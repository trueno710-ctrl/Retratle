import { NextRequest, NextResponse } from "next/server"

const NOTION_API_KEY = process.env.NOTION_API_KEY
const NOTION_DATABASE_ID = "99cd29e6-29ec-47ec-8d39-35a2bce6fe7f"

export async function POST(req: NextRequest) {
  if (!NOTION_API_KEY) {
    return NextResponse.json(
      { success: false, error: "NOTION_API_KEY が .env.local に設定されていません" },
      { status: 500 }
    )
  }

  const b = await req.json()
  const title = b.tradeName || `${b.currencyPair} ${b.direction} ${b.date}`

  const props: Record<string, unknown> = {
    "トレード": { title: [{ text: { content: title } }] },
    "日付": b.date ? { date: { start: b.date } } : undefined,
    "通貨ペア": b.currencyPair ? { select: { name: b.currencyPair } } : undefined,
    "方向": b.direction ? { select: { name: b.direction } } : undefined,
    "セッション": b.session ? { select: { name: b.session } } : undefined,
    "曜日": b.dayOfWeek ? { select: { name: b.dayOfWeek } } : undefined,
    "時間足": b.timeframe ? { select: { name: b.timeframe } } : undefined,
    "ロット数": b.lot != null ? { number: b.lot } : undefined,
    "エントリー価格": b.entryPrice != null ? { number: b.entryPrice } : undefined,
    "決済価格": b.exitPrice != null ? { number: b.exitPrice } : undefined,
    "損切り幅_pips": b.stopLossPips != null ? { number: b.stopLossPips } : undefined,
    "損益_pips": b.pnlPips != null ? { number: b.pnlPips } : undefined,
    "損益_円": b.pnlJpy != null ? { number: b.pnlJpy } : undefined,
    "結果": b.result ? { select: { name: b.result } } : undefined,
    "エントリー根拠": b.entryBasis ? { rich_text: [{ text: { content: b.entryBasis } }] } : undefined,
    "分析・メモ": b.memo ? { rich_text: [{ text: { content: b.memo } }] } : undefined,
    "更新日": { date: { start: new Date().toISOString().slice(0, 10) } },
  }

  const cleanProps = Object.fromEntries(Object.entries(props).filter(([, v]) => v !== undefined))

  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${NOTION_API_KEY}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify({ parent: { database_id: NOTION_DATABASE_ID }, properties: cleanProps }),
  })

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ success: false, error: err }, { status: res.status })
  }

  const data = await res.json()
  return NextResponse.json({ success: true, url: data.url })
}
