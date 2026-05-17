"use client"
import { useState } from "react"

interface AlertCardProps {
  ticker: string
  name: string
  price: number
  change: number
  changePercent: number
  volume: number
  report: string
  alertTime: string
}

export default function AlertCard({ ticker, name, price, change, changePercent, volume, report, alertTime }: AlertCardProps) {
  const [posting, setPosting] = useState(false)
  const [posted, setPosted] = useState(false)
  const isPositive = changePercent >= 0

  async function handlePost() {
    setPosting(true)
    try {
      const res = await fetch("/api/price-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report }),
      })
      const data = await res.json()
      if (data.success) setPosted(true)
    } catch {
      // ignore
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className={`bg-slate-800/60 border rounded-lg p-4 ${isPositive ? "border-emerald-500/30" : "border-red-500/30"}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded">{ticker}</span>
            <span className="text-sm font-semibold text-slate-100">{name}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-slate-100">{price.toLocaleString()}円</span>
            <span className={`text-sm font-mono font-bold ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
              {isPositive ? "▲" : "▼"} {isPositive ? "+" : ""}{change.toFixed(0)}円 ({isPositive ? "+" : ""}{changePercent.toFixed(2)}%)
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-sm font-bold px-3 py-1 rounded-full ${isPositive ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
            {isPositive ? "急騰" : "急落"}
          </div>
          <div className="text-xs text-slate-500 mt-1">出来高: {(volume / 10000).toFixed(0)}万株</div>
        </div>
      </div>

      <div className="bg-slate-900/60 rounded-lg p-3 mb-3">
        <div className="text-xs text-slate-400 mb-1">AIレポート</div>
        <p className="text-xs text-slate-300 leading-relaxed">{report}</p>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">{new Date(alertTime).toLocaleTimeString("ja-JP")}</span>
        <button
          onClick={handlePost}
          disabled={posting || posted}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
            posted
              ? "bg-slate-700 text-slate-400 cursor-not-allowed"
              : posting
              ? "bg-blue-600/50 text-blue-300 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-500 text-white"
          }`}
        >
          {posted ? "投稿済み ✓" : posting ? "投稿中..." : "X に投稿"}
        </button>
      </div>
    </div>
  )
}
