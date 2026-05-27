import { NextResponse } from "next/server"
import { getStockPrice } from "@/lib/jquants"
import { sendSlackBlocks } from "@/lib/slack"

interface Holding {
  code: string
  name: string
  qty: number
  avgCost: number
  type: "現物" | "信用"
}

const PORTFOLIO: Holding[] = [
  { code: "3350", name: "メタプラネット",   qty: 100, avgCost: 443.00,   type: "現物" },
  { code: "3543", name: "コメダHD",         qty: 100, avgCost: 3015.00,  type: "現物" },
  { code: "5721", name: "エスクリプト",     qty: 100, avgCost: 139.00,   type: "現物" },
  { code: "5957", name: "日東精工",         qty: 300, avgCost: 782.89,   type: "現物" },
  { code: "6140", name: "旭ダイヤモンド",   qty: 300, avgCost: 1301.66,  type: "現物" },
  { code: "6223", name: "西部技研",         qty: 100, avgCost: 2345.00,  type: "現物" },
  { code: "8306", name: "三菱UFJFG",        qty: 100, avgCost: 2533.00,  type: "現物" },
  { code: "9432", name: "NTT",              qty: 100, avgCost: 155.30,   type: "現物" },
  { code: "1938", name: "日本リーテック",   qty: 100, avgCost: 2994.00,  type: "信用" },
  { code: "290A", name: "SYNSPECTIVE",      qty: 500, avgCost: 1475.60,  type: "信用" },
]

function fmt(n: number): string {
  return n.toLocaleString("ja-JP", { maximumFractionDigits: 0 })
}

function sign(n: number): string {
  return n >= 0 ? `+${fmt(n)}` : fmt(n)
}

function emoji(n: number): string {
  if (n > 0) return "📈"
  if (n < 0) return "📉"
  return "➡️"
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get("authorization")
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  const results = await Promise.all(
    PORTFOLIO.map(async (h) => {
      const price = await getStockPrice(h.code)
      const currentPrice = price?.price ?? h.avgCost
      const pnl = (currentPrice - h.avgCost) * h.qty
      const pnlPct = ((currentPrice - h.avgCost) / h.avgCost) * 100
      return { ...h, currentPrice, pnl, pnlPct, change: price?.change ?? 0 }
    })
  )

  const totalPnl = results.reduce((s, r) => s + r.pnl, 0)
  const spotPnl = results.filter(r => r.type === "現物").reduce((s, r) => s + r.pnl, 0)
  const marginPnl = results.filter(r => r.type === "信用").reduce((s, r) => s + r.pnl, 0)

  const now = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })

  const rows = results.map(r =>
    `${emoji(r.pnl)} *${r.name}* (${r.code})　現在値: ${fmt(r.currentPrice)}円　損益: ${sign(r.pnl)}円 (${r.pnlPct >= 0 ? "+" : ""}${r.pnlPct.toFixed(1)}%)`
  ).join("\n")

  const blocks = [
    {
      type: "header",
      text: { type: "plain_text", text: "📊 ポートフォリオ 17時更新", emoji: true },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${now}* 時点\n\n*合計損益: ${sign(totalPnl)}円*\n現物: ${sign(spotPnl)}円　信用: ${sign(marginPnl)}円`,
      },
    },
    { type: "divider" },
    {
      type: "section",
      text: { type: "mrkdwn", text: `*📋 現物株*\n${rows.slice(0, 8 * rows.length / results.length)}` },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*📋 個別明細*\n${rows}`,
      },
    },
  ]

  await sendSlackBlocks(blocks)

  return NextResponse.json({ ok: true, totalPnl, spotPnl, marginPnl })
}
