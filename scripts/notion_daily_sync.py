"""
Notion Daily Sync
毎日1回、「AIに覚えさせたいリスト」の未処理URLを取得→要約→Knowledge/に保存します。
"""

import json
import os
import re
import sys
from datetime import datetime, timezone

import requests

NOTION_TOKEN = os.environ["NOTION_TOKEN"]
# AIに覚えさせたいリスト (data source ID)
INBOX_DB_ID = "f940de99-927b-497c-9818-1e736ed400f3"

HEADERS = {
    "Authorization": f"Bearer {NOTION_TOKEN}",
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
}

KNOWLEDGE_DIR = os.path.join(os.path.dirname(__file__), "..", "Knowledge")


def get_unprocessed_items():
    """未処理のURLリストを取得する。"""
    url = f"https://api.notion.com/v1/databases/{INBOX_DB_ID}/query"
    payload = {
        "filter": {
            "property": "ステータス",
            "select": {"equals": "未処理"},
        }
    }
    res = requests.post(url, headers=HEADERS, json=payload, timeout=30)
    res.raise_for_status()
    return res.json().get("results", [])


def fetch_page_text(target_url: str) -> str:
    """URLのテキスト内容を取得する（最大5000文字）。"""
    try:
        res = requests.get(
            target_url,
            timeout=15,
            headers={"User-Agent": "Mozilla/5.0 (compatible; RetratleBot/1.0)"},
        )
        res.raise_for_status()
        text = res.text

        # HTMLタグを簡易除去
        text = re.sub(r"<script[^>]*>.*?</script>", "", text, flags=re.DOTALL)
        text = re.sub(r"<style[^>]*>.*?</style>", "", text, flags=re.DOTALL)
        text = re.sub(r"<[^>]+>", " ", text)
        text = re.sub(r"\s+", " ", text).strip()
        return text[:5000]
    except Exception as e:
        return f"[取得失敗: {e}]"


def summarize_with_claude(title: str, url: str, text: str, category: str) -> str:
    """Claude APIを使って記事を要約する。"""
    try:
        import anthropic

        client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
        category_hint = ""
        if "株式" in category or "投資" in category:
            category_hint = "\n\nAKATOSHI（株式投資YouTubeチャンネル）への活用アイデアも1〜2行で提案してください。"

        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=600,
            messages=[
                {
                    "role": "user",
                    "content": f"以下の記事を日本語で要約してください。\n\nタイトル: {title}\nURL: {url}\n\n本文:\n{text}\n\n## 出力形式\n**要約**（3〜4行）\n\n**ポイント**\n- ポイント1\n- ポイント2\n- ポイント3{category_hint}",
                }
            ],
        )
        return message.content[0].text
    except Exception as e:
        return f"要約失敗: {e}\n\n取得テキスト冒頭:\n{text[:500]}"


def save_to_knowledge(title: str, url: str, summary: str, category: str, memo: str) -> str:
    """Obsidian Knowledge/フォルダに保存してファイル名を返す。"""
    os.makedirs(KNOWLEDGE_DIR, exist_ok=True)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # ファイル名: 日付-タイトルのスラッグ
    slug = re.sub(r"[^\w぀-鿿]", "-", title)[:40].strip("-")
    filename = f"{today}-{slug}.md"
    filepath = os.path.join(KNOWLEDGE_DIR, filename)

    tags = []
    if "株式" in category or "投資" in category:
        tags += ["stocks", "investment"]
    if "AI" in category:
        tags += ["ai", "technology"]
    if "YouTube" in category or "動画" in category:
        tags += ["youtube", "video"]
    if "省庁" in category or "ニュース" in category:
        tags += ["news", "government"]

    content = f"""---
date: {today}
tags: {json.dumps(tags, ensure_ascii=False)}
source: {url}
category: {category}
project: akatoshi
---

# {title}

{summary}
"""
    if memo:
        content += f"\n## メモ\n{memo}\n"

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"  [保存] Knowledge/{filename}")
    return filename


def update_notion_status(page_id: str, filename: str):
    """Notionのステータスを「保存済み」に更新する。"""
    url = f"https://api.notion.com/v1/pages/{page_id}"
    payload = {
        "properties": {
            "ステータス": {"select": {"name": "保存済み"}},
            "Obsidianファイル": {"rich_text": [{"text": {"content": f"Knowledge/{filename}"}}]},
        }
    }
    res = requests.patch(url, headers=HEADERS, json=payload, timeout=30)
    res.raise_for_status()


def get_prop(page, key: str) -> str:
    """Notionページのプロパティ値を安全に取得する。"""
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


def main():
    print(f"=== Notion Daily Sync: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} ===")

    items = get_unprocessed_items()
    if not items:
        print("未処理アイテムなし。スキップします。")
        return

    print(f"未処理アイテム: {len(items)}件")

    for item in items:
        page_id = item["id"]
        title = get_prop(item, "タイトル") or "無題"
        target_url = get_prop(item, "URL")
        category = get_prop(item, "カテゴリ")
        memo = get_prop(item, "メモ")

        print(f"\n[処理] {title}")

        if not target_url:
            print("  URLなし、スキップ")
            continue

        # ステータスを「処理中」に更新
        requests.patch(
            f"https://api.notion.com/v1/pages/{page_id}",
            headers=HEADERS,
            json={"properties": {"ステータス": {"select": {"name": "処理中"}}}},
            timeout=30,
        )

        text = fetch_page_text(target_url)
        summary = summarize_with_claude(title, target_url, text, category)
        filename = save_to_knowledge(title, target_url, summary, category, memo)
        update_notion_status(page_id, filename)
        print(f"  [完了] {title}")

    print("\n=== 完了 ===")


if __name__ == "__main__":
    main()
