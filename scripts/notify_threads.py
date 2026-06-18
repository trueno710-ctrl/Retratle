#!/usr/bin/env python3
"""
Threads通知スクリプト
GitHub Actions のジョブ完了時に @FLUX22663176093 へ通知投稿する
"""

import os
import sys
import time
import requests

THREADS_ACCESS_TOKEN = os.environ["THREADS_ACCESS_TOKEN"]
THREADS_USER_ID      = os.environ["THREADS_USER_ID"]


def notify(message: str):
    base_url = f"https://graph.threads.net/v1.0/{THREADS_USER_ID}"

    # コンテナ作成
    r = requests.post(
        f"{base_url}/threads",
        params={
            "media_type": "TEXT",
            "text": message,
            "access_token": THREADS_ACCESS_TOKEN,
        },
    )
    r.raise_for_status()
    creation_id = r.json()["id"]

    time.sleep(2)

    # 公開
    r2 = requests.post(
        f"{base_url}/threads_publish",
        params={
            "creation_id": creation_id,
            "access_token": THREADS_ACCESS_TOKEN,
        },
    )
    r2.raise_for_status()
    print(f"通知投稿完了: {r2.json()['id']}")


if __name__ == "__main__":
    # 引数からメッセージを受け取る
    msg = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else "✅ GitHub Actions タスク完了"
    notify(msg)
