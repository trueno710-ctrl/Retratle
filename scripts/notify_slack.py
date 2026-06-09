#!/usr/bin/env python3
"""Slack通知スクリプト — GitHub Actions 完了時に Slack へ通知"""

import os
import sys
import json
import requests

SLACK_WEBHOOK_URL = os.environ["SLACK_WEBHOOK_URL"]


def notify(message: str):
    r = requests.post(
        SLACK_WEBHOOK_URL,
        headers={"Content-Type": "application/json"},
        data=json.dumps({"text": message}),
    )
    r.raise_for_status()
    print("Slack通知送信完了")


if __name__ == "__main__":
    msg = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else "✅ GitHub Actions タスク完了"
    notify(msg)
