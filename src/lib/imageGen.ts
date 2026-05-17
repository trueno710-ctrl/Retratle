/**
 * Google AI（Gemini API）を使った画像・動画生成
 * 1つの GOOGLE_API_KEY で完結
 *
 * 画像: Imagen 3 (imagen-3.0-generate-001)
 * 動画: Veo 2  (veo-2.0-generate-001)
 *
 * APIキー取得: https://aistudio.google.com/apikey
 */

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta"

function getKey(): string | null {
  return process.env.GOOGLE_API_KEY ?? null
}

export interface GeneratedImage {
  url: string          // data:image/png;base64,... または公開URL
  revisedPrompt?: string
}

export interface VideoJob {
  jobId: string        // Google Long-Running Operation の name
  status: "queued" | "processing" | "completed" | "failed"
  videoUrl?: string    // data:video/mp4;base64,...
  thumbnailUrl?: string
}

// ---------- 画像生成 ----------

/**
 * Imagen 3 で広告画像を生成。
 * レスポンスは base64 → data URL に変換して返す。
 */
export async function generateAdImage(prompt: string): Promise<GeneratedImage | null> {
  const key = getKey()
  if (!key) return null

  try {
    const res = await fetch(
      `${GEMINI_BASE}/models/imagen-3.0-generate-001:predict?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: "1:1",
            safetyFilterLevel: "BLOCK_SOME",
            personGeneration: "ALLOW_ADULT",
          },
        }),
      }
    )
    if (!res.ok) {
      const err = await res.text()
      console.error("Imagen error:", err)
      return null
    }
    const data = await res.json() as {
      predictions: Array<{ bytesBase64Encoded: string; mimeType: string }>
    }
    const pred = data.predictions?.[0]
    if (!pred?.bytesBase64Encoded) return null

    const dataUrl = `data:${pred.mimeType ?? "image/png"};base64,${pred.bytesBase64Encoded}`
    return { url: dataUrl, revisedPrompt: prompt }
  } catch (e) {
    console.error("generateAdImage:", e)
    return null
  }
}

// ---------- 動画生成 ----------

/**
 * Veo 2 で画像→動画を生成（非同期 LRO）。
 * imageUrl は data URL または公開 URL を受け付ける。
 */
export async function startVideoGeneration(
  imageUrl: string,
  motionPrompt: string
): Promise<VideoJob | null> {
  const key = getKey()
  if (!key) return null

  try {
    // data URL → base64 部分を抽出、または URL から fetch して変換
    let imageBase64: string
    let imageMime = "image/png"

    if (imageUrl.startsWith("data:")) {
      const [header, b64] = imageUrl.split(",")
      imageMime = header.split(":")[1]?.split(";")[0] ?? "image/png"
      imageBase64 = b64
    } else {
      const imgRes = await fetch(imageUrl)
      const buf = await imgRes.arrayBuffer()
      imageBase64 = Buffer.from(buf).toString("base64")
      imageMime = imgRes.headers.get("content-type") ?? "image/png"
    }

    const res = await fetch(
      `${GEMINI_BASE}/models/veo-2.0-generate-001:predictLongRunning?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [
            {
              prompt: motionPrompt,
              image: { bytesBase64Encoded: imageBase64, mimeType: imageMime },
            },
          ],
          parameters: {
            aspectRatio: "16:9",
            durationSeconds: 5,
            sampleCount: 1,
          },
        }),
      }
    )
    if (!res.ok) {
      const err = await res.text()
      console.error("Veo start error:", err)
      return null
    }
    const data = await res.json() as { name: string }
    if (!data.name) return null
    return { jobId: data.name, status: "queued" }
  } catch (e) {
    console.error("startVideoGeneration:", e)
    return null
  }
}

/**
 * Veo のジョブステータスをポーリング。
 * 完了時は base64 → data URL に変換して返す。
 */
export async function checkVideoStatus(jobId: string): Promise<VideoJob | null> {
  const key = getKey()
  if (!key) return null

  try {
    const res = await fetch(`${GEMINI_BASE}/${jobId}?key=${key}`)
    if (!res.ok) return null

    const data = await res.json() as {
      done?: boolean
      error?: { message: string }
      response?: {
        videos: Array<{ bytesBase64Encoded: string; mimeType: string }>
      }
    }

    if (data.error) return { jobId, status: "failed" }

    if (data.done && data.response?.videos?.length) {
      const vid = data.response.videos[0]
      const videoUrl = `data:${vid.mimeType ?? "video/mp4"};base64,${vid.bytesBase64Encoded}`
      return { jobId, status: "completed", videoUrl }
    }

    if (data.done) return { jobId, status: "failed" }
    return { jobId, status: "processing" }
  } catch (e) {
    console.error("checkVideoStatus:", e)
    return null
  }
}
