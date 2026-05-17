import { NextResponse } from "next/server"
import { getAllItems } from "@/lib/approvalStore"
import { generatePostingSchedule } from "@/lib/claude"

const MONTHLY_REVENUE = [
  { label: "2026/2", revenue: 94100 },
  { label: "2026/3", revenue: 108300 },
  { label: "2026/4", revenue: 115600 },
  { label: "2026/5", revenue: 127450 },
]

export async function GET() {
  const posted = getAllItems()
    .filter(i => i.status === "posted" && i.postedAt)
    .slice(0, 10)
    .map(i => ({
      postedAt: i.postedAt!,
      platform: i.platforms.join(","),
      product: i.product,
    }))

  const schedule = await generatePostingSchedule(
    MONTHLY_REVENUE,
    posted,
    new Date().getMonth() + 1
  )

  if (!schedule) return NextResponse.json({ error: "スケジュール生成失敗" }, { status: 500 })
  return NextResponse.json({ schedule })
}
