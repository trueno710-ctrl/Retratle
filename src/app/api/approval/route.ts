import { NextResponse } from "next/server"
import { getAllItems, getItem, upsertItem, updateItem } from "@/lib/approvalStore"
import type { ApprovalItem, Platform } from "@/lib/approvalStore"
import { checkPostCompliance, generatePostingSchedule } from "@/lib/claude"

/** 一覧取得 */
export async function GET() {
  return NextResponse.json({ items: getAllItems() })
}

export async function POST(req: Request) {
  const body = await req.json() as {
    action: "submit" | "approve" | "reject" | "update-caption" | "update-platforms"
    item?: Partial<ApprovalItem>
    id?: string
    caption?: string
    platforms?: Platform[]
    rejectionReason?: string
  }

  // ===== 新規投稿を承認キューに追加 =====
  if (body.action === "submit") {
    const item = body.item
    if (!item) return NextResponse.json({ error: "item required" }, { status: 400 })

    const newItem: ApprovalItem = {
      id: `item-${Date.now()}`,
      createdAt: new Date().toISOString(),
      source: item.source ?? "manual",
      product: item.product ?? "",
      trend: item.trend ?? "",
      caption: item.caption ?? "",
      imageUrl: item.imageUrl,
      videoUrl: item.videoUrl,
      platforms: item.platforms ?? ["x", "instagram", "threads"],
      status: "compliance_checking",
    }
    upsertItem(newItem)

    // バックグラウンドでコンプライアンスチェックとスケジュール生成
    Promise.all([
      checkPostCompliance(newItem.caption, newItem.product, newItem.platforms),
      generatePostingSchedule(
        [{ label: "直近", revenue: 127450 }],
        [],
        new Date().getMonth() + 1
      ),
    ]).then(([compliance, schedule]) => {
      updateItem(newItem.id, {
        compliance: compliance ? { ...compliance, checkedAt: new Date().toISOString() } : undefined,
        schedule: schedule
          ? {
              frequency: schedule.frequency,
              nextSlots: schedule.nextSlots.map(s => ({
                time: s.time,
                platforms: s.platforms as Platform[],
                reasoning: s.reasoning,
              })),
              weeklyPlan: schedule.weeklyPlan,
            }
          : undefined,
        status: "awaiting_approval",
      })
    })

    return NextResponse.json({ item: newItem })
  }

  // ===== 承認 =====
  if (body.action === "approve") {
    if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 })
    const updated = updateItem(body.id, {
      status: "approved",
      approvedAt: new Date().toISOString(),
    })
    if (!updated) return NextResponse.json({ error: "not found" }, { status: 404 })
    return NextResponse.json({ item: updated })
  }

  // ===== 却下 =====
  if (body.action === "reject") {
    if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 })
    const updated = updateItem(body.id, {
      status: "rejected",
      rejectionReason: body.rejectionReason ?? "理由なし",
    })
    if (!updated) return NextResponse.json({ error: "not found" }, { status: 404 })
    return NextResponse.json({ item: updated })
  }

  // ===== 投稿文を更新してから再チェック =====
  if (body.action === "update-caption") {
    if (!body.id || !body.caption) return NextResponse.json({ error: "id and caption required" }, { status: 400 })
    const existing = getItem(body.id)
    if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 })

    updateItem(body.id, { caption: body.caption, status: "compliance_checking" })

    // 再チェック
    const compliance = await checkPostCompliance(body.caption, existing.product, existing.platforms)
    const updated = updateItem(body.id, {
      compliance: compliance ? { ...compliance, checkedAt: new Date().toISOString() } : undefined,
      status: "awaiting_approval",
    })
    return NextResponse.json({ item: updated })
  }

  // ===== プラットフォームを更新 =====
  if (body.action === "update-platforms") {
    if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 })
    const updated = updateItem(body.id, { platforms: body.platforms })
    return NextResponse.json({ item: updated })
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 })
}
