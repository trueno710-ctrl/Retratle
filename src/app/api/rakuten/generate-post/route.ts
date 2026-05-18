import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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
}

export interface GeneratedPost {
  instagram: string
  threads: string
  hashtags: string[]
}

export async function POST(req: NextRequest) {
  const body: GeneratePostRequest = await req.json()

  const tone = body.tone || "カジュアル"
  const affiliateId = process.env.RAKUTEN_AFFILIATE_ID

  const affiliateNote = affiliateId
    ? "※投稿にはアフィリエイトリンクを含むことを明記してください（#PR または #ad）"
    : ""

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `楽天アフィリエイト投稿を作成してください。

【商品情報】
商品名: ${body.itemName}
価格: ¥${body.itemPrice.toLocaleString()}
キャッチコピー: ${body.catchcopy}
商品説明: ${body.itemCaption.slice(0, 300)}
ショップ: ${body.shopName}
レビュー: ${body.reviewAverage}点（${body.reviewCount}件）
URL: ${body.affiliateUrl}

【要件】
- トーン: ${tone}
- Instagram用: 最大2200文字、絵文字多用、改行で読みやすく、ハッシュタグ20〜30個
- Threads用: 最大500文字、絵文字少なめ、自然な文体、ハッシュタグ5〜10個
${affiliateNote}

以下のJSON形式で返答（他テキスト不要）:
{
  "instagram": "Instagram投稿文（ハッシュタグ含む）",
  "threads": "Threads投稿文（ハッシュタグ含む）",
  "hashtags": ["タグ1", "タグ2", "タグ3"]
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
