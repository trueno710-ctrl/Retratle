"use client"
import { useState, useEffect } from "react"

interface TenbaggerStock {
  ticker: string
  name: string
  sector: string
  marketCapBillion: number
  per: number
  pbr: number
  psr: number
  roe: number
  roa: number
  equityRatio: number
  dividendYield: number
  mixCoefficient: number
  hasZeroDebt: boolean
  growthRate: number
  consecutiveDividendGrowth: number
  themes: string[]
  score: number
  shikihoComment: string
  catalysts: string[]
  targetMultiple: string
  riskFactors: string[]
}

function MixIndicator({ value }: { value: number }) {
  const isGood = value <= 10
  const isMid = value <= 20
  const color = isGood ? "text-emerald-400" : isMid ? "text-amber-400" : "text-red-400"
  return (
    <span className={`font-mono text-sm font-bold ${color}`}>
      {value.toFixed(2)}{isGood ? " ◎" : isMid ? "" : " △"}
    </span>
  )
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 85 ? "#10b981" : score >= 70 ? "#3b82f6" : "#f59e0b"
  return (
    <div className="relative w-16 h-16">
      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="15" fill="none" stroke="#1f2937" strokeWidth="3" />
        <circle
          cx="18" cy="18" r="15" fill="none"
          stroke={color} strokeWidth="3"
          strokeDasharray={`${score * 0.942} 94.2`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold" style={{ color }}>{score}</span>
      </div>
    </div>
  )
}

export default function TenbaggerPage() {
  const [stocks, setStocks] = useState<TenbaggerStock[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<TenbaggerStock | null>(null)
  const [sortBy, setSortBy] = useState<"score" | "mixCoefficient" | "growthRate" | "marketCap">("score")

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
    if (sortBy === "mixCoefficient") return a.mixCoefficient - b.mixCoefficient
    if (sortBy === "growthRate") return b.growthRate - a.growthRate
    return a.marketCapBillion - b.marketCapBillion
  })

  const multipleColor = (m: string) =>
    m === "5バガー" ? "text-purple-400 bg-purple-400/10 border-purple-400/30" :
    m === "3バガー" ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/30" :
    m === "2バガー" ? "text-blue-400 bg-blue-400/10 border-blue-400/30" :
    "text-slate-400 bg-slate-400/10 border-slate-400/30"

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">🚀 テンバガー研究所</h1>
          <p className="text-sm text-slate-400 mt-1">
            四季報分析スタイルで小型・割安・国策テーマ株をスクリーニング
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 text-white text-sm rounded-lg transition-colors"
        >
          {loading ? "分析中..." : "再スクリーニング"}
        </button>
      </div>

      {/* Selection criteria summary */}
      <div className="bg-slate-800/40 border border-purple-500/20 rounded-xl p-4">
        <div className="text-xs text-purple-400 font-semibold mb-2">📖 四季報スタイル銘柄選定条件</div>
        <div className="flex flex-wrap gap-3 text-xs text-slate-300">
          <span>⭕時価総額500億円以下</span>
          <span>⭕ミックス係数（PER×PBR）10以下</span>
          <span>⭕来期業績拡大期待</span>
          <span>⭕国策・テーマ性あり</span>
          <span>⭕自己資本比率40%以上</span>
          <span>⭕2バガー以上のポテンシャル</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "スクリーニング対象", value: "3,800+", sub: "プライム上場銘柄" },
          { label: "候補銘柄数", value: stocks.length.toString(), sub: "スコア60点以上" },
          { label: "ミックス係数10以下", value: stocks.filter(s => s.mixCoefficient <= 10).length.toString(), sub: "割安◎" },
          { label: "高スコア（80点+）", value: stocks.filter(s => s.score >= 80).length.toString(), sub: "厳選銘柄" },
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
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400">並び替え:</span>
            {[
              { key: "score", label: "スコア" },
              { key: "mixCoefficient", label: "Mix係数" },
              { key: "growthRate", label: "成長率" },
              { key: "marketCap", label: "時価総額" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setSortBy(key as typeof sortBy)}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  sortBy === key ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1,2,3,4,5].map(i => <div key={i} className="h-28 bg-slate-800/40 rounded-xl animate-pulse" />)}
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
                        <span className="text-xs text-slate-500 font-bold">#{rank + 1}</span>
                        <span className="text-xs font-mono text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded">{stock.ticker}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${multipleColor(stock.targetMultiple)}`}>
                          {stock.targetMultiple}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-100">{stock.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-500">Mix:</span>
                        <MixIndicator value={stock.mixCoefficient} />
                        <span className="text-xs text-slate-500">時価 {stock.marketCapBillion}億</span>
                      </div>
                    </div>
                    <ScoreRing score={stock.score} />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {stock.themes.slice(0, 2).map(t => (
                      <span key={t} className="text-xs text-slate-400">⭕{t}</span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="col-span-3">
          {selected && (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-6 space-y-5 sticky top-8">
              {/* Title */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-mono text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded">{selected.ticker}</span>
                    <span className={`text-xs px-2 py-0.5 rounded border font-medium ${multipleColor(selected.targetMultiple)}`}>
                      目標 {selected.targetMultiple}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white">{selected.name}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{selected.sector}</p>
                </div>
                <ScoreRing score={selected.score} />
              </div>

              {/* Shikiho-style metrics block */}
              <div className="bg-slate-900/60 rounded-lg p-4">
                <div className="text-xs text-purple-400 font-semibold mb-3">📖 四季報スタイル分析</div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">時価総額</span>
                    <span className={`font-mono ${selected.marketCapBillion <= 500 ? "text-emerald-400 font-bold" : "text-slate-200"}`}>
                      {selected.marketCapBillion}億円{selected.marketCapBillion <= 500 ? " ◎" : ""}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">PER</span>
                    <span className="text-slate-200 font-mono">{selected.per > 0 ? `${selected.per}倍` : "赤字"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">PBR</span>
                    <span className={`font-mono ${selected.pbr < 1 ? "text-emerald-400 font-bold" : "text-slate-200"}`}>
                      {selected.pbr}倍{selected.pbr < 1 ? " ◎" : ""}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">PSR</span>
                    <span className="text-slate-200 font-mono">{selected.psr}倍</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">ROE（予）</span>
                    <span className={`font-mono ${selected.roe >= 10 ? "text-emerald-400" : "text-slate-200"}`}>{selected.roe}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">ROA（予）</span>
                    <span className="text-slate-200 font-mono">{selected.roa}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">自己資本比率</span>
                    <span className={`font-mono ${selected.equityRatio >= 60 ? "text-emerald-400 font-bold" : selected.equityRatio >= 40 ? "text-slate-200" : "text-amber-400"}`}>
                      {selected.equityRatio}%{selected.equityRatio >= 60 ? " ◎" : ""}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">配当利回り</span>
                    <span className={`font-mono ${selected.dividendYield >= 3 ? "text-amber-400 font-bold" : "text-slate-200"}`}>
                      {selected.dividendYield}%{selected.dividendYield >= 3 ? " ◎" : ""}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">ミックス係数</span>
                    <MixIndicator value={selected.mixCoefficient} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">有利子負債</span>
                    {selected.hasZeroDebt
                      ? <span className="text-emerald-400 font-bold">ゼロ ◎</span>
                      : <span className="text-slate-400">あり</span>}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">売上成長率</span>
                    <span className={`font-mono ${selected.growthRate >= 20 ? "text-emerald-400 font-bold" : "text-slate-200"}`}>
                      +{selected.growthRate}%{selected.growthRate >= 20 ? " ◎" : ""}
                    </span>
                  </div>
                  {selected.consecutiveDividendGrowth > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">連続増配</span>
                      <span className="text-amber-400 font-mono">{selected.consecutiveDividendGrowth}年◎</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Themes */}
              <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-2">⭕ 国策・テーマ</h3>
                <div className="flex flex-wrap gap-2">
                  {selected.themes.map(t => (
                    <span key={t} className="text-sm text-slate-200">⭕{t}</span>
                  ))}
                </div>
              </div>

              {/* AI comment */}
              <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-2">📝 四季報スタイル分析コメント</h3>
                <p className="text-sm text-slate-300 leading-relaxed bg-slate-900/60 rounded-lg p-3">{selected.shikihoComment}</p>
              </div>

              {/* Catalysts & Risks */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-emerald-400 mb-2">▶ カタリスト</h3>
                  <div className="space-y-1">
                    {selected.catalysts.map((c, i) => (
                      <p key={i} className="text-xs text-slate-300">⭕ {c}</p>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-red-400 mb-2">▶ リスク要因</h3>
                  <div className="space-y-1">
                    {selected.riskFactors.map((r, i) => (
                      <p key={i} className="text-xs text-slate-400">△ {r}</p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
