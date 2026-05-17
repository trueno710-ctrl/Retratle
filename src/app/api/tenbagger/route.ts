import { NextResponse } from "next/server"
import { getMockTenbaggerCandidates } from "@/lib/jquants"
import { analyzeTenbaggerCandidates, type TenbaggerAnalysis } from "@/lib/claude"

function getMockAnalysis(): TenbaggerAnalysis[] {
  return [
    {
      ticker: "4125", score: 88,
      shikihoComment: "時価総額85億円・ミックス係数5.71の超割安小型株。半導体廃液処理でレアメタル回収という独自ポジション。国策の恩恵大。",
      mixCoefficient: 5.71, themes: ["レアメタル関連", "半導体関連", "産業廃棄物処理◎"],
      catalysts: ["レアメタル国産化政策加速", "半導体廃液処理需要急増", "都市鉱山法整備"],
      targetMultiple: "3バガー", riskFactors: ["小型株のため流動性リスク", "レアメタル価格変動"],
    },
    {
      ticker: "6140", score: 82,
      shikihoComment: "合成ダイヤモンドで次世代半導体素材をグローバルニッチ独占。自己資本比率84%・有利子負債ゼロの超健全財務。ミックス係数7.96。",
      mixCoefficient: 7.96, themes: ["合成ダイヤモンド関連", "次世代半導体◎", "グローバルニッチ"],
      catalysts: ["次世代半導体（SiC/GaN）普及加速", "METI半導体支援10兆円超", "研磨材需要急増"],
      targetMultiple: "3バガー", riskFactors: ["需要サイクルの変動", "技術トレンドの変化リスク"],
    },
    {
      ticker: "4320", score: 84,
      shikihoComment: "時価総額102億円。医療DX・電子カルテ普及の直接受益者。ROE13.5%と高収益。上方修正狙いが期待できる局面。",
      mixCoefficient: 13.94, themes: ["医療DX関連◎", "電子カルテ関連", "上方修正狙い"],
      catalysts: ["EHRS全国展開（12,000施設突破）", "マイナ保険証連携義務化", "医療DX500億円補助金"],
      targetMultiple: "3バガー", riskFactors: ["医療政策変更リスク", "競合他社参入"],
    },
    {
      ticker: "3655", score: 75,
      shikihoComment: "20期連続増収の優良株。有利子負債ゼロ・ROE18.1%。AI・医療データ分析で政府DX受注が急増中。",
      mixCoefficient: 84.28, themes: ["AI関連◎", "医療データ分析", "20期連続増収◎"],
      catalysts: ["医療AI需要拡大", "政府DXシステム受注拡大", "フィジカルAI関連AI分析基盤構築"],
      targetMultiple: "2バガー", riskFactors: ["高PBRのため割高感あり", "競合ITコンサル参入"],
    },
    {
      ticker: "5821", score: 70,
      shikihoComment: "時価総額488億円・有利子負債ゼロ。データセンター急増で特殊ケーブル需要が爆発的に増加。自己資本比率74%の堅固財務。",
      mixCoefficient: 12.43, themes: ["データセンター関連◎", "5G・6G関連", "再エネ配線"],
      catalysts: ["国内データセンター建設ラッシュ", "5G基地局整備加速", "再エネ設備配線需要増"],
      targetMultiple: "2バガー", riskFactors: ["原材料（銅）価格上昇リスク", "大手競合との競争激化"],
    },
    {
      ticker: "7456", score: 65,
      shikihoComment: "都市鉱山・貴金属リサイクルの専門企業。半導体・電子材料分野でのレアメタル回収需要が高まる。連続増配6年。",
      mixCoefficient: 15.60, themes: ["都市鉱山◎", "貴金属リサイクル", "半導体電子材料"],
      catalysts: ["レアメタル国産化政策", "半導体リサイクル義務化", "貴金属価格高止まり"],
      targetMultiple: "2バガー", riskFactors: ["時価総額1,415億円でやや大型", "市況依存"],
    },
    {
      ticker: "6584", score: 72,
      shikihoComment: "ミックス係数6.34と圧倒的割安。データセンター冷却システムという時流テーマ×インド展開で成長2軸。連続増配3年。",
      mixCoefficient: 6.34, themes: ["データセンター冷却◎", "インド関連", "割安成長株"],
      catalysts: ["データセンター冷却需要急増", "インド工場増産", "自動車EV化対応部品"],
      targetMultiple: "3バガー", riskFactors: ["自動車産業依存度高い", "為替リスク"],
    },
    {
      ticker: "4078", score: 68,
      shikihoComment: "ミックス係数6.68の割安株。MLCC向け電子材料でニッチトップ。配当利回り4.37%の高配当も魅力。増収増益・増配継続。",
      mixCoefficient: 6.68, themes: ["MLCC電子材料◎", "ニッチトップ", "高配当4.37%"],
      catalysts: ["MLCC需要拡大（AI・EV）", "電子材料国産化支援", "増配継続"],
      targetMultiple: "2バガー", riskFactors: ["特定顧客依存度高い", "電子部品市況変動"],
    },
  ]
}

export async function GET() {
  try {
    const candidates = getMockTenbaggerCandidates()

    let analysisResults: TenbaggerAnalysis[] = []

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
        score: 60,
        shikihoComment: "分析データを取得中...",
        mixCoefficient: c.per * c.pbr,
        themes: c.themes,
        catalysts: ["国策テーマ関連", "業績拡大期待"],
        targetMultiple: "2バガー",
        riskFactors: ["市場全体のリスク"],
      }
      return { ...c, ...analysis }
    }).sort((a, b) => b.score - a.score)

    return NextResponse.json({ success: true, data: enriched })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
