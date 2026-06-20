#!/usr/bin/env python3
"""
テクニカルスクリーニングスクリプト
J-Quants の日次株価から RSI・出来高急増を計算し、
・売られすぎ（RSI低位×出来高急増）＝反発候補
・過熱（RSI高位×出来高急増）＝急騰・利益確定注意
を東証プライム/スタンダード全銘柄から自動抽出する。
結果は Slack 通知 + Obsidian（data/x-posts/）に保存。
"""

import os
import time
from pathlib import Path
from datetime import date, timedelta

import requests

# ─── 設定 ────────────────────────────────────────────────
JQUANTS_BASE = "https://api.jquants.com/v1"
JQUANTS_REFRESH_TOKEN = os.environ.get("JQUANTS_REFRESH_TOKEN", "")
JQUANTS_EMAIL = os.environ.get("JQUANTS_EMAIL", "")
JQUANTS_PASSWORD = os.environ.get("JQUANTS_PASSWORD", "")

RSI_PERIOD = 14
RSI_OVERSOLD = 30
RSI_OVERBOUGHT = 70
VOLUME_SPIKE_RATIO = 2.0   # 直近出来高が20日平均の何倍以上か
LOOKBACK_DAYS = 60          # RSI・出来高平均の計算に必要な日数を確保
MAX_RESULTS = 10
MAX_CHECKED = int(os.environ.get("TECH_SCREEN_MAX_CHECKED", "800"))  # API呼び出し件数の上限

OUTPUT_DIR = Path("data/x-posts")


# ─── J-Quants 認証 ───────────────────────────────────────
def jquants_token() -> str:
    if JQUANTS_REFRESH_TOKEN:
        try:
            r = requests.post(
                f"{JQUANTS_BASE}/token/auth_refresh",
                params={"refreshtoken": JQUANTS_REFRESH_TOKEN},
            )
            r.raise_for_status()
            return r.json()["idToken"]
        except Exception as e:
            print(f"リフレッシュトークン失敗: {e}")
    r = requests.post(
        f"{JQUANTS_BASE}/token/auth_user",
        json={"mailaddress": JQUANTS_EMAIL, "password": JQUANTS_PASSWORD},
    )
    r.raise_for_status()
    refresh = r.json()["refreshToken"]
    r2 = requests.post(
        f"{JQUANTS_BASE}/token/auth_refresh",
        params={"refreshtoken": refresh},
    )
    r2.raise_for_status()
    return r2.json()["idToken"]


def fetch_listed_info(token: str) -> list[dict]:
    r = requests.get(
        f"{JQUANTS_BASE}/listed/info",
        headers={"Authorization": f"Bearer {token}"},
    )
    r.raise_for_status()
    return r.json().get("info", [])


def fetch_quotes(token: str, code: str, from_date: str, to_date: str) -> list[dict]:
    r = requests.get(
        f"{JQUANTS_BASE}/prices/daily_quotes",
        headers={"Authorization": f"Bearer {token}"},
        params={"code": code, "from": from_date, "to": to_date},
    )
    if not r.ok:
        return []
    return sorted(r.json().get("daily_quotes", []), key=lambda q: q["Date"])


# ─── 指標計算 ────────────────────────────────────────────
def calc_rsi(closes: list[float], period: int = RSI_PERIOD) -> float | None:
    """終値配列（古い→新しい順）からRSI(period)を計算"""
    if len(closes) < period + 1:
        return None
    gains, losses = [], []
    for i in range(1, len(closes)):
        diff = closes[i] - closes[i - 1]
        gains.append(max(diff, 0))
        losses.append(max(-diff, 0))
    avg_gain = sum(gains[-period:]) / period
    avg_loss = sum(losses[-period:]) / period
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return round(100 - (100 / (1 + rs)), 1)


def calc_volume_spike(volumes: list[float]) -> float | None:
    """直近出来高 ÷ 直近20日平均出来高（直近日を除く）"""
    if len(volumes) < 21:
        return None
    latest = volumes[-1]
    avg20 = sum(volumes[-21:-1]) / 20
    if avg20 == 0:
        return None
    return round(latest / avg20, 2)


# ─── スクリーニング本体 ───────────────────────────────────
def screen() -> dict:
    token = jquants_token()
    print("上場銘柄一覧取得中...")
    all_stocks = fetch_listed_info(token)
    targets = [s for s in all_stocks if s.get("MarketCodeName") in ("プライム", "スタンダード")]
    print(f"  対象: {len(targets)}銘柄（チェック上限{MAX_CHECKED}銘柄）")

    today = date.today()
    from_d = (today - timedelta(days=LOOKBACK_DAYS)).strftime("%Y-%m-%d")
    to_d = today.strftime("%Y-%m-%d")

    oversold, overbought = [], []
    checked = 0

    for stock in targets[:MAX_CHECKED]:
        code = stock.get("Code", "")
        if not code:
            continue

        quotes = fetch_quotes(token, code, from_d, to_d)
        checked += 1
        if checked % 100 == 0:
            print(f"  {checked}銘柄チェック済... 売られすぎ{len(oversold)}件 / 過熱{len(overbought)}件")

        closes = [q["Close"] for q in quotes if q.get("Close") is not None]
        volumes = [q["Volume"] for q in quotes if q.get("Volume") is not None]
        if len(closes) < RSI_PERIOD + 1 or len(volumes) < 21:
            time.sleep(0.1)
            continue

        rsi = calc_rsi(closes)
        vol_spike = calc_volume_spike(volumes)
        if rsi is None or vol_spike is None or vol_spike < VOLUME_SPIKE_RATIO:
            time.sleep(0.1)
            continue

        entry = {
            "code": code,
            "name": stock.get("CompanyName", ""),
            "sector": stock.get("Sector33CodeName", ""),
            "close": closes[-1],
            "rsi": rsi,
            "volume_spike": vol_spike,
        }
        if rsi <= RSI_OVERSOLD:
            oversold.append(entry)
        elif rsi >= RSI_OVERBOUGHT:
            overbought.append(entry)

        time.sleep(0.1)

    oversold.sort(key=lambda x: x["rsi"])
    overbought.sort(key=lambda x: -x["rsi"])
    return {
        "oversold": oversold[:MAX_RESULTS],
        "overbought": overbought[:MAX_RESULTS],
        "checked": checked,
        "date": today.isoformat(),
    }


# ─── 結果の保存・通知 ──────────────────────────────────────
def save_to_obsidian(result: dict) -> Path:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUTPUT_DIR / f"{result['date']}-technical-screen.md"

    def rows(entries):
        return "\n".join(
            f"| {e['code']} | {e['name']} | {e['sector']} | {e['close']:,.0f} | "
            f"{e['rsi']} | {e['volume_spike']}倍 |"
            for e in entries
        ) or "| - | - | - | - | - | - |"

    content = f"""---
date: {result['date']}
tags: [stock-picks, technical-screener, RSI, 出来高急増]
---

# テクニカルスクリーニング結果 {result['date']}

チェック対象: {result['checked']}銘柄（東証プライム・スタンダード）
基準: RSI({RSI_PERIOD}) + 出来高が直近20日平均の{VOLUME_SPIKE_RATIO}倍以上

## 売られすぎ候補（RSI≤{RSI_OVERSOLD} & 出来高急増）

| コード | 銘柄名 | 業種 | 終値 | RSI | 出来高 |
| --- | --- | --- | --- | --- | --- |
{rows(result['oversold'])}

## 過熱・急騰候補（RSI≥{RSI_OVERBOUGHT} & 出来高急増）

| コード | 銘柄名 | 業種 | 終値 | RSI | 出来高 |
| --- | --- | --- | --- | --- | --- |
{rows(result['overbought'])}

---
*technical_screener.py により自動生成。投資助言ではありません。*
"""
    path.write_text(content, encoding="utf-8")
    print(f"Obsidian保存完了: {path}")
    return path


def build_slack_message(result: dict) -> str:
    def fmt(entries, label):
        if not entries:
            return f"{label}\n（該当なし）"
        lines = [
            f"{e['code']} {e['name']} RSI:{e['rsi']} 出来高{e['volume_spike']}倍 終値:{e['close']:,.0f}円"
            for e in entries
        ]
        return f"{label}\n" + "\n".join(lines)

    return (
        f"📊 *テクニカルスクリーニング結果* {result['date']}\n"
        f"チェック対象: {result['checked']}銘柄\n\n"
        f"{fmt(result['oversold'], '🔵 売られすぎ候補（RSI≤' + str(RSI_OVERSOLD) + ' & 出来高急増）')}\n\n"
        f"{fmt(result['overbought'], '🔴 過熱・急騰候補（RSI≥' + str(RSI_OVERBOUGHT) + ' & 出来高急増）')}\n\n"
        f"※投資助言ではありません。詳細はObsidianのdata/x-posts/を確認してください。"
    )


def main():
    print("=== テクニカルスクリーニング起動 ===\n")
    result = screen()
    print(f"\n売られすぎ候補: {len(result['oversold'])}件 / 過熱候補: {len(result['overbought'])}件")

    save_to_obsidian(result)

    message = build_slack_message(result)
    try:
        from notify_slack import notify
        notify(message)
    except KeyError:
        print("SLACK_WEBHOOK_URL未設定のため通知スキップ")
        print(message)

    print("\n=== 完了 ===")


if __name__ == "__main__":
    main()
