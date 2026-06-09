import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface FxTradeData {
  date: string
  currencyPair: string
  direction: "買い（ロング）" | "売り（ショート）" | ""
  lot: number | null
  entryPrice: number | null
  exitPrice: number | null
  pnlPips: number | null
  pnlJpy: number | null
  result: "勝ち" | "負け" | "引き分け" | ""
  memo: string
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const imageFile = formData.get("image") as File | null
    const csvText = formData.get("csv") as string | null

    if (!imageFile && !csvText) {
      return NextResponse.json({ success: false, error: "画像またはCSVが必要です" }, { status: 400 })
    }

    let result: FxTradeData

    if (imageFile) {
      const bytes = await imageFile.arrayBuffer()
      const base64 = Buffer.from(bytes).toString("base64")
      const mediaType = (imageFile.type || "image/png") as "image/png" | "image/jpeg" | "image/gif" | "image/webp"

      const msg = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            {
              type: "text",
              text: `このTradingViewのスクリーンショットからFXトレード情報を抽出してください。
以下のJSON形式で返してください（コードブロックなし、JSONのみ）:
{
  "date": "YYYY-MM-DD（取引日。不明なら今日の日付）",
  "currencyPair": "USD/JPY or EUR/JPY or GBP/JPY or EUR/USD or GBP/USD or AUD/JPY or USD/CHF or その他",
  "direction": "買い（ロング） or 売り（ショート）",
  "lot": 数値（ロット・枚数。不明ならnull）,
  "entryPrice": 数値（エントリー価格。不明ならnull）,
  "exitPrice": 数値（決済価格。不明ならnull）,
  "pnlPips": 数値（損益pips。不明ならnull）,
  "pnlJpy": 数値（損益円。不明ならnull）,
  "result": "勝ち or 負け or 引き分け or （不明なら空文字）",
  "memo": "画像から読み取れる補足情報やチャートの状況（日本語で）"
}`,
            },
          ],
        }],
      })

      const text = msg.content[0].type === "text" ? msg.content[0].text.trim() : "{}"
      const cleaned = text.replace(/```json|```/g, "").trim()
      result = JSON.parse(cleaned)
    } else {
      // CSV parse (TradingView strategy tester format)
      const lines = (csvText as string).split("\n").filter(Boolean)
      const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""))
      const lastTrade = lines[lines.length - 1].split(",").map(v => v.trim().replace(/^"|"$/g, ""))

      const get = (key: string) => {
        const idx = headers.findIndex(h => h.includes(key))
        return idx >= 0 ? lastTrade[idx] : ""
      }

      const typeVal = get("Type") || get("方向") || ""
      const profitVal = parseFloat(get("Profit") || get("損益") || "0")

      result = {
        date: new Date().toISOString().slice(0, 10),
        currencyPair: get("Symbol") || get("通貨ペア") || "その他",
        direction: typeVal.toLowerCase().includes("buy") || typeVal.includes("買") ? "買い（ロング）" : "売り（ショート）",
        lot: parseFloat(get("Contracts") || get("ロット") || "0") || null,
        entryPrice: parseFloat(get("Price") || get("エントリー") || "0") || null,
        exitPrice: null,
        pnlPips: null,
        pnlJpy: profitVal || null,
        result: profitVal > 0 ? "勝ち" : profitVal < 0 ? "負け" : "引き分け",
        memo: `CSV取込: ${lines.length - 1}件のトレード記録`,
      }
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
