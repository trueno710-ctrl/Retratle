import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface StockRecommendation {
  ticker: string
  name: string
  reason: string
  confidence: "高" | "中" | "低"
  sector: string
  expectedImpact: string
}

export async function analyzeMinistryPost(
  post: string,
  ministry: string,
  sector: string
): Promise<StockRecommendation[]> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `あなたは日本株式市場の専門アナリストです。
以下の日本政府省庁のX（旧Twitter）投稿を分析し、恩恵を受けそうな日本の上場株式銘柄を最大5件推薦してください。

省庁: ${ministry}（${sector}担当）
投稿内容: ${post}

以下のJSON形式で回答してください。他のテキストは含めないでください:
[
  {
    "ticker": "銘柄コード(4桁)",
    "name": "会社名",
    "reason": "推薦理由（100字以内）",
    "confidence": "高|中|低",
    "sector": "業種",
    "expectedImpact": "期待される株価への影響（50字以内）"
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
    return JSON.parse(jsonMatch[0]) as StockRecommendation[]
  } catch {
    return []
  }
}

export async function generatePriceReport(
  ticker: string,
  name: string,
  changePercent: number,
  currentPrice: number,
  recentContext: string
): Promise<string> {
  const direction = changePercent > 0 ? "急騰" : "急落"
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `日本株アナリストとして、以下の銘柄の値動きレポートを作成してください。

銘柄: ${name}（${ticker}）
現在値: ${currentPrice}円
変動率: ${changePercent > 0 ? "+" : ""}${changePercent.toFixed(2)}%（${direction}）
関連情報: ${recentContext}

280字以内でX（Twitter）投稿用のレポートを作成してください。
ハッシュタグを含め、原因分析と今後の展望を簡潔に述べてください。`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== "text") return ""
  return content.text.trim()
}

export async function summarizeWeeklyNews(newsItems: string[]): Promise<string> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `日本株式市場のアナリストとして、今週の日経ニュースを以下の観点でまとめてください。

ニュース一覧:
${newsItems.map((item, i) => `${i + 1}. ${item}`).join("\n")}

以下の形式でまとめてください:
1. 今週の市場全体の総括（100字以内）
2. セクター別の注目ポイント（3つ）
3. 来週への影響が大きいトピック（2つ）
4. 注目銘柄（ticker: reason 形式で3件）`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== "text") return ""
  return content.text.trim()
}

export async function analyzeTenbaggerCandidates(
  stocks: Array<{ ticker: string; name: string; per: number; pbr: number; growthRate: number; sector: string }>
): Promise<Array<{ ticker: string; score: number; analysis: string; catalysts: string[] }>> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `テンバガー（10倍株）ハンターとして、以下の銘柄を分析し、10倍株ポテンシャルをスコアリングしてください。

銘柄データ:
${stocks.map(s => `${s.ticker} ${s.name}: PER=${s.per} PBR=${s.pbr} 成長率=${s.growthRate}% 業種=${s.sector}`).join("\n")}

以下のJSON形式で回答してください:
[
  {
    "ticker": "銘柄コード",
    "score": 85,
    "analysis": "分析コメント（100字以内）",
    "catalysts": ["カタリスト1", "カタリスト2", "カタリスト3"]
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
    return JSON.parse(jsonMatch[0])
  } catch {
    return []
  }
}
