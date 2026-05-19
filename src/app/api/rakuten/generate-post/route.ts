import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const ANIME_PERSONA = `あなたはアニメ・フィギュア・推しグッズ専門のInstagramインフルエンサーです。

【キャラクター設定】
- アニメをこよなく愛するオタク女子/男子のアカウント
- 推しへの熱量が高く、読者に「これ欲しい！」と思わせる文章が得意
- トレンドのアニメ・作品をよく把握している
- 日本のオタク文化・スラングに精通している（「尊い」「神」「沼」「推し活」など）

【Instagram投稿のルール】
- 冒頭3行で心を掴む（絵文字で目を引く）
- 商品の「どこが良いか」を具体的に熱量高く語る
- 「欲しい人はプロフのリンクから🔗」で誘導
- 改行を多用して読みやすく
- ハッシュタグは日本語+英語のバランスよく
- 必ず #PR をつける（景品表示法遵守）

【Threads投稿のルール】
- よりカジュアルで本音っぽいトーン
- 短く刺さる一言から始める
- リンクはプロフ欄を案内
- ハッシュタグは少なめ（5個程度）`

export interface GeneratePostRequest {
  itemName: string
  itemPrice: number
  catchcopy: string
  itemCaption: string
  shopName: string
  reviewAverage: number
  reviewCount: number
  affiliateUrl: string
  platform: "instagram" | "threads" | "both"
  tone?: "カジュアル" | "丁寧" | "熱量高め"
  isAnime?: boolean
}

export interface GeneratedPost {
  instagram: string
  threads: string
  hashtags: string[]
}

export async function POST(req: NextRequest) {
  const body: GeneratePostRequest = await req.json()

  const tone = body.tone || "熱量高め"
  const isAnime = body.isAnime !== false  // デフォルトはアニメモード

  const systemPrompt = isAnime ? ANIME_PERSONA : "あなたはSNS投稿の専門家です。"

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `以下の商品のInstagram・Threads投稿文を作成してください。

【商品情報】
商品名: ${body.itemName}
価格: ¥${body.itemPrice.toLocaleString()}
キャッチコピー: ${body.catchcopy}
商品説明: ${body.itemCaption.slice(0, 400)}
ショップ: ${body.shopName}
レビュー評価: ${body.reviewAverage}点（${body.reviewCount}件レビュー）
購入リンク: ${body.affiliateUrl}

【トーン】: ${tone}

【Instagram要件】
- 冒頭に絵文字で興味を引く（例：🔥✨💕など）
- 商品の魅力を熱量高く2〜3段落で説明
- 「プロフのリンクから購入できます🔗」を入れる
- ハッシュタグ20〜30個（作品名・キャラ名・#フィギュア #推しグッズ #アニメグッズ #楽天 #PR など）
- 改行多用、最大2000文字

【Threads要件】
- 一言目で興味を引く
- 300文字以内でコンパクトに
- ハッシュタグ5個以内
- #PR必須

以下のJSON形式のみ返答:
{
  "instagram": "Instagram投稿文全文",
  "threads": "Threads投稿文全文",
  "hashtags": ["ハッシュタグ1（#なし）", "ハッシュタグ2", "ハッシュタグ3"]
}`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== "text") {
    return NextResponse.json({ success: false, error: "AI generation failed" }, { status: 500 })
  }

  try {
    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error("no json")
    const result: GeneratedPost = JSON.parse(jsonMatch[0])
    return NextResponse.json({ success: true, data: result })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to parse AI response" }, { status: 500 })
  }
}
