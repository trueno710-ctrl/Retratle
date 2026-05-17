"use client"
import { useState, useEffect } from "react"

interface NewsItem {
  id: string
  text: string
  date: string
  category: string
  importance: "高" | "中" | "低"
}

interface WeeklyPick {
  ticker: string
  name: string
  price: number
  per: number
  pbr: number
  mixCoefficient: number
  marketCapBillion: number
  themes: string[]
  shikihoComment: string
  catalysts: string[]
}

interface WeeklyData {
  weekRange: { start: string; end: string }
  newsItems: NewsItem[]
  summary: string
  weeklyPicks: WeeklyPick[]
}

const CATEGORY_COLORS: Record<string, string> = {
  "半導体・AI": "#3b82f6",
  "医療DX": "#10b981",
  "GX・環境": "#06b6d4",
  "防衛DX": "#6366f1",
  "金融・金利": "#8b5cf6",
  "フィジカルAI": "#ec4899",
  "インバウンド": "#f59e0b",
  "物流DX": "#84cc16",
  "市場全般": "#6b7280",
}

const IMPORTANCE_STYLES: Record<string, string> = {
  "高": "text-red-400 bg-red-400/10 border border-red-400/30",
  "中": "text-amber-400 bg-amber-400/10 border border-amber-400/30",
  "低": "text-slate-400 bg-slate-400/10 border border-slate-400/30",
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
            {data ? `${data.weekRange.start} 〜 ${data.weekRange.end}` : "今週の市場ニュースをAIが四季報スタイルで要約"}
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white text-sm rounded-lg transition-colors"
        >
          {loading ? "AI生成中..." : "再生成"}
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-80 bg-slate-800/40 rounded-xl animate-pulse" />
          <div className="h-40 bg-slate-800/40 rounded-xl animate-pulse" />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-6">
          {/* Main content */}
          <div className="col-span-2 space-y-5">
            {/* AI summary */}
            <div className="bg-slate-800/40 border border-blue-500/20 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs px-2 py-0.5 rounded text-blue-400 bg-blue-400/10 border border-blue-400/30">Claude AI × 四季報スタイル</span>
                <h2 className="text-base font-semibold text-white">今週の総合レポート</h2>
              </div>
              <div className="space-y-2.5">
                {summaryLines.map((line, i) => {
                  const isH1 = line.startsWith("【")
                  const isBullet = line.startsWith("•") || line.startsWith("⭕")
                  const isCode = line.match(/^\d{4}/)
                  return (
                    <p key={i} className={`text-sm leading-relaxed ${
                      isH1 ? "font-bold text-blue-300 mt-4 first:mt-0" :
                      isBullet ? "text-slate-200 pl-2" :
                      isCode ? "font-mono text-slate-200 bg-slate-900/60 px-3 py-2 rounded-lg" :
                      "text-slate-300"
                    }`}>
                      {line}
                    </p>
                  )
                })}
              </div>
            </div>

            {/* Weekly picks - shikiho style */}
            {data?.weeklyPicks && data.weeklyPicks.length > 0 && (
              <div className="bg-slate-800/40 border border-purple-500/20 rounded-xl p-5">
                <div className="text-xs text-purple-400 font-semibold mb-4">📖 今週の四季報スタイルピックアップ銘柄</div>
                <div className="grid grid-cols-1 gap-4">
                  {data.weeklyPicks.map(pick => (
                    <div key={pick.ticker} className="bg-slate-900/60 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-mono text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded font-bold">{pick.ticker}</span>
                        <span className="font-semibold text-white">{pick.name}</span>
                        <span className="text-xs text-slate-400 ml-auto">時価総額 {pick.marketCapBillion}億円{pick.marketCapBillion <= 500 ? " ◎" : ""}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm mb-3">
                        <span className="text-slate-400">PER <span className="text-slate-200 font-mono">{pick.per}倍</span></span>
                        <span className="text-slate-400">PBR <span className="text-slate-200 font-mono">{pick.pbr}倍</span></span>
                        <span className="text-slate-400">Mix <span className={`font-mono font-bold ${pick.mixCoefficient <= 10 ? "text-emerald-400" : "text-slate-200"}`}>{pick.mixCoefficient.toFixed(2)}{pick.mixCoefficient <= 10 ? " ◎" : ""}</span></span>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {pick.themes.map(t => <span key={t} className="text-xs text-slate-300">⭕{t}</span>)}
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{pick.shikihoComment}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Category filter */}
            <div className="flex items-center gap-2 flex-wrap">
              {categories.map(cat => {
                const color = CATEGORY_COLORS[cat] || "#6b7280"
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`text-xs px-3 py-1.5 rounded-lg transition-all border ${
                      selectedCategory === cat
                        ? "text-white border-transparent"
                        : "bg-slate-800/60 text-slate-400 hover:text-white border-slate-700/50"
                    }`}
                    style={selectedCategory === cat ? { background: `${color}33`, borderColor: `${color}66`, color } : {}}
                  >
                    {cat}
                  </button>
                )
              })}
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
                        <span className={`text-xs px-2 py-0.5 rounded ${IMPORTANCE_STYLES[item.importance]}`}>
                          重要度:{item.importance}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded" style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}>
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
            {/* Category chart */}
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">カテゴリー別</h3>
              <div className="space-y-2">
                {categories.filter(c => c !== "全て").map(cat => {
                  const count = data?.newsItems.filter(n => n.category === cat).length || 0
                  const highCount = data?.newsItems.filter(n => n.category === cat && n.importance === "高").length || 0
                  const color = CATEGORY_COLORS[cat] || "#6b7280"
                  const max = Math.max(1, ...categories.filter(c => c !== "全て").map(c2 => data?.newsItems.filter(n => n.category === c2).length || 0))
                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex justify-between text-xs items-center">
                        <span className="text-slate-400">{cat}</span>
                        <div className="flex items-center gap-1">
                          {highCount > 0 && <span className="text-red-400 text-xs">🔥{highCount}</span>}
                          <span style={{ color }}>{count}件</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(count / max) * 100}%`, background: color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 2026 policy themes */}
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">2026年 国策テーマ</h3>
              <div className="space-y-2">
                {[
                  { theme: "フィジカルAI", budget: "3,873億円", color: "#ec4899" },
                  { theme: "半導体支援", budget: "10兆円超", color: "#3b82f6" },
                  { theme: "GX推進", budget: "150兆円/10年", color: "#06b6d4" },
                  { theme: "防衛DX", budget: "43兆円/5年", color: "#6366f1" },
                  { theme: "医療DX", budget: "500億円+", color: "#10b981" },
                  { theme: "インバウンド", budget: "8兆円/年", color: "#f59e0b" },
                ].map(({ theme, budget, color }) => (
                  <div key={theme} className="flex items-center justify-between text-xs">
                    <span style={{ color }}>⭕ {theme}</span>
                    <span className="text-slate-500">{budget}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sentiment */}
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">市場センチメント</h3>
              {[
                { label: "強気（国策・内需）", value: 72, color: "#10b981" },
                { label: "中立（外需・輸出）", value: 18, color: "#f59e0b" },
                { label: "弱気（金利・円高）", value: 10, color: "#ef4444" },
              ].map(s => (
                <div key={s.label} className="mb-2 space-y-1">
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
      )}
    </div>
  )
}
