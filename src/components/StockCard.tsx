interface StockCardProps {
  ticker: string
  name: string
  reason: string
  confidence: "高" | "中" | "低"
  sector: string
  expectedImpact?: string
  price?: number
  changePercent?: number
  compact?: boolean
}

const confidenceColors = {
  "高": "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
  "中": "text-amber-400 bg-amber-400/10 border-amber-400/30",
  "低": "text-slate-400 bg-slate-400/10 border-slate-400/30",
}

export default function StockCard({ ticker, name, reason, confidence, sector, expectedImpact, price, changePercent, compact }: StockCardProps) {
  const isPositive = changePercent !== undefined ? changePercent >= 0 : null

  return (
    <div className={`bg-slate-800/60 border border-slate-700/50 rounded-lg ${compact ? "p-3" : "p-4"} hover:border-blue-500/40 transition-colors`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <span className="text-xs font-mono text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded">{ticker}</span>
          <span className="ml-2 text-sm font-semibold text-slate-100">{name}</span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded border font-medium ${confidenceColors[confidence]}`}>
          確信度:{confidence}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-slate-400 bg-slate-700/50 px-2 py-0.5 rounded">{sector}</span>
        {price !== undefined && (
          <span className="text-xs text-slate-300">{price.toLocaleString()}円</span>
        )}
        {changePercent !== undefined && (
          <span className={`text-xs font-mono ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
            {isPositive ? "+" : ""}{changePercent.toFixed(2)}%
          </span>
        )}
      </div>

      {!compact && (
        <>
          <p className="text-xs text-slate-300 leading-relaxed mb-2">{reason}</p>
          {expectedImpact && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-500">期待インパクト:</span>
              <span className="text-xs font-mono text-emerald-400">{expectedImpact}</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}
