import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface AffiliateProductSuggestion {
  name: string
  category: string
  estimatedPrice: string
  commissionRate: string
  rakutenSearchQuery: string
  reason: string
  expectedRevenue: number
  urgency: "今すぐ" | "今週中" | "今月中"
  postAngle: string
}

export async function suggestAffiliateProductsFromTrend(
  trendTopic: string,
  seasonalContext: string
): Promise<AffiliateProductSuggestion[]> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: "あなたは楽天アフィリエイトで月10万円以上稼ぐ熟練のアフィリエイターです。トレンドと季節から最適な商品を提案してください。",
    messages: [
      {
        role: "user",
        content: `Xトレンド「${trendTopic}」と季節背景「${seasonalContext}」をもとに、楽天アフィリエイトで今すぐ紹介すべき商品を3件提案してください。

以下のJSON配列形式のみで回答してください:
[
  {
    "name": "商品名",
    "category": "カテゴリ",
    "estimatedPrice": "¥XX,XXX",
    "commissionRate": "X%",
    "rakutenSearchQuery": "楽天での検索キーワード",
    "reason": "この商品を今選ぶ理由（80字以内）",
    "expectedRevenue": 12000,
    "urgency": "今すぐ|今週中|今月中",
    "postAngle": "X投稿の訴求角度（40字以内）"
  }
]`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== "text") return []
  try {
    const m = content.text.trim().match(/\[[\s\S]*\]/)
    if (!m) return []
    return JSON.parse(m[0]) as AffiliateProductSuggestion[]
  } catch {
    return []
  }
}

export interface DraftPost {
  text: string
  hashtags: string[]
  characterCount: number
  callToAction: string
  bestPostTime: string
}

export interface CMConcept {
  imagePrompt: string
  videoScript: {
    duration: string
    scenes: Array<{ time: string; visual: string; text: string; voice: string }>
    bgm: string
    motionPrompt: string
    cta: string
  }
  xCaption: string
  hashtags: string[]
}

export async function generateCMConcept(
  productName: string,
  category: string,
  trendContext: string,
  style: string,
  targetAudience: string
): Promise<CMConcept | null> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: "あなたは日本のトップ広告クリエイターです。楽天アフィリエイト向けの魅力的なCMコンセプトを作成します。",
    messages: [
      {
        role: "user",
        content: `以下の条件でSNS用CMコンセプトを作成してください。

商品名: ${productName}
カテゴリ: ${category}
トレンド文脈: ${trendContext}
スタイル: ${style}
ターゲット: ${targetAudience}

以下のJSON形式のみで回答してください:
{
  "imagePrompt": "DALL-E 3用の英語プロンプト。商品の魅力を最大限に引き出す広告ビジュアル。300文字以内",
  "videoScript": {
    "duration": "15秒",
    "scenes": [
      { "time": "0-4秒", "visual": "映像の説明", "text": "テロップテキスト", "voice": "ナレーション文" },
      { "time": "5-9秒", "visual": "映像の説明", "text": "テロップテキスト", "voice": "ナレーション文" },
      { "time": "10-14秒", "visual": "映像の説明", "text": "テロップテキスト", "voice": "ナレーション文" }
    ],
    "bgm": "BGMの雰囲気説明",
    "motionPrompt": "Runway ML用の動き指示（英語）",
    "cta": "行動喚起テキスト（10字以内）"
  },
  "xCaption": "X投稿文（120字以内、URLプレースホルダー[URL]含む）",
  "hashtags": ["#ハッシュタグ1", "#ハッシュタグ2", "#ハッシュタグ3"]
}`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== "text") return null
  try {
    const m = content.text.trim().match(/\{[\s\S]*\}/)
    if (!m) return null
    return JSON.parse(m[0]) as CMConcept
  } catch {
    return null
  }
}

export interface SalesAnalysis {
  summary: string
  strengths: string[]
  weaknesses: string[]
  improvements: Array<{
    priority: "高" | "中" | "低"
    category: string
    action: string
    expectedImpact: string
    timeline: string
  }>
  nextPeriodForecast: string
}

export async function analyzeAffiliateSales(
  period: "weekly" | "monthly" | "yearly",
  revenueData: Array<{ label: string; revenue: number; clicks: number; conversions: number }>,
  topProducts: Array<{ name: string; revenue: number; cvr: number; trend: string }>,
  categoryBreakdown: Array<{ category: string; share: number; growth: string }>
): Promise<SalesAnalysis | null> {
  const periodLabel = period === "weekly" ? "週次" : period === "monthly" ? "月次" : "年次"
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: "あなたは楽天アフィリエイトの売上分析の専門家です。データから具体的な改善策を提案します。",
    messages: [
      {
        role: "user",
        content: `以下の${periodLabel}売上データを分析し、具体的な改善提案を行ってください。

【売上推移】
${revenueData.map(d => `${d.label}: ¥${d.revenue.toLocaleString()} (クリック${d.clicks.toLocaleString()}、CV${d.conversions})`).join("\n")}

【上位商品】
${topProducts.map(p => `${p.name}: ¥${p.revenue.toLocaleString()} CVR${p.cvr}% ${p.trend}`).join("\n")}

【カテゴリ別シェア】
${categoryBreakdown.map(c => `${c.category}: ${c.share}% (成長率${c.growth})`).join("\n")}

以下のJSON形式のみで回答してください:
{
  "summary": "全体の分析サマリー（150字以内）",
  "strengths": ["強み1", "強み2", "強み3"],
  "weaknesses": ["課題1", "課題2", "課題3"],
  "improvements": [
    {
      "priority": "高|中|低",
      "category": "改善カテゴリ（商品選定/投稿戦略/CVR改善/新規カテゴリ等）",
      "action": "具体的なアクション（100字以内）",
      "expectedImpact": "期待される効果（50字以内）",
      "timeline": "実施時期（今週中/来週/来月等）"
    }
  ],
  "nextPeriodForecast": "次期の収益予測と根拠（100字以内）"
}`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== "text") return null
  try {
    const m = content.text.trim().match(/\{[\s\S]*\}/)
    if (!m) return null
    return JSON.parse(m[0]) as SalesAnalysis
  } catch {
    return null
  }
}

export interface ComplianceReport {
  passed: boolean
  complianceScore: number
  prDisclosure: { present: boolean; suggested: string }
  issues: Array<{
    severity: "error" | "warning" | "info"
    law: string
    description: string
    suggestion: string
  }>
  revisedCaption: string
}

export async function checkPostCompliance(
  caption: string,
  productName: string,
  platforms: string[]
): Promise<ComplianceReport | null> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1536,
    system: `あなたは日本のアフィリエイト・SNS投稿のコンプライアンス専門家です。
以下の法律・規約を熟知しています:
- 景品表示法（不当表示の禁止）
- 特定商取引法（通信販売の広告規制）
- 消費者契約法
- ASP（楽天アフィリエイト）の規約
- 各SNS（Instagram・Threads・X）のガイドライン
- ステルスマーケティング規制（2023年10月施行）`,
    messages: [
      {
        role: "user",
        content: `以下のアフィリエイト投稿文を法令・規約の観点でチェックしてください。

【商品名】${productName}
【投稿予定プラットフォーム】${platforms.join("、")}
【投稿文】
${caption}

以下のJSON形式のみで回答してください（コメント不要）:
{
  "passed": true,
  "complianceScore": 85,
  "prDisclosure": {
    "present": false,
    "suggested": "#PR または「広告：」の追記が必要"
  },
  "issues": [
    {
      "severity": "error|warning|info",
      "law": "景品表示法|特定商取引法|ステマ規制|SNSガイドライン|アフィリエイト規約",
      "description": "問題の具体的な説明（50字以内）",
      "suggestion": "修正方法の提案（80字以内）"
    }
  ],
  "revisedCaption": "コンプライアンスに準拠した修正版の投稿文（元の文章をベースに最小限の修正）"
}

判定基準:
- errorが1件以上: passed=false, score大幅減点
- warningのみ: passed=true, score若干減点
- infoのみ: passed=true, score満点近く
- PR表記なし: 2023年10月のステマ規制により必ずerrorとすること`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== "text") return null
  try {
    const m = content.text.trim().match(/\{[\s\S]*\}/)
    if (!m) return null
    return JSON.parse(m[0]) as ComplianceReport
  } catch {
    return null
  }
}

export interface PostingSchedule {
  frequency: string
  nextSlots: Array<{ time: string; platforms: string[]; reasoning: string }>
  weeklyPlan: string
  reasoning: string
}

export async function generatePostingSchedule(
  salesData: Array<{ label: string; revenue: number }>,
  recentPosts: Array<{ postedAt: string; platform: string; product: string }>,
  currentMonth: number
): Promise<PostingSchedule | null> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: "あなたはSNSマーケティングと楽天アフィリエイトの専門家です。データに基づいた最適な投稿戦略を立案します。",
    messages: [
      {
        role: "user",
        content: `以下のデータをもとに、Instagram・Threads・Xへの最適な投稿スケジュールを提案してください。

【売上推移（直近）】
${salesData.slice(-4).map(d => `${d.label}: ¥${d.revenue.toLocaleString()}`).join("\n")}

【最近の投稿履歴】
${recentPosts.slice(-5).map(p => `${p.postedAt} ${p.platform} - ${p.product}`).join("\n") || "なし"}

【現在月】${currentMonth}月（${currentMonth === 5 ? "母の日・楽天スーパーSALE期" : currentMonth === 6 ? "父の日・ボーナス期" : "通常期"}）

以下のJSON形式のみで回答してください:
{
  "frequency": "例: 1日2〜3投稿",
  "nextSlots": [
    { "time": "2026/05/17 07:00", "platforms": ["x","threads"], "reasoning": "理由（40字以内）" },
    { "time": "2026/05/17 12:00", "platforms": ["instagram"], "reasoning": "理由（40字以内）" },
    { "time": "2026/05/17 22:00", "platforms": ["threads","instagram"], "reasoning": "理由（40字以内）" }
  ],
  "weeklyPlan": "週間投稿計画の説明（100字以内）",
  "reasoning": "このスケジュールを選んだ根拠（100字以内）"
}`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== "text") return null
  try {
    const m = content.text.trim().match(/\{[\s\S]*\}/)
    if (!m) return null
    return JSON.parse(m[0]) as PostingSchedule
  } catch {
    return null
  }
}

export async function generateAffiliateXPost(
  productName: string,
  productPrice: string,
  trendTopic: string,
  affiliateUrl: string,
  postAngle: string
): Promise<DraftPost> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: "あなたはXで10万フォロワーを持つ楽天アフィリエイターです。クリック率・購買率の高い投稿文を作成します。",
    messages: [
      {
        role: "user",
        content: `以下の条件でX投稿の下書きを作成してください。

商品名: ${productName}
価格: ${productPrice}
関連トレンド: ${trendTopic}
アフィリエイトURL: ${affiliateUrl}
訴求角度: ${postAngle}

条件:
- 140字以内（URLの22字を除く）
- トレンドに乗った自然な文脈でアフィリエイトリンクを紹介
- 押しつけがましくなく、読者の役に立つ視点
- ハッシュタグは2〜3個

以下のJSON形式のみで回答:
{
  "text": "投稿本文（URLは[URL]プレースホルダーで）",
  "hashtags": ["#ハッシュタグ1", "#ハッシュタグ2"],
  "characterCount": 118,
  "callToAction": "リンクのテキスト（10字以内）",
  "bestPostTime": "投稿推奨時間（例: 朝7時・昼12時・夜22時）"
}`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== "text") {
    return { text: "", hashtags: [], characterCount: 0, callToAction: "詳しくはこちら", bestPostTime: "朝7時" }
  }
  try {
    const m = content.text.trim().match(/\{[\s\S]*\}/)
    if (!m) throw new Error()
    return JSON.parse(m[0]) as DraftPost
  } catch {
    return { text: content.text.trim(), hashtags: [], characterCount: content.text.length, callToAction: "詳しくはこちら", bestPostTime: "朝7時" }
  }
}

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
