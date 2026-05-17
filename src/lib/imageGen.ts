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

/** DALL-E 3 で宣伝画像を生成。OPENAI_API_KEY が必要。 */
export async function generateAdImage(prompt: string): Promise<GeneratedImage | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  try {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt,
        n: 1,
        size: "1024x1024",
        quality: "hd",
        style: "vivid",
      }),
    })
    if (!res.ok) return null
    const data = await res.json() as { data: Array<{ url: string; revised_prompt?: string }> }
    const item = data.data?.[0]
    if (!item) return null
    return { url: item.url, revisedPrompt: item.revised_prompt }
  } catch {
    return null
  }
}

/**
 * Runway ML Gen-3 Alpha で画像→動画を生成。
 * RUNWAY_API_KEY が必要。
 * https://docs.runwayml.com
 */
export async function startVideoGeneration(
  imageUrl: string,
  motionPrompt: string
): Promise<VideoJob | null> {
  const apiKey = process.env.RUNWAY_API_KEY
  if (!apiKey) return null

  try {
    const res = await fetch("https://api.runwayml.com/v1/image_to_video", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Runway-Version": "2024-11-06",
      },
      body: JSON.stringify({
        promptImage: imageUrl,
        promptText: motionPrompt,
        model: "gen3a_turbo",
        duration: 5,
        ratio: "1280:768",
      }),
    })
    if (!res.ok) return null
    const data = await res.json() as { id: string }
    return { jobId: data.id, status: "queued" }
  } catch {
    return null
  }
}

/** Runway のジョブステータスをポーリング */
export async function checkVideoStatus(jobId: string): Promise<VideoJob | null> {
  const apiKey = process.env.RUNWAY_API_KEY
  if (!apiKey) return null

  try {
    const res = await fetch(`https://api.runwayml.com/v1/tasks/${jobId}`, {
      headers: { Authorization: `Bearer ${apiKey}`, "X-Runway-Version": "2024-11-06" },
    })
    if (!res.ok) return null
    const data = await res.json() as {
      id: string
      status: string
      output?: string[]
      failure?: string
    }
    return {
      jobId: data.id,
      status:
        data.status === "SUCCEEDED" ? "completed"
        : data.status === "FAILED" ? "failed"
        : data.status === "RUNNING" ? "processing"
        : "queued",
      videoUrl: data.output?.[0],
    }
  } catch {
    return null
  }
}
