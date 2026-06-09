"""
Notion Daily Sync
毎日1回、「AIに覚えさせたいリスト」の未処理URLを処理します。

処理フロー:
  1. ステータスが「未処理」のエントリを取得
  2. URLの内容をフェッチ
  3. Claude Haiku で要約・カテゴリ自動分類
  4. タイトル・カテゴリ・詳細を自動入力
  5. Knowledge/ にMarkdownで保存
  6. ステータスを「保存済み」に更新
"""

import json
import os
import re
from datetime import datetime, timezone

import requests

NOTION_TOKEN = os.environ["NOTION_TOKEN"]
ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]

# AIに覚えさせたいリスト (data source ID)
INBOX_DB_ID = "f940de99-927b-497c-9818-1e736ed400f3"

HEADERS = {
    "Authorization": f"Bearer {NOTION_TOKEN}",
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
}

KNOWLEDGE_DIR = os.path.join(os.path.dirname(__file__), "..", "Knowledge")

CATEGORY_OPTIONS = [
    "株式・投資",
    "AI・テクノロジー",
    "YouTube・動画",
    "ビジネス",
    "政治・省庁",
    "生活・趣味",
    "その他",
]


# ── Notion API ────────────────────────────────────────────────

def get_unprocessed_items() -> list:
    url = f"https://api.notion.com/v1/databases/{INBOX_DB_ID}/query"
    payload = {"filter": {"property": "ステータス", "select": {"equals": "未処理"}}}
    res = requests.post(url, headers=HEADERS, json=payload, timeout=30)
    res.raise_for_status()
    return res.json().get("results", [])


def update_notion_page(page_id: str, props: dict):
    res = requests.patch(
        f"https://api.notion.com/v1/pages/{page_id}",
        headers=HEADERS,
        json={"properties": props},
        timeout=30,
    )
    res.raise_for_status()


def get_prop(page: dict, key: str) -> str:
    props = page.get("properties", {})
    prop = props.get(key, {})
    ptype = prop.get("type", "")
    if ptype == "title":
        items = prop.get("title", [])
        return items[0]["text"]["content"] if items else ""
    if ptype == "url":
        return prop.get("url") or ""
    if ptype == "select":
        sel = prop.get("select")
        return sel["name"] if sel else ""
    if ptype == "multi_select":
        return ", ".join(o["name"] for o in prop.get("multi_select", []))
    if ptype == "rich_text":
        items = prop.get("rich_text", [])
        return items[0]["text"]["content"] if items else ""
    return ""


# ── Web フェッチ ──────────────────────────────────────────────

def fetch_page_text(target_url: str) -> str:
    try:
        res = requests.get(
            target_url,
            timeout=15,
            headers={"User-Agent": "Mozilla/5.0 (compatible; RetratleBot/1.0)"},
        )
        res.raise_for_status()
        text = res.text
        text = re.sub(r"<script[^>]*>.*?</script>", "", text, flags=re.DOTALL)
        text = re.sub(r"<style[^>]*>.*?</style>", "", text, flags=re.DOTALL)
        text = re.sub(r"<[^>]+>", " ", text)
        text = re.sub(r"\s+", " ", text).strip()
        return text[:5000]
    except Exception as e:
        return f"[取得失敗: {e}]"


# ── Claude API ────────────────────────────────────────────────

def analyze_with_claude(target_url: str, raw_text: str, user_memo: str) -> dict:
    """
    URLの内容を分析し以下を返す:
      title      : 記事タイトル（日本語）
      category   : カテゴリ（CATEGORY_OPTIONS のいずれか）
      summary    : 3〜4行の要約
      points     : 箇条書きポイント（3〜5項目）
      application: AKATOSHIチャンネルへの活用アイデア（任意）
    """
    import anthropic

    categories_str = " / ".join(CATEGORY_OPTIONS)
    memo_section = f"\nユーザーメモ: {user_memo}" if user_memo else ""

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=800,
        messages=[
            {
                "role": "user",
                "content": f"""以下の記事を分析してJSON形式で出力してください。

URL: {target_url}{memo_section}

本文:
{raw_text}

## 出力形式（JSONのみ。余分なテキスト不要）
{{
  "title": "記事タイトル（日本語、30文字以内）",
  "category": "{categories_str} のいずれか1つ",
  "summary": "3〜4行の要約",
  "points": ["ポイント1", "ポイント2", "ポイント3"],
  "application": "AKATOSHIチャンネル（株式投資YouTube）への活用アイデア（関係薄い場合は空文字）"
}}""",
            }
        ],
    )

    text = message.content[0].text.strip()
    # JSONブロックの抽出
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        return json.loads(match.group())
    raise ValueError(f"JSON解析失敗: {text[:200]}")


# ── Obsidian 保存 ─────────────────────────────────────────────

def save_to_knowledge(analysis: dict, target_url: str) -> str:
    os.makedirs(KNOWLEDGE_DIR, exist_ok=True)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    slug = re.sub(r"[^\w぀-鿿]", "-", analysis["title"])[:40].strip("-")
    filename = f"{today}-{slug}.md"
    filepath = os.path.join(KNOWLEDGE_DIR, filename)

    tag_map = {
        "株式・投資": ["stocks", "investment"],
        "AI・テクノロジー": ["ai", "technology"],
        "YouTube・動画": ["youtube", "video"],
        "ビジネス": ["business"],
        "政治・省庁": ["news", "government"],
        "生活・趣味": ["lifestyle"],
        "その他": [],
    }
    tags = tag_map.get(analysis["category"], [])

    points_md = "\n".join(f"- {p}" for p in analysis.get("points", []))
    application = analysis.get("application", "")
    app_section = f"\n## AKATOSHIチャンネルへの活用\n{application}\n" if application else ""

    content = f"""---
date: {today}
tags: {json.dumps(tags, ensure_ascii=False)}
source: {target_url}
category: {analysis['category']}
project: akatoshi
---

# {analysis['title']}

## 要約
{analysis['summary']}

## ポイント
{points_md}
{app_section}"""

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"  [保存] Knowledge/{filename}")
    return filename


# ── メイン ────────────────────────────────────────────────────

def main():
    print(f"=== Notion Daily Sync: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} ===")

    items = get_unprocessed_items()
    if not items:
        print("未処理アイテムなし。終了します。")
        return

    print(f"未処理: {len(items)}件")

    for item in items:
        page_id = item["id"]
        # タイトル欄に直接URLが貼られた場合と、URLフィールドに入れた場合の両対応
        title_raw = get_prop(item, "タイトル")
        url_field = get_prop(item, "URL")
        user_memo = get_prop(item, "メモ")

        # URLの判定: URLフィールド優先、なければタイトル欄がURLかチェック
        target_url = url_field
        if not target_url and title_raw.startswith("http"):
            target_url = title_raw

        print(f"\n[処理] {title_raw or target_url or '（タイトルなし）'}")

        if not target_url:
            print("  URLなし → スキップ")
            continue

        # ステータス → 処理中
        update_notion_page(page_id, {"ステータス": {"select": {"name": "処理中"}}})

        try:
            raw_text = fetch_page_text(target_url)
            analysis = analyze_with_claude(target_url, raw_text, user_memo)
            filename = save_to_knowledge(analysis, target_url)

            # Notionを更新: タイトル・カテゴリ・詳細・ステータス・Obsidianファイル
            update_notion_page(
                page_id,
                {
                    "タイトル": {"title": [{"text": {"content": analysis["title"]}}]},
                    "カテゴリ": {
                        "multi_select": [{"name": analysis["category"]}]
                    },
                    "ステータス": {"select": {"name": "保存済み"}},
                    "Obsidianファイル": {
                        "rich_text": [{"text": {"content": f"Knowledge/{filename}"}}]
                    },
                },
            )
            print(f"  [完了] {analysis['title']} → {analysis['category']}")

        except Exception as e:
            print(f"  [エラー] {e}")
            update_notion_page(page_id, {"ステータス": {"select": {"name": "未処理"}}})

    print("\n=== 完了 ===")


if __name__ == "__main__":
    main()
