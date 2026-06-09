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

# J-Quants: リフレッシュトークン優先、なければメール/パスワード
JQUANTS_REFRESH_TOKEN = os.environ.get("JQUANTS_REFRESH_TOKEN", "")
JQUANTS_EMAIL = os.environ.get("JQUANTS_EMAIL", "")
JQUANTS_PASSWORD = os.environ.get("JQUANTS_PASSWORD", "")

NOTION_BASE = "https://api.notion.com/v1"
JQUANTS_BASE = "https://api.jquants.com/v1"


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


# ─── J-Quants 認証 ───────────────────────────────────────
def jquants_get_refresh_token_via_login() -> str:
    resp = requests.post(
        f"{JQUANTS_BASE}/token/auth_user",
        json={"mailaddress": JQUANTS_EMAIL, "password": JQUANTS_PASSWORD},
    )
    resp.raise_for_status()
    return resp.json()["refreshToken"]


def jquants_get_access_token(refresh_token: str) -> str:
    resp = requests.post(
        f"{JQUANTS_BASE}/token/auth_refresh",
        params={"refreshtoken": refresh_token},
    )
    resp.raise_for_status()
    return resp.json()["idToken"]


def jquants_authenticate() -> str:
    """リフレッシュトークン → IDトークン（アクセストークン）を取得"""
    if JQUANTS_REFRESH_TOKEN:
        print("リフレッシュトークンで認証中...")
        try:
            return jquants_get_access_token(JQUANTS_REFRESH_TOKEN)
        except Exception as e:
            print(f"リフレッシュトークン失敗: {e}")
            if not JQUANTS_EMAIL:
                raise RuntimeError("JQUANTS_REFRESH_TOKEN が無効で JQUANTS_EMAIL も未設定です") from e
    print("メール/パスワードで認証中...")
    refresh = jquants_get_refresh_token_via_login()
    return jquants_get_access_token(refresh)


# ─── 株価取得 ────────────────────────────────────────────
def fetch_prices(token: str, code: str, from_date: str, to_date: str) -> list[dict]:
    resp = requests.get(
        f"{JQUANTS_BASE}/prices/daily_quotes",
        headers={"Authorization": f"Bearer {token}"},
        params={"code": f"{code}", "from": from_date, "to": to_date},
    )
    resp.raise_for_status()
    return resp.json().get("daily_quotes", [])


def get_close(quotes: list[dict], target_date: str) -> float | None:
    for q in quotes:
        if q.get("Date") == target_date:
            return q.get("Close")
    return None


def get_latest_close(quotes: list[dict]) -> tuple[str, float] | tuple[None, None]:
    if not quotes:
        return None, None
    latest = sorted(quotes, key=lambda q: q["Date"])[-1]
    return latest["Date"], latest.get("Close")


def nearest_trading_day_before(target: date, quotes: list[dict]) -> float | None:
    """target日以前で最も近い終値を返す"""
    available = {q["Date"]: q.get("Close") for q in quotes if q.get("Close") is not None}
    for i in range(10):
        d = (target - timedelta(days=i)).strftime("%Y-%m-%d")
        if d in available:
            return available[d]
    return None


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


def build_row(h: Holding, current: float | None, prev_day: float | None, prev_month: float | None) -> str:
    if current is None:
        return f"| {h.name} | {h.code} | {h.quantity:,} | {h.cost:,.0f} | - | - | - | - |"

    current_str = f"{current:,.0f}"
    day_chg = fmt_chg(((current - prev_day) / prev_day * 100) if prev_day else None)
    month_chg = fmt_chg(((current - prev_month) / prev_month * 100) if prev_month else None)
    pl = calc_pl(h.cost, current, h.quantity)
    pl_str = fmt_pl(pl)
    return f"| {h.name} | {h.code} | {h.quantity:,} | {h.cost:,.0f} | {current_str} | {day_chg} | {month_chg} | {pl_str} |"


def build_margin_row(h: Holding, current: float | None, prev_day: float | None, prev_month: float | None) -> str:
    if current is None:
        return f"| {h.name} | {h.code} | {h.quantity:,} | {h.cost:,.0f} | - | - | - | - |"

    current_str = f"{current:,.0f}"
    day_chg = fmt_chg(((current - prev_day) / prev_day * 100) if prev_day else None)
    month_chg = fmt_chg(((current - prev_month) / prev_month * 100) if prev_month else None)
    pl = calc_pl(h.cost, current, h.quantity)
    pl_str = fmt_pl(pl)
    return f"| {h.name} | {h.code} | {h.quantity:,} | {h.cost:,.0f} | {current_str} | {day_chg} | {month_chg} | {pl_str} |"


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

    access_token = jquants_authenticate()

    print(f"株価取得中（{from_date} → {today_str}）...")

    spot_rows = []
    spot_pl_total = 0
    margin_rows = []
    margin_pl_total = 0

    for h in HOLDINGS:
        quotes = fetch_prices(access_token, h.code, from_date, today_str)
        _, current = get_latest_close(quotes)
        prev_day_price = nearest_trading_day_before(prev_day, quotes)
        prev_month_price = nearest_trading_day_before(prev_month, quotes)

        if h.is_margin:
            row = build_margin_row(h, current, prev_day_price, prev_month_price)
            margin_rows.append(row)
            if current:
                margin_pl_total += calc_pl(h.cost, current, h.quantity)
        else:
            row = build_row(h, current, prev_day_price, prev_month_price)
            spot_rows.append(row)
            if current:
                spot_pl_total += calc_pl(h.cost, current, h.quantity)

        print(f"  {h.name}({h.code}): {current}円")

    total_pl = spot_pl_total + margin_pl_total

    content = f"""最終更新: {today_str} 18:00 *(毎日18:00 自動更新)*

## 現物株

評価損益: **{fmt_pl(spot_pl_total)}**

| 銘柄 | コード | 保有数 | 取得価額(円) | 現在値(円) | 前日比 | 前月比 | 損益(円) |
| --- | --- | --- | --- | --- | --- | --- | --- |
{chr(10).join(spot_rows)}

## 信用建玉

評価損益: **{fmt_pl(margin_pl_total)}**

| 銘柄 | コード | 数量 | 平均建値(円) | 現在値(円) | 前日比 | 前月比 | 評価損益(円) |
| --- | --- | --- | --- | --- | --- | --- | --- |
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


if __name__ == "__main__":
    main()
