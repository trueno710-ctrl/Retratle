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

  const body = await req.json()
  const { date, currencyPair, direction, lot, entryPrice, exitPrice, pnlPips, pnlJpy, result, memo, tradeName } = body

  const properties: Record<string, unknown> = {
    "トレード": {
      title: [{ text: { content: tradeName || `${currencyPair} ${direction} ${date}` } }],
    },
    "通貨ペア": direction ? { select: { name: currencyPair } } : undefined,
    "方向": direction ? { select: { name: direction } } : undefined,
    "日付": date ? { date: { start: date } } : undefined,
    "ロット数": lot != null ? { number: lot } : undefined,
    "エントリー価格": entryPrice != null ? { number: entryPrice } : undefined,
    "決済価格": exitPrice != null ? { number: exitPrice } : undefined,
    "損益_pips": pnlPips != null ? { number: pnlPips } : undefined,
    "損益_円": pnlJpy != null ? { number: pnlJpy } : undefined,
    "結果": result ? { select: { name: result } } : undefined,
    "分析・メモ": memo ? { rich_text: [{ text: { content: memo } }] } : undefined,
    "更新日": { date: { start: new Date().toISOString().slice(0, 10) } },
  }

  // Remove undefined values
  const cleanProps = Object.fromEntries(
    Object.entries(properties).filter(([, v]) => v !== undefined)
  )

  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${NOTION_API_KEY}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify({
      parent: { database_id: NOTION_DATABASE_ID },
      properties: cleanProps,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ success: false, error: err }, { status: res.status })
  }

  const data = await res.json()
  return NextResponse.json({ success: true, url: data.url })
}
