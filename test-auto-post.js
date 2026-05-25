#!/usr/bin/env node
/**
 * 楽天アフィリエイト 全自動テスト投稿スクリプト
 * 実行方法: node test-auto-post.js
 */

const https = require("https")
const http = require("http")

// ===== 設定 =====
// .env.local から読み込む
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

function fetchJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const lib = urlObj.protocol === "https:" ? https : http
    const req = lib.request(url, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
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
  console.log(`✅ 選定商品: ${selected.itemName.slice(0, 50)}`)
  console.log(`   価格: ¥${selected.itemPrice.toLocaleString()} | ★${selected.reviewAverage}(${selected.reviewCount}件)`)
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
  const caption = res.content[0].text.trim()
  console.log("✅ 投稿文生成完了")
  console.log("--- プレビュー（最初の100文字）---")
  console.log(caption.slice(0, 100) + "...")
  return caption
}

// Step 4: CM画像URLを生成
function generateCmImageUrl(item) {
  const params = new URLSearchParams({
    itemName: item.itemName,
    price: String(item.itemPrice),
    imageUrl: item.mediumImageUrls[0]?.imageUrl || "",
    reviewAverage: String(item.reviewAverage),
    reviewCount: String(item.reviewCount),
    shopName: item.shopName,
    account: "@otoku_ai_life",
  })
  return `${CONFIG.siteUrl}/api/rakuten/generate-image?${params}`
}

// Step 5: Instagramに投稿
async function postToInstagram(caption, imageUrl) {
  console.log("\n📤 Instagramに投稿中...")
  console.log(`   画像URL: ${imageUrl.slice(0, 80)}...`)

  // Step 5a: メディアコンテナ作成
  const createParams = new URLSearchParams({
    caption,
    image_url: imageUrl,
    access_token: CONFIG.instagramToken,
  })
  const createRes = await fetchJson(
    `https://graph.facebook.com/v18.0/${CONFIG.instagramUserId}/media?${createParams}`,
    { method: "POST" }
  )

  if (createRes.error) {
    throw new Error(`メディア作成エラー: ${JSON.stringify(createRes.error)}`)
  }
  console.log(`✅ メディアコンテナ作成: ${createRes.id}`)

  // Step 5b: 公開
  await new Promise(r => setTimeout(r, 2000)) // 2秒待機
  const publishParams = new URLSearchParams({
    creation_id: createRes.id,
    access_token: CONFIG.instagramToken,
  })
  const publishRes = await fetchJson(
    `https://graph.facebook.com/v18.0/${CONFIG.instagramUserId}/media_publish?${publishParams}`,
    { method: "POST" }
  )

  if (publishRes.error) {
    throw new Error(`公開エラー: ${JSON.stringify(publishRes.error)}`)
  }
  console.log(`🎉 Instagram投稿完了！ Post ID: ${publishRes.id}`)
  return publishRes.id
}

// メイン実行
async function main() {
  console.log("🚀 楽天アフィリエイト全自動投稿テスト開始")
  console.log("=".repeat(50))

  try {
    // 1. 検索
    const items = await searchRakuten("アニメ フィギュア 人気")

    // 2. AI選定
    const selected = await selectBestItem(items)

    // 3. 投稿文生成
    const caption = await generatePost(selected)

    // 4. CM画像URL
    const imageUrl = selected.mediumImageUrls[0]?.imageUrl || ""
    console.log(`\n🎬 使用画像: ${imageUrl.slice(0, 60)}...`)

    // 5. Instagram投稿
    const postId = await postToInstagram(caption, imageUrl)

    console.log("\n" + "=".repeat(50))
    console.log("✅ 全工程完了！")
    console.log(`   投稿商品: ${selected.itemName.slice(0, 40)}`)
    console.log(`   Instagram Post ID: ${postId}`)
    console.log(`   価格: ¥${selected.itemPrice.toLocaleString()}`)

  } catch (err) {
    console.error("\n❌ エラー:", err.message)
    process.exit(1)
  }
}

main()
