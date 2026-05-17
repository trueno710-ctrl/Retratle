/**
 * Threads API v1.0 クライアント（Meta）
 * 必要な環境変数:
 *   THREADS_ACCESS_TOKEN - ユーザーアクセストークン
 *   THREADS_USER_ID      - Threads ユーザー ID
 */

const BASE = "https://graph.threads.net/v1.0"

function getCredentials() {
  const token = process.env.THREADS_ACCESS_TOKEN
  const userId = process.env.THREADS_USER_ID
  if (!token || !userId) throw new Error("Threads credentials not configured")
  return { token, userId }
}

export interface ThreadsPostResult {
  id: string
  permalink?: string
}

/** テキスト投稿 */
export async function postThreadsText(text: string): Promise<ThreadsPostResult | null> {
  try {
    const { token, userId } = getCredentials()

    const containerRes = await fetch(`${BASE}/${userId}/threads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ media_type: "TEXT", text, access_token: token }),
    })
    if (!containerRes.ok) return null
    const { id: creationId } = await containerRes.json() as { id: string }

    const publishRes = await fetch(`${BASE}/${userId}/threads_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: creationId, access_token: token }),
    })
    if (!publishRes.ok) return null
    const { id } = await publishRes.json() as { id: string }
    return { id, permalink: `https://www.threads.net/t/${id}` }
  } catch {
    return null
  }
}

/** 画像付き投稿 */
export async function postThreadsImage(
  text: string,
  imageUrl: string
): Promise<ThreadsPostResult | null> {
  try {
    const { token, userId } = getCredentials()

    const containerRes = await fetch(`${BASE}/${userId}/threads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        media_type: "IMAGE",
        image_url: imageUrl,
        text,
        access_token: token,
      }),
    })
    if (!containerRes.ok) return null
    const { id: creationId } = await containerRes.json() as { id: string }

    const publishRes = await fetch(`${BASE}/${userId}/threads_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: creationId, access_token: token }),
    })
    if (!publishRes.ok) return null
    const { id } = await publishRes.json() as { id: string }
    return { id }
  } catch {
    return null
  }
}

/** 動画付き投稿 */
export async function postThreadsVideo(
  text: string,
  videoUrl: string
): Promise<ThreadsPostResult | null> {
  try {
    const { token, userId } = getCredentials()

    const containerRes = await fetch(`${BASE}/${userId}/threads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        media_type: "VIDEO",
        video_url: videoUrl,
        text,
        access_token: token,
      }),
    })
    if (!containerRes.ok) return null
    const { id: creationId } = await containerRes.json() as { id: string }

    await new Promise(r => setTimeout(r, 3000))

    const publishRes = await fetch(`${BASE}/${userId}/threads_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: creationId, access_token: token }),
    })
    if (!publishRes.ok) return null
    const { id } = await publishRes.json() as { id: string }
    return { id }
  } catch {
    return null
  }
}
