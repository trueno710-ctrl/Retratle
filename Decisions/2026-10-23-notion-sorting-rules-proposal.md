---
date: 2026-10-23
updated: 2026-10-25
tags: [notion, obsidian, claude-md, proposal]
project: retratle
related: [[2026-10-23-notion-sorting-rules]]
---

# 「AIに覚えさせたいリスト」振り分けルール案

> 2026-10-23 承認・反映済み（CLAUDE.md セクション9、Notion「種別」列、`.mcp.json`）。決定の要約は [[2026-10-23-notion-sorting-rules]]。

## 1. 今の状態（確認したこと）

- CLAUDE.md セクション9 は「URL付き記事 → 要約して `Knowledge/YYYY-MM-DD-キーワード.md`」の1パターンだけ。
- Notion DB のプロパティ: タイトル / URL / カテゴリ（株式・投資, AI・テクノロジー, YouTube・動画, ビジネス, 政治・省庁, 生活・趣味, その他）/ ステータス（未処理・処理中・保存済み）/ メモ / Obsidianファイル / 追加日 / 更新日。
- 「何として保存するか」を示す列はない。サンプル行はURLだけでタイトル・メモが空。

## 2. 振り分けルール案

### 判定の順番

1. **「種別」列があればそれに従う**（Notion に select 列を1つ追加する案。下記 §3）
2. 種別が空なら内容から自動判定:

| 条件 | 種別 | 保存先 | ファイル名 |
|---|---|---|---|
| URL がある | 記事 | `Knowledge/` | `YYYY-MM-DD-キーワード.md`（今のまま） |
| メモに「〜にした」「〜で行く」「〜に決めた」 | 決定 | `Decisions/` | `YYYY-MM-DD-topic.md` |
| メモに「好き」「嫌い」「〜したい派」「いつも〜」など本人の好み・やり方 | 好み | `Preferences/` | 既存の `category.md` に追記（例: `profile.md`, `coding-style.md`） |
| それ以外のURLなしメモ（アイデア・思いつき） | メモ | `Knowledge/ideas-memo.md` に追記 | 既存ファイルに見出しを足す |

迷ったら「メモ」扱いにして、Notion の「メモ」欄に「判定に迷った」と書き残す。

### 種別ごとの保存フォーマット

- **記事**: 今のセクション9のフォーマットのまま（要約・ポイント・AKATOSHI応用）。
- **決定**: セクション3のフロントマター＋「決めたこと / 他の候補 / 理由」の3見出し。
- **好み**: 既存ファイルの該当見出しに1行追記し、`updated` を今日に。CLAUDE.md の「ユーザー情報」も同時に更新（セクション8のルール通り）。
- **メモ**: `ideas-memo.md` に `## N. タイトル` を追加し、`updated` を今日に。

### Notion 側の後処理（共通）

- ステータス → 「保存済み」
- Obsidianファイル → `Decisions/2026-10-23-xxx.md` のようにフォルダ付きで記入（今はファイル名だけなので、どこに入ったか分かるように）

## 3. Notion に「種別」列を足すか

- 足す場合: `種別`（select: 記事 / 決定 / 好み / メモ）。スマホから入れるときに1タップで指定でき、誤判定がなくなる。空欄なら上の自動判定。
- 足さない場合: 自動判定だけで運用。設定変更なしで始められる。

おすすめは「足す」（空欄OKなので今までの入れ方も壊れない）。

## 4. パスの古い参照

| 場所 | 今の記述 | 指摘 |
|---|---|---|
| `CLAUDE.md` 200行目 | Vault パス: `C:\Users\truen\OneDrive\デスクトップ` | `C:\Users\truen\iCloudDrive\Claude` に更新が必要 |
| `CLAUDE.md` 201行目 | 作業フォルダ: `C:\Users\truen\obsidian-claude` | まだ使っているか要確認。Vault と同じ場所になったなら統合 |
| `.claude/settings.json` | `mcpServers` に obsidian（Local REST API, `localhost:27123`） | パスは書かれていないので Vault 移動の影響はなし（Obsidian で開いている Vault が対象になる）。ただし Claude Code はプロジェクトの MCP 設定を `settings.json` ではなく `.mcp.json` から読むので、この設定は効いていない可能性が高い。`.mcp.json` に移す案 |
| PC 側の MCP 設定（`~/.claude.json` など） | リポジトリ外なので未確認 | ファイルシステム系の MCP（パス指定型）を使っているなら、そちらに OneDrive のパスが残っていないか確認が必要 |

## 5. 反映するときの変更内容（承認後）

1. CLAUDE.md セクション9 に §2 のルールを追記（記事以外の振り分け）
2. CLAUDE.md の Vault パスを iCloud Drive に更新、最終更新日を 2026-10-23 に
3. （任意）`.claude/settings.json` の `mcpServers` を `.mcp.json` に移す
4. （任意）Notion DB に「種別」列を追加

ブランチ `claude/project-thread-2gt3gr` にコミット・プッシュし、PR を作る。
