import { NextResponse } from "next/server"
import { generateCMConcept } from "@/lib/claude"
import { generateAdImage, startVideoGeneration, checkVideoStatus } from "@/lib/imageGen"
import { postTweet } from "@/lib/xapi"

export async function POST(req: Request) {
  const body = await req.json() as {
    action: "concept" | "image" | "video-start" | "video-status" | "post"
    productName?: string
    category?: string
    trendContext?: string
    style?: string
    targetAudience?: string
    imagePrompt?: string
    motionPrompt?: string
    imageUrl?: string
    jobId?: string
    postText?: string
    mediaUrl?: string
  }

  if (body.action === "concept") {
    const concept = await generateCMConcept(
      body.productName ?? "",
      body.category ?? "",
      body.trendContext ?? "",
      body.style ?? "明るくポップ",
      body.targetAudience ?? "20〜40代"
    )
    if (!concept) return NextResponse.json({ error: "生成失敗" }, { status: 500 })
    return NextResponse.json({ concept })
  }

  if (body.action === "image") {
    if (!body.imagePrompt) return NextResponse.json({ error: "imagePrompt required" }, { status: 400 })
    const result = await generateAdImage(body.imagePrompt)
    if (!result) {
      // GOOGLE_API_KEY 未設定時はプレースホルダーを返す
      return NextResponse.json({
        image: {
          url: `https://placehold.co/1024x1024/1a1a2e/3b82f6?text=${encodeURIComponent(body.imagePrompt.slice(0, 30))}`,
          revisedPrompt: body.imagePrompt,
          mock: true,
        },
      })
    }
    return NextResponse.json({ image: result })
  }

  if (body.action === "video-start") {
    if (!body.imageUrl || !body.motionPrompt) {
      return NextResponse.json({ error: "imageUrl and motionPrompt required" }, { status: 400 })
    }
    const job = await startVideoGeneration(body.imageUrl, body.motionPrompt)
    if (!job) {
      // RUNWAY_API_KEY 未設定時はモックジョブを返す
      return NextResponse.json({
        job: { jobId: `mock-${Date.now()}`, status: "processing", mock: true },
      })
    }
    return NextResponse.json({ job })
  }

  if (body.action === "video-status") {
    if (!body.jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 })
    if (body.jobId.startsWith("mock-")) {
      return NextResponse.json({
        job: {
          jobId: body.jobId,
          status: "completed",
          videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
          mock: true,
        },
      })
    }
    const job = await checkVideoStatus(body.jobId)
    if (!job) return NextResponse.json({ error: "ステータス取得失敗" }, { status: 500 })
    return NextResponse.json({ job })
  }

  if (body.action === "post") {
    if (!body.postText) return NextResponse.json({ error: "postText required" }, { status: 400 })
    const result = await postTweet(body.postText)
    if (!result) return NextResponse.json({ error: "X投稿失敗" }, { status: 500 })
    return NextResponse.json({ posted: result })
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 })
}
