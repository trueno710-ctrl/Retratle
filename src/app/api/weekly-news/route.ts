import { NextResponse } from "next/server"
import { summarizeWeeklyNews } from "@/lib/claude"

// 2026年の実際のニュースに基づくモックデータ
const MOCK_NEWS_2026 = [
  "【経済産業省】ラピダスへ追加補助金2,000億円交付決定。2027年2nmチップ量産に向けて国内半導体エコシステム整備を加速。東京エレクトロン・アドバンテスト・旭ダイヤモンド工業など関連株が急騰。",
  "【デジタル庁】電子カルテ情報共有サービス（EHRS）の参加医療機関数が12,000施設を突破。マイナ保険証との連携完成でCEホールディングスなど医療DX株に買い集まる。",
  "【環境省】GX排出量取引市場（GX-ETS）の炭素価格が1トン3,200円に上昇。再エネ関連投資加速でGSユアサ・三井化学・日東電工などGX株が堅調。",
  "【防衛省】令和8年度防衛DX予算3,200億円確定。AI・ドローン・サイバー・宇宙領域強化で三菱重工業・アオイ電子など防衛関連小型株に資金流入。",
  "【日銀】政策金利を0.75%に追加引き上げ。円相場は一時140円台に突入。メガバンク株上昇・輸出株は売り圧力。三菱UFJなど銀行株が年初来高値を更新。",
  "【経済産業省】フィジカルAI推進に3,873億円投資計画発表。製造業向けAI・ロボット普及で安川電機・ファナック・キーエンス株に強い追い風。",
  "【観光庁】訪日外客数が月間400万人を突破し過去最高を更新。インバウンド消費額が年間8兆円ペースに。百貨店・ホテル・航空株が全面高。",
  "【国土交通省】ドローン・自動配送ロボットの商業利用を大幅規制緩和。物流DX関連株・ドローンメーカー株が急騰。2030年物流自動化50%目標を正式発表。",
]

const WEEKLY_PICKS_2026 = [
  {
    ticker: "4125",
    name: "三和油化工業",
    price: 2180,
    per: 8.52,
    pbr: 0.67,
    mixCoefficient: 5.71,
    marketCapBillion: 85,
    themes: ["レアメタル関連", "半導体関連", "産業廃棄物処理◎"],
    shikihoComment: "時価総額85億円の超割安小型株。ミックス係数5.71と驚異的な割安水準。半導体廃液からのレアメタル回収事業が国策の追い風。",
    catalysts: ["レアメタル国産化政策加速", "半導体廃液処理需要急増"],
  },
  {
    ticker: "6832",
    name: "アオイ電子",
    price: 2180,
    per: 12.8,
    pbr: 1.45,
    mixCoefficient: 18.56,
    marketCapBillion: 134,
    themes: ["防衛電子部品関連◎", "半導体パッケージ", "防衛DX"],
    shikihoComment: "時価総額134億円の防衛電子部品小型株。防衛DX予算3,200億円で直接恩恵。有利子負債ゼロ・自己資本比率58%の健全財務。",
    catalysts: ["防衛DX予算大幅増額", "電子部品国産化推進", "サイバー防衛需要増"],
  },
  {
    ticker: "4320",
    name: "CEホールディングス",
    price: 1285,
    per: 8.55,
    pbr: 1.63,
    mixCoefficient: 13.94,
    marketCapBillion: 102,
    themes: ["電子カルテ関連◎", "医療DX", "上方修正狙い"],
    shikihoComment: "EHRS12,000施設突破で上方修正が濃厚。時価総額102億円・ROE13.5%・配当利回り3.33%の高収益小型成長株。",
    catalysts: ["マイナ保険証連携義務化", "電子カルテ全国展開加速", "上期上方修正期待"],
  },
]

export async function GET() {
  try {
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)

    let summary = ""
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        summary = await summarizeWeeklyNews(MOCK_NEWS_2026)
      } catch {
        summary = getMockSummary()
      }
    } else {
      summary = getMockSummary()
    }

    return NextResponse.json({
      success: true,
      data: {
        weekRange: {
          start: weekStart.toISOString().slice(0, 10),
          end: weekEnd.toISOString().slice(0, 10),
        },
        newsItems: MOCK_NEWS_2026.map((text, i) => ({
          id: String(i + 1),
          text,
          date: new Date(weekStart.getTime() + Math.floor(i / 2) * 86400000).toISOString().slice(0, 10),
          category: getCategory(text),
          importance: getImportance(text),
        })),
        summary,
        weeklyPicks: WEEKLY_PICKS_2026,
      },
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

function getCategory(text: string): string {
  if (text.includes("半導体") || text.includes("ラピダス")) return "半導体・AI"
  if (text.includes("医療") || text.includes("電子カルテ")) return "医療DX"
  if (text.includes("GX") || text.includes("再エネ") || text.includes("排出量")) return "GX・環境"
  if (text.includes("防衛")) return "防衛DX"
  if (text.includes("日銀") || text.includes("金融") || text.includes("円")) return "金融・金利"
  if (text.includes("ロボット") || text.includes("AI") || text.includes("フィジカル")) return "フィジカルAI"
  if (text.includes("インバウンド") || text.includes("訪日")) return "インバウンド"
  if (text.includes("物流") || text.includes("ドローン")) return "物流DX"
  return "市場全般"
}

function getImportance(text: string): "高" | "中" | "低" {
  const highKeywords = ["ストップ高", "急騰", "2,000億", "3,200億", "12,000施設", "過去最高", "年初来高値"]
  const midKeywords = ["急騰", "全面高", "上昇", "強化", "拡大", "補助金"]
  if (highKeywords.some(k => text.includes(k))) return "高"
  if (midKeywords.some(k => text.includes(k))) return "中"
  return "低"
}

function getMockSummary(): string {
  return `【今週の市場総括】
日銀の追加利上げ（0.75%）と防衛・半導体・医療DXの国策テーマが交錯した週。内需・国策株が主役となり、日経平均は小幅高でナスダック連動から脱却の兆し。

【注目セクター × 恩恵銘柄】
• 半導体・AI: 8035 東京エレクトロン（ラピダス補助金2,000億で装置需要確定）/ 6140 旭ダイヤモンド工業（合成ダイヤモンド研磨材でラピダス向け需要急増）
• 医療DX: 4320 CEホールディングス（EHRS12,000施設突破で上方修正必至・小型株に資金集中）
• 防衛DX: 6832 アオイ電子（防衛DX予算3,200億円決定・時価総額134億の超小型防衛株）

【来週の重要イベント＆注目ポイント】
• 米国FOMC議事要旨（水曜）: ドル円・長期金利に影響。輸出株の方向性を左右
• 主要企業決算ラッシュ（月〜金）: 東エレク・キーエンス・安川電機に注目
• GX-ETS 第2回入札（木曜）: 炭素価格の推移でGX株の方向感決まる

【今週の四季報スタイルピックアップ銘柄】

【4125 三和油化工業】
📖四季報注目銘柄📖
時価総額 85億円 PER 8.52倍 PBR 0.67倍
ミックス係数 5.71（10以下◎）
⭕レアメタル関連 ⭕半導体関連 ⭕産業廃棄物処理◎ ⭕超割安◎

【6832 アオイ電子】
📖今週の急騰銘柄📖
時価総額 134億円 PER 12.8倍 PBR 1.45倍
ミックス係数 18.56
⭕防衛電子部品関連◎ ⭕半導体パッケージ ⭕有利子負債ゼロ◎ ⭕防衛DX直接恩恵`
}
