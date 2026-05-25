#!/usr/bin/env node
/**
 * 楽天アフィリエイト CM動画生成スクリプト
 * Instagram Reels向け縦型動画 (1080x1920, 20秒)
 *
 * 前提条件:
 *   - ffmpeg インストール済み (winget install ffmpeg または https://ffmpeg.org/download.html)
 *   - npm install fluent-ffmpeg axios
 *
 * 使い方:
 *   node generate-video.js               # 自動で楽天検索→商品選定→動画生成
 *   node generate-video.js --post        # 動画生成後にInstagram Reelsへ投稿
 */

const https = require("https")
const http = require("http")
const fs = require("fs")
const path = require("path")
const readline = require("readline")
const { execSync } = require("child_process")

// ===== 設定読み込み =====
require("fs").readFileSync(".env.local", "utf8").split("\n").forEach(line => {
  const [key, ...val] = line.split("=")
  if (key && val.length) process.env[key.trim()] = val.join("=").trim()
})

const CONFIG = {
  rakutenAppId: process.env.RAKUTEN_APP_ID,
  rakutenAffiliateId: process.env.RAKUTEN_AFFILIATE_ID,
  anthropicKey: process.env.ANTHROPIC_API_KEY,
  instagramToken: process.env.INSTAGRAM_ACCESS_TOKEN,
  instagramUserId: process.env.INSTAGRAM_USER_ID,
}

const POST_MODE = process.argv.includes("--post")

// ===== ユーティリティ =====
function fetchJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const lib = urlObj.protocol === "https:" ? https : http
    const req = lib.request(url, {
      method: options.method || "GET",
      headers: { "Content-Type": "application/json", ...options.headers },
    }, (res) => {
      let data = ""
      res.on("data", chunk => data += chunk)
      res.on("end", () => {
        try { resolve(JSON.parse(data)) } catch { resolve(data) }
      })
    })
    req.on("error", reject)
    if (options.body) req.write(options.body)
    req.end()
  })
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    // HTTPSリダイレクトを追う
    function download(u, depth = 0) {
      if (depth > 5) return reject(new Error("リダイレクト上限"))
      const lib = u.startsWith("https") ? https : http
      lib.get(u, res => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return download(res.headers.location, depth + 1)
        }
        const file = fs.createWriteStream(dest)
        res.pipe(file)
        file.on("finish", () => { file.close(); resolve() })
        file.on("error", reject)
      }).on("error", reject)
    }
    download(url)
  })
}

function askConfirm(question) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    rl.question(question, ans => { rl.close(); resolve(ans.trim().toLowerCase()) })
  })
}

// ffmepgの存在確認
function checkFfmpeg() {
  try {
    execSync("ffmpeg -version", { stdio: "pipe" })
    return true
  } catch {
    return false
  }
}

// Windowsフォントパスを自動検出
function detectFontPath() {
  const candidates = [
    "C:/Windows/Fonts/meiryo.ttc",
    "C:/Windows/Fonts/YuGothM.ttc",
    "C:/Windows/Fonts/msgothic.ttc",
    "/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc",   // Mac
    "/System/Library/Fonts/Supplemental/Hiragino Sans GB W3.ttc",
    "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc", // Linux
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
  ]
  for (const p of candidates) {
    try { fs.accessSync(p); return p } catch { /* not found */ }
  }
  return null
}

// ===== 楽天検索 =====
async function searchRakuten(keyword) {
  console.log(`\n🔍 楽天検索中: ${keyword}`)
  const params = new URLSearchParams({
    format: "json", keyword,
    applicationId: CONFIG.rakutenAppId,
    affiliateId: CONFIG.rakutenAffiliateId,
    hits: "10", sort: "-reviewCount", imageFlag: "1",
  })
  const data = await fetchJson(
    `https://app.rakuten.co.jp/services/api/IchibaItem/Search/20220601?${params}`
  )
  if (!data.Items) throw new Error("楽天API エラー: " + JSON.stringify(data))
  return data.Items.map(i => i.Item)
}

// ===== Claude AI選定 =====
async function selectBestItem(items) {
  console.log("\n🤖 Claude AIが商品を選定中...")
  const itemList = items.map((item, i) =>
    `${i + 1}. ${item.itemName.slice(0, 60)} | ¥${item.itemPrice.toLocaleString()} | ★${item.reviewAverage}(${item.reviewCount}件)`
  ).join("\n")

  const res = await fetchJson("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": CONFIG.anthropicKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6", max_tokens: 256,
      messages: [{ role: "user", content: `以下のアニメ・フィギュア商品から最も適した1商品を選んでください。\n\n${itemList}\n\n番号のみ回答（例: 3）` }],
    }),
  })
  const num = parseInt(res.content[0].text.trim().match(/\d+/)?.[0] || "1") - 1
  return items[Math.min(num, items.length - 1)]
}

// ===== キャプション生成 =====
async function generateCaption(item) {
  console.log("\n✨ キャプション生成中...")
  const res = await fetchJson("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": CONFIG.anthropicKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6", max_tokens: 1024,
      system: "あなたはアニメ・フィギュア・推しグッズ専門のInstagramインフルエンサーです。熱量高く、オタク文化に刺さる投稿文を作ります。",
      messages: [{ role: "user", content: `商品名: ${item.itemName}\n価格: ¥${item.itemPrice.toLocaleString()}\nレビュー: ★${item.reviewAverage}（${item.reviewCount}件）\nURL: ${item.affiliateUrl}\n\n要件:\n- 冒頭に絵文字で興味を引く\n- 熱量高く魅力を伝える\n- 「プロフのリンクから購入できます🔗」を入れる\n- ハッシュタグ20個（#PR必須）\n- 2000文字以内\n\n投稿文のみ返答してください。` }],
    }),
  })
  return res.content[0].text.trim()
}

// ===== CM動画生成 (ffmpeg) =====
async function generateVideo(item, outputDir) {
  if (!checkFfmpeg()) {
    throw new Error(
      "ffmpegがインストールされていません。\n" +
      "Windowsの場合: winget install ffmpeg\n" +
      "またはhttps://ffmpeg.org/download.htmlからダウンロードしてください。"
    )
  }

  const fontPath = detectFontPath()
  if (!fontPath) {
    throw new Error("日本語フォントが見つかりません。Meiryo等がインストールされているか確認してください。")
  }

  const timestamp = Date.now()
  const imagePath = path.join(outputDir, `product_${timestamp}.jpg`)
  const videoPath = path.join(outputDir, `cm_reels_${timestamp}.mp4`)

  // 1. 商品画像ダウンロード
  const imageUrl = item.mediumImageUrls?.[0]?.imageUrl || item.smallImageUrls?.[0]?.imageUrl
  if (!imageUrl) throw new Error("商品画像URLが見つかりません")
  console.log("\n📥 商品画像ダウンロード中...")
  await downloadFile(imageUrl, imagePath)

  // 2. テキスト準備（ffmpeg drawtext用にエスケープ）
  function esc(str) {
    // ffmpeg drawtext特殊文字エスケープ: ' : \ を処理
    return str
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\\'")
      .replace(/:/g, "\\:")
      .replace(/\[/g, "\\[")
      .replace(/\]/g, "\\]")
      .slice(0, 20) // 長すぎるテキストは切る
  }

  const productNameShort = esc(item.itemName.slice(0, 18) + (item.itemName.length > 18 ? "..." : ""))
  const priceText = esc(`¥${Number(item.itemPrice).toLocaleString()}`)
  const reviewText = esc(`★${item.reviewAverage}  (${item.reviewCount}件)`)
  const accountText = "@otoku\\_ai\\_life"
  const ctaText = esc("プロフのリンクから購入できます")

  // ffmpegフォントパス（Windowsはコロンをエスケープ）
  const ffFont = fontPath.replace(/\\/g, "/").replace("C:/", "C\\:/")

  // 3. ffmpegフィルターグラフ構築
  // 1080x1920縦型、20秒、アニメーションテキストオーバーレイ
  const vf = [
    // 商品画像をスクエアにクロップ→1080x1080にリサイズ→上部に配置
    `[0:v]scale=1080:1080:force_original_aspect_ratio=increase,crop=1080:1080,setsar=1[product]`,
    // 1080x1920の暗いグラデーション背景
    `color=c=#1a1a2e:s=1080x1920:r=30[bg]`,
    // 背景に商品画像をブラー＆暗くしてオーバーレイ（全体）
    `[product]scale=1080:1080,gblur=sigma=20,colorchannelmixer=.2:.2:.2:.2:.2:.2:.2:.2:.2[blur_product]`,
    `[bg][blur_product]overlay=0:420[with_blur]`,
    // 商品画像を中央にクリアにオーバーレイ（上から420px）
    `[with_blur][product]overlay=0:420[with_product]`,
    // 暗いオーバーレイ（下半分テキスト領域）
    `[with_product]drawbox=x=0:y=1350:w=1080:h=570:color=#00000099@0.9:t=fill[with_box]`,
    // アカウント名（上部）
    `[with_box]drawtext=fontfile='${ffFont}':text='${accountText}':x=40:y=50:fontsize=40:fontcolor=white:alpha='if(lt(t\\,1)\\,0\\,if(lt(t\\,2)\\,t-1\\,1))'[t1]`,
    // PRバッジ（右上）
    `[t1]drawbox=x=900:y=40:w=140:h=60:color=#BF0000@1:t=fill[badge_box]`,
    `[badge_box]drawtext=fontfile='${ffFont}':text='\\#PR':x=930:y=55:fontsize=36:fontcolor=white:fontweight=bold[t2]`,
    // 商品名（中央下）- 3秒後にフェードイン
    `[t2]drawtext=fontfile='${ffFont}':text='${productNameShort}':x=(w-text_w)/2:y=1380:fontsize=52:fontcolor=white:alpha='if(lt(t\\,3)\\,0\\,if(lt(t\\,4)\\,t-3\\,1))'[t3]`,
    // 価格（大きく）- 6秒後にフェードイン
    `[t3]drawtext=fontfile='${ffFont}':text='${priceText}':x=(w-text_w)/2:y=1470:fontsize=88:fontcolor=#ff6b6b:fontweight=bold:alpha='if(lt(t\\,6)\\,0\\,if(lt(t\\,7)\\,t-6\\,1))'[t4]`,
    // レビュー - 9秒後
    `[t4]drawtext=fontfile='${ffFont}':text='${reviewText}':x=(w-text_w)/2:y=1580:fontsize=44:fontcolor=#ffd700:alpha='if(lt(t\\,9)\\,0\\,if(lt(t\\,10)\\,t-9\\,1))'[t5]`,
    // CTA - 12秒後
    `[t5]drawtext=fontfile='${ffFont}':text='${ctaText}':x=(w-text_w)/2:y=1660:fontsize=38:fontcolor=white:alpha='if(lt(t\\,12)\\,0\\,if(lt(t\\,13)\\,t-12\\,1))'[t6]`,
    // Ken Burnsズームエフェクト（商品画像に適用 - 実際には全体に）
    `[t6]zoompan=z='min(zoom+0.001\\,1.2)':x='iw/2-(iw/zoom/2)':y='ih/4-(ih/zoom/4)':d=600:s=1080x1920:fps=30[final]`,
    // フェードイン/アウト
    `[final]fade=t=in:st=0:d=1,fade=t=out:st=19:d=1[out]`,
  ].join(";")

  console.log("\n🎬 CM動画生成中... (約20〜60秒かかります)")

  return new Promise((resolve, reject) => {
    const args = [
      "-y",
      "-loop", "1",
      "-i", imagePath,
      "-filter_complex", vf,
      "-map", "[out]",
      "-t", "20",
      "-r", "30",
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-preset", "fast",
      "-crf", "23",
      videoPath,
    ]

    const proc = require("child_process").spawn("ffmpeg", args, { stdio: ["pipe", "pipe", "pipe"] })

    let stderr = ""
    proc.stderr.on("data", chunk => {
      stderr += chunk
      // 進捗表示
      const match = chunk.toString().match(/time=(\d+:\d+:\d+)/)
      if (match) process.stdout.write(`\r   エンコード進捗: ${match[1]} / 00:00:20`)
    })

    proc.on("close", code => {
      // 一時ファイル削除
      try { fs.unlinkSync(imagePath) } catch {}
      if (code === 0) {
        console.log("\n✅ 動画生成完了！")
        resolve(videoPath)
      } else {
        reject(new Error("ffmpegエラー:\n" + stderr.slice(-500)))
      }
    })
  })
}

// ===== Instagram Reels投稿 =====
async function postReelsToInstagram(videoPath, caption) {
  // Instagram Graph API はURLによる動画投稿のみサポート
  // ローカルファイルを投稿するには公開URLが必要
  // → Vercelデプロイ後に対応予定
  console.log("\n📋 Instagram Reels投稿について:")
  console.log("   Reels投稿には動画の公開URLが必要です。")
  console.log("   Vercelデプロイ後に自動投稿が可能になります。")
  console.log(`   生成された動画: ${videoPath}`)
  console.log("\n   今すぐ投稿したい場合:")
  console.log("   1. 生成された動画ファイルをスマホに転送")
  console.log("   2. Instagramアプリで手動投稿")
}

// ===== メイン =====
async function main() {
  console.log("🎬 楽天アフィリエイト CM動画生成システム")
  console.log("=".repeat(60))

  // 出力フォルダ作成
  const outputDir = path.join(__dirname, "output")
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir)

  try {
    // 1. 楽天検索
    const items = await searchRakuten("アニメ フィギュア 人気")

    // 2. AI選定
    const selected = await selectBestItem(items)

    // 3. キャプション生成
    const caption = await generateCaption(selected)

    // ========== オーナー確認 ==========
    console.log("\n" + "=".repeat(60))
    console.log("📋 生成内容プレビュー")
    console.log("=".repeat(60))
    console.log("\n【選定商品】")
    console.log(`  商品名 : ${selected.itemName}`)
    console.log(`  価格   : ¥${selected.itemPrice.toLocaleString()}`)
    console.log(`  評価   : ★${selected.reviewAverage}（${selected.reviewCount}件）`)
    console.log(`  ショップ: ${selected.shopName}`)
    console.log("\n【キャプション（全文）】")
    console.log("-".repeat(60))
    console.log(caption)
    console.log("-".repeat(60))
    console.log(`\n  文字数: ${caption.length} 文字`)

    console.log("\n" + "=".repeat(60))
    const answer = await askConfirm("👆 この商品でCM動画を生成しますか？ (y = 生成する / n = キャンセル): ")

    if (answer !== "y") {
      console.log("\n⏸  キャンセルしました。")
      return
    }

    // 4. 動画生成
    const videoPath = await generateVideo(selected, outputDir)

    // 5. 結果表示
    console.log("\n" + "=".repeat(60))
    console.log("✅ CM動画生成完了！")
    console.log(`   📁 保存先: ${videoPath}`)
    console.log(`   📦 商品  : ${selected.itemName.slice(0, 40)}`)
    console.log(`   💰 価格  : ¥${selected.itemPrice.toLocaleString()}`)
    console.log("\n【次のステップ】")
    console.log("  1. outputフォルダの動画ファイルを確認")
    console.log("  2. 問題なければInstagramアプリで手動投稿 または Vercelデプロイ後に自動投稿")

    if (POST_MODE) {
      await postReelsToInstagram(videoPath, caption)
    }

  } catch (err) {
    console.error("\n❌ エラー:", err.message)
    if (err.message.includes("ffmpeg")) {
      console.error("\n💡 解決方法:")
      console.error("   Windows: winget install ffmpeg")
      console.error("   または: https://ffmpeg.org/download.html")
    }
    process.exit(1)
  }
}

main()
