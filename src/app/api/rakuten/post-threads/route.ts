import { NextRequest, NextResponse } from "next/server"
import axios from "axios"

export async function POST(req: NextRequest) {
  const { text, imageUrl } = await req.json()

  const accessToken = process.env.THREADS_ACCESS_TOKEN
  const userId = process.env.THREADS_USER_ID

  if (!accessToken || !userId) {
    return NextResponse.json({
      success: false,
      error: "THREADS_ACCESS_TOKEN または THREADS_USER_ID が設定されていません。環境変数に追加してください。",
      setupRequired: true,
    }, { status: 400 })
  }

  try {
    const params: Record<string, string> = {
      media_type: imageUrl ? "IMAGE" : "TEXT",
      text,
      access_token: accessToken,
    }
    if (imageUrl) params.image_url = imageUrl

    // Step 1: Create container
    const createRes = await axios.post(
      `https://graph.threads.net/v1.0/${userId}/threads`,
      null,
      { params }
    )

    const creationId = createRes.data.id

    // Step 2: Publish
    const publishRes = await axios.post(
      `https://graph.threads.net/v1.0/${userId}/threads_publish`,
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
