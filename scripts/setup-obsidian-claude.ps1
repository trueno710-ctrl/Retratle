# Obsidian + Claude Code セットアップスクリプト
# PowerShellで実行: .\setup-obsidian-claude.ps1

$workDir = "$env:USERPROFILE\obsidian-claude"

Write-Host "=== Obsidian + Claude Code セットアップ ===" -ForegroundColor Cyan

# 1. 作業フォルダ作成
Write-Host "`n[1/4] 作業フォルダを作成中..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $workDir | Out-Null
New-Item -ItemType Directory -Force -Path "$workDir\.claude" | Out-Null
Write-Host "    -> $workDir" -ForegroundColor Green

# 2. OBSIDIAN_API_KEY の確認
Write-Host "`n[2/4] APIキーを確認中..." -ForegroundColor Yellow
$apiKey = [System.Environment]::GetEnvironmentVariable("OBSIDIAN_API_KEY", "User")
if (-not $apiKey) {
    Write-Host "    [エラー] OBSIDIAN_API_KEY が設定されていません" -ForegroundColor Red
    Write-Host "    以下を実行してから再度このスクリプトを実行してください:"
    Write-Host '    [System.Environment]::SetEnvironmentVariable("OBSIDIAN_API_KEY", "あなたのAPIキー", "User")'
    exit 1
}
Write-Host "    -> APIキー確認OK" -ForegroundColor Green

# 3. .claude/settings.json を作成
Write-Host "`n[3/4] MCP設定ファイルを作成中..." -ForegroundColor Yellow
$settings = @{
    mcpServers = @{
        obsidian = @{
            command = "npx"
            args    = @("-y", "mcp-obsidian")
            env     = @{
                OBSIDIAN_API_KEY = $apiKey
                OBSIDIAN_HOST    = "http://localhost:27123"
            }
        }
    }
} | ConvertTo-Json -Depth 5

$settings | Out-File -FilePath "$workDir\.claude\settings.json" -Encoding utf8
Write-Host "    -> .claude\settings.json 作成完了" -ForegroundColor Green

# 4. CLAUDE.md を作成
Write-Host "`n[4/4] CLAUDE.md を作成中..." -ForegroundColor Yellow
$claudeMd = @"
# Obsidian記法ルール

ノートを作成・編集するときは必ず以下のルールに従うこと。

## 内部リンク
- 通常リンク: [[ノート名]]
- 別名付き:   [[ノート名|表示テキスト]]
- 埋め込み:   ![[ノート名]]

## タグ
- インライン: #タグ名
- フロントマターに配列で記載

## フロントマター（全ノートの先頭に必ず付ける）
---
title: タイトル
date: YYYY-MM-DD
tags: [タグ1, タグ2]
---

## ファイル命名規則
- デイリーノート: YYYY-MM-DD.md
- 通常ノート: 日本語OK、スペースはハイフンで代替

## フォルダ構成
- デイリーノート: Daily/
- 株式メモ:       Stocks/
- アイデア:       Ideas/
"@

$claudeMd | Out-File -FilePath "$workDir\CLAUDE.md" -Encoding utf8
Write-Host "    -> CLAUDE.md 作成完了" -ForegroundColor Green

# 完了メッセージ
Write-Host "`n=== セットアップ完了 ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "次のステップ:" -ForegroundColor White
Write-Host "  1. Obsidianを起動する（必須）"
Write-Host "  2. 以下のコマンドでClaudeを起動:"
Write-Host "     cd $workDir" -ForegroundColor Yellow
Write-Host "     claude" -ForegroundColor Yellow
Write-Host "  3. Claudeの中で /mcp と入力して obsidian が connected か確認"
Write-Host ""
