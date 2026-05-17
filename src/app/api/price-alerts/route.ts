import { NextResponse } from "next/server"
import { getTopMovers } from "@/lib/jquants"
import { generatePriceReport } from "@/lib/claude"

function getMockMovers(threshold: number) {
  const today = new Date().toISOString().slice(0, 10)
  const data = [
    { ticker: "6140", name: "旭ダイヤモンド工業", price: 952, change: 148, changePercent: 18.4, volume: 3850000, high: 968, low: 810, open: 804, date: today, marketCapBillion: 437, sector: "精密工具・半導体素材", themes: ["次世代半導体", "合成ダイヤモンド"], context: "METI半導体支援策発表で材料視。合成ダイヤモンド研磨材がラピダス向け需要急増の報道。" },
    { ticker: "4320", name: "CEホールディングス", price: 1285, change: 195, changePercent: 17.9, volume: 2100000, high: 1310, low: 1098, open: 1090, date: today, marketCapBillion: 102, sector: "医療IT・DX", themes: ["医療DX", "電子カルテ"], context: "デジタル庁のEHRS全国展開加速発表でストップ高水準。時価総額102億円の小型株に資金集中。" },
    { ticker: "8035", name: "東京エレクトロン", price: 38450, change: 1650, changePercent: 4.48, volume: 4200000, high: 38900, low: 37200, open: 36800, date: today, marketCapBillion: 18500, sector: "半導体製造装置", themes: ["半導体", "AI"], context: "ラピダスへの追加補助金2,000億円決定で半導体装置セクター全体に買い。" },
    { ticker: "6832", name: "アオイ電子", price: 2180, change: 245, changePercent: 12.7, volume: 1890000, high: 2210, low: 1950, open: 1935, date: today, marketCapBillion: 134, sector: "防衛電子部品", themes: ["防衛DX", "電子部品国産化"], context: "防衛省の防衛DX予算3,200億円発表で防衛電子部品の小型株に資金流入。" },
    { ticker: "4183", name: "三井化学", price: 3680, change: -185, changePercent: -4.78, volume: 2900000, high: 3750, low: 3650, open: 3865, date: today, marketCapBillion: 3200, sector: "化学・素材", themes: ["ペロブスカイト太陽電池"], context: "海外競合メーカーのペロブスカイト太陽電池特許取得が報道され、競合懸念から売り。" },
    { ticker: "9984", name: "ソフトバンクグループ", price: 8450, change: -380, changePercent: -4.31, volume: 15600000, high: 8650, low: 8380, open: 8830, date: today, marketCapBillion: 8850, sector: "投資・通信", themes: ["AI投資", "半導体"], context: "AI投資先企業の業績懸念と米国長期金利上昇で保有資産評価額が減少。" },
  ]
  return data.filter(s => Math.abs(s.changePercent) >= threshold)
}

function getMockReport(stock: ReturnType<typeof getMockMovers>[number]): { report: string; xPost: string } {
  const isUp = stock.changePercent > 0
  const sign = isUp ? "+" : ""
  const direction = isUp ? "急騰" : "急落"

  const report = `【${stock.ticker} ${stock.name}】${sign}${stock.changePercent.toFixed(1)}%の${direction}。${stock.context} 時価総額${stock.marketCapBillion}億円。テーマ: ${stock.themes.join("・")}`

  const xPost = `【${stock.ticker} ${stock.name}】${sign}${stock.changePercent.toFixed(1)}%${direction}

${stock.context.slice(0, 60)}

時価総額 ${stock.marketCapBillion}億円
${stock.themes.map(t => `⭕${t}関連`).join("\n")}

#${stock.name.replace(/\s/g, "")} #日本株 #${stock.themes[0]?.replace(/\s/g, "")}`.slice(0, 280)

  return { report, xPost }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const threshold = Number(searchParams.get("threshold") || "3")

  try {
    let movers: ReturnType<typeof getMockMovers> = []
    try {
      const jquantsMovers = await getTopMovers(threshold)
      movers = jquantsMovers.map(m => ({
        ...m, marketCapBillion: 0, sector: "", themes: [], context: `${m.name}が大きく動きました。`
      }))
    } catch {
      movers = getMockMovers(threshold)
    }

    if (movers.length === 0) {
      movers = getMockMovers(threshold)
    }

    const alerts = []
    for (const stock of movers.slice(0, 8)) {
      let reportData: { report: string; xPost: string } = { report: "", xPost: "" }

      if (process.env.ANTHROPIC_API_KEY) {
        try {
          const result = await generatePriceReport(
            stock.ticker, stock.name, stock.changePercent, stock.price,
            (stock as ReturnType<typeof getMockMovers>[number]).marketCapBillion || 0,
            (stock as ReturnType<typeof getMockMovers>[number]).context || ""
          )
          reportData = result
        } catch {
          reportData = getMockReport(stock as ReturnType<typeof getMockMovers>[number])
        }
      } else {
        reportData = getMockReport(stock as ReturnType<typeof getMockMovers>[number])
      }

      alerts.push({
        ...stock,
        report: reportData.report,
        xPost: reportData.xPost,
        alertTime: new Date().toISOString(),
      })
    }

    return NextResponse.json({ success: true, data: alerts })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { xPost, report } = await req.json()
    const text = xPost || report
    if (!text) return NextResponse.json({ success: false, error: "text required" }, { status: 400 })

    if (!process.env.X_BEARER_TOKEN) {
      return NextResponse.json({ success: true, mock: true, message: "X API未設定 - 投稿をシミュレート", text })
    }

    const { postTweet } = await import("@/lib/xapi")
    const result = await postTweet(text)
    return NextResponse.json({ success: !!result, data: result })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
