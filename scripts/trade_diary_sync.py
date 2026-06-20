"""
Trade Diary Sync
FXプラットフォームから届く約定/決済確認メールをGmailから取得し、
1日分のトレードをまとめてObsidianの TradeDiary/ に保存する。

処理フロー:
  1. Gmail検索（ラベル "TradeDiarySynced" が付いていない約定確認メール）
  2. メール本文から取引情報を正規表現で抽出
  3. 日付（JST）ごとにグルーピングし、勝率・損益合計を集計
  4. TradeDiary/YYYY-MM-DD.md に追記保存
  5. 処理済みメールに "TradeDiarySynced" ラベルを付与
"""

import base64
import os
import re
from datetime import datetime, timezone, timedelta

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

GMAIL_CLIENT_ID = os.environ["GMAIL_CLIENT_ID"]
GMAIL_CLIENT_SECRET = os.environ["GMAIL_CLIENT_SECRET"]
GMAIL_REFRESH_TOKEN = os.environ["GMAIL_REFRESH_TOKEN"]

SEARCH_QUERY = os.environ.get(
    "TRADE_DIARY_SEARCH_QUERY",
    "from:trade@alerts.ctrader.com newer_than:2d -label:TradeDiarySynced",
)
SYNCED_LABEL_NAME = "TradeDiarySynced"

JST = timezone(timedelta(hours=9))
TRADE_DIARY_DIR = os.path.join(os.path.dirname(__file__), "..", "TradeDiary")

FIELD_PATTERNS = {
    "account": r"Account[:\s]+([^\n]+)",
    "symbol": r"Symbol[:\s]+([^\n]+)",
    "direction": r"Direction[:\s]+([^\n]+)",
    "fill_time": r"Fill time[:\s]+([^\n]+)",
    "fill_price": r"Fill price[:\s]+([^\n]+)",
    "volume": r"Volume[^\n:]*[:\s]+([^\n]+)",
    "position_id": r"Position ID[:\s]+([^\n]+)",
    "gross_pnl": r"Gross P&L[:\s]+([^\n]+)",
    "net_pnl": r"Net P&L[:\s]+([^\n]+)",
    "balance": r"Current balance[:\s]+([^\n]+)",
}


def get_gmail_service():
    creds = Credentials(
        token=None,
        refresh_token=GMAIL_REFRESH_TOKEN,
        client_id=GMAIL_CLIENT_ID,
        client_secret=GMAIL_CLIENT_SECRET,
        token_uri="https://oauth2.googleapis.com/token",
    )
    return build("gmail", "v1", credentials=creds)


def get_or_create_label(service, name: str) -> str:
    labels = service.users().labels().list(userId="me").execute().get("labels", [])
    for label in labels:
        if label["name"] == name:
            return label["id"]
    created = (
        service.users()
        .labels()
        .create(userId="me", body={"name": name, "labelListVisibility": "labelShow"})
        .execute()
    )
    return created["id"]


def extract_body_text(payload: dict) -> str:
    if payload.get("mimeType") == "text/plain" and payload.get("body", {}).get("data"):
        return base64.urlsafe_b64decode(payload["body"]["data"]).decode("utf-8", "ignore")

    for part in payload.get("parts", []):
        text = extract_body_text(part)
        if text:
            return text
    return ""


def parse_trade(body: str) -> dict:
    trade = {}
    for key, pattern in FIELD_PATTERNS.items():
        match = re.search(pattern, body)
        trade[key] = match.group(1).strip() if match else ""
    return trade


def fetch_trades(service) -> list:
    results = service.users().messages().list(userId="me", q=SEARCH_QUERY).execute()
    messages = results.get("messages", [])

    trades = []
    for msg in messages:
        full = service.users().messages().get(userId="me", id=msg["id"], format="full").execute()
        body = extract_body_text(full["payload"])
        if not body:
            continue

        trade = parse_trade(body)
        if not trade.get("position_id"):
            continue

        internal_ts = int(full["internalDate"]) / 1000
        received = datetime.fromtimestamp(internal_ts, tz=timezone.utc).astimezone(JST)
        trade["date_jst"] = received.strftime("%Y-%m-%d")
        trade["message_id"] = msg["id"]
        trades.append(trade)

    return trades


def parse_pnl(value: str) -> float:
    cleaned = re.sub(r"[^\d.\-]", "", value)
    try:
        return float(cleaned)
    except ValueError:
        return 0.0


def save_trade_diary(date_jst: str, trades: list):
    os.makedirs(TRADE_DIARY_DIR, exist_ok=True)
    filepath = os.path.join(TRADE_DIARY_DIR, f"{date_jst}.md")
    today = datetime.now(JST).strftime("%Y-%m-%d")

    net_pnls = [parse_pnl(t["net_pnl"]) for t in trades]
    total_pnl = sum(net_pnls)
    wins = sum(1 for p in net_pnls if p > 0)
    losses = sum(1 for p in net_pnls if p < 0)

    rows = "\n".join(
        f"| {t['symbol']} | {t['direction']} | {t['fill_time']} | {t['fill_price']} | "
        f"{t['volume']} | {t['net_pnl']} | {t['position_id']} |"
        for t in trades
    )

    content = f"""---
date: {date_jst}
updated: {today}
tags: [trade-diary, fx]
project: akatoshi
---

# トレード日記 {date_jst}

## 集計
- トレード件数: {len(trades)}
- 勝ち: {wins} / 負け: {losses}
- 合計Net P&L: {total_pnl:,.0f}

## トレード一覧
| Symbol | Direction | Fill time | Fill price | Volume | Net P&L | Position ID |
|---|---|---|---|---|---|---|
{rows}
"""

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"  [保存] TradeDiary/{date_jst}.md（{len(trades)}件）")


def main():
    print(f"=== Trade Diary Sync: {datetime.now(JST).strftime('%Y-%m-%d %H:%M:%S')} JST ===")

    service = get_gmail_service()
    trades = fetch_trades(service)

    if not trades:
        print("対象メールなし。終了します。")
        return

    print(f"取得トレード: {len(trades)}件")

    by_date: dict[str, list] = {}
    for trade in trades:
        by_date.setdefault(trade["date_jst"], []).append(trade)

    for date_jst, day_trades in by_date.items():
        save_trade_diary(date_jst, day_trades)

    label_id = get_or_create_label(service, SYNCED_LABEL_NAME)
    for trade in trades:
        service.users().messages().modify(
            userId="me", id=trade["message_id"], body={"addLabelIds": [label_id]}
        ).execute()

    print("\n=== 完了 ===")


if __name__ == "__main__":
    main()
