import { NextResponse } from "next/server"
import { getItem, updateItem } from "@/lib/approvalStore"
import type { Platform, PostResult } from "@/lib/approvalStore"
import { postTweet } from "@/lib/xapi"
import { postInstagramImage, postInstagramReel } from "@/lib/instagram"
import { postThreadsText, postThreadsImage, postThreadsVideo } from "@/lib/threads"

export async function POST(req: Request) {
  const { id } = await req.json() as { id: string }

  const item = getItem(id)
  if (!item) return NextResponse.json({ error: "not found" }, { status: 404 })
  if (item.status !== "approved") {
    return NextResponse.json({ error: "承認済みの投稿のみ公開できます" }, { status: 400 })
  }

  const results: PostResult[] = []

  for (const platform of item.platforms as Platform[]) {
    let success = false
    let postId: string | undefined
    let error: string | undefined

    try {
      if (platform === "x") {
        const res = await postTweet(item.caption)
        success = !!res
        postId = res?.id
        if (!success) error = "X API エラー（X_BEARER_TOKEN を確認）"
      }

      if (platform === "instagram") {
        const res = item.videoUrl
          ? await postInstagramReel(item.caption, item.videoUrl)
          : item.imageUrl
          ? await postInstagramImage(item.caption, item.imageUrl)
          : null
        success = !!res
        postId = res?.id
        if (!success) error = "Instagram API エラー（INSTAGRAM_ACCESS_TOKEN を確認）"
      }

      if (platform === "threads") {
        const res = item.videoUrl
          ? await postThreadsVideo(item.caption, item.videoUrl)
          : item.imageUrl
          ? await postThreadsImage(item.caption, item.imageUrl)
          : await postThreadsText(item.caption)
        success = !!res
        postId = res?.id
        if (!success) error = "Threads API エラー（THREADS_ACCESS_TOKEN を確認）"
      }
    } catch (e) {
      error = e instanceof Error ? e.message : "不明なエラー"
    }

    results.push({ platform, success, postId, error })
  }

  const allPosted = results.every(r => r.success)
  const anyPosted = results.some(r => r.success)

  updateItem(id, {
    status: anyPosted ? "posted" : "approved",
    postedAt: anyPosted ? new Date().toISOString() : undefined,
    postResults: results,
  })

  return NextResponse.json({
    results,
    allPosted,
    anyPosted,
    message: allPosted
      ? "全プラットフォームへの投稿が完了しました"
      : anyPosted
      ? "一部のプラットフォームへの投稿に失敗しました"
      : "すべての投稿に失敗しました（APIキーを確認してください）",
  })
}
