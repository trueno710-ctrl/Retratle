#!/usr/bin/env node
// J-Quants APIから当日の株価データを取得し、data/stock-quotes/ にJSON保存する
// 実行方法: JQUANTS_REFRESH_TOKEN=xxx node scripts/fetch_stock_data.js

const fs = require("fs")
const path = require("path")
const https = require("https")

const BASE_URL = "https://api.jquants.com/v1"

function request(method, url, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null
    const req = https.request(
      url,
      {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
        },
      },
      (res) => {
        let data = ""
        res.on("data", (chunk) => (data += chunk))
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`))
            return
          }
          try {
            resolve(JSON.parse(data))
          } catch (err) {
            reject(err)
          }
        })
      }
    )
    req.on("error", reject)
    if (payload) req.write(payload)
    req.end()
  })
}

async function getIdToken(refreshToken) {
  const url = `${BASE_URL}/token/auth_refresh?refreshtoken=${encodeURIComponent(refreshToken)}`
  const data = await request("POST", url)
  if (!data.idToken) throw new Error("idToken取得に失敗しました")
  return data.idToken
}

async function getDailyQuotes(idToken, date) {
  const url = `${BASE_URL}/prices/daily_quotes?date=${date}`
  return new Promise((resolve, reject) => {
    https.get(
      url,
      { headers: { Authorization: `Bearer ${idToken}` } },
      (res) => {
        let data = ""
        res.on("data", (chunk) => (data += chunk))
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`))
            return
          }
          try {
            resolve(JSON.parse(data))
          } catch (err) {
            reject(err)
          }
        })
      }
    ).on("error", reject)
  })
}

async function main() {
  const refreshToken = process.env.JQUANTS_REFRESH_TOKEN
  if (!refreshToken) {
    console.error("JQUANTS_REFRESH_TOKEN が設定されていません")
    process.exit(1)
  }

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "")
  console.log(`[fetch_stock_data] ${today} の株価データを取得します`)

  const idToken = await getIdToken(refreshToken)
  const quotes = await getDailyQuotes(idToken, today)

  const dir = path.join(__dirname, "..", "data", "stock-quotes")
  fs.mkdirSync(dir, { recursive: true })

  const dateHyphen = new Date().toISOString().slice(0, 10)
  const filePath = path.join(dir, `${dateHyphen}.json`)
  fs.writeFileSync(filePath, JSON.stringify(quotes, null, 2))

  console.log(`[fetch_stock_data] 保存完了: ${filePath}`)
}

main().catch((err) => {
  console.error("[fetch_stock_data] エラー:", err.message)
  process.exit(1)
})
