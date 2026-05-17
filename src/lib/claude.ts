import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// shikiho_10スタイルの銘柄分析フォーマット
const ANALYST_PERSONA = `あなたは「四季報分析@テンバガー研究所」のスタイルで株式分析を行う専門アナリストです。

【分析スタイル】
- 会社四季報をベースに、国策・テーマ性のある割安小型成長株を発掘する
- 時価総額500億円以下の小型株を優先（大化けの余地が大きいため）
- ミックス係数（PER×PBR）が10以下の割安株を重視
- 清原達郎氏の視点：グローバルニッチ→PER20倍以下、優良顧客多数→PER15倍以下
- 国策・テーマ株を特定し、政策の追い風を最大限活用する
- 財務健全性（自己資本比率40%以上、有利子負債ゼロが理想）を重視
- 連続増収・連続増配銘柄を高く評価

【2026年の重要国策テーマ】
・フィジカルAI（ロボット・製造AI）：政府が3,873億円投資
・半導体サプライチェーン強化：METI 10兆円超支援フレーム
・GX（グリーントランスフォーメーション）：10年150兆円の公私投資
・防衛DX・サイバーセキュリティ
・医療DX・電子カルテ普及
・データセンター整備・5G/6G
・防災×デジタル（衛星・ドローン・センサー）
・インバウンド消費拡大

【銘柄出力フォーマット（必ずこの形式）】
{
  "ticker": "4桁コード",
  "name": "会社名",
  "marketCapBillion": 時価総額億円(数値),
  "per": PER倍(数値),
  "pbr": PBR倍(数値),
  "roe": ROE%(数値),
  "roa": ROA%(数値),
  "equityRatio": 自己資本比率%(数値),
  "dividendYield": 配当利回り%(数値),
  "mixCoefficient": ミックス係数PER×PBR(数値),
  "hasZeroDebt": 有利子負債ゼロか(boolean),
  "themes": ["テーマ1", "テーマ2"],
  "reason": "選定理由（四季報スタイルで簡潔に）",
  "confidence": "高|中|低",
  "catalysts": ["カタリスト1", "カタリスト2"],
  "tenbaggerScore": 2バガー以上の可能性スコア0-100(数値)
}`

export interface ShikihoRecommendation {
  ticker: string
  name: string
  marketCapBillion: number
  per: number
  pbr: number
  roe: number
  roa: number
  equityRatio: number
  dividendYield: number
  mixCoefficient: number
  hasZeroDebt: boolean
  themes: string[]
  reason: string
  confidence: "高" | "中" | "低"
  catalysts: string[]
  tenbaggerScore: number
}

export interface PriceReport {
  report: string
  xPost: string
}

export async function analyzeMinistryPost(
  post: string,
  ministry: string,
  sector: string,
  policyThemes: string[]
): Promise<ShikihoRecommendation[]> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: ANALYST_PERSONA,
    messages: [
      {
        role: "user",
        content: `以下の${ministry}（${sector}）のX投稿を分析し、恩恵を受ける日本の上場株式を最大4件ピックアップしてください。

【投稿内容】
${post}

【関連する2026年国策テーマ】
${policyThemes.join("、")}

選定基準：
1. 時価総額500億円以下を優先
2. ミックス係数（PER×PBR）10以下が理想
3. 国策・テーマへの直接的な恩恵が明確
4. 財務健全性が高い

JSON配列のみ返答してください（他のテキスト不要）:`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== "text") return []

  try {
    const text = content.text.trim()
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []
    return JSON.parse(jsonMatch[0]) as ShikihoRecommendation[]
  } catch {
    return []
  }
}

export async function generatePriceReport(
  ticker: string,
  name: string,
  changePercent: number,
  currentPrice: number,
  marketCap: number,
  recentContext: string
): Promise<PriceReport> {
  const direction = changePercent > 0 ? "急騰" : "急落"
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 768,
    system: ANALYST_PERSONA,
    messages: [
      {
        role: "user",
        content: `四季報分析アナリストとして、以下の銘柄の値動きレポートを2種類作成してください。

銘柄: 【${ticker} ${name}】
現在値: ${currentPrice.toLocaleString()}円
時価総額: ${marketCap}億円
変動率: ${changePercent > 0 ? "+" : ""}${changePercent.toFixed(2)}%（${direction}）
背景情報: ${recentContext}

以下のJSON形式で返答（他テキスト不要）:
{
  "report": "詳細分析レポート（200字以内。原因・背景・今後の展望を含む）",
  "xPost": "X投稿用（140字以内。ハッシュタグ含む。四季報分析スタイルで）"
}`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== "text") return { report: "", xPost: "" }

  try {
    const text = content.text.trim()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return { report: text, xPost: text.slice(0, 140) }
    return JSON.parse(jsonMatch[0]) as PriceReport
  } catch {
    return { report: "", xPost: "" }
  }
}

export async function summarizeWeeklyNews(newsItems: string[]): Promise<string> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    system: ANALYST_PERSONA,
    messages: [
      {
        role: "user",
        content: `四季報分析アナリストとして、今週の市場ニュースを分析してください。

【今週のニュース】
${newsItems.map((item, i) => `${i + 1}. ${item}`).join("\n")}

以下の形式で回答:
【今週の市場総括】
（100字以内）

【注目セクター × 恩恵銘柄】
（各セクター1行で「セクター名: 代表銘柄コード 会社名（理由）」形式で3セクター）

【来週の重要イベント＆注目ポイント】
（箇条書き3点）

【今週の四季報スタイルピックアップ銘柄】
（shikiho_10フォーマットで2銘柄：時価総額・PER・PBR・ミックス係数・テーマ）`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== "text") return ""
  return content.text.trim()
}

export interface TenbaggerAnalysis {
  ticker: string
  score: number
  shikihoComment: string
  mixCoefficient: number
  themes: string[]
  catalysts: string[]
  targetMultiple: string
  riskFactors: string[]
}

export async function analyzeTenbaggerCandidates(
  stocks: Array<{
    ticker: string
    name: string
    marketCapBillion: number
    per: number
    pbr: number
    psr: number
    roe: number
    equityRatio: number
    growthRate: number
    dividendYield: number
    sector: string
    themes: string[]
  }>
): Promise<TenbaggerAnalysis[]> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 3000,
    system: ANALYST_PERSONA,
    messages: [
      {
        role: "user",
        content: `四季報分析@テンバガー研究所のスタイルで以下の銘柄を評価し、2バガー（2倍）以上の可能性をスコアリングしてください。

銘柄データ:
${stocks.map(s =>
  `${s.ticker} ${s.name}: 時価総額${s.marketCapBillion}億 PER${s.per} PBR${s.pbr} PSR${s.psr} ミックス係数${(s.per * s.pbr).toFixed(2)} ROE${s.roe}% 自己資本比率${s.equityRatio}% 売上成長率${s.growthRate}% 配当${s.dividendYield}% 業種:${s.sector} テーマ:${s.themes.join(",")}`
).join("\n")}

JSON配列で返答（他テキスト不要）:
[
  {
    "ticker": "コード",
    "score": 0-100のスコア,
    "shikihoComment": "四季報スタイルの選定コメント（80字以内）",
    "mixCoefficient": PER×PBRの値,
    "themes": ["国策テーマ1", "テーマ2"],
    "catalysts": ["カタリスト1", "カタリスト2", "カタリスト3"],
    "targetMultiple": "2バガー|3バガー|5バガー|様子見",
    "riskFactors": ["リスク1", "リスク2"]
  }
]`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== "text") return []

  try {
    const text = content.text.trim()
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []
    return JSON.parse(jsonMatch[0]) as TenbaggerAnalysis[]
  } catch {
    return []
  }
}
