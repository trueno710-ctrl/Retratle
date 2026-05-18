import { NextRequest, NextResponse } from "next/server"
import axios from "axios"

export interface RakutenItem {
  itemCode: string
  itemName: string
  itemPrice: number
  itemUrl: string
  affiliateUrl: string
  mediumImageUrls: { imageUrl: string }[]
  shopName: string
  reviewAverage: number
  reviewCount: number
  catchcopy: string
  itemCaption: string
  pointRate: number
}

export async function GET(req: NextRequest) {
  const keyword = req.nextUrl.searchParams.get("keyword")
  const hits = req.nextUrl.searchParams.get("hits") || "10"
  const sort = req.nextUrl.searchParams.get("sort") || "-reviewCount"

  if (!keyword) {
    return NextResponse.json({ success: false, error: "keyword is required" }, { status: 400 })
  }

  const appId = process.env.RAKUTEN_APP_ID
  const affiliateId = process.env.RAKUTEN_AFFILIATE_ID

  if (!appId) {
    return NextResponse.json({ success: false, error: "RAKUTEN_APP_ID not configured" }, { status: 500 })
  }

  try {
    const res = await axios.get("https://app.rakuten.co.jp/services/api/IchibaItem/Search/20220601", {
      params: {
        format: "json",
        keyword,
        applicationId: appId,
        affiliateId: affiliateId || undefined,
        hits: Number(hits),
        sort,
        imageFlag: 1,
      },
    })

    const items: RakutenItem[] = res.data.Items.map((i: { Item: RakutenItem }) => i.Item)
    return NextResponse.json({ success: true, data: items, count: res.data.count })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
