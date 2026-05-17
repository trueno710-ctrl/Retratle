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
  xPost?: string
  alertTime: string
  marketCapBillion?: number
  themes?: string[]
  context?: string
}

export default function AlertCard({
  ticker, name, price, change, changePercent, volume, report, xPost, alertTime, marketCapBillion, themes
}: AlertCardProps) {
  const [posting, setPosting] = useState(false)
  const [posted, setPosted] = useState(false)
  const [showXPost, setShowXPost] = useState(false)
  const isPositive = changePercent >= 0
  const isBigMove = Math.abs(changePercent) >= 10

  async function handlePost() {
    setPosting(true)
    try {
      const res = await fetch("/api/price-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ xPost: xPost || report }),
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
    <div className={`bg-slate-800/60 border rounded-lg p-4 ${
      isBigMove
        ? isPositive ? "border-emerald-400/50" : "border-red-400/50"
        : isPositive ? "border-emerald-500/20" : "border-red-500/20"
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-mono text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded font-bold">{ticker}</span>
            <span className="text-sm font-semibold text-slate-100">{name}</span>
            {marketCapBillion && (
              <span className="text-xs text-slate-500">
                {marketCapBillion}億円
                {marketCapBillion <= 500 && <span className="text-emerald-400 ml-0.5">小型◎</span>}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-slate-100 font-mono">{price.toLocaleString()}円</span>
            <span className={`text-base font-mono font-bold ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
              {isPositive ? "▲" : "▼"} {isPositive ? "+" : ""}{change > 0 ? change.toFixed(0) : Math.abs(change).toFixed(0)}円
              &nbsp;({isPositive ? "+" : ""}{changePercent.toFixed(2)}%)
            </span>
          </div>
        </div>
        <div className={`text-sm font-bold px-3 py-1.5 rounded-full shrink-0 ${
          isBigMove
            ? isPositive ? "bg-emerald-500/30 text-emerald-300 ring-1 ring-emerald-400/50" : "bg-red-500/30 text-red-300 ring-1 ring-red-400/50"
            : isPositive ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
        }`}>
          {isBigMove ? "⚡ " : ""}{isPositive ? "急騰" : "急落"}
        </div>
      </div>

      {/* Themes */}
      {themes && themes.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {themes.map(t => (
            <span key={t} className="text-xs text-slate-300">⭕{t}関連</span>
          ))}
        </div>
      )}

      {/* Report */}
      <div className="bg-slate-900/60 rounded-lg p-3 mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-slate-400">AIレポート（四季報スタイル）</span>
          {xPost && (
            <button onClick={() => setShowXPost(!showXPost)} className="text-xs text-blue-400 hover:text-blue-300">
              {showXPost ? "詳細表示" : "X投稿プレビュー"}
            </button>
          )}
        </div>
        <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
          {showXPost && xPost ? xPost : report}
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>{new Date(alertTime).toLocaleTimeString("ja-JP")}</span>
          <span>出来高: {(volume / 10000).toFixed(0)}万株</span>
        </div>
        <button
          onClick={handlePost}
          disabled={posting || posted}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
            posted
              ? "bg-slate-700 text-slate-400 cursor-not-allowed"
              : posting
              ? "bg-blue-600/50 text-blue-300 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-500 text-white"
          }`}
        >
          {posted ? "✓ 投稿済み" : posting ? "投稿中..." : "𝕏 に投稿"}
        </button>
      </div>
    </div>
  )
}
