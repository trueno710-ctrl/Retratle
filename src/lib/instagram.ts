/**
 * Instagram Graph API クライアント
 * 必要な環境変数:
 *   INSTAGRAM_ACCESS_TOKEN  - ユーザーアクセストークン（長期）
 *   INSTAGRAM_ACCOUNT_ID    - Instagram ビジネスアカウント ID
 */

const BASE = "https://graph.instagram.com/v21.0"

function getCredentials() {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID
  if (!token || !accountId) throw new Error("Instagram credentials not configured")
  return { token, accountId }
}

export interface InstagramPostResult {
  id: string
  permalink?: string
}

/** 画像付き投稿を作成 */
export async function postInstagramImage(
  caption: string,
  imageUrl: string
): Promise<InstagramPostResult | null> {
  try {
    const { token, accountId } = getCredentials()

    // Step 1: メディアコンテナを作成
    const containerRes = await fetch(`${BASE}/${accountId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: imageUrl,
        caption,
        access_token: token,
      }),
    })
    if (!containerRes.ok) return null
    const { id: creationId } = await containerRes.json() as { id: string }

    // Step 2: コンテナを公開
    const publishRes = await fetch(`${BASE}/${accountId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: creationId, access_token: token }),
    })
    if (!publishRes.ok) return null
    const { id } = await publishRes.json() as { id: string }
    return { id, permalink: `https://www.instagram.com/p/${id}/` }
  } catch {
    return null
  }
}

/** リール（動画）投稿を作成 */
export async function postInstagramReel(
  caption: string,
  videoUrl: string
): Promise<InstagramPostResult | null> {
  try {
    const { token, accountId } = getCredentials()

    const containerRes = await fetch(`${BASE}/${accountId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        media_type: "REELS",
        video_url: videoUrl,
        caption,
        access_token: token,
      }),
    })
    if (!containerRes.ok) return null
    const { id: creationId } = await containerRes.json() as { id: string }

    // リールは処理に時間がかかるため少し待機
    await new Promise(r => setTimeout(r, 5000))

    const publishRes = await fetch(`${BASE}/${accountId}/media_publish`, {
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
