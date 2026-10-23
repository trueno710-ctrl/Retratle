---
date: 2026-10-23
updated: 2026-10-23
tags: [notion, obsidian, rules]
project: retratle
related: [[mistakes]]
---

# 「AIに覚えさせたいリスト」を種別ごとに振り分ける

## 決めたこと
- Notion DB に「種別」列（記事 / 決定 / 好み / メモ）を追加。空欄なら内容から自動判定
- 記事→Knowledge/、決定→Decisions/、好み→Preferences/、メモ→Knowledge/ideas-memo.md
- MCP 設定は `.claude/settings.json` から `.mcp.json` へ移動
- Vault パスは `C:\Users\truen\iCloudDrive\Claude`

## 他の候補
- 種別列を足さず自動判定だけにする

## 理由
- スマホから1タップで指定でき誤判定が減る。空欄OKなので今までの入れ方も使える
