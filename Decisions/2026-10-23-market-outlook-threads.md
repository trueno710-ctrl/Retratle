---
date: 2026-10-23
updated: 2026-10-23
tags: [investment, threads, automation, monetization]
project: retratle
related: [[ideas-memo]]
---

# 投資発信は「指標分析 → Threads 半自動投稿」から始める

## 決めたこと
- AI音楽・SNS投資発信・note 収益化のうち、最初に経済指標 → Claude 下書き → 本人確認 → Threads 投稿を作る
- 完全自動ではなく、下書きを確認してから投稿する（`scripts/market_outlook_post.py`、Actions は mode=publish で投稿）

## 他の候補
- X への半自動投稿（API の料金プラン確認が先に必要）
- note 記事の下書き作成
- AI音楽（Suno）の始め方ガイド

## 理由
- Threads は公式 API が無料で、THREADS_ACCESS_TOKEN も既に設定済み
- ここで集客と記事のネタがたまり、次の note 有料記事につながる
- 確認を挟むことで誤情報・投資助言規制（断定・売買推奨）のリスクを下げる
