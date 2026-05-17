"use client"
import { useState, useEffect } from "react"

interface NewsItem {
  id: string
  text: string
  date: string
  category: string
}

interface WeeklyData {
  weekRange: { start: string; end: string }
  newsItems: NewsItem[]
  summary: string
}

const CATEGORY_COLORS: Record<string, string> = {
  "金融・金利": "#8b5cf6",
  "テクノロジー": "#3b82f6",
  "自動車": "#f59e0b",
  "消費・観光": "#10b981",
  "環境・エネルギー": "#06b6d4",
  "グローバル": "#ec4899",
  "中国・アジア": "#ef4444",
  "市場全般": "#6b7280",
}

export default function WeeklyNewsPage() {
  const [data, setData] = useState<WeeklyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>("全て")

  async function fetchData() {
    setLoading(true)
    try {
      const res = await fetch("/api/weekly-news")
      const json = await res.json()
      if (json.success) setData(json.data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const categories = data ? ["全て", ...Array.from(new Set(data.newsItems.map(n => n.category)))] : []
  const filteredNews = data?.newsItems.filter(n => selectedCategory === "全て" || n.category === selectedCategory) || []

  const summaryLines = data?.summary.split("\n").filter(Boolean) || []

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">📰 週次ニュースレポート</h1>
          <p className="text-sm text-slate-400 mt-1">
            {data ? `${data.weekRange.start} 〜 ${data.weekRange.end}` : "今週の日経ニュースをAIが要約"}
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white text-sm rounded-lg transition-colors"
        >
          {loading ? "生成中..." : "再生成"}
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-64 bg-slate-800/40 rounded-xl animate-pulse" />
          <div className="h-32 bg-slate-800/40 rounded-xl animate-pulse" />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-6">
          {/* AI Summary */}
          <div className="col-span-2 space-y-4">
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs px-2 py-0.5 rounded text-blue-400 bg-blue-400/10 border border-blue-400/30">Claude AI 生成</span>
                <h2 className="text-base font-semibold text-white">今週の総合レポート</h2>
              </div>
              <div className="space-y-3">
                {summaryLines.map((line, i) => {
                  const isHeader = line.startsWith("【") || line.match(/^[１-９]\./)
                  const isBullet = line.startsWith("•") || line.startsWith("・")
                  return (
                    <p
                      key={i}
                      className={`text-sm leading-relaxed ${
                        isHeader ? "font-semibold text-slate-100 mt-4 first:mt-0" : isBullet ? "text-slate-300 pl-2" : "text-slate-300"
                      }`}
                    >
                      {line}
                    </p>
                  )
                })}
              </div>
            </div>

            {/* Category filter */}
            <div className="flex items-center gap-2 flex-wrap">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                    selectedCategory === cat
                      ? "bg-blue-600 text-white"
                      : "bg-slate-800/60 border border-slate-700/50 text-slate-400 hover:text-white"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* News list */}
            <div className="space-y-3">
              {filteredNews.map(item => {
                const color = CATEGORY_COLORS[item.category] || "#6b7280"
                return (
                  <div
                    key={item.id}
                    className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4 hover:border-slate-600 transition-colors"
                    style={{ borderLeft: `3px solid ${color}` }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm text-slate-300 leading-relaxed flex-1">{item.text}</p>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span
                          className="text-xs px-2 py-0.5 rounded"
                          style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}
                        >
                          {item.category}
                        </span>
                        <span className="text-xs text-slate-500">{item.date}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">カテゴリー別件数</h3>
              <div className="space-y-2">
                {categories.filter(c => c !== "全て").map(cat => {
                  const count = data?.newsItems.filter(n => n.category === cat).length || 0
                  const color = CATEGORY_COLORS[cat] || "#6b7280"
                  const max = Math.max(...(data?.newsItems ? [1, ...categories.filter(c => c !== "全て").map(c2 => data.newsItems.filter(n => n.category === c2).length)] : [1]))
                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">{cat}</span>
                        <span style={{ color }}>{count}件</span>
                      </div>
                      <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${(count / max) * 100}%`, background: color }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">市場センチメント</h3>
              <div className="flex flex-col gap-2">
                {[
                  { label: "強気", value: 65, color: "#10b981" },
                  { label: "中立", value: 22, color: "#f59e0b" },
                  { label: "弱気", value: 13, color: "#ef4444" },
                ].map(s => (
                  <div key={s.label} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">{s.label}</span>
                      <span style={{ color: s.color }}>{s.value}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${s.value}%`, background: s.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
