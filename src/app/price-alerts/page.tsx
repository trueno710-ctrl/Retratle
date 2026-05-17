"use client"
import { useState, useEffect } from "react"
import AlertCard from "@/components/AlertCard"

interface Alert {
  ticker: string
  name: string
  price: number
  change: number
  changePercent: number
  volume: number
  report: string
  alertTime: string
}

export default function PriceAlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [threshold, setThreshold] = useState(3)
  const [filter, setFilter] = useState<"all" | "up" | "down">("all")

  async function fetchAlerts() {
    setLoading(true)
    try {
      const res = await fetch(`/api/price-alerts?threshold=${threshold}`)
      const json = await res.json()
      if (json.success) setAlerts(json.data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAlerts() }, [threshold])

  const filtered = alerts.filter(a => {
    if (filter === "up") return a.changePercent > 0
    if (filter === "down") return a.changePercent < 0
    return true
  })

  const gainers = alerts.filter(a => a.changePercent > 0).length
  const losers = alerts.filter(a => a.changePercent < 0).length

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">⚡ 値動きアラート</h1>
          <p className="text-sm text-slate-400 mt-1">
            大きな値動きがあった銘柄をAIが分析・レポート生成
          </p>
        </div>
        <button
          onClick={fetchAlerts}
          disabled={loading}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 text-white text-sm rounded-lg transition-colors"
        >
          {loading ? "分析中..." : "更新"}
        </button>
      </div>

      {/* Stats + Controls */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
          <p className="text-2xl font-bold text-white">{alerts.length}</p>
          <p className="text-xs text-slate-400">総アラート数</p>
        </div>
        <div className="bg-emerald-900/20 border border-emerald-500/20 rounded-xl p-4">
          <p className="text-2xl font-bold text-emerald-400">{gainers}</p>
          <p className="text-xs text-slate-400">急騰銘柄</p>
        </div>
        <div className="bg-red-900/20 border border-red-500/20 rounded-xl p-4">
          <p className="text-2xl font-bold text-red-400">{losers}</p>
          <p className="text-xs text-slate-400">急落銘柄</p>
        </div>
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
          <p className="text-xs text-slate-400 mb-2">アラート閾値</p>
          <div className="flex items-center gap-2">
            {[2, 3, 5].map(t => (
              <button
                key={t}
                onClick={() => setThreshold(t)}
                className={`flex-1 py-1 text-xs rounded transition-colors ${
                  threshold === t ? "bg-amber-600 text-white" : "bg-slate-700 text-slate-400 hover:text-white"
                }`}
              >
                ±{t}%
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400">表示:</span>
        {([
          { key: "all", label: "すべて" },
          { key: "up", label: "▲ 急騰のみ" },
          { key: "down", label: "▼ 急落のみ" },
        ] as const).map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
              filter === f.key
                ? "bg-slate-600 text-white"
                : "bg-slate-800/60 border border-slate-700/50 text-slate-400 hover:text-white"
            }`}
          >
            {f.label}
          </button>
        ))}
        <span className="text-xs text-slate-500 ml-2">{filtered.length}件表示中</span>
      </div>

      {/* Alert cards */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-48 bg-slate-800/40 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <p className="text-4xl mb-3">📊</p>
          <p className="text-sm">現在アクティブなアラートはありません</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {filtered.map(alert => (
            <AlertCard key={alert.ticker} {...alert} />
          ))}
        </div>
      )}

      <div className="bg-slate-800/20 border border-slate-700/30 rounded-xl p-4">
        <h3 className="text-xs font-semibold text-slate-400 mb-2">ℹ️ X投稿について</h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          「X に投稿」ボタンをクリックすると、AIが生成したレポートをX（旧Twitter）に自動投稿します。
          X API v2の設定（環境変数）が必要です。未設定の場合はシミュレーションモードで動作します。
        </p>
      </div>
    </div>
  )
}
