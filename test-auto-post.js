#!/usr/bin/env node
/**
 * 楽天アフィリエイト 全自動テスト投稿スクリプト
 * 実行方法: node test-auto-post.js
 *
 * 流れ:
 *   1. 楽天で商品検索
 *   2. Claude AIが最適商品を選定
 *   3. 投稿文（キャプション）を生成
 *   4. 内容をすべて表示して確認を求める
 *   5. y を入力したときのみ Instagram に投稿
 */

const https = require("https")
const http = require("http")
const readline = require("readline")

// ===== 設定 =====
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
  siteUrl: "http://localhost:3000",
}

// キーボード入力（y/n）を待つ
function askConfirm(question) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    rl.question(question, answer => {
      rl.close()
      resolve(answer.trim().toLowerCase())
    })
  })
}

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
        try { resolve(JSON.parse(data)) }
        catch { resolve(data) }
      })
    })
    req.on("error", reject)
    if (options.body) req.write(options.body)
    req.end()
  })
}

// Step 1: 楽天でトレンドアニメ商品を取得
async function searchRakuten(keyword) {
  console.log(`\n🔍 楽天検索中: ${keyword}`)
  const params = new URLSearchParams({
    format: "json",
    keyword,
    applicationId: CONFIG.rakutenAppId,
    affiliateId: CONFIG.rakutenAffiliateId,
    hits: "10",
    sort: "-reviewCount",
    imageFlag: "1",
  })
  const url = `https://app.rakuten.co.jp/services/api/IchibaItem/Search/20220601?${params}`
  const data = await fetchJson(url)
  if (!data.Items) throw new Error("楽天API エラー: " + JSON.stringify(data))
  return data.Items.map(i => i.Item)
}

// Step 2: ClaudeがAIで最適商品を選定
async function selectBestItem(items) {
  console.log("\n🤖 Claude AIが商品を選定中...")
  const itemList = items.map((item, i) =>
    `${i + 1}. ${item.itemName.slice(0, 60)} | ¥${item.itemPrice.toLocaleString()} | ★${item.reviewAverage}(${item.reviewCount}件)`
  ).join("\n")

  const res = await fetchJson("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": CONFIG.anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 256,
      messages: [{
        role: "user",
        content: `以下のアニメ・フィギュア商品から、Instagramアフィリエイト投稿に最も適した1商品を選んでください。

選定基準：
- レビュー数・評価が高い
- 価格帯が手頃（1,000円〜30,000円）
- 話題性・視覚的映え

商品リスト：
${itemList}

番号のみ回答してください（例: 3）`,
      }],
    }),
  })

  const text = res.content[0].text.trim()
  const num = parseInt(text.match(/\d+/)?.[0] || "1") - 1
  const selected = items[Math.min(num, items.length - 1)]
  return selected
}

// Step 3: 投稿文を生成
async function generatePost(item) {
  console.log("\n✨ 投稿文を生成中...")
  const res = await fetchJson("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": CONFIG.anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: "あなたはアニメ・フィギュア・推しグッズ専門のInstagramインフルエンサーです。熱量高く、オタク文化に刺さる投稿文を作ります。",
      messages: [{
        role: "user",
        content: `以下の商品のInstagram投稿文を作成してください。

商品名: ${item.itemName}
価格: ¥${item.itemPrice.toLocaleString()}
レビュー: ★${item.reviewAverage}（${item.reviewCount}件）
URL: ${item.affiliateUrl}

要件:
- 冒頭に絵文字で興味を引く
- 熱量高く魅力を伝える
- 「プロフのリンクから購入できます🔗」を入れる
- ハッシュタグ20個（#PR必須）
- 2000文字以内

投稿文のみ返答してください。`,
      }],
    }),
  })
  return res.content[0].text.trim()
}

// Step 4: Instagramに投稿
async function postToInstagram(caption, imageUrl) {
  console.log("\n📤 Instagramに投稿中...")

  const createParams = new URLSearchParams({
    caption,
    image_url: imageUrl,
    access_token: CONFIG.instagramToken,
  })
  const createRes = await fetchJson(
    `https://graph.facebook.com/v18.0/${CONFIG.instagramUserId}/media?${createParams}`,
    { method: "POST" }
  )

  if (createRes.error) throw new Error(`メディア作成エラー: ${JSON.stringify(createRes.error)}`)
  console.log(`✅ メディアコンテナ作成: ${createRes.id}`)

  await new Promise(r => setTimeout(r, 2000))

  const publishParams = new URLSearchParams({
    creation_id: createRes.id,
    access_token: CONFIG.instagramToken,
  })
  const publishRes = await fetchJson(
    `https://graph.facebook.com/v18.0/${CONFIG.instagramUserId}/media_publish?${publishParams}`,
    { method: "POST" }
  )

  if (publishRes.error) throw new Error(`公開エラー: ${JSON.stringify(publishRes.error)}`)
  console.log(`🎉 Instagram投稿完了！ Post ID: ${publishRes.id}`)
  return publishRes.id
}

// ===== メイン =====
async function main() {
  console.log("🚀 楽天アフィリエイト 投稿確認モード")
  console.log("=".repeat(60))

  try {
    // 1. 楽天検索
    const items = await searchRakuten("アニメ フィギュア 人気")

    // 2. AI選定
    const selected = await selectBestItem(items)

    // 3. 投稿文生成
    const caption = await generatePost(selected)

    // 4. 使用画像（楽天の商品画像をそのまま使用）
    const imageUrl = selected.mediumImageUrls[0]?.imageUrl || ""

    // ========== オーナー確認画面 ==========
    console.log("\n" + "=".repeat(60))
    console.log("📋 投稿内容プレビュー（オーナー確認）")
    console.log("=".repeat(60))

    console.log("\n【選定商品】")
    console.log(`  商品名 : ${selected.itemName}`)
    console.log(`  価格   : ¥${selected.itemPrice.toLocaleString()}`)
    console.log(`  評価   : ★${selected.reviewAverage}（${selected.reviewCount}件レビュー）`)
    console.log(`  ショップ: ${selected.shopName}`)
    console.log(`  商品URL: ${selected.itemUrl}`)
    console.log(`  AF URL : ${selected.affiliateUrl}`)

    console.log("\n【使用画像URL】")
    console.log(`  ${imageUrl}`)

    console.log("\n【Instagram 投稿文（キャプション）全文】")
    console.log("-".repeat(60))
    console.log(caption)
    console.log("-".repeat(60))
    console.log(`\n  文字数: ${caption.length} 文字`)

    console.log("\n" + "=".repeat(60))
    const answer = await askConfirm("👆 上記内容でInstagramに投稿しますか？ (y = 投稿する / n = キャンセル): ")

    if (answer !== "y") {
      console.log("\n⏸  投稿をキャンセルしました。")
      console.log("   内容を調整したい場合はお知らせください。")
      return
    }

    // 5. 投稿実行
    const postId = await postToInstagram(caption, imageUrl)

    console.log("\n" + "=".repeat(60))
    console.log("✅ 全工程完了！")
    console.log(`   投稿商品       : ${selected.itemName.slice(0, 40)}`)
    console.log(`   Instagram Post ID: ${postId}`)
    console.log(`   価格           : ¥${selected.itemPrice.toLocaleString()}`)

  } catch (err) {
    console.error("\n❌ エラー:", err.message)
    process.exit(1)
  }
}

main()
