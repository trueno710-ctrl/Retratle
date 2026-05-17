import { NextResponse } from "next/server"
import { getMockTenbaggerCandidates } from "@/lib/jquants"
import { analyzeTenbaggerCandidates } from "@/lib/claude"

export async function GET() {
  try {
    const candidates = getMockTenbaggerCandidates()

    let analysisResults: Array<{ ticker: string; score: number; analysis: string; catalysts: string[] }> = []

    if (process.env.ANTHROPIC_API_KEY) {
      try {
        analysisResults = await analyzeTenbaggerCandidates(candidates)
      } catch {
        analysisResults = getMockAnalysis()
      }
    } else {
      analysisResults = getMockAnalysis()
    }

    const enriched = candidates.map((c) => {
      const analysis = analysisResults.find((a) => a.ticker === c.ticker) || {
        ticker: c.ticker,
        score: Math.floor(Math.random() * 30) + 55,
        analysis: "分析データを取得中...",
        catalysts: ["成長余地あり", "市場拡大中"],
      }
      return { ...c, ...analysis }
    }).sort((a, b) => b.score - a.score)

    return NextResponse.json({ success: true, data: enriched })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

function getMockAnalysis() {
  return [
    { ticker: "4385", score: 82, analysis: "フリマアプリ国内首位。米国・欧州展開加速中で海外売上比率上昇が株価の次のカタリスト", catalysts: ["海外展開加速", "SaaSモデルへの転換", "黒字化達成"] },
    { ticker: "3659", score: 71, analysis: "グローバルゲーム展開で安定収益。「Dungeon&Fighter」モバイル版好調で業績が再加速", catalysts: ["新作ゲームリリース", "中国市場回復", "PC→モバイル転換"] },
    { ticker: "4661", score: 68, analysis: "テーマパーク独占的地位。訪日外客急増でアトラクション単価引き上げ余地大", catalysts: ["インバウンド需要", "新アトラクション開業", "外貨収入増加"] },
    { ticker: "6098", score: 78, analysis: "Indeed世界展開と人材DXで2軸成長。日本の労働市場変革の最大受益者の一つ", catalysts: ["HR Tech拡大", "Indeed海外成長", "日本の人手不足構造"] },
    { ticker: "4478", score: 88, analysis: "中小企業DXの中核プラットフォーム。ARR成長率40%超を維持し、収益化の転換点に近づく", catalysts: ["ARR拡大加速", "インボイス制度特需", "黒字転換期待"] },
    { ticker: "3697", score: 85, analysis: "IT品質保証の専門企業として独自ポジション。エンジニア採用力で競合追随困難な参入障壁", catalysts: ["DX需要継続", "エンジニア不足環境", "高単価案件増"] },
  ]
}
