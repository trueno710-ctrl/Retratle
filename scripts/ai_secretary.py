"""
AI Secretary - Monthly Calendar Manager
毎月1日に実行され、年間イベントの登録・重複削除を自動管理します。
"""

import json
import os
import sys
from datetime import datetime, date, timedelta

from google.oauth2 import service_account
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError


SCOPES = ["https://www.googleapis.com/auth/calendar"]
CONFIG_PATH = os.path.join(os.path.dirname(__file__), "events_config.json")


def get_service():
    """Google Calendar APIのサービスオブジェクトを返す。"""
    service_account_info = json.loads(os.environ["GOOGLE_SERVICE_ACCOUNT_JSON"])
    creds = service_account.Credentials.from_service_account_info(
        service_account_info, scopes=SCOPES
    )
    return build("calendar", "v3", credentials=creds)


def load_config():
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def list_events_in_range(service, calendar_id, start_date, end_date):
    """指定期間のイベント一覧を返す。"""
    time_min = f"{start_date}T00:00:00Z"
    time_max = f"{end_date}T00:00:00Z"
    result = (
        service.events()
        .list(
            calendarId=calendar_id,
            timeMin=time_min,
            timeMax=time_max,
            singleEvents=True,
            orderBy="created",
        )
        .execute()
    )
    return result.get("items", [])


def is_same_event(event, keywords):
    """イベントのタイトルがキーワードのいずれかを含むか判定。"""
    summary = event.get("summary", "").lower()
    return any(kw.lower() in summary for kw in keywords)


def remove_duplicates(service, calendar_id, events_to_keep_ids, duplicate_ids):
    """重複イベントを削除し、残したIDのリストを返す。"""
    removed = []
    for event_id in duplicate_ids:
        if event_id in events_to_keep_ids:
            continue
        try:
            service.events().delete(calendarId=calendar_id, eventId=event_id).execute()
            removed.append(event_id)
            print(f"  [削除] id={event_id}")
        except HttpError as e:
            print(f"  [削除失敗] id={event_id}: {e}", file=sys.stderr)
    return removed


def create_event(service, calendar_id, event_cfg, year_data, year):
    """イベントを新規作成する。"""
    summary = event_cfg["summary_template"].format(year=year)
    body = {
        "summary": summary,
        "location": event_cfg["location"],
        "description": year_data["description"],
        "colorId": event_cfg["color_id"],
        "start": {"date": year_data["start"]},
        "end": {"date": year_data["end"]},
        "reminders": {"useDefault": False, "overrides": [{"method": "popup", "minutes": 30}]},
    }
    created = service.events().insert(calendarId=calendar_id, body=body).execute()
    print(f"  [登録] {summary} ({year_data['start']} 〜 {year_data['end']})")
    return created


def process_event(service, config, event_cfg, year):
    """1イベント・1年分の重複削除と登録を処理する。"""
    calendar_id = config["calendar_id"]
    year_str = str(year)
    year_data = event_cfg.get("years", {}).get(year_str)
    if not year_data:
        return

    start_date = year_data["start"]
    # end_dateは検索範囲として1日余裕を持たせる
    end_dt = datetime.strptime(year_data["end"], "%Y-%m-%d") + timedelta(days=1)
    search_end = end_dt.strftime("%Y-%m-%d")

    # 開催期間のイベントを取得しキーワードで絞り込む
    all_events = list_events_in_range(service, calendar_id, start_date, search_end)
    matched = [e for e in all_events if is_same_event(e, event_cfg["keywords"])]

    if len(matched) == 0:
        # 未登録 → 新規作成
        create_event(service, calendar_id, event_cfg, year_data, year)
    elif len(matched) == 1:
        print(f"  [スキップ] {event_cfg['summary_template'].format(year=year)} は登録済み")
    else:
        # 重複あり → 最も情報が充実しているもの（descriptionが長いもの）を残す
        matched_sorted = sorted(
            matched,
            key=lambda e: len(e.get("description", "") + e.get("location", "")),
            reverse=True,
        )
        keep = matched_sorted[0]
        duplicates = [e["id"] for e in matched_sorted[1:]]
        print(f"  [重複検出] {len(matched)}件 → 最良版(id={keep['id']})を保持し{len(duplicates)}件を削除")
        remove_duplicates(service, calendar_id, {keep["id"]}, duplicates)


def main():
    print(f"=== AI Secretary 実行開始: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} ===")
    service = get_service()
    config = load_config()

    today = date.today()
    target_years = [today.year, today.year + 1]

    for event_cfg in config["events"]:
        for year in target_years:
            print(f"\n[{event_cfg['id']} / {year}年]")
            process_event(service, config, event_cfg, year)

    print("\n=== 完了 ===")


if __name__ == "__main__":
    main()
