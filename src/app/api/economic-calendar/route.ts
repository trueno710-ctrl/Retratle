import { NextResponse } from "next/server"
import {
  INDICATOR_DEFINITIONS,
  getScheduledReleases,
  categorizeReleases,
  type ScheduledRelease,
} from "@/lib/economicIndicators"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  const view = searchParams.get("view") || "all"

  const todayStr = new Date("2026-05-17").toISOString().slice(0, 10)
  const releases = getScheduledReleases()

  if (id) {
    const release = releases.find(r => r.id === id)
    if (!release) {
      return NextResponse.json({ success: false, error: "not found" }, { status: 404 })
    }
    const definition = INDICATOR_DEFINITIONS[release.indicatorId]
    return NextResponse.json({ success: true, data: { release, definition } })
  }

  if (view === "definitions") {
    return NextResponse.json({ success: true, data: Object.values(INDICATOR_DEFINITIONS) })
  }

  const { upcoming, past, today } = categorizeReleases(releases, todayStr)

  const enriched = (list: ScheduledRelease[]) =>
    list.map(r => ({ ...r, definition: INDICATOR_DEFINITIONS[r.indicatorId] }))

  return NextResponse.json({
    success: true,
    data: {
      all: enriched(releases),
      upcoming: enriched(upcoming),
      past: enriched(past),
      today: enriched(today),
      todayStr,
    },
  })
}

export async function POST(req: Request) {
  try {
    const { releaseId } = await req.json()
    if (!releaseId) {
      return NextResponse.json({ success: false, error: "releaseId required" }, { status: 400 })
    }

    const releases = getScheduledReleases()
    const release = releases.find(r => r.id === releaseId)
    if (!release) {
      return NextResponse.json({ success: false, error: "release not found" }, { status: 404 })
    }

    const definition = INDICATOR_DEFINITIONS[release.indicatorId]
    const isReleased = release.actual !== null

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({
        success: true,
        mock: true,
        data: {
          preAnalysis: release.preAnalysis,
          postAnalysis: release.postAnalysis,
          outlook: release.outlook,
          marketReaction: release.marketReaction,
          definition,
        },
      })
    }

    const { default: Anthropic } = await import("@anthropic-ai/sdk")
    const client = new Anthropic()

    const prompt = isReleased
      ? `${definition.name}（${release.period}）の結果分析をお願いします。
予想: ${release.forecast}${release.forecastUnit}
前回: ${release.previous}${release.forecastUnit}
実績: ${release.actual}${release.forecastUnit}
サプライズ: ${release.surprise}

【発表後の分析・今後の見通し・市場への影響を200字程度で回答してください】`
      : `${definition.name}（${release.period}）の事前分析をお願いします。
予想: ${release.forecast}${release.forecastUnit}
前回: ${release.previous}${release.forecastUnit}
発表日: ${release.releaseDate}

指標の背景: ${definition.description}

【市場への影響・シナリオ分析を200字程度で回答してください】`

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      system: "あなたは日本株式市場のプロアナリストです。経済指標が日本株市場に与える影響を、具体的な銘柄・セクターへの影響を交えて解説してください。",
      messages: [{ role: "user", content: prompt }],
    })

    const text = message.content[0].type === "text" ? message.content[0].text : ""

    return NextResponse.json({
      success: true,
      data: {
        analysis: text,
        isPreRelease: !isReleased,
        definition,
        release,
      },
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
