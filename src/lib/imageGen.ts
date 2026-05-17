/**
 * fal.ai を使った画像・動画生成（1つの FAL_KEY で完結）
 * https://fal.ai/docs
 *
 * 必要な環境変数:
 *   FAL_KEY  - fal.ai のAPIキー（https://fal.ai/dashboard/keys）
 *
 * 画像: FLUX.1 Pro（DALL-E 3同等品質）
 * 動画: Kling v1.6（Runway ML同等品質）
 */

const FAL_BASE = "https://fal.run"
const FAL_QUEUE = "https://queue.fal.run"

function getKey() {
  return process.env.FAL_KEY ?? null
}

function falHeaders(key: string) {
  return {
    Authorization: `Key ${key}`,
    "Content-Type": "application/json",
  }
}

export interface GeneratedImage {
  url: string
  revisedPrompt?: string
}

export interface VideoJob {
  jobId: string
  status: "queued" | "processing" | "completed" | "failed"
  videoUrl?: string
  thumbnailUrl?: string
}

/**
 * FLUX.1 Pro で広告画像を生成。
 * 同期APIなので結果が直接返ってくる。
 */
export async function generateAdImage(prompt: string): Promise<GeneratedImage | null> {
  const key = getKey()
  if (!key) return null

  try {
    const res = await fetch(`${FAL_BASE}/fal-ai/flux-pro`, {
      method: "POST",
      headers: falHeaders(key),
      body: JSON.stringify({
        prompt,
        image_size: "square_hd",   // 1024×1024
        num_images: 1,
        enable_safety_checker: true,
      }),
    })
    if (!res.ok) return null
    const data = await res.json() as { images: Array<{ url: string }> }
    const url = data.images?.[0]?.url
    if (!url) return null
    return { url, revisedPrompt: prompt }
  } catch {
    return null
  }
}

/**
 * Kling v1.6 で画像→動画を生成（キューベース）。
 * → jobId を返し、checkVideoStatus でポーリングする。
 */
export async function startVideoGeneration(
  imageUrl: string,
  motionPrompt: string
): Promise<VideoJob | null> {
  const key = getKey()
  if (!key) return null

  try {
    const res = await fetch(
      `${FAL_QUEUE}/fal-ai/kling-video/v1.6/standard/image-to-video`,
      {
        method: "POST",
        headers: falHeaders(key),
        body: JSON.stringify({
          image_url: imageUrl,
          prompt: motionPrompt,
          duration: "5",       // 5秒
          aspect_ratio: "16:9",
        }),
      }
    )
    if (!res.ok) return null
    const data = await res.json() as { request_id: string }
    if (!data.request_id) return null
    return { jobId: data.request_id, status: "queued" }
  } catch {
    return null
  }
}

/** Kling のジョブステータスをポーリング */
export async function checkVideoStatus(jobId: string): Promise<VideoJob | null> {
  const key = getKey()
  if (!key) return null

  try {
    // まずステータス確認
    const statusRes = await fetch(
      `${FAL_QUEUE}/fal-ai/kling-video/v1.6/standard/image-to-video/requests/${jobId}/status`,
      { headers: falHeaders(key) }
    )
    if (!statusRes.ok) return null
    const status = await statusRes.json() as { status: string }

    if (status.status === "COMPLETED") {
      // 結果を取得
      const resultRes = await fetch(
        `${FAL_QUEUE}/fal-ai/kling-video/v1.6/standard/image-to-video/requests/${jobId}`,
        { headers: falHeaders(key) }
      )
      if (!resultRes.ok) return { jobId, status: "completed" }
      const result = await resultRes.json() as { video?: { url: string } }
      return { jobId, status: "completed", videoUrl: result.video?.url }
    }

    if (status.status === "FAILED") return { jobId, status: "failed" }
    if (status.status === "IN_PROGRESS") return { jobId, status: "processing" }
    return { jobId, status: "queued" }
  } catch {
    return null
  }
}
