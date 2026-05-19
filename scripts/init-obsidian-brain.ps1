# Obsidian 外部脳 初期化スクリプト
# ObsidianのVaultパスを引数で指定: .\init-obsidian-brain.ps1 -VaultPath "C:\Users\truen\Documents\MyVault"

param(
    [Parameter(Mandatory=$true)]
    [string]$VaultPath
)

Write-Host "=== Obsidian 外部脳 初期化 ===" -ForegroundColor Cyan

$claudeDir = "$VaultPath\Claude"
$logDir    = "$claudeDir\日次ログ"
$today     = Get-Date -Format "yyyy-MM-dd"

New-Item -ItemType Directory -Force -Path $claudeDir | Out-Null
New-Item -ItemType Directory -Force -Path $logDir    | Out-Null

# 1. プロフィールノート
$profile = @"
---
title: プロフィール
tags: [claude, profile]
updated: $today
---

# 小澤貴 プロフィール

## 基本情報
- 名前: 小澤貴
- OS: Windows 11
- 主な関心: 株式投資・テンバガー候補・省庁情報・AI活用

## 使用ツール
- [[Retratle]] — 株式モニタリングNext.jsアプリ
- Obsidian — 外部脳・ノート管理
- Claude Code — AIアシスタント
- 楽天証券 — 株式取引

## 好みと設定
- カレンダー: Google Calendar（Outlookへ移行予定）
- 言語: 日本語

## その他メモ
（随時追記）
"@
[System.IO.File]::WriteAllText("$claudeDir\プロフィール.md", $profile, [System.Text.UTF8Encoding]::new($true))
Write-Host "[OK] プロフィール.md" -ForegroundColor Green

# 2. 進行中タスク
$tasks = @"
---
title: 進行中タスク
tags: [claude, tasks]
updated: $today
---

# 進行中タスク

## 🔴 緊急
（なし）

## 🟡 進行中
- [ ] Obsidian + Claude Code MCP連携のセットアップ
- [ ] Facebook・Instagram 初期設定（5/19 18:00）
- [ ] 楽天証券 逆指値設定（5/18 夜）
- [ ] Outlookカレンダーへの移行

## 🟢 完了
（随時移動）
"@
[System.IO.File]::WriteAllText("$claudeDir\進行中タスク.md", $tasks, [System.Text.UTF8Encoding]::new($true))
Write-Host "[OK] 進行中タスク.md" -ForegroundColor Green

# 3. 記憶メモ
$memory = @"
---
title: 記憶メモ
tags: [claude, memory]
updated: $today
---

# Claude 記憶メモ

セッションを跨いで引き継ぐ重要な情報をここに記録する。

## 2026-05-18
- Obsidian + Claude Code MCP連携のセットアップを開始
- Local REST API プラグインをインストール・APIキー取得済み
- Node.js v24.15.0 インストール済み
- Claude Code CLIインストール済み
- 環境変数 OBSIDIAN_API_KEY を Windows に永続化済み
- setup-obsidian-claude.ps1 で作業フォルダ作成済み
- Google Calendarに登録済みの予定:
  - 5/18 夜: 楽天証券 逆指値設定
  - 5/19 18:00: Facebook・Instagram 初期設定
- Outlookカレンダーへの移行を希望している
"@
[System.IO.File]::WriteAllText("$claudeDir\記憶メモ.md", $memory, [System.Text.UTF8Encoding]::new($true))
Write-Host "[OK] 記憶メモ.md" -ForegroundColor Green

# 4. 今日の日次ログ
$log = @"
---
title: $today
tags: [claude, log]
date: $today
---

# $today のログ

## 今日やったこと
- Obsidian外部脳システムを初期化

## メモ
（随時追記）
"@
[System.IO.File]::WriteAllText("$logDir\$today.md", $log, [System.Text.UTF8Encoding]::new($true))
Write-Host "[OK] 日次ログ/$today.md" -ForegroundColor Green

Write-Host "`n=== 初期化完了 ===" -ForegroundColor Cyan
Write-Host "Vaultパス: $VaultPath\Claude\" -ForegroundColor White
Write-Host "`n作成されたノート:"
Write-Host "  Claude/プロフィール.md"
Write-Host "  Claude/進行中タスク.md"
Write-Host "  Claude/記憶メモ.md"
Write-Host "  Claude/日次ログ/$today.md"
Write-Host "`n次はObsidianを起動してClaude/フォルダを確認してください。" -ForegroundColor Yellow
