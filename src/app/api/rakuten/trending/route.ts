import { NextRequest, NextResponse } from "next/server"
import axios from "axios"

// 楽天ジャンルID（アニメ・フィギュア関連）
const ANIME_GENRES = [
  { id: "101164", label: "フィギュア" },
  { id: "562637", label: "アニメグッズ" },
  { id: "200162", label: "アニメ・漫画" },
  { id: "101070", label: "おもちゃ・ホビー" },
]

export async function GET(req: NextRequest) {
  const genreId = req.nextUrl.searchParams.get("genreId") || "101164"
  const appId = process.env.RAKUTEN_APP_ID
  const affiliateId = process.env.RAKUTEN_AFFILIATE_ID

  if (!appId) {
    return NextResponse.json({ success: false, error: "RAKUTEN_APP_ID not configured" }, { status: 500 })
  }

  try {
    const res = await axios.get("https://app.rakuten.co.jp/services/api/IchibaItem/Ranking/20220601", {
      params: {
        format: "json",
        applicationId: appId,
        affiliateId: affiliateId || undefined,
        genreId,
        hits: 10,
        imageFlag: 1,
      },
    })

    const items = res.data.Items.map((i: { Item: unknown }) => i.Item)
    return NextResponse.json({
      success: true,
      data: items,
      genres: ANIME_GENRES,
      currentGenre: ANIME_GENRES.find(g => g.id === genreId)?.label || "フィギュア",
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
