# Obsidian + Claude Code Setup Script
# Run in PowerShell: .\setup-obsidian-claude.ps1

$workDir = "$env:USERPROFILE\obsidian-claude"

Write-Host "=== Obsidian + Claude Code Setup ===" -ForegroundColor Cyan

# 1. Create working directory
Write-Host "`n[1/4] Creating working directory..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $workDir | Out-Null
New-Item -ItemType Directory -Force -Path "$workDir\.claude" | Out-Null
Write-Host "    -> $workDir" -ForegroundColor Green

# 2. Check OBSIDIAN_API_KEY
Write-Host "`n[2/4] Checking API key..." -ForegroundColor Yellow
$apiKey = [System.Environment]::GetEnvironmentVariable("OBSIDIAN_API_KEY", "User")
if (-not $apiKey) {
    Write-Host "    [ERROR] OBSIDIAN_API_KEY is not set." -ForegroundColor Red
    Write-Host "    Please run the following first:"
    Write-Host '    [System.Environment]::SetEnvironmentVariable("OBSIDIAN_API_KEY", "your-key", "User")'
    exit 1
}
Write-Host "    -> API key OK" -ForegroundColor Green

# 3. Create .claude/settings.json
Write-Host "`n[3/4] Creating MCP settings..." -ForegroundColor Yellow
$settings = @"
{
  "mcpServers": {
    "obsidian": {
      "command": "npx",
      "args": ["-y", "mcp-obsidian"],
      "env": {
        "OBSIDIAN_API_KEY": "$apiKey",
        "OBSIDIAN_HOST": "http://localhost:27123"
      }
    }
  }
}
"@
[System.IO.File]::WriteAllText("$workDir\.claude\settings.json", $settings, [System.Text.Encoding]::UTF8)
Write-Host "    -> .claude\settings.json created" -ForegroundColor Green

# 4. Create CLAUDE.md (Obsidian notation rules)
Write-Host "`n[4/4] Creating CLAUDE.md..." -ForegroundColor Yellow
$claudeMd = @"
# Obsidian Notation Rules

Always follow these rules when creating or editing notes.

## Internal Links
- Normal link  : [[Note Name]]
- With alias   : [[Note Name|Display Text]]
- Embed        : ![[Note Name]]

## Tags
- Inline : #tagname
- Or in frontmatter as array

## Frontmatter (add to every note)
---
title: Title
date: YYYY-MM-DD
tags: [tag1, tag2]
---

## File Naming
- Daily notes : YYYY-MM-DD.md
- Other notes : descriptive-name.md

## Folder Structure
- Daily notes : Daily/
- Stock notes : Stocks/
- Ideas       : Ideas/
"@
[System.IO.File]::WriteAllText("$workDir\CLAUDE.md", $claudeMd, [System.Text.Encoding]::UTF8)
Write-Host "    -> CLAUDE.md created" -ForegroundColor Green

# Done
Write-Host "`n=== Setup Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Open Obsidian (must be running)"
Write-Host "  2. Start Claude Code:"
Write-Host "     cd $workDir" -ForegroundColor Yellow
Write-Host "     claude" -ForegroundColor Yellow
Write-Host "  3. Type /mcp inside Claude and confirm obsidian shows 'connected'"
Write-Host ""
