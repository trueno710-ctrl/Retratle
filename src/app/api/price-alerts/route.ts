import { NextResponse } from "next/server"
import { getTopMovers } from "@/lib/jquants"
import { generatePriceReport } from "@/lib/claude"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const threshold = Number(searchParams.get("threshold") || "3")

  try {
    let movers = []
    try {
      movers = await getTopMovers(threshold)
    } catch {
      movers = getMockMovers(threshold)
    }

    const alerts = []
    for (const stock of movers.slice(0, 8)) {
      let report = ""
      if (process.env.ANTHROPIC_API_KEY) {
        try {
          const context = `市場全体の動向や業界ニュースを踏まえた分析`
          report = await generatePriceReport(stock.ticker, stock.name, stock.changePercent, stock.price, context)
        } catch {
          report = getMockReport(stock.name, stock.changePercent)
        }
      } else {
        report = getMockReport(stock.name, stock.changePercent)
      }

      alerts.push({ ...stock, report, alertTime: new Date().toISOString() })
    }

    return NextResponse.json({ success: true, data: alerts })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { report } = await req.json()
    if (!report) return NextResponse.json({ success: false, error: "report required" }, { status: 400 })

    if (!process.env.X_BEARER_TOKEN) {
      return NextResponse.json({ success: true, mock: true, message: "X API未設定 - 投稿をシミュレート", report })
    }

    const { postTweet } = await import("@/lib/xapi")
    const result = await postTweet(report)
    return NextResponse.json({ success: !!result, data: result })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

function getMockReport(name: string, changePercent: number): string {
  const direction = changePercent > 0 ? "急騰" : "急落"
  const sign = changePercent > 0 ? "+" : ""
  return `【値動きレポート】${name}が${sign}${changePercent.toFixed(1)}%の${direction}。${
    changePercent > 0
      ? "好決算や業界再編期待が材料視され、機関投資家の買いが集中。短期的な過熱感に注意しつつも、業績モメンタムは継続と見る。"
      : "業績下方修正懸念や外部環境悪化が嫌気され売りが先行。下値支持線を割り込んだ場合は追加下落リスクに警戒。"
  } #日本株 #${name.replace(/\s/g, "")}`
}

function getMockMovers(threshold: number) {
  const data = [
    { ticker: "6758", name: "ソニーグループ", price: 14250, change: 580, changePercent: 4.24, volume: 8500000, high: 14350, low: 13820, open: 13670, date: new Date().toISOString().slice(0, 10) },
    { ticker: "9984", name: "ソフトバンクG", price: 8920, change: -380, changePercent: -4.09, volume: 12000000, high: 9050, low: 8880, open: 9300, date: new Date().toISOString().slice(0, 10) },
    { ticker: "4568", name: "第一三共", price: 5840, change: 245, changePercent: 4.38, volume: 5200000, high: 5890, low: 5610, open: 5595, date: new Date().toISOString().slice(0, 10) },
    { ticker: "8035", name: "東京エレクトロン", price: 36800, change: 1650, changePercent: 4.70, volume: 3100000, high: 37200, low: 35800, open: 35150, date: new Date().toISOString().slice(0, 10) },
  ]
  return data.filter(s => Math.abs(s.changePercent) >= threshold)
}
