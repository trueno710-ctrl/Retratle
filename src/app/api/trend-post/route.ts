import { NextResponse } from "next/server"
import { getTrendingTopics, getMockTrendingTopics, getSeasonalCalendar } from "@/lib/xapi"
import { suggestAffiliateProductsFromTrend, generateAffiliateXPost } from "@/lib/claude"
import { postTweet } from "@/lib/xapi"

export async function GET() {
  const [trends, seasonal] = await Promise.all([
    getTrendingTopics().catch(() => getMockTrendingTopics()),
    Promise.resolve(getSeasonalCalendar()),
  ])
  return NextResponse.json({ trends, seasonal })
}

export async function POST(req: Request) {
  const body = await req.json() as {
    action: "suggest" | "draft" | "post"
    trendTopic?: string
    seasonalContext?: string
    productName?: string
    productPrice?: string
    affiliateUrl?: string
    postAngle?: string
    postText?: string
  }

  if (body.action === "suggest") {
    const products = await suggestAffiliateProductsFromTrend(
      body.trendTopic ?? "",
      body.seasonalContext ?? ""
    )
    return NextResponse.json({ products })
  }

  if (body.action === "draft") {
    const draft = await generateAffiliateXPost(
      body.productName ?? "",
      body.productPrice ?? "",
      body.trendTopic ?? "",
      body.affiliateUrl ?? "https://hb.afl.rakuten.co.jp/xxx",
      body.postAngle ?? ""
    )
    return NextResponse.json({ draft })
  }

  if (body.action === "post") {
    if (!body.postText) return NextResponse.json({ error: "postText required" }, { status: 400 })
    const result = await postTweet(body.postText)
    if (!result) return NextResponse.json({ error: "投稿に失敗しました" }, { status: 500 })
    return NextResponse.json({ posted: result })
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 })
}
