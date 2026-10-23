#!/usr/bin/env python3
"""
経済指標 → ドル円・金・BTC 見通し → Threads 半自動投稿

使い方:
  python scripts/market_outlook_post.py            # 下書き作成 → 表示 → y で投稿（ローカル用）
  python scripts/market_outlook_post.py draft      # 下書きを data/market-posts/ に保存するだけ
  python scripts/market_outlook_post.py publish    # 今日の下書きを投稿（日付指定: publish 2026-10-23）

下書きファイル（Markdown）は投稿前に手で直してOK。publish はファイルの中身をそのまま投稿する。

必要な環境変数（.env.local または GitHub Secrets）:
  ANTHROPIC_API_KEY, FRED_API_KEY, THREADS_ACCESS_TOKEN, THREADS_USER_ID
"""

import os
import re
import sys
import time
import requests
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

# ─── 設定 ────────────────────────────────────────────────
ENV_FILE    = Path(".env.local")
OUTPUT_DIR  = Path("data/market-posts")
CLAUDE_MODEL = "claude-sonnet-5-5"
FRED_BASE   = "https://api.stlouisfed.org/fred/series/observations"
COINGECKO   = "https://api.coingecko.com/api/v3/simple/price"
THREADS_MAX_CHARS = 500
JST = timezone(timedelta(hours=9))

DISCLAIMER = "※情報提供であり投資助言ではありません。投資判断はご自身で。"

# FRED の系列（取得できなかったものは「データなし」としてスキップ）
# kind: level=最新値 / diff=前月差 / yoy=前年比%
FRED_SERIES = [
    ("PAYEMS",            "米 非農業部門雇用者数（前月差・千人）", "diff"),
    ("UNRATE",            "米 失業率（%）",                     "level"),
    ("CPIAUCSL",          "米 CPI（前年比%）",                  "yoy"),
    ("DFF",               "米 FF金利（%）",                     "level"),
    ("DGS10",             "米 10年債利回り（%）",               "level"),
    ("DEXJPUS",           "ドル円（FRED日次・数日遅れ）",        "level"),
    ("IRLTLT01JPM156N",   "日本 10年債利回り（%・月次）",        "level"),
    ("LRUN64TTJPM156S",   "日本 失業率（%・月次）",             "level"),
]


def load_env():
    """.env.local があれば読み込む（既に設定済みの環境変数は上書きしない）"""
    if not ENV_FILE.exists():
        return
    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        key, sep, val = line.partition("=")
        if sep and key.strip() and not key.strip().startswith("#"):
            os.environ.setdefault(key.strip(), val.strip())


def require_env(*keys):
    missing = [k for k in keys if not os.environ.get(k)]
    if missing:
        sys.exit(f"環境変数が未設定です: {', '.join(missing)}（.env.local に追加してください）")


# ══════════════════════════════════════════════════════════
# STEP 1: 指標・価格データ取得
# ══════════════════════════════════════════════════════════

def fetch_fred(series_id: str, kind: str) -> dict | None:
    start = (date.today() - timedelta(days=500)).isoformat()
    r = requests.get(FRED_BASE, params={
        "series_id": series_id,
        "api_key": os.environ["FRED_API_KEY"],
        "file_type": "json",
        "observation_start": start,
    }, timeout=20)
    r.raise_for_status()
    obs = [o for o in r.json().get("observations", []) if o["value"] not in (".", "")]
    if len(obs) < 2:
        return None

    latest, prev = obs[-1], obs[-2]
    v, pv = float(latest["value"]), float(prev["value"])
    if kind == "diff":
        value, prev_value = v - pv, pv - float(obs[-3]["value"]) if len(obs) >= 3 else None
    elif kind == "yoy":
        if len(obs) < 14:
            return None
        value = (v / float(obs[-13]["value"]) - 1) * 100
        prev_value = (pv / float(obs[-14]["value"]) - 1) * 100
    else:
        value, prev_value = v, pv
    return {"date": latest["date"], "value": round(value, 2),
            "prev": None if prev_value is None else round(prev_value, 2)}


def fetch_indicators() -> list[dict]:
    results = []
    for series_id, label, kind in FRED_SERIES:
        try:
            data = fetch_fred(series_id, kind)
        except requests.RequestException as e:
            print(f"  {label}: 取得失敗 ({e})")
            continue
        if data:
            results.append({"label": label, **data})
            print(f"  {label}: {data['value']}（前回 {data['prev']}, {data['date']}）")
        else:
            print(f"  {label}: データなし")
    return results


def fetch_prices() -> dict:
    """BTC と PAXG（金1トロイオンス連動トークン）を CoinGecko から取得。ドル円は BTC の円/ドル比で算出"""
    r = requests.get(COINGECKO, params={
        "ids": "bitcoin,pax-gold",
        "vs_currencies": "usd,jpy",
        "include_24hr_change": "true",
    }, timeout=20)
    r.raise_for_status()
    d = r.json()
    btc, gold = d["bitcoin"], d["pax-gold"]
    return {
        "USDJPY": round(btc["jpy"] / btc["usd"], 2),
        "BTC_USD": round(btc["usd"]),
        "BTC_24h%": round(btc.get("usd_24h_change", 0), 2),
        "GOLD_USD": round(gold["usd"], 1),
        "GOLD_24h%": round(gold.get("usd_24h_change", 0), 2),
    }


# ══════════════════════════════════════════════════════════
# STEP 2: Claude で投稿文を作成
# ══════════════════════════════════════════════════════════

PROMPT = """あなたは日本の個人投資家向けにマクロ経済を解説する発信者です。
以下の最新データをもとに、Threads 用の3連投稿を日本語で作ってください。

# 最新の経済指標
{indicators}

# 現在の価格
{prices}

# 構成
- 投稿1: 今日の注目ポイント（指標の結果と市場の受け止め）
- 投稿2: ドル円・金・BTC それぞれの見通しを「上昇シナリオ / 下落シナリオ」で
- 投稿3: 次に注目するイベントとまとめ

# ルール（必ず守る）
- 各投稿は {max_chars} 文字以内（免責文の分も空けておく）
- 「必ず上がる」「買い時」など断定や売買の推奨はしない。「〜の可能性」「シナリオ」で書く
- エントリー価格・損切り価格などの売買シグナルは書かない
- データにない数字を作らない
- 絵文字は各投稿2個まで、ハッシュタグは投稿3に2〜3個

# 出力形式（この形式以外は書かない）
===1===
（投稿1）
===2===
（投稿2）
===3===
（投稿3）
"""


def format_indicators(indicators: list[dict]) -> str:
    if not indicators:
        return "（取得できず）"
    return "\n".join(f"- {i['label']}: {i['value']}（前回 {i['prev']}、{i['date']}）" for i in indicators)


def generate_posts(indicators: list[dict], prices: dict) -> list[str]:
    prompt = PROMPT.format(
        indicators=format_indicators(indicators),
        prices="\n".join(f"- {k}: {v}" for k, v in prices.items()) or "（取得できず）",
        max_chars=THREADS_MAX_CHARS - len(DISCLAIMER) - 2,
    )
    r = requests.post(
        "https://api.anthropic.com/v1/messages",
        headers={
            "x-api-key": os.environ["ANTHROPIC_API_KEY"],
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        json={
            "model": CLAUDE_MODEL,
            "max_tokens": 2000,
            "messages": [{"role": "user", "content": prompt}],
        },
        timeout=120,
    )
    r.raise_for_status()
    text = "".join(b.get("text", "") for b in r.json()["content"])
    posts = parse_posts(text)
    if len(posts) != 3:
        raise RuntimeError(f"投稿文の形式が想定外です:\n{text}")
    posts[-1] = f"{posts[-1]}\n\n{DISCLAIMER}"
    return posts


def parse_posts(text: str) -> list[str]:
    parts = re.split(r"^===\d+===\s*$", text, flags=re.MULTILINE)
    return [p.strip() for p in parts[1:] if p.strip()]


# ══════════════════════════════════════════════════════════
# STEP 3: 下書きの保存・読み込み
# ══════════════════════════════════════════════════════════

def draft_path(day: str) -> Path:
    return OUTPUT_DIR / f"{day}.md"


def save_draft(day: str, posts: list[str], indicators: list[dict], prices: dict) -> Path:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    body = "\n\n".join(f"===投稿{n}===\n{p}" for n, p in enumerate(posts, 1))
    content = f"""---
date: {day}
updated: {day}
tags: [market-outlook, threads, draft]
status: draft
---

# 市場見通し {day}

投稿は「===投稿N===」の区切りごとに Threads へ連投されます。直してから publish してください。

## 投稿文

{body}

===END===

## 使ったデータ

{format_indicators(indicators)}

価格: {", ".join(f"{k} {v}" for k, v in prices.items())}
"""
    path = draft_path(day)
    path.write_text(content, encoding="utf-8")
    return path


def load_draft(day: str) -> list[str]:
    path = draft_path(day)
    if not path.exists():
        sys.exit(f"下書きがありません: {path}")
    text = path.read_text(encoding="utf-8")
    if "status: posted" in text:
        sys.exit(f"この下書きは投稿済みです: {path}")
    section = text.split("## 投稿文", 1)[-1].split("===END===", 1)[0]
    posts = [p.strip() for p in re.split(r"^===投稿\d+===\s*$", section, flags=re.MULTILINE)[1:] if p.strip()]
    for n, p in enumerate(posts, 1):
        if len(p) > THREADS_MAX_CHARS:
            sys.exit(f"投稿{n} が {len(p)} 文字で、上限 {THREADS_MAX_CHARS} 文字を超えています。下書きを短くしてください。")
    return posts


def mark_posted(day: str, ids: list[str]):
    path = draft_path(day)
    text = path.read_text(encoding="utf-8").replace("status: draft", "status: posted", 1)
    text += f"\n投稿ID: {', '.join(ids)}（{datetime.now(JST):%Y-%m-%d %H:%M} JST）\n"
    path.write_text(text, encoding="utf-8")


# ══════════════════════════════════════════════════════════
# STEP 4: Threads 投稿（スレッド形式）
# ══════════════════════════════════════════════════════════

def post_to_threads(posts: list[str]) -> list[str]:
    base_url = f"https://graph.threads.net/v1.0/{os.environ['THREADS_USER_ID']}"
    token = os.environ["THREADS_ACCESS_TOKEN"]
    published_ids = []

    for i, text in enumerate(posts):
        params = {"media_type": "TEXT", "text": text, "access_token": token}
        if published_ids:
            params["reply_to_id"] = published_ids[-1]
        r = requests.post(f"{base_url}/threads", params=params, timeout=30)
        r.raise_for_status()
        creation_id = r.json()["id"]
        time.sleep(2)
        r2 = requests.post(f"{base_url}/threads_publish",
                           params={"creation_id": creation_id, "access_token": token}, timeout=30)
        r2.raise_for_status()
        published_ids.append(r2.json()["id"])
        print(f"  Threads投稿{i+1}完了")
        time.sleep(3)

    return published_ids


# ══════════════════════════════════════════════════════════
# メイン
# ══════════════════════════════════════════════════════════

def make_draft(day: str) -> Path:
    require_env("ANTHROPIC_API_KEY", "FRED_API_KEY")
    print("経済指標を取得中...")
    indicators = fetch_indicators()
    print("価格を取得中...")
    try:
        prices = fetch_prices()
    except requests.RequestException as e:
        print(f"  価格取得失敗 ({e})")
        prices = {}
    if not indicators and not prices:
        sys.exit("データが1件も取れなかったので中止します。")
    print("Claude で投稿文を作成中...")
    posts = generate_posts(indicators, prices)
    path = save_draft(day, posts, indicators, prices)
    print(f"下書きを保存しました: {path}")
    return path


def publish(day: str):
    require_env("THREADS_ACCESS_TOKEN", "THREADS_USER_ID")
    posts = load_draft(day)
    ids = post_to_threads(posts)
    mark_posted(day, ids)
    print(f"投稿完了: {len(ids)}件")


def main():
    load_env()
    args = sys.argv[1:]
    mode = args[0] if args else "run"
    day = args[1] if len(args) > 1 else datetime.now(JST).date().isoformat()

    if mode == "draft":
        make_draft(day)
    elif mode == "publish":
        publish(day)
    elif mode == "run":
        make_draft(day)
        print("\n" + "=" * 50)
        for n, p in enumerate(load_draft(day), 1):
            print(f"\n【投稿{n}】（{len(p)}文字）\n{p}")
        print("\n" + "=" * 50)
        if input("\nThreads に投稿しますか？ (y/n): ").strip().lower() == "y":
            publish(day)
        else:
            print(f"投稿しませんでした。直してから投稿するには: python scripts/market_outlook_post.py publish {day}")
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
