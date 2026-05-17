"use client"
import { useState, useEffect } from "react"

interface TenbaggerStock {
  ticker: string
  name: string
  sector: string
  marketCap: number
  per: number
  pbr: number
  dividendYield: number
  growthRate: number
  score: number
  analysis: string
  catalysts: string[]
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 85 ? "#10b981" : score >= 70 ? "#3b82f6" : "#f59e0b"
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-700/50 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-sm font-bold w-8" style={{ color }}>{score}</span>
    </div>
  )
}

export default function TenbaggerPage() {
  const [stocks, setStocks] = useState<TenbaggerStock[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<TenbaggerStock | null>(null)
  const [sortBy, setSortBy] = useState<"score" | "growthRate" | "per">("score")

  async function fetchData() {
    setLoading(true)
    try {
      const res = await fetch("/api/tenbagger")
      const json = await res.json()
      if (json.success) {
        setStocks(json.data)
        setSelected(json.data[0] || null)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const sorted = [...stocks].sort((a, b) => {
    if (sortBy === "score") return b.score - a.score
    if (sortBy === "growthRate") return b.growthRate - a.growthRate
    return a.per - b.per
  })

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">🚀 テンバガー研究所</h1>
          <p className="text-sm text-slate-400 mt-1">
            10倍株（テンバガー）ポテンシャルをAIがスコアリング分析
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 text-white text-sm rounded-lg transition-colors"
        >
          {loading ? "分析中..." : "再分析"}
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "スクリーニング対象", value: "3,800+", sub: "プライム上場銘柄" },
          { label: "候補銘柄数", value: stocks.length.toString(), sub: "スコア60点以上" },
          { label: "高スコア銘柄", value: stocks.filter(s => s.score >= 80).length.toString(), sub: "スコア80点以上" },
          { label: "平均成長率", value: stocks.length > 0 ? `${(stocks.reduce((a, b) => a + b.growthRate, 0) / stocks.length).toFixed(1)}%` : "-", sub: "候補銘柄平均" },
        ].map((stat, i) => (
          <div key={i} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
            <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
            <p className="text-xs text-slate-400">{stat.label}</p>
            <p className="text-xs text-slate-500 mt-0.5">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-6">
        {/* Stock list */}
        <div className="col-span-2 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">並び替え:</span>
            {(["score", "growthRate", "per"] as const).map(key => (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  sortBy === key ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                {key === "score" ? "スコア" : key === "growthRate" ? "成長率" : "PER"}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-24 bg-slate-800/40 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {sorted.map((stock, rank) => (
                <button
                  key={stock.ticker}
                  onClick={() => setSelected(stock)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selected?.ticker === stock.ticker
                      ? "border-purple-500/60 bg-purple-500/10"
                      : "border-slate-700/50 bg-slate-800/40 hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-slate-500">#{rank + 1}</span>
                        <span className="text-xs font-mono text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded">{stock.ticker}</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-100">{stock.name}</p>
                      <p className="text-xs text-slate-500">{stock.sector}</p>
                    </div>
                    <span className={`text-lg font-bold ${stock.score >= 85 ? "text-emerald-400" : stock.score >= 70 ? "text-blue-400" : "text-amber-400"}`}>
                      {stock.score}
                    </span>
                  </div>
                  <ScoreBar score={stock.score} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="col-span-3">
          {selected && (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-6 space-y-5 sticky top-8">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-mono text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded">{selected.ticker}</span>
                    <span className="text-xs text-slate-400 bg-slate-700/50 px-2 py-0.5 rounded">{selected.sector}</span>
                  </div>
                  <h2 className="text-xl font-bold text-white">{selected.name}</h2>
                </div>
                <div className="text-right">
                  <div className={`text-3xl font-bold ${selected.score >= 85 ? "text-emerald-400" : selected.score >= 70 ? "text-blue-400" : "text-amber-400"}`}>
                    {selected.score}
                  </div>
                  <div className="text-xs text-slate-500">テンバガースコア</div>
                </div>
              </div>

              <ScoreBar score={selected.score} />

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "PER", value: selected.per > 0 ? `${selected.per}倍` : "赤字", color: selected.per > 0 && selected.per < 30 ? "#10b981" : "#f59e0b" },
                  { label: "PBR", value: `${selected.pbr}倍`, color: selected.pbr < 3 ? "#10b981" : "#f59e0b" },
                  { label: "成長率", value: `+${selected.growthRate}%`, color: selected.growthRate > 25 ? "#10b981" : "#3b82f6" },
                  { label: "時価総額", value: `${(selected.marketCap / 100).toFixed(0)}億円`, color: "#9ca3af" },
                  { label: "配当利回り", value: `${selected.dividendYield}%`, color: "#9ca3af" },
                ].map((metric, i) => (
                  <div key={i} className="bg-slate-900/60 rounded-lg p-3 text-center">
                    <p className="text-xs text-slate-500 mb-1">{metric.label}</p>
                    <p className="text-base font-bold" style={{ color: metric.color }}>{metric.value}</p>
                  </div>
                ))}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-2">AI分析コメント</h3>
                <p className="text-sm text-slate-300 leading-relaxed bg-slate-900/60 rounded-lg p-3">{selected.analysis}</p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-2">カタリスト（株価上昇要因）</h3>
                <div className="space-y-2">
                  {selected.catalysts.map((c, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-emerald-400 text-xs">▶</span>
                      <span className="text-sm text-slate-300">{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
