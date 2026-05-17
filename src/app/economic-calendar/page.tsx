"use client"

import { useEffect, useState, useCallback } from "react"
import type { ScheduledRelease, IndicatorDefinition, Importance, Country } from "@/lib/economicIndicators"

type EnrichedRelease = ScheduledRelease & { definition: IndicatorDefinition }

interface CalendarData {
  all: EnrichedRelease[]
  upcoming: EnrichedRelease[]
  past: EnrichedRelease[]
  today: EnrichedRelease[]
  todayStr: string
}

const importanceColor: Record<Importance, string> = {
  高: "#ef4444",
  中: "#f59e0b",
  低: "#6b7280",
}

const importanceBg: Record<Importance, string> = {
  高: "rgba(239,68,68,0.15)",
  中: "rgba(245,158,11,0.15)",
  低: "rgba(107,114,128,0.1)",
}

const countryLabel: Record<Country, string> = {
  JP: "🇯🇵 日本",
  US: "🇺🇸 米国",
  EU: "🇪🇺 EU",
  CN: "🇨🇳 中国",
}

const surpriseColor: Record<string, string> = {
  "大幅上回り": "#10b981",
  "上回り": "#34d399",
  "一致": "#6b7280",
  "下回り": "#f87171",
  "大幅下回り": "#ef4444",
}

function SurpriseBadge({ surprise }: { surprise: string }) {
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{
        background: surpriseColor[surprise] + "22",
        color: surpriseColor[surprise],
        border: `1px solid ${surpriseColor[surprise]}44`,
      }}
    >
      {surprise}
    </span>
  )
}

function ImportanceDot({ level }: { level: Importance }) {
  return (
    <span
      className="inline-block w-2 h-2 rounded-full"
      style={{ background: importanceColor[level] }}
    />
  )
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", weekday: "short" })
}

function ReleaseCard({
  release,
  selected,
  onClick,
}: {
  release: EnrichedRelease
  selected: boolean
  onClick: () => void
}) {
  const isPast = release.actual !== null
  const isToday = release.releaseDate === "2026-05-17"

  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-3 rounded-lg transition-all"
      style={{
        background: selected ? "rgba(59,130,246,0.15)" : isToday ? "rgba(16,185,129,0.07)" : "transparent",
        border: selected ? "1px solid rgba(59,130,246,0.4)" : isToday ? "1px solid rgba(16,185,129,0.25)" : "1px solid transparent",
      }}
    >
      <div className="flex items-start gap-2">
        <ImportanceDot level={release.importance} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs" style={{ color: "#6b7280" }}>
              {formatDate(release.releaseDate)}
            </span>
            <span className="text-xs" style={{ color: "#4b5563" }}>
              {release.releaseTime} JST
            </span>
            {isToday && (
              <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(16,185,129,0.2)", color: "#10b981" }}>
                本日
              </span>
            )}
          </div>
          <div className="text-sm font-medium mt-0.5 leading-tight" style={{ color: "#e2e8f0" }}>
            {release.definition.name}
          </div>
          <div className="text-xs mt-0.5" style={{ color: "#6b7280" }}>
            {release.period} · {countryLabel[release.definition.country]}
          </div>
          {isPast && release.actual !== null && (
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs" style={{ color: "#9ca3af" }}>
                結果: <span className="font-semibold" style={{ color: "#e2e8f0" }}>{release.actual.toLocaleString()}{release.forecastUnit}</span>
              </span>
              {release.surprise && <SurpriseBadge surprise={release.surprise} />}
            </div>
          )}
          {!isPast && release.forecast !== null && (
            <div className="text-xs mt-1" style={{ color: "#9ca3af" }}>
              予想: <span style={{ color: "#60a5fa" }}>{release.forecast.toLocaleString()}{release.forecastUnit}</span>
            </div>
          )}
        </div>
      </div>
    </button>
  )
}

function SectorImpact({ sectors }: { sectors: IndicatorDefinition["affectedSectors"] }) {
  return (
    <div className="space-y-1.5">
      {sectors.map((s, i) => (
        <div key={i} className="flex items-start gap-2 text-sm">
          <span
            className="mt-0.5 shrink-0 text-xs px-1.5 py-0.5 rounded"
            style={{
              background: s.direction === "positive" ? "rgba(16,185,129,0.15)" : s.direction === "negative" ? "rgba(239,68,68,0.15)" : "rgba(107,114,128,0.15)",
              color: s.direction === "positive" ? "#10b981" : s.direction === "negative" ? "#ef4444" : "#9ca3af",
            }}
          >
            {s.direction === "positive" ? "↑" : s.direction === "negative" ? "↓" : "→"}
          </span>
          <div>
            <span className="font-medium" style={{ color: "#e2e8f0" }}>{s.sector}</span>
            <span className="ml-1" style={{ color: "#6b7280" }}>— {s.note}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function TickerTable({ tickers }: { tickers: ScheduledRelease["affectedTickers"] }) {
  return (
    <div className="space-y-1">
      {tickers.map((t, i) => (
        <div
          key={i}
          className="flex items-center justify-between px-3 py-2 rounded-lg text-sm"
          style={{ background: "rgba(255,255,255,0.04)" }}
        >
          <div>
            <span className="font-mono text-xs" style={{ color: "#6b7280" }}>{t.ticker}</span>
            <span className="ml-2" style={{ color: "#e2e8f0" }}>{t.name}</span>
          </div>
          <span className="text-xs" style={{ color: "#9ca3af" }}>{t.expectedMove}</span>
        </div>
      ))}
    </div>
  )
}

export default function EconomicCalendarPage() {
  const [data, setData] = useState<CalendarData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<EnrichedRelease | null>(null)
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("all")
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"overview" | "preAnalysis" | "postAnalysis" | "sectors" | "tickers">("overview")

  useEffect(() => {
    fetch("/api/economic-calendar")
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setData(res.data)
          const upcomingFirst = res.data.upcoming[0]
          if (upcomingFirst) setSelected(upcomingFirst)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const runAIAnalysis = useCallback(async () => {
    if (!selected) return
    setAnalysisLoading(true)
    setAiAnalysis(null)
    try {
      const res = await fetch("/api/economic-calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ releaseId: selected.id }),
      })
      const json = await res.json()
      if (json.success) {
        setAiAnalysis(json.data.analysis || json.data.preAnalysis || null)
      }
    } finally {
      setAnalysisLoading(false)
    }
  }, [selected])

  useEffect(() => {
    setAiAnalysis(null)
    setActiveTab("overview")
  }, [selected])

  const displayList = data
    ? filter === "upcoming" ? data.upcoming : filter === "past" ? data.past : data.all
    : []

  const importanceCounts = data
    ? { 高: data.all.filter(r => r.importance === "高").length, 中: data.all.filter(r => r.importance === "中").length }
    : { 高: 0, 中: 0 }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-2">
          <div className="text-2xl animate-pulse">📅</div>
          <p style={{ color: "#6b7280" }}>経済指標データを読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#0a0f1e" }}>
      {/* Left sidebar */}
      <div
        className="w-72 flex flex-col overflow-hidden"
        style={{ borderRight: "1px solid #1f2937" }}
      >
        {/* Header */}
        <div className="px-4 py-4" style={{ borderBottom: "1px solid #1f2937" }}>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            📅 経済カレンダー
          </h1>
          <p className="text-xs mt-1" style={{ color: "#6b7280" }}>
            重要指標の予想・解説・結果分析
          </p>
          <div className="flex gap-3 mt-3 text-xs">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ background: "#ef4444" }} />
              <span style={{ color: "#9ca3af" }}>高 {importanceCounts.高}件</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ background: "#f59e0b" }} />
              <span style={{ color: "#9ca3af" }}>中 {importanceCounts.中}件</span>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="flex border-b" style={{ borderColor: "#1f2937" }}>
          {(["all", "upcoming", "past"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="flex-1 py-2 text-xs font-medium transition-colors"
              style={{
                color: filter === f ? "#3b82f6" : "#6b7280",
                borderBottom: filter === f ? "2px solid #3b82f6" : "2px solid transparent",
              }}
            >
              {f === "all" ? "すべて" : f === "upcoming" ? "予定" : "発表済"}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {displayList.map(r => (
            <ReleaseCard
              key={r.id}
              release={r}
              selected={selected?.id === r.id}
              onClick={() => setSelected(r)}
            />
          ))}
          {displayList.length === 0 && (
            <p className="text-xs text-center py-8" style={{ color: "#6b7280" }}>該当なし</p>
          )}
        </div>
      </div>

      {/* Main panel */}
      <div className="flex-1 overflow-y-auto">
        {!selected ? (
          <div className="flex items-center justify-center h-full">
            <p style={{ color: "#6b7280" }}>左のリストから指標を選択してください</p>
          </div>
        ) : (
          <div className="p-6 max-w-4xl">
            {/* Title row */}
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span
                    className="text-xs px-2 py-1 rounded font-medium"
                    style={{
                      background: importanceBg[selected.importance],
                      color: importanceColor[selected.importance],
                    }}
                  >
                    重要度: {selected.importance}
                  </span>
                  <span className="text-xs" style={{ color: "#6b7280" }}>
                    {countryLabel[selected.definition.country]}
                  </span>
                  <span className="text-xs" style={{ color: "#6b7280" }}>
                    {selected.definition.category}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-white mt-2">{selected.definition.name}</h2>
                <p className="text-sm mt-1" style={{ color: "#9ca3af" }}>
                  {selected.definition.nameEn} · {selected.period}
                </p>
              </div>

              <button
                onClick={runAIAnalysis}
                disabled={analysisLoading}
                className="shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                style={{ background: "rgba(59,130,246,0.2)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.3)" }}
              >
                {analysisLoading ? "分析中..." : "🤖 AI分析"}
              </button>
            </div>

            {/* Numbers row */}
            <div
              className="grid grid-cols-3 gap-3 mb-6 p-4 rounded-xl"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid #1f2937" }}
            >
              <div>
                <p className="text-xs mb-1" style={{ color: "#6b7280" }}>発表日時</p>
                <p className="text-sm font-semibold text-white">
                  {selected.releaseDate} {selected.releaseTime} JST
                </p>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: "#6b7280" }}>
                  {selected.actual !== null ? "実績値" : "コンセンサス予想"}
                </p>
                <p
                  className="text-xl font-bold"
                  style={{
                    color: selected.actual !== null
                      ? (selected.surprise === "大幅上回り" || selected.surprise === "上回り" ? "#10b981" : selected.surprise === "大幅下回り" || selected.surprise === "下回り" ? "#ef4444" : "#e2e8f0")
                      : "#60a5fa"
                  }}
                >
                  {selected.actual !== null ? selected.actual.toLocaleString() : selected.forecast !== null ? selected.forecast.toLocaleString() : "—"}
                  <span className="text-sm font-normal ml-1" style={{ color: "#6b7280" }}>
                    {selected.forecastUnit}
                  </span>
                </p>
                {selected.actual !== null && selected.surprise && (
                  <div className="mt-1">
                    <SurpriseBadge surprise={selected.surprise} />
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: "#6b7280" }}>
                  {selected.actual !== null ? "コンセンサス予想" : "前回値"}
                </p>
                <p className="text-xl font-bold" style={{ color: "#9ca3af" }}>
                  {selected.actual !== null
                    ? (selected.forecast !== null ? selected.forecast.toLocaleString() : "—")
                    : (selected.previous !== null ? selected.previous.toLocaleString() : "—")}
                  <span className="text-sm font-normal ml-1" style={{ color: "#6b7280" }}>
                    {selected.forecastUnit}
                  </span>
                </p>
              </div>
            </div>

            {/* AI analysis result */}
            {aiAnalysis && (
              <div
                className="mb-6 p-4 rounded-xl"
                style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}
              >
                <p className="text-xs font-semibold mb-2" style={{ color: "#60a5fa" }}>🤖 AI分析</p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#e2e8f0" }}>{aiAnalysis}</p>
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 mb-4 flex-wrap">
              {([
                ["overview", "概要・解説"],
                ["preAnalysis", "事前分析"],
                ...(selected.actual !== null ? [["postAnalysis", "結果分析"], ["sectors", "セクター影響"]] : [["sectors", "セクター影響"]]),
                ["tickers", "関連銘柄"],
              ] as [typeof activeTab, string][]).map(([tab, label]) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="px-3 py-1.5 rounded-lg text-sm transition-colors"
                  style={{
                    background: activeTab === tab ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.04)",
                    color: activeTab === tab ? "#60a5fa" : "#9ca3af",
                    border: activeTab === tab ? "1px solid rgba(59,130,246,0.3)" : "1px solid transparent",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div
              className="rounded-xl p-5"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid #1f2937" }}
            >
              {activeTab === "overview" && (
                <div className="space-y-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#6b7280" }}>指標の説明</p>
                    <p className="text-sm leading-relaxed" style={{ color: "#d1d5db" }}>{selected.definition.description}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#6b7280" }}>株式市場への影響</p>
                    <p className="text-sm leading-relaxed" style={{ color: "#d1d5db" }}>{selected.definition.whyItMatters}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#6b7280" }}>数値の読み方</p>
                    <p className="text-sm leading-relaxed" style={{ color: "#d1d5db" }}>{selected.definition.readingGuide}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#6b7280" }}>直近のトレンド</p>
                    <p className="text-sm leading-relaxed" style={{ color: "#d1d5db" }}>{selected.definition.historicalContext}</p>
                  </div>
                </div>
              )}

              {activeTab === "preAnalysis" && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#6b7280" }}>事前分析・予想の背景</p>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#d1d5db" }}>{selected.preAnalysis}</p>
                </div>
              )}

              {activeTab === "postAnalysis" && selected.actual !== null && (
                <div className="space-y-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#6b7280" }}>発表後の分析</p>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#d1d5db" }}>
                      {selected.postAnalysis || "分析データなし"}
                    </p>
                  </div>
                  {selected.marketReaction && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#6b7280" }}>市場の反応</p>
                      <div
                        className="p-3 rounded-lg text-sm"
                        style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", color: "#d1d5db" }}
                      >
                        {selected.marketReaction}
                      </div>
                    </div>
                  )}
                  {selected.outlook && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#6b7280" }}>今後の見通し</p>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#d1d5db" }}>{selected.outlook}</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "sectors" && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#6b7280" }}>セクター別影響</p>
                  <SectorImpact sectors={selected.definition.affectedSectors} />
                </div>
              )}

              {activeTab === "tickers" && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#6b7280" }}>
                    注目銘柄 · 想定される動き
                  </p>
                  <TickerTable tickers={selected.affectedTickers} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
