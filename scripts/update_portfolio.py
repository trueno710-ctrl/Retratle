#!/usr/bin/env python3
"""
株式ポートフォリオ自動更新スクリプト
J-Quants API で株価取得 → Notion ページを毎日18:00に更新
"""

import os
import json
import requests
from datetime import date, timedelta
from dataclasses import dataclass, field

# ─── 設定 ────────────────────────────────────────────────
NOTION_TOKEN = os.environ["NOTION_TOKEN"]
NOTION_PAGE_ID = "36dc573ff8f481abac02ebf436a948bf"

# J-Quants V2: APIキー認証
JQUANTS_API_KEY = os.environ["JQUANTS_API_KEY"]

NOTION_BASE = "https://api.notion.com/v1"
JQUANTS_BASE = "https://api.jquants.com/v2"

ATR_PERIOD = 14
ATR_STOP_LOSS_MULT = 2.0   # 損切り = 取得価額 - 2×ATR14
ATR_TARGET_MULT = 3.0      # 目標値 = 取得価額 + 3×ATR14


# ─── 保有銘柄定義 ────────────────────────────────────────
@dataclass
class Holding:
    name: str
    code: str
    quantity: int
    cost: float          # 取得価額（1株あたり）
    is_margin: bool = False  # 信用建玉かどうか


HOLDINGS: list[Holding] = [
    # 現物株
    Holding("メタプラネット",  "3350", 100,   443,    False),
    Holding("コメダHD",       "3543", 100,   3015,   False),
    Holding("エスクリプト",   "5721", 100,   139,    False),
    Holding("日東精工",       "5957", 300,   783,    False),
    Holding("旭ダイヤモンド", "6140", 300,   1302,   False),
    Holding("西部技研",       "6223", 100,   2345,   False),
    Holding("三菱UFJFG",     "8306", 100,   2533,   False),
    Holding("NTT",           "9432", 100,   155,    False),
    # 信用建玉
    Holding("日本リーテック",  "1938", 100,   2994,   True),
    Holding("SYNSPECTIVE",   "290A", 500,   1476,   True),
]


# ─── 株価取得（J-Quants V2: APIキー認証）─────────────────────
def fetch_prices(code: str, from_date: str, to_date: str) -> list[dict]:
    quotes = []
    pagination_key = None
    while True:
        params = {"code": code, "from": from_date, "to": to_date}
        if pagination_key:
            params["pagination_key"] = pagination_key
        resp = requests.get(
            f"{JQUANTS_BASE}/equities/bars/daily",
            headers={"x-api-key": JQUANTS_API_KEY},
            params=params,
        )
        resp.raise_for_status()
        body = resp.json()
        quotes.extend(body.get("data", []))
        pagination_key = body.get("pagination_key")
        if not pagination_key:
            break
    return quotes


def get_close(quotes: list[dict], target_date: str) -> float | None:
    for q in quotes:
        if q.get("date") == target_date:
            return q.get("close")
    return None


def get_latest_close(quotes: list[dict]) -> tuple[str, float] | tuple[None, None]:
    if not quotes:
        return None, None
    latest = sorted(quotes, key=lambda q: q["date"])[-1]
    return latest["date"], latest.get("close")


def nearest_trading_day_before(target: date, quotes: list[dict]) -> float | None:
    """target日以前で最も近い終値を返す"""
    available = {q["date"]: q.get("close") for q in quotes if q.get("close") is not None}
    for i in range(10):
        d = (target - timedelta(days=i)).strftime("%Y-%m-%d")
        if d in available:
            return available[d]
    return None


# ─── ATRベース目標・損切り計算 ─────────────────────────────
def calc_atr(quotes: list[dict], period: int = ATR_PERIOD) -> float | None:
    """日足（古い→新しい順）からATR(period)を計算"""
    valid = [q for q in quotes if q.get("high") is not None and q.get("low") is not None and q.get("close") is not None]
    if len(valid) < period + 1:
        return None
    trs = []
    for i in range(1, len(valid)):
        high, low = valid[i]["high"], valid[i]["low"]
        prev_close = valid[i - 1]["close"]
        trs.append(max(high - low, abs(high - prev_close), abs(low - prev_close)))
    return sum(trs[-period:]) / period


def calc_target_stop(cost: float, atr: float | None) -> tuple[float | None, float | None]:
    """取得価額 ± ATR から目標価格・損切り価格を算出"""
    if atr is None:
        return None, None
    target = cost + ATR_TARGET_MULT * atr
    stop_loss = cost - ATR_STOP_LOSS_MULT * atr
    return target, stop_loss


def status_flag(current: float | None, target: float | None, stop_loss: float | None) -> str:
    if current is None:
        return "-"
    if target is not None and current >= target:
        return "🎯目標達成"
    if stop_loss is not None and current <= stop_loss:
        return "⛔損切りライン割れ"
    if stop_loss is not None and current <= stop_loss * 1.03:
        return "⚠️損切り接近"
    return ""


# ─── 損益計算 ────────────────────────────────────────────
def calc_pl(cost: float, current: float, qty: int) -> int:
    return round((current - cost) * qty)


def fmt_pl(val: int) -> str:
    return f"+{val:,}円" if val >= 0 else f"{val:,}円"


def fmt_chg(val: float | None) -> str:
    if val is None:
        return "-"
    sign = "+" if val >= 0 else ""
    return f"{sign}{val:.2f}%"


# ─── Notion ページ更新 ────────────────────────────────────
def notion_headers() -> dict:
    return {
        "Authorization": f"Bearer {NOTION_TOKEN}",
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
    }


def fmt_price(val: float | None) -> str:
    return f"{val:,.0f}" if val is not None else "-"


def build_row(
    h: Holding,
    current: float | None,
    prev_day: float | None,
    prev_month: float | None,
    target: float | None,
    stop_loss: float | None,
) -> str:
    if current is None:
        return f"| {h.name} | {h.code} | {h.quantity:,} | {h.cost:,.0f} | - | - | - | - | - | - | - |"

    current_str = f"{current:,.0f}"
    day_chg = fmt_chg(((current - prev_day) / prev_day * 100) if prev_day else None)
    month_chg = fmt_chg(((current - prev_month) / prev_month * 100) if prev_month else None)
    pl = calc_pl(h.cost, current, h.quantity)
    pl_str = fmt_pl(pl)
    status = status_flag(current, target, stop_loss)
    return (
        f"| {h.name} | {h.code} | {h.quantity:,} | {h.cost:,.0f} | {current_str} | {day_chg} | "
        f"{month_chg} | {pl_str} | {fmt_price(target)} | {fmt_price(stop_loss)} | {status} |"
    )


def update_notion_page(content: str):
    # 既存コンテンツを取得してブロックIDを取る
    page_url = f"{NOTION_BASE}/blocks/{NOTION_PAGE_ID}/children"
    resp = requests.get(page_url, headers=notion_headers())
    resp.raise_for_status()
    blocks = resp.json().get("results", [])

    # 全ブロックを削除してから新コンテンツで置き換える
    for block in blocks:
        bid = block["id"]
        requests.delete(f"{NOTION_BASE}/blocks/{bid}", headers=notion_headers())

    # マークダウンを段落ブロックとして追加（シンプルな実装）
    lines = content.strip().split("\n")
    new_blocks = []
    for line in lines:
        if line.startswith("## "):
            new_blocks.append({
                "object": "block",
                "type": "heading_2",
                "heading_2": {
                    "rich_text": [{"type": "text", "text": {"content": line[3:]}}]
                }
            })
        elif line.startswith("| "):
            new_blocks.append({
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [{"type": "text", "text": {"content": line}}]
                }
            })
        elif line.strip():
            new_blocks.append({
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [{"type": "text", "text": {"content": line}}]
                }
            })

    # 100件ずつ分割してAPIに送信
    for i in range(0, len(new_blocks), 100):
        chunk = new_blocks[i:i+100]
        requests.patch(
            page_url,
            headers=notion_headers(),
            json={"children": chunk},
        )


# ─── メイン ──────────────────────────────────────────────
def main():
    today = date.today()
    today_str = today.strftime("%Y-%m-%d")

    # 前日（平日）
    prev_day = today - timedelta(days=1)
    if prev_day.weekday() == 5:  # 土
        prev_day -= timedelta(days=1)
    elif prev_day.weekday() == 6:  # 日
        prev_day -= timedelta(days=2)
    prev_day_str = prev_day.strftime("%Y-%m-%d")

    # 前月同日
    if today.month == 1:
        prev_month = today.replace(year=today.year - 1, month=12)
    else:
        try:
            prev_month = today.replace(month=today.month - 1)
        except ValueError:
            import calendar
            prev_month = today.replace(
                month=today.month - 1,
                day=calendar.monthrange(today.year, today.month - 1)[1]
            )
    prev_month_str = prev_month.strftime("%Y-%m-%d")

    from_date = (today - timedelta(days=40)).strftime("%Y-%m-%d")

    print(f"株価取得中（{from_date} → {today_str}）...")

    spot_rows = []
    spot_pl_total = 0
    margin_rows = []
    margin_pl_total = 0
    alerts = []

    for h in HOLDINGS:
        quotes = fetch_prices(h.code, from_date, today_str)
        sorted_quotes = sorted(quotes, key=lambda q: q["date"])
        _, current = get_latest_close(quotes)
        prev_day_price = nearest_trading_day_before(prev_day, quotes)
        prev_month_price = nearest_trading_day_before(prev_month, quotes)

        atr = calc_atr(sorted_quotes)
        target, stop_loss = calc_target_stop(h.cost, atr)

        row = build_row(h, current, prev_day_price, prev_month_price, target, stop_loss)
        if h.is_margin:
            margin_rows.append(row)
            if current:
                margin_pl_total += calc_pl(h.cost, current, h.quantity)
        else:
            spot_rows.append(row)
            if current:
                spot_pl_total += calc_pl(h.cost, current, h.quantity)

        status = status_flag(current, target, stop_loss)
        if status in ("🎯目標達成", "⛔損切りライン割れ"):
            alerts.append(f"{status} {h.name}({h.code}) 現在値:{fmt_price(current)}円 目標:{fmt_price(target)}円 損切り:{fmt_price(stop_loss)}円")

        print(f"  {h.name}({h.code}): {current}円 [目標:{fmt_price(target)} / 損切り:{fmt_price(stop_loss)}]")

    total_pl = spot_pl_total + margin_pl_total

    content = f"""最終更新: {today_str} 18:00 *(毎日18:00 自動更新)*

目標価格・損切り価格はATR（{ATR_PERIOD}日平均値幅）から自動算出: 目標=取得価額+{ATR_TARGET_MULT}×ATR、損切り=取得価額-{ATR_STOP_LOSS_MULT}×ATR

## 現物株

評価損益: **{fmt_pl(spot_pl_total)}**

| 銘柄 | コード | 保有数 | 取得価額(円) | 現在値(円) | 前日比 | 前月比 | 損益(円) | 目標価格(円) | 損切り価格(円) | 状態 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
{chr(10).join(spot_rows)}

## 信用建玉

評価損益: **{fmt_pl(margin_pl_total)}**

| 銘柄 | コード | 数量 | 平均建値(円) | 現在値(円) | 前日比 | 前月比 | 評価損益(円) | 目標価格(円) | 損切り価格(円) | 状態 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
{chr(10).join(margin_rows)}

## 合計

| 区分 | 評価損益 |
| --- | --- |
| 現物 | {fmt_pl(spot_pl_total)} |
| 信用 | {fmt_pl(margin_pl_total)} |
| **合計** | **{fmt_pl(total_pl)}** |

---

⚙️ J-Quants API + GitHub Actions により自動更新（毎営業日 18:00）"""

    print("Notion ページを更新中...")
    update_notion_page(content)
    print("完了！")

    if alerts:
        message = "🚨 *ポートフォリオ アラート*\n" + "\n".join(alerts)
        try:
            from notify_slack import notify
            notify(message)
        except KeyError:
            print("SLACK_WEBHOOK_URL未設定のためアラート通知スキップ")
            print(message)


if __name__ == "__main__":
    main()
