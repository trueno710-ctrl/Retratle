"""
Gmail refresh_token 取得用ワンタイムスクリプト（ローカルPCで1回だけ実行）

事前にGoogle Cloud ConsoleでダウンロードしたOAuthクライアントのJSONファイル
（例: client_secret_xxxx.json）を用意し、このスクリプトと同じフォルダに置く。

使い方:
    pip install google-auth-oauthlib
    python scripts/get_gmail_refresh_token.py client_secret_xxxx.json

実行するとブラウザが開き、Googleログイン→許可を行うと、
ターミナルに client_id / client_secret / refresh_token が表示される。
この3つをGitHub Secretsに登録する。
"""

import sys

from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.modify",
]


def main():
    if len(sys.argv) != 2:
        print("使い方: python scripts/get_gmail_refresh_token.py <client_secret_xxxx.json>")
        sys.exit(1)

    client_secret_file = sys.argv[1]

    flow = InstalledAppFlow.from_client_secrets_file(client_secret_file, SCOPES)
    creds = flow.run_local_server(port=0)

    print("\n=== 以下をGitHub Secretsに登録してください ===")
    print(f"GMAIL_CLIENT_ID     = {creds.client_id}")
    print(f"GMAIL_CLIENT_SECRET = {creds.client_secret}")
    print(f"GMAIL_REFRESH_TOKEN = {creds.refresh_token}")


if __name__ == "__main__":
    main()
