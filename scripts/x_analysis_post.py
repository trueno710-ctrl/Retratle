#!/usr/bin/env python3
"""
X投稿分析・自動投稿スクリプト
- 監視アカウント: @shikiho_10（参考・分析元）
- 投稿先アカウント: @FLUX22663176093（自分のアカウント）
- data/x-feed/ に蓄積された投稿をClaude APIで分析
- 投資有益情報をまとめて @FLUX22663176093 に自動投稿
- 分析メモをdata/x-posts/に保存（Obsidian連携）
"""

import os
import re
import json
import requests
from datetime import date, timedelta
from pathlib import Path

# ─── 設定 ────────────────────────────────────────────────
ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]
X_API_KEY         = os.environ["X_API_KEY"]
X_API_SECRET      = os.environ["X_API_SECRET"]
X_ACCESS_TOKEN    = os.environ["X_ACCESS_TOKEN"]
X_ACCESS_SECRET   = os.environ["X_ACCESS_SECRET"]

MONITOR_ACCOUNTS = ["shikiho_10"]   # 監視・分析するアカウント
POST_ACCOUNT     = "FLUX22663176093"  # 投稿先（自分のアカウント）
DATA_DIR   = Path("data/x-feed")
OUTPUT_DIR = Path("data/x-posts")

CLAUDE_MODEL = "claude-sonnet-4-6"


# ─── ツイート読み込み ────────────────────────────────────
def load_recent_tweets(days: int = 7) -> list[dict]:
    """直近N日分のツイートを全アカウントから読み込む"""
    cutoff = date.today() - timedelta(days=days)
    tweets = []

    for account in MONITOR_ACCOUNTS:
        folder = DATA_DIR / account
        if not folder.exists():
            continue
        for md_file in sorted(folder.glob("*.md")):
            try:
                file_date = date.fromisoformat(md_file.stem[:10])
            except ValueError:
                continue
            if file_date < cutoff:
                continue
            content = md_file.read_text(encoding="utf-8")
            tweets.append({
                "account": account,
                "date": file_date.isoformat(),
                "content": content,
            })

    return tweets


# ─── Claude API 分析 ─────────────────────────────────────
def analyze_with_claude(tweets: list[dict]) -> dict:
    """ツイートを分析して投資有益情報と投稿文を生成"""

    if not tweets:
        return {"summary": "今週の対象投稿なし", "post_text": None}

    tweets_text = "\n\n".join(
        f"【@{t['account']} / {t['date']}】\n{t['content']}"
        for t in tweets
    )

    prompt = f"""あなたは株式投資アナリストです。
以下は今週の @shikiho_10 のX投稿です。これを参考に、@FLUX22663176093 として投稿する内容を作成してください。

{tweets_text}

【タスク1】投資に役立つ情報をまとめてください（箇条書き、500字以内）
【タスク2】@FLUX22663176093 のアカウントでXに投稿する140字以内の日本語ツイートを1つ作成してください。
  - @shikiho_10 の内容を参考にしつつ、独自の考察・視点を加える
  - 具体的な銘柄・テーマ・数値を含める
  - 「#テンバガー #株式投資 #四季報」のハッシュタグを末尾に付ける
  - @shikiho_10 の投稿をそのままコピーせず、自分の言葉でまとめる

以下のJSON形式で返してください：
{{
  "summary": "まとめ文章",
  "post_text": "140字以内のツイート文",
  "tickers": ["1234", "5678"],
  "themes": ["テーマ1", "テーマ2"]
}}"""

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

    raw = resp.json()["content"][0]["text"]

    # JSON部分を抽出
    match = re.search(r"\{[\s\S]+\}", raw)
    if match:
        return json.loads(match.group())
    return {"summary": raw, "post_text": None}


# ─── X 投稿（OAuth 1.0a） ────────────────────────────────
def post_to_x(text: str) -> dict:
    """X APIでツイートを投稿"""
    import hmac
    import hashlib
    import base64
    import time
    import urllib.parse
    import secrets

    url = "https://api.twitter.com/2/tweets"
    timestamp = str(int(time.time()))
    nonce = secrets.token_hex(16)

    oauth_params = {
        "oauth_consumer_key": X_API_KEY,
        "oauth_nonce": nonce,
        "oauth_signature_method": "HMAC-SHA1",
        "oauth_timestamp": timestamp,
        "oauth_token": X_ACCESS_TOKEN,
        "oauth_version": "1.0",
    }

    # シグネチャ生成
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
    signature = base64.b64encode(
        hmac.new(signing_key.encode(), base_str.encode(), hashlib.sha1).digest()
    ).decode()

    oauth_params["oauth_signature"] = signature
    auth_header = "OAuth " + ", ".join(
        f'{urllib.parse.quote(k, safe="")}="{urllib.parse.quote(v, safe="")}"'
        for k, v in sorted(oauth_params.items())
    )

    resp = requests.post(
        url,
        headers={"Authorization": auth_header, "Content-Type": "application/json"},
        json={"text": text},
    )
    resp.raise_for_status()
    return resp.json()


# ─── Obsidian 用メモ保存 ──────────────────────────────────
def save_analysis_memo(analysis: dict, tweet_count: int):
    today = date.today().isoformat()
    output_path = OUTPUT_DIR / f"{today}-analysis.md"

    tickers = ", ".join(analysis.get("tickers", []))
    themes  = ", ".join(analysis.get("themes", []))
    post    = analysis.get("post_text", "（投稿なし）")
    summary = analysis.get("summary", "")

    content = f"""---
date: {today}
tags: [x-analysis, 株式投資, 自動生成]
monitor_account: "@shikiho_10"
post_account: "@FLUX22663176093"
tickers: [{tickers}]
themes: [{themes}]
---

# X投稿分析 {today}

分析対象: {tweet_count}件のツイート

## まとめ

{summary}

## 自動投稿したツイート

> {post}

---
*自動生成 by Claude API*
"""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_path.write_text(content, encoding="utf-8")
    print(f"メモ保存: {output_path}")


# ─── メイン ──────────────────────────────────────────────
def main():
    print("直近7日分のツイートを読み込み中...")
    tweets = load_recent_tweets(days=7)
    print(f"  {len(tweets)}件取得")

    print("Claude APIで分析中...")
    analysis = analyze_with_claude(tweets)
    print(f"  まとめ生成完了")

    save_analysis_memo(analysis, len(tweets))

    post_text = analysis.get("post_text")
    if post_text:
        print(f"Xに投稿中...\n  「{post_text}」")
        result = post_to_x(post_text)
        print(f"  投稿完了: {result}")
    else:
        print("投稿文なし（スキップ）")

    print("完了！")


if __name__ == "__main__":
    main()
