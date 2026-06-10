import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface FxTradeData {
  date: string
  dayOfWeek: "月曜" | "火曜" | "水曜" | "木曜" | "金曜" | ""
  currencyPair: string
  direction: "買い（ロング）" | "売り（ショート）" | ""
  session: "アジア時間" | "ロンドン時間" | "ニューヨーク時間" | "ロンドン/NY重複" | ""
  timeframe: "1分足" | "5分足" | "15分足" | "1時間足" | "4時間足" | "日足" | "週足" | ""
  lot: number | null
  entryPrice: number | null
  exitPrice: number | null
  stopLossPips: number | null
  pnlPips: number | null
  pnlJpy: number | null
  result: "勝ち" | "負け" | "引き分け" | ""
  entryBasis: string
  memo: string
}

function inferSession(jstHour: number): FxTradeData["session"] {
  if (jstHour >= 8 && jstHour < 15) return "アジア時間"
  if (jstHour >= 15 && jstHour < 18) return "ロンドン時間"
  if (jstHour >= 22 || jstHour < 2) return "ニューヨーク時間"
  if (jstHour >= 18 && jstHour < 22) return "ロンドン/NY重複"
  return "アジア時間"
}

function inferDayOfWeek(dateStr: string): FxTradeData["dayOfWeek"] {
  const days: FxTradeData["dayOfWeek"][] = ["", "月曜", "火曜", "水曜", "木曜", "金曜", ""]
  const d = new Date(dateStr)
  return days[d.getDay()] || ""
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
        max_tokens: 2048,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
            {
              type: "text",
              text: `あなたはFXトレーダーのアシスタントです。このTradingViewのスクリーンショットを詳細に分析してください。

以下のJSON形式のみで返してください（コードブロック・説明文不要）:
{
  "date": "YYYY-MM-DD（画面左上やチャートの日付から。不明なら今日）",
  "currencyPair": "USD/JPY or EUR/JPY or GBP/JPY or EUR/USD or GBP/USD or AUD/JPY or NZD/USD or AUD/USD or USD/CHF or USD/CAD or その他",
  "direction": "買い（ロング） or 売り（ショート）（ポジションマーカーの色・方向から判断。緑/上向き=ロング、赤/下向き=ショート）",
  "timeframe": "1分足 or 5分足 or 15分足 or 1時間足 or 4時間足 or 日足 or 週足（チャートタイトルから）",
  "entryPrice": 数値（エントリー価格。ポジションラインや吹き出しから。不明はnull）,
  "exitPrice": 数値（決済価格。不明はnull）,
  "lot": 数値（ロット数。吹き出しの数字から。不明はnull）,
  "pnlPips": 数値（損益pips。吹き出しの「+XX pips」「-XX pips」から。不明はnull）,
  "pnlJpy": 数値（損益円。不明はnull）,
  "stopLossPips": 数値（損切り幅pips。不明はnull）,
  "result": "勝ち or 負け or 引き分け or （未決済なら空文字）",
  "entryBasis": "エントリー根拠を日本語で詳しく説明。以下の観点を含めること：①チャートパターン（EQH/EQL、CHoCH、BOS等のSMC概念が見えれば）②価格帯（フィボナッチレベル、サポレジ等）③トレンド方向（上昇/下降/レンジ）④エントリータイミングの根拠",
  "memo": "その他の補足（インジケーター、注目ライン、特記事項等）"
}`,
            },
          ],
        }],
      })

      const text = msg.content[0].type === "text" ? msg.content[0].text.trim() : "{}"
      const cleaned = text.replace(/```json|```/g, "").trim()
      const parsed = JSON.parse(cleaned)

      const today = new Date()
      const date = parsed.date || today.toISOString().slice(0, 10)
      const jstHour = today.getUTCHours() + 9

      result = {
        ...parsed,
        date,
        dayOfWeek: inferDayOfWeek(date),
        session: inferSession(jstHour),
        entryBasis: parsed.entryBasis || "",
        memo: parsed.memo || "",
      }
    } else {
      const lines = (csvText as string).split("\n").filter(Boolean)
      const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""))
      const lastTrade = lines[lines.length - 1].split(",").map(v => v.trim().replace(/^"|"$/g, ""))
      const get = (key: string) => {
        const idx = headers.findIndex(h => h.includes(key))
        return idx >= 0 ? lastTrade[idx] : ""
      }
      const typeVal = get("Type") || get("方向") || ""
      const profitVal = parseFloat(get("Profit") || get("損益") || "0")
      const today = new Date()
      const date = today.toISOString().slice(0, 10)
      result = {
        date,
        dayOfWeek: inferDayOfWeek(date),
        currencyPair: get("Symbol") || "その他",
        direction: typeVal.toLowerCase().includes("buy") || typeVal.includes("買") ? "買い（ロング）" : "売り（ショート）",
        session: inferSession(today.getUTCHours() + 9),
        timeframe: "",
        lot: parseFloat(get("Contracts") || "0") || null,
        entryPrice: parseFloat(get("Price") || "0") || null,
        exitPrice: null,
        stopLossPips: null,
        pnlPips: null,
        pnlJpy: profitVal || null,
        result: profitVal > 0 ? "勝ち" : profitVal < 0 ? "負け" : "引き分け",
        entryBasis: "",
        memo: `CSV取込: ${lines.length - 1}件`,
      }
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
