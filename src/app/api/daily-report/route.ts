import { NextResponse } from "next/server"
import { getMockMinistryPosts } from "@/lib/xapi"
import { analyzeMinistryPost, type ShikihoRecommendation } from "@/lib/claude"
import { MINISTRIES } from "@/lib/ministries"
import { loadReports, saveReport, getReportByDate, markPostedToX, type DailyReport, type StockPick, type MinistryPostResult } from "@/lib/reportStore"
import Anthropic from "@anthropic-ai/sdk"

// Vercel Cron / 外部cronからの呼び出しを検証
function verifyCronSecret(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true  // 未設定時はローカル開発用として許可
  const authHeader = req.headers.get("authorization")
  return authHeader === `Bearer ${secret}`
}

// モック推薦銘柄（APIキー未設定時のフォールバック）
function getMockPicksForMinistry(ministry: string, sector: string, postText: string): ShikihoRecommendation[] {
  const postLower = postText.toLowerCase()

  if (sector.includes("半導体") || postLower.includes("半導体") || postLower.includes("ラピダス")) {
    return [
      { ticker: "6140", name: "旭ダイヤモンド工業", marketCapBillion: 437, per: 11.53, pbr: 0.69, roe: 4.6, roa: 3.9, equityRatio: 84.2, dividendYield: 4.26, mixCoefficient: 7.96, hasZeroDebt: true, themes: ["合成ダイヤモンド", "次世代半導体◎", "グローバルニッチ"], reason: "合成ダイヤモンド研磨材でラピダス向け需要急増。ミックス係数7.96の割安株。", confidence: "高", catalysts: ["ラピダス2nmチップ量産", "半導体補助金拡大"], tenbaggerScore: 82 },
      { ticker: "4125", name: "三和油化工業", marketCapBillion: 85, per: 8.52, pbr: 0.67, roe: 6.1, roa: 3.7, equityRatio: 60.0, dividendYield: 2.17, mixCoefficient: 5.71, hasZeroDebt: false, themes: ["レアメタル関連", "半導体関連", "産業廃棄物◎"], reason: "時価総額85億の超小型。半導体廃液レアメタル回収が国策追い風。Mix5.71の超割安。", confidence: "高", catalysts: ["半導体廃液処理需要増", "レアメタル国産化"], tenbaggerScore: 88 },
    ]
  }
  if (sector.includes("医療") || postLower.includes("医療") || postLower.includes("電子カルテ")) {
    return [
      { ticker: "4320", name: "CEホールディングス", marketCapBillion: 102, per: 8.55, pbr: 1.63, roe: 13.5, roa: 7.3, equityRatio: 54.2, dividendYield: 3.33, mixCoefficient: 13.94, hasZeroDebt: false, themes: ["電子カルテ◎", "医療DX", "上方修正狙い"], reason: "EHRS全国展開12,000施設突破で上方修正必至。時価総額102億の小型成長株。", confidence: "高", catalysts: ["電子カルテ義務化", "マイナ保険証連携"], tenbaggerScore: 84 },
    ]
  }
  if (sector.includes("防衛") || postLower.includes("防衛") || postLower.includes("dX")) {
    return [
      { ticker: "6832", name: "アオイ電子", marketCapBillion: 134, per: 12.8, pbr: 1.45, roe: 11.8, roa: 6.9, equityRatio: 58.3, dividendYield: 2.35, mixCoefficient: 18.56, hasZeroDebt: true, themes: ["防衛電子部品◎", "半導体パッケージ", "防衛DX"], reason: "防衛DX予算3,200億円の直接受益者。時価総額134億の小型防衛株。", confidence: "高", catalysts: ["防衛DX予算増額", "電子部品国産化"], tenbaggerScore: 80 },
    ]
  }
  if (sector.includes("GX") || postLower.includes("gx") || postLower.includes("再エネ") || postLower.includes("排出量")) {
    return [
      { ticker: "4183", name: "三井化学", marketCapBillion: 3200, per: 12.8, pbr: 0.95, roe: 7.5, roa: 3.8, equityRatio: 42.3, dividendYield: 3.12, mixCoefficient: 12.16, hasZeroDebt: false, themes: ["ペロブスカイト太陽電池◎", "GX関連", "割安PBR0.95"], reason: "ペロブスカイト太陽電池材料の国内リーダー。GX政策加速で中長期の需要急増。", confidence: "高", catalysts: ["GX-ETS炭素価格上昇", "再エネ実証事業参加"], tenbaggerScore: 73 },
      { ticker: "6674", name: "GSユアサ", marketCapBillion: 4800, per: 18.5, pbr: 2.1, roe: 11.4, roa: 5.2, equityRatio: 45.8, dividendYield: 1.85, mixCoefficient: 38.85, hasZeroDebt: false, themes: ["蓄電池関連◎", "EV関連", "GX直接恩恵"], reason: "EV・定置用蓄電池の国内最大手。炭素価格上昇で再エネ蓄電需要が急拡大。", confidence: "中", catalysts: ["GX投資加速", "EV普及拡大"], tenbaggerScore: 65 },
    ]
  }
  if (postLower.includes("ロボット") || postLower.includes("ai") || postLower.includes("フィジカル")) {
    return [
      { ticker: "6506", name: "安川電機", marketCapBillion: 12800, per: 31.5, pbr: 4.8, roe: 15.2, roa: 9.8, equityRatio: 64.2, dividendYield: 0.98, mixCoefficient: 151.2, hasZeroDebt: true, themes: ["産業ロボット◎", "フィジカルAI", "有利子負債ゼロ"], reason: "フィジカルAI政策3,873億円の最大受益者。産業ロボット・サーボモーターで国内首位。", confidence: "高", catalysts: ["フィジカルAI政府投資", "製造業自動化需要"], tenbaggerScore: 68 },
    ]
  }
  // デフォルト
  return [
    { ticker: "4307", name: "野村総合研究所", marketCapBillion: 8200, per: 28.5, pbr: 4.8, roe: 17.2, roa: 9.8, equityRatio: 68.5, dividendYield: 0.85, mixCoefficient: 136.8, hasZeroDebt: true, themes: ["DX関連", "ITコンサルティング", "政府DX受注◎"], reason: "省庁DX政策の主要受託企業。政府システム刷新で安定的な大型受注が継続。", confidence: "中", catalysts: ["行政DX加速", "政府クラウド移行"], tenbaggerScore: 55 },
  ]
}

async function generateDaySummary(picks: StockPick[], ministryCount: number): Promise<{ summary: string; xPost: string }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return getMockDaySummary(picks, ministryCount)
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: `あなたは「四季報分析@テンバガー研究所」スタイルの株式アナリストです。日本語で簡潔かつ専門的に分析します。`,
      messages: [{
        role: "user",
        content: `本日（${new Date().toLocaleDateString("ja-JP")}）の省庁X投稿分析から以下の銘柄を選定しました。

【選定銘柄】
${picks.slice(0, 6).map(p =>
  `・【${p.ticker} ${p.name}】時価総額${p.marketCapBillion}億 PER${p.per} PBR${p.pbr} Mix${p.mixCoefficient.toFixed(2)} 確信度:${p.confidence}
  テーマ: ${p.themes.join("・")}
  理由: ${p.reason}`
).join("\n")}

分析した省庁数: ${ministryCount}省庁

以下のJSON形式で返答（他テキスト不要）:
{
  "summary": "本日の四季報スタイル総括（200字以内。省庁発表の要点・選定銘柄の共通テーマ・注目ポイントを含む）",
  "xPost": "X投稿用テキスト（280字以内。shikiho_10スタイル。⭕テーマ・Mix係数・ハッシュタグ含む）"
}`,
      }],
    })
    const content = message.content[0]
    if (content.type !== "text") return getMockDaySummary(picks, ministryCount)
    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return getMockDaySummary(picks, ministryCount)
    return JSON.parse(jsonMatch[0]) as { summary: string; xPost: string }
  } catch {
    return getMockDaySummary(picks, ministryCount)
  }
}

function getMockDaySummary(picks: StockPick[], ministryCount: number): { summary: string; xPost: string } {
  const topPick = picks[0]
  const date = new Date().toLocaleDateString("ja-JP", { month: "long", day: "numeric" })

  const summary = `【${date}の省庁X投稿分析まとめ】${ministryCount}省庁の投稿を分析。半導体・医療DX・防衛DXの国策テーマが集中。時価総額500億円以下の小型株を中心に${picks.length}銘柄を選定。ミックス係数10以下の割安株に注目。特に【${topPick?.ticker} ${topPick?.name}】が複数省庁の政策と連動し高評価。`

  const xPost = `【${date} 省庁X分析レポート📊】

${ministryCount}省庁の投稿から本日の注目銘柄:

${picks.slice(0, 3).map(p =>
    `⭕【${p.ticker}】${p.name}
時価総額${p.marketCapBillion}億 Mix${p.mixCoefficient.toFixed(2)}${p.mixCoefficient <= 10 ? "◎" : ""}
${p.themes[0]}`
  ).join("\n\n")}

#日本株 #国策株 #四季報分析`.slice(0, 280)

  return { summary, xPost }
}

// GET: 過去レポート一覧 or 特定日のレポート取得
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get("date")
  const limit = Number(searchParams.get("limit") || "30")

  if (date) {
    const report = getReportByDate(date)
    if (!report) return NextResponse.json({ success: false, error: "report not found" }, { status: 404 })
    return NextResponse.json({ success: true, data: report })
  }

  const reports = loadReports().slice(0, limit)
  return NextResponse.json({ success: true, data: reports })
}

// POST: 日次レポートの生成（Cronまたは手動トリガー）
export async function POST(req: Request) {
  // Cronシークレット検証
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => ({})) as { forceDate?: string; postToX?: boolean }
  const targetDate = body.forceDate || new Date().toISOString().slice(0, 10)
  const postToX = body.postToX === true

  console.log(`[daily-report] Generating report for ${targetDate}`)

  try {
    // 1. 省庁のX投稿を取得
    const ministryPosts = getMockMinistryPosts()
    const ministryResults: MinistryPostResult[] = []
    const allPicks: StockPick[] = []

    for (const mp of ministryPosts) {
      const ministry = MINISTRIES.find(m => m.handle === mp.handle)
      if (!ministry) continue

      for (const post of mp.posts.slice(0, 1)) {  // 最新1投稿のみ処理
        let recs: ShikihoRecommendation[] = []

        if (process.env.ANTHROPIC_API_KEY) {
          try {
            recs = await analyzeMinistryPost(post.text, ministry.name, ministry.sector) as unknown as ShikihoRecommendation[]
          } catch {
            recs = getMockPicksForMinistry(ministry.name, ministry.sector, post.text)
          }
        } else {
          recs = getMockPicksForMinistry(ministry.name, ministry.sector, post.text)
        }

        const picks: StockPick[] = recs.map(r => ({
          ...r,
          sourceMinistry: ministry.name,
          sourcePostId: post.id,
        }))

        ministryResults.push({
          ministry: ministry.name,
          handle: mp.handle,
          sector: ministry.sector,
          color: ministry.color,
          postId: post.id,
          postText: post.text,
          postedAt: post.created_at,
          likes: post.public_metrics?.like_count || 0,
          retweets: post.public_metrics?.retweet_count || 0,
          picks,
        })

        allPicks.push(...picks)
      }
    }

    // 2. 重複除去・スコア順ソート
    const uniquePicks = Object.values(
      allPicks.reduce((acc, pick) => {
        const key = pick.ticker
        if (!acc[key] || pick.tenbaggerScore > acc[key].tenbaggerScore) {
          acc[key] = pick
        }
        return acc
      }, {} as Record<string, StockPick>)
    ).sort((a, b) => {
      const confOrder = { "高": 3, "中": 2, "低": 1 }
      if (confOrder[b.confidence] !== confOrder[a.confidence]) return confOrder[b.confidence] - confOrder[a.confidence]
      return b.tenbaggerScore - a.tenbaggerScore
    })

    const topPicks = uniquePicks.slice(0, 5)

    // 3. AI総括生成
    const { summary, xPost } = await generateDaySummary(uniquePicks, ministryResults.length)

    // 4. レポート保存
    const report: DailyReport = {
      id: `report-${targetDate}`,
      date: targetDate,
      generatedAt: new Date().toISOString(),
      ministryPosts: ministryResults,
      allPicks: uniquePicks,
      topPicks,
      daySummary: summary,
      xPostText: xPost,
      totalPostsAnalyzed: ministryResults.reduce((s, r) => s + 1, 0),
      totalMinistries: ministryResults.length,
      postedToX: false,
    }

    saveReport(report)

    // 5. X投稿（オプション）
    if (postToX && process.env.X_BEARER_TOKEN) {
      const { postTweet } = await import("@/lib/xapi")
      await postTweet(xPost)
      markPostedToX(targetDate)
      report.postedToX = true
    }

    console.log(`[daily-report] Done: ${uniquePicks.length} stocks from ${ministryResults.length} ministries`)
    return NextResponse.json({
      success: true,
      data: report,
      message: `${ministryResults.length}省庁・${uniquePicks.length}銘柄を分析完了`,
    })
  } catch (error) {
    console.error("[daily-report] Error:", error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

// PATCH: Xへの手動投稿
export async function PATCH(req: Request) {
  const { date } = await req.json() as { date: string }
  if (!date) return NextResponse.json({ success: false, error: "date required" }, { status: 400 })

  const report = getReportByDate(date)
  if (!report) return NextResponse.json({ success: false, error: "report not found" }, { status: 404 })

  if (!process.env.X_BEARER_TOKEN) {
    markPostedToX(date)
    return NextResponse.json({ success: true, mock: true, message: "X API未設定 - 投稿シミュレート完了", xPost: report.xPostText })
  }

  const { postTweet } = await import("@/lib/xapi")
  const result = await postTweet(report.xPostText)
  if (result) markPostedToX(date)

  return NextResponse.json({ success: !!result, data: result })
}
