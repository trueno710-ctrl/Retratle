import { NextRequest, NextResponse } from "next/server"

// 最適投稿時間帯（日本のアニメオタク層に合わせた時間）
export const OPTIMAL_TIMES = [
  { hour: 7, label: "朝7時（通勤前）", score: 85 },
  { hour: 12, label: "昼12時（ランチ）", score: 90 },
  { hour: 18, label: "夕方18時（帰宅後）", score: 88 },
  { hour: 21, label: "夜21時（就寝前）", score: 95 },
  { hour: 23, label: "深夜23時（オタク時間）", score: 80 },
]

// 週間投稿計画（新規アカウント向け：品質重視で週5投稿）
export const WEEKLY_PLAN = [
  { day: "月", theme: "今週の注目フィギュア", priority: "high" },
  { day: "水", theme: "コスパ最強グッズ紹介", priority: "high" },
  { day: "金", theme: "週末の推し活に", priority: "high" },
  { day: "土", theme: "限定・新発売情報", priority: "medium" },
  { day: "日", theme: "今週のまとめ・ランキング", priority: "medium" },
]

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") || "plan"

  if (type === "times") {
    return NextResponse.json({ success: true, data: OPTIMAL_TIMES })
  }

  if (type === "plan") {
    const now = new Date()
    const dayOfWeek = now.getDay()

    const upcoming = WEEKLY_PLAN.map((p, i) => {
      const days = ["日", "月", "火", "水", "木", "金", "土"]
      const targetDay = days.indexOf(p.day)
      let daysUntil = targetDay - dayOfWeek
      if (daysUntil <= 0) daysUntil += 7

      const date = new Date(now)
      date.setDate(date.getDate() + daysUntil)
      date.setHours(21, 0, 0, 0)  // デフォルト21時

      return {
        ...p,
        index: i,
        date: date.toISOString(),
        dateLabel: `${date.getMonth() + 1}/${date.getDate()}（${p.day}）21:00`,
        daysUntil,
      }
    }).sort((a, b) => a.daysUntil - b.daysUntil)

    return NextResponse.json({ success: true, data: upcoming, optimalTimes: OPTIMAL_TIMES })
  }

  return NextResponse.json({ success: false, error: "invalid type" }, { status: 400 })
}
