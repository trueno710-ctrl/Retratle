#!/usr/bin/env python3
"""
AI株式ピッカー + Claude Code情報収集
・@shikiho_10 の過去選定銘柄から投資基準を学習し、同じパターンの新銘柄を自動発掘 → @FLUX22663176093 に投稿
・@ClaudeCode_love の最新投稿を収集 → Obsidian Knowledge/ に自動保存
"""

import os
import re
import json
import time
import hmac
import hashlib
import base64
import secrets
import urllib.parse
import requests
from datetime import date, datetime, timedelta
from pathlib import Path

# ─── 設定 ────────────────────────────────────────────────
ANTHROPIC_API_KEY   = os.environ["ANTHROPIC_API_KEY"]
X_API_KEY           = os.environ["X_API_KEY"]
X_API_SECRET        = os.environ["X_API_SECRET"]
X_ACCESS_TOKEN      = os.environ["X_ACCESS_TOKEN"]
X_ACCESS_SECRET     = os.environ["X_ACCESS_SECRET"]
X_BEARER_TOKEN      = os.environ.get("X_BEARER_TOKEN", "")
JQUANTS_REFRESH_TOKEN = os.environ.get("JQUANTS_REFRESH_TOKEN", "")
JQUANTS_EMAIL       = os.environ.get("JQUANTS_EMAIL", "")
JQUANTS_PASSWORD    = os.environ.get("JQUANTS_PASSWORD", "")
NOTION_TOKEN        = os.environ.get("NOTION_TOKEN", "")

# Obsidianボルトパス（環境変数で上書き可）
OBSIDIAN_VAULT      = Path(os.environ.get(
    "OBSIDIAN_VAULT_PATH",
    r"C:\Users\truen\OneDrive\デスクトップ"
))

NOTION_DS_ID   = "8f7b14d0-2e0f-4f24-b0a8-2b2e467c9a37"   # @shikiho_10 DB
FEED_DIR       = Path("data/x-feed/shikiho_10")
OUTPUT_DIR     = Path("data/x-posts")
CLAUDE_MODEL   = "claude-sonnet-4-6"
JQUANTS_BASE   = "https://api.jquants.com/v1"
NOTION_BASE    = "https://api.notion.com/v1"
X_API_BASE     = "https://api.twitter.com/2"

# @ClaudeCode_love の収集設定
CLCODE_USERNAME   = "ClaudeCode_love"
CLCODE_MAX_POSTS  = 20  # 1回の収集件数上限


# ══════════════════════════════════════════════════════════
# STEP 1: @shikiho_10 の選定銘柄データを収集
# ══════════════════════════════════════════════════════════

def load_notion_stocks() -> list[dict]:
    """Notion DBから既存の選定銘柄を取得"""
    if not NOTION_TOKEN:
        return []
    headers = {
        "Authorization": f"Bearer {NOTION_TOKEN}",
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
    }
    resp = requests.post(
        f"{NOTION_BASE}/databases/{NOTION_DS_ID.replace('-','')}/query",
        headers=headers,
        json={"page_size": 100},
    )
    if not resp.ok:
        print(f"Notion取得失敗: {resp.status_code}")
        return []

    stocks = []
    for page in resp.json().get("results", []):
        props = page.get("properties", {})
        def get_num(key):
            n = props.get(key, {}).get("number")
            return n

        def get_text(key):
            rich = props.get(key, {}).get("rich_text", [])
            return rich[0]["plain_text"] if rich else ""

        def get_title(key):
            title = props.get(key, {}).get("title", [])
            return title[0]["plain_text"] if title else ""

        def get_select(key):
            s = props.get(key, {}).get("select")
            return s["name"] if s else ""

        def get_multi(key):
            return [o["name"] for o in props.get(key, {}).get("multi_select", [])]

        def get_check(key):
            return props.get(key, {}).get("checkbox", False)

        stocks.append({
            "name":            get_title("銘柄名"),
            "code":            get_text("コード"),
            "shikiho":         get_select("四季報号"),
            "market_cap":      get_num("時価総額_億円"),
            "per":             get_num("PER予"),
            "pbr":             get_num("PBR"),
            "mix":             get_num("ミックス係数"),
            "roe":             get_num("ROE予_%"),
            "roa":             get_num("ROA予_%"),
            "equity_ratio":    get_num("自己資本比率_%"),
            "dividend":        get_num("配当利回り_%"),
            "zero_debt":       get_check("有利子負債ゼロ"),
            "themes":          get_multi("テーマ"),
            "achieved_2x":     get_check("2バガー達成"),
        })
    return [s for s in stocks if s["name"]]


def load_feed_posts(days: int = 180) -> list[str]:
    """data/x-feed/shikiho_10 から過去N日分の投稿を読み込む"""
    if not FEED_DIR.exists():
        return []
    cutoff = date.today() - timedelta(days=days)
    posts = []
    for f in sorted(FEED_DIR.glob("*.md")):
        try:
            d = date.fromisoformat(f.stem[:10])
        except ValueError:
            continue
        if d >= cutoff:
            posts.append(f.read_text(encoding="utf-8"))
    return posts


# ══════════════════════════════════════════════════════════
# STEP 2: Claude でパターン抽出
# ══════════════════════════════════════════════════════════

def extract_criteria(stocks: list[dict], posts: list[str]) -> dict:
    """@shikiho_10 の選定パターンをClaude AIで抽出"""

    stocks_text = json.dumps(stocks, ensure_ascii=False, indent=2)
    posts_text  = "\n\n---\n\n".join(posts[:30]) if posts else "（投稿データなし）"

    prompt = f"""あなたは株式投資の分析専門家です。
以下は @shikiho_10 が選定した銘柄データとX投稿です。

## 選定銘柄データ（Notion DB）
{stocks_text}

## 過去のX投稿（抜粋）
{posts_text}

これらの銘柄に共通する投資選定基準を分析し、以下のJSON形式で返してください：

{{
  "criteria": {{
    "market_cap_max": 数値（億円）,
    "mix_coeff_max": 数値（PER×PBR上限）,
    "mix_coeff_excellent": 数値（◎の基準），
    "roe_min": 数値（%）,
    "roa_min": 数値（%）,
    "equity_ratio_min": 数値（%）,
    "prefer_zero_debt": true/false,
    "target_multiple": 数値（何倍狙いか）
  }},
  "theme_keywords": ["テーマ1", "テーマ2", ...],
  "pattern_summary": "選定パターンの説明（200字以内）",
  "key_insights": ["特徴1", "特徴2", "特徴3"]
}}"""

    resp = _call_claude(prompt)
    match = re.search(r"\{[\s\S]+\}", resp)
    if match:
        return json.loads(match.group())

    # フォールバック: 既知の基準
    return {
        "criteria": {
            "market_cap_max": 500,
            "mix_coeff_max": 10,
            "mix_coeff_excellent": 5,
            "roe_min": 5.0,
            "roa_min": 3.0,
            "equity_ratio_min": 40.0,
            "prefer_zero_debt": True,
            "target_multiple": 2,
        },
        "theme_keywords": ["国策", "インフラ", "AI", "半導体", "DX", "省エネ", "国土強靭化"],
        "pattern_summary": "時価総額500億以下・ミックス係数≤10・高自己資本・無借金の割安成長株",
        "key_insights": [],
    }


# ══════════════════════════════════════════════════════════
# STEP 3: J-Quants で新候補銘柄をスクリーニング
# ══════════════════════════════════════════════════════════

def jquants_token() -> str:
    if JQUANTS_REFRESH_TOKEN:
        try:
            r = requests.post(
                f"{JQUANTS_BASE}/token/auth_refresh",
                params={"refreshtoken": JQUANTS_REFRESH_TOKEN},
            )
            r.raise_for_status()
            return r.json()["idToken"]
        except Exception:
            pass
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
    """上場銘柄一覧を取得"""
    r = requests.get(
        f"{JQUANTS_BASE}/listed/info",
        headers={"Authorization": f"Bearer {token}"},
    )
    r.raise_for_status()
    return r.json().get("info", [])


def fetch_financials(token: str, code: str) -> dict:
    """財務情報を取得"""
    r = requests.get(
        f"{JQUANTS_BASE}/fins/statements",
        headers={"Authorization": f"Bearer {token}"},
        params={"code": code},
    )
    if not r.ok:
        return {}
    data = r.json().get("statements", [])
    return data[-1] if data else {}


def fetch_price(token: str, code: str) -> dict:
    """最新株価・PER・PBRを取得"""
    today = date.today().strftime("%Y-%m-%d")
    from_d = (date.today() - timedelta(days=5)).strftime("%Y-%m-%d")
    r = requests.get(
        f"{JQUANTS_BASE}/prices/daily_quotes",
        headers={"Authorization": f"Bearer {token}"},
        params={"code": code, "from": from_d, "to": today},
    )
    if not r.ok:
        return {}
    quotes = r.json().get("daily_quotes", [])
    return quotes[-1] if quotes else {}


def screen_candidates(
    token: str,
    criteria: dict,
    known_codes: set[str],
    max_candidates: int = 10,
) -> list[dict]:
    """基準に合う新候補銘柄をスクリーニング"""

    c = criteria["criteria"]
    print("上場銘柄一覧取得中...")
    all_stocks = fetch_listed_info(token)

    # 東証プライム・スタンダードに絞る
    targets = [
        s for s in all_stocks
        if s.get("MarketCodeName") in ("プライム", "スタンダード")
        and s.get("Code") not in known_codes
    ]
    print(f"  対象: {len(targets)}銘柄（既知{len(known_codes)}銘柄を除外）")

    candidates = []
    checked = 0

    for stock in targets:
        code = stock.get("Code", "")
        if not code:
            continue

        price_data = fetch_price(token, code)
        if not price_data:
            continue

        # 時価総額チェック（概算）
        close   = price_data.get("Close", 0) or 0
        shares  = price_data.get("TradingVolume", 0)  # 近似値
        per     = price_data.get("PER", 0) or 0
        pbr     = price_data.get("PBR", 0) or 0
        market_cap_approx = price_data.get("MarketCapitalization", 0) or 0

        if market_cap_approx == 0:
            continue
        market_cap_bil = market_cap_approx / 1e8

        # フィルタリング
        if market_cap_bil > c["market_cap_max"]:
            continue
        if per <= 0 or pbr <= 0:
            continue

        mix = per * pbr
        if mix > c["mix_coeff_max"]:
            continue

        # 財務情報取得（通過銘柄のみ）
        fin = fetch_financials(token, code)
        equity_ratio = float(fin.get("EquityRatio", 0) or 0)
        roe = float(fin.get("ROE", 0) or 0)
        roa = float(fin.get("ROA", 0) or 0)

        if equity_ratio < c["equity_ratio_min"]:
            continue
        if roe < c["roe_min"]:
            continue

        score = _score_stock(mix, c, roe, roa, equity_ratio)

        candidates.append({
            "code":         code,
            "name":         stock.get("CompanyName", ""),
            "sector":       stock.get("Sector33CodeName", ""),
            "market":       stock.get("MarketCodeName", ""),
            "market_cap":   round(market_cap_bil, 1),
            "per":          round(per, 2),
            "pbr":          round(pbr, 2),
            "mix":          round(mix, 2),
            "roe":          round(roe, 1),
            "roa":          round(roa, 1),
            "equity_ratio": round(equity_ratio, 1),
            "score":        score,
        })
        checked += 1
        if checked % 50 == 0:
            print(f"  {checked}銘柄チェック済... 候補{len(candidates)}件")
        if len(candidates) >= max_candidates * 3:
            break
        time.sleep(0.1)  # API制限対策

    candidates.sort(key=lambda x: x["score"], reverse=True)
    return candidates[:max_candidates]


def _score_stock(mix: float, c: dict, roe: float, roa: float, equity_ratio: float) -> float:
    """スコアリング（高いほど @shikiho_10 の選定基準に近い）"""
    score = 0.0
    if mix <= c["mix_coeff_excellent"]:
        score += 30
    elif mix <= c["mix_coeff_max"]:
        score += 15
    if roe >= 10:
        score += 20
    elif roe >= c["roe_min"]:
        score += 10
    if roa >= 5:
        score += 15
    elif roa >= c["roa_min"]:
        score += 8
    if equity_ratio >= 70:
        score += 20
    elif equity_ratio >= c["equity_ratio_min"]:
        score += 10
    return score


# ══════════════════════════════════════════════════════════
# STEP 4: 投稿文生成・X投稿
# ══════════════════════════════════════════════════════════

def generate_post(candidates: list[dict], criteria: dict) -> str:
    """Claude で投稿文を生成"""
    if not candidates:
        return ""

    top = candidates[:3]
    cands_text = json.dumps(top, ensure_ascii=False, indent=2)
    pattern = criteria.get("pattern_summary", "")

    prompt = f"""あなたは株式投資家として @FLUX22663176093 のXアカウントで投稿します。

@shikiho_10 の選定パターン: {pattern}

同じ基準でスクリーニングした新候補銘柄:
{cands_text}

以下の条件でXの投稿文を作成してください:
- 140字以内の日本語
- 銘柄コードと銘柄名を含める
- ミックス係数やROEなど具体的な数値を1〜2個入れる
- 「@shikiho_10 式スクリーニング」という言葉を入れる
- 末尾に「#テンバガー #株式投資」を付ける
- 断定せず「注目」「候補」などの表現を使う

投稿文のみ返してください（説明不要）。"""

    return _call_claude(prompt).strip()


def _call_claude(prompt: str) -> str:
    resp = requests.post(
        "https://api.anthropic.com/v1/messages",
        headers={
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        json={
            "model": CLAUDE_MODEL,
            "max_tokens": 1024,
            "messages": [{"role": "user", "content": prompt}],
        },
    )
    resp.raise_for_status()
    return resp.json()["content"][0]["text"]


def post_to_x(text: str) -> dict:
    url = "https://api.twitter.com/2/tweets"
    timestamp = str(int(time.time()))
    nonce = secrets.token_hex(16)
    oauth_params = {
        "oauth_consumer_key":     X_API_KEY,
        "oauth_nonce":            nonce,
        "oauth_signature_method": "HMAC-SHA1",
        "oauth_timestamp":        timestamp,
        "oauth_token":            X_ACCESS_TOKEN,
        "oauth_version":          "1.0",
    }
    param_str = "&".join(
        f"{urllib.parse.quote(k, safe='')}={urllib.parse.quote(v, safe='')}"
        for k, v in sorted(oauth_params.items())
    )
    base_str = "&".join([
        "POST",
        urllib.parse.quote(url, safe=""),
        urllib.parse.quote(param_str, safe=""),
    ])
    signing_key = "&".join([
        urllib.parse.quote(X_API_SECRET, safe=""),
        urllib.parse.quote(X_ACCESS_SECRET, safe=""),
    ])
    sig = base64.b64encode(
        hmac.new(signing_key.encode(), base_str.encode(), hashlib.sha1).digest()
    ).decode()
    oauth_params["oauth_signature"] = sig
    auth_header = "OAuth " + ", ".join(
        f'{urllib.parse.quote(k, safe="")}="{urllib.parse.quote(v, safe="")}"'
        for k, v in sorted(oauth_params.items())
    )
    r = requests.post(
        url,
        headers={"Authorization": auth_header, "Content-Type": "application/json"},
        json={"text": text},
    )
    r.raise_for_status()
    return r.json()


# ══════════════════════════════════════════════════════════
# STEP 5a: @ClaudeCode_love 投稿収集 → Obsidian 保存
# ══════════════════════════════════════════════════════════

def _x_bearer_headers() -> dict:
    """X API v2 用 Bearer ヘッダー"""
    if not X_BEARER_TOKEN:
        raise RuntimeError("X_BEARER_TOKEN が未設定です（.env に追加してください）")
    return {"Authorization": f"Bearer {X_BEARER_TOKEN}"}


def fetch_clcode_user_id() -> str:
    """@ClaudeCode_love のユーザーIDを取得"""
    r = requests.get(
        f"{X_API_BASE}/users/by/username/{CLCODE_USERNAME}",
        headers=_x_bearer_headers(),
        params={"user.fields": "id,name,description"},
    )
    r.raise_for_status()
    return r.json()["data"]["id"]


def fetch_clcode_posts(user_id: str, since_days: int = 7) -> list[dict]:
    """
    @ClaudeCode_love の直近N日分の投稿を取得。
    X API v2 の GET /2/users/:id/tweets を使用。
    """
    since_dt = (datetime.utcnow() - timedelta(days=since_days)).strftime(
        "%Y-%m-%dT%H:%M:%SZ"
    )
    params = {
        "max_results": CLCODE_MAX_POSTS,
        "start_time": since_dt,
        "tweet.fields": "created_at,text,public_metrics,entities",
        "exclude": "retweets,replies",
    }
    r = requests.get(
        f"{X_API_BASE}/users/{user_id}/tweets",
        headers=_x_bearer_headers(),
        params=params,
    )
    r.raise_for_status()
    return r.json().get("data", [])


def summarize_clcode_posts(posts: list[dict]) -> str:
    """Claude で投稿群をまとめ、Retratle改善提案を付ける"""
    posts_text = "\n\n".join(
        f"[{p.get('created_at','')}]\n{p['text']}" for p in posts
    )
    prompt = f"""以下は @ClaudeCode_love（Claude Code Studio）の最新X投稿です。

{posts_text}

次の2点を日本語でまとめてください：

## 1. 今週の主なトピック（箇条書き5件以内）

## 2. Retratle（Next.jsアプリ）に取り入れられる技術・機能の提案（3件）
各提案は「機能名: 概要（1〜2文）」の形式で。"""

    return _call_claude(prompt).strip()


def save_clcode_to_obsidian(posts: list[dict], summary: str) -> Path:
    """
    収集した @ClaudeCode_love 投稿と要約を
    Obsidian の Knowledge/ フォルダに保存する。
    スクリプトをローカル実行した場合のみ実際に書き込まれる。
    """
    today = date.today().isoformat()
    knowledge_dir = OBSIDIAN_VAULT / "Knowledge"
    knowledge_dir.mkdir(parents=True, exist_ok=True)

    filepath = knowledge_dir / f"claude-code-studio-{today}.md"

    # 投稿一覧をMarkdownリストに変換
    posts_md = "\n\n".join(
        f"### {p.get('created_at', '')[:10]}\n{p['text']}\n"
        f"❤️ {p.get('public_metrics', {}).get('like_count', 0)}  "
        f"🔁 {p.get('public_metrics', {}).get('retweet_count', 0)}  "
        f"👁 {p.get('public_metrics', {}).get('impression_count', 0)}"
        for p in posts
    )

    content = f"""---
date: {today}
tags: [claude-code, 技術収集, ClaudeCode_love, 自動収集]
source: "@ClaudeCode_love on X"
related: [[Knowledge/mistakes]]
---

# @ClaudeCode_love 収集メモ {today}

{summary}

---

## 収集投稿一覧（直近7日）

{posts_md}

---
*x_analysis_post.py により自動収集*
"""
    filepath.write_text(content, encoding="utf-8")
    print(f"Obsidian保存完了: {filepath}")
    return filepath


# ══════════════════════════════════════════════════════════
# STEP 5b: Obsidian 用メモ保存（株式ピッカー結果）
# ══════════════════════════════════════════════════════════

def save_to_obsidian(criteria: dict, candidates: list[dict], post_text: str):
    today = date.today().isoformat()
    # Obsidianボルトの Knowledge/ に保存。ローカル実行時のみ書き込まれる
    knowledge_dir = OBSIDIAN_VAULT / "Knowledge"
    knowledge_dir.mkdir(parents=True, exist_ok=True)
    path = knowledge_dir / f"stock-picks-{today}.md"
    # フォールバック: ボルトパスが存在しない場合はローカルに保存
    if not (OBSIDIAN_VAULT / "Knowledge").exists():
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        path = OUTPUT_DIR / f"{today}-stock-picks.md"

    c = criteria.get("criteria", {})
    themes = ", ".join(criteria.get("theme_keywords", []))
    insights = "\n".join(f"- {i}" for i in criteria.get("key_insights", []))
    pattern = criteria.get("pattern_summary", "")

    rows = "\n".join(
        f"| {s['code']} | {s['name']} | {s['market_cap']}億 | "
        f"{s['per']} | {s['pbr']} | {s['mix']} | "
        f"{s['roe']}% | {s['equity_ratio']}% | {s['score']} |"
        for s in candidates
    )

    content = f"""---
date: {today}
tags: [stock-picks, AI-screener, shikiho10-pattern]
pattern: "{pattern}"
market_cap_max: {c.get('market_cap_max')}
mix_coeff_max: {c.get('mix_coeff_max')}
---

# @shikiho_10 式AIスクリーニング結果 {today}

## 抽出された選定パターン

{pattern}

### 主な基準
- 時価総額: {c.get('market_cap_max')}億円以下
- ミックス係数: {c.get('mix_coeff_max')}以下（◎は{c.get('mix_coeff_excellent')}以下）
- ROE: {c.get('roe_min')}%以上 / ROA: {c.get('roa_min')}%以上
- 自己資本比率: {c.get('equity_ratio_min')}%以上
- 注目テーマ: {themes}

### 特徴
{insights}

## 新候補銘柄（スクリーニング結果）

| コード | 銘柄名 | 時価総額 | PER | PBR | ミックス | ROE | 自己資本比率 | スコア |
|---|---|---|---|---|---|---|---|---|
{rows}

## 自動投稿した内容（@FLUX22663176093）

> {post_text}

---
*@shikiho_10 の選定銘柄パターンをClaude AIが学習・応用*
"""
    path.write_text(content, encoding="utf-8")
    print(f"Obsidianメモ保存: {path}")


# ══════════════════════════════════════════════════════════
# メイン
# ══════════════════════════════════════════════════════════

def main():
    print("=== @shikiho_10 式AI株式ピッカー + Claude Code情報収集 起動 ===\n")

    # Step 1: データ収集
    print("【STEP 1】選定銘柄データ収集中...")
    stocks = load_notion_stocks()
    posts  = load_feed_posts(days=180)
    print(f"  Notion: {len(stocks)}銘柄 / X投稿: {len(posts)}件")

    # Step 2: パターン抽出
    print("\n【STEP 2】Claude AIでパターン抽出中...")
    criteria = extract_criteria(stocks, posts)
    print(f"  パターン: {criteria.get('pattern_summary', '')}")

    # Step 3: スクリーニング
    print("\n【STEP 3】J-Quantsで新候補銘柄スクリーニング中...")
    known_codes = {s["code"] for s in stocks if s.get("code")}
    token = jquants_token()
    candidates = screen_candidates(token, criteria, known_codes)
    print(f"  候補: {len(candidates)}銘柄")
    for c in candidates[:3]:
        print(f"  → {c['code']} {c['name']} MC:{c['market_cap']}億 Mix:{c['mix']} スコア:{c['score']}")

    # Step 4: 投稿
    print("\n【STEP 4】投稿文生成・X投稿中...")
    post_text = generate_post(candidates, criteria)
    print(f"  投稿文: {post_text}")
    if post_text:
        result = post_to_x(post_text)
        print(f"  投稿完了: {result}")

    # Step 5a: @ClaudeCode_love 投稿収集 → Obsidian
    print("\n【STEP 5a】@ClaudeCode_love 投稿収集中...")
    try:
        clcode_user_id = fetch_clcode_user_id()
        clcode_posts   = fetch_clcode_posts(clcode_user_id, since_days=7)
        print(f"  取得: {len(clcode_posts)}件")
        if clcode_posts:
            summary = summarize_clcode_posts(clcode_posts)
            saved_path = save_clcode_to_obsidian(clcode_posts, summary)
            print(f"  要約:\n{summary[:200]}...")
    except RuntimeError as e:
        print(f"  スキップ（{e}）")
    except Exception as e:
        print(f"  エラー（{e}）— 株式ピッカー処理は継続")

    # Step 5b: 株式スクリーニング結果 → Obsidian
    print("\n【STEP 5b】Obsidianメモ保存中（株式ピッカー結果）...")
    save_to_obsidian(criteria, candidates, post_text)

    print("\n=== 完了 ===")


if __name__ == "__main__":
    main()
