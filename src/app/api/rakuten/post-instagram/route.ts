import { NextRequest, NextResponse } from "next/server"
import axios from "axios"

export async function POST(req: NextRequest) {
  const { caption, imageUrl } = await req.json()

  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN
  const userId = process.env.INSTAGRAM_USER_ID

  if (!accessToken || !userId) {
    return NextResponse.json({
      success: false,
      error: "INSTAGRAM_ACCESS_TOKEN または INSTAGRAM_USER_ID が設定されていません。環境変数に追加してください。",
      setupRequired: true,
    }, { status: 400 })
  }

  try {
    // Step 1: Create media container
    const createRes = await axios.post(
      `https://graph.facebook.com/v18.0/${userId}/media`,
      null,
      {
        params: {
          caption,
          image_url: imageUrl,
          access_token: accessToken,
        },
      }
    )

    const creationId = createRes.data.id

    // Step 2: Publish
    const publishRes = await axios.post(
      `https://graph.facebook.com/v18.0/${userId}/media_publish`,
      null,
      {
        params: {
          creation_id: creationId,
          access_token: accessToken,
        },
      }
    )

    return NextResponse.json({ success: true, postId: publishRes.data.id })
  } catch (error) {
    const msg = axios.isAxiosError(error) ? error.response?.data?.error?.message : String(error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
