interface StockCardProps {
  ticker: string
  name: string
  marketCapBillion?: number
  per?: number
  pbr?: number
  roe?: number
  equityRatio?: number
  dividendYield?: number
  mixCoefficient?: number
  hasZeroDebt?: boolean
  themes?: string[]
  reason: string
  confidence: "高" | "中" | "低"
  catalysts?: string[]
  tenbaggerScore?: number
  // legacy props
  sector?: string
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

function MixBadge({ value }: { value: number }) {
  const isGood = value <= 10
  const isMid = value <= 20 && value > 10
  const color = isGood ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/30" : isMid ? "text-amber-400 bg-amber-400/10 border-amber-400/30" : "text-slate-400 bg-slate-400/10 border-slate-400/30"
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded border font-mono ${color}`}>
      Mix:{value.toFixed(2)}{isGood ? "◎" : ""}
    </span>
  )
}

export default function StockCard({
  ticker, name, marketCapBillion, per, pbr, roe, equityRatio, dividendYield,
  mixCoefficient, hasZeroDebt, themes, reason, confidence, catalysts, tenbaggerScore,
  sector, price, changePercent, compact
}: StockCardProps) {
  const isPositive = changePercent !== undefined ? changePercent >= 0 : null
  const mix = mixCoefficient ?? (per && pbr ? per * pbr : undefined)

  return (
    <div className={`bg-slate-800/60 border border-slate-700/50 rounded-lg ${compact ? "p-3" : "p-4"} hover:border-blue-500/40 transition-colors`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded font-bold">{ticker}</span>
          <span className="text-sm font-semibold text-slate-100">{name}</span>
          {marketCapBillion && (
            <span className="text-xs text-slate-400">
              {marketCapBillion >= 1000 ? `${(marketCapBillion / 100).toFixed(0)}億` : `${marketCapBillion}億`}
              {marketCapBillion <= 500 && <span className="text-emerald-400 ml-0.5">◎</span>}
            </span>
          )}
        </div>
        <span className={`text-xs px-2 py-0.5 rounded border font-medium shrink-0 ${confidenceColors[confidence]}`}>
          確信:{confidence}
        </span>
      </div>

      {/* Metrics row - shikiho style */}
      {!compact && (per || pbr || roe || dividendYield) && (
        <div className="flex items-center gap-2 flex-wrap mb-2">
          {per !== undefined && <span className="text-xs text-slate-400">PER <span className="text-slate-200 font-mono">{per > 0 ? `${per}倍` : "赤字"}</span></span>}
          {pbr !== undefined && <span className="text-xs text-slate-400">PBR <span className="text-slate-200 font-mono">{pbr}倍</span></span>}
          {roe !== undefined && <span className="text-xs text-slate-400">ROE <span className="text-slate-200 font-mono">{roe}%</span></span>}
          {equityRatio !== undefined && <span className="text-xs text-slate-400">自己資本 <span className={`font-mono ${equityRatio >= 60 ? "text-emerald-400" : equityRatio >= 40 ? "text-slate-200" : "text-amber-400"}`}>{equityRatio}%</span></span>}
          {dividendYield !== undefined && dividendYield > 0 && <span className="text-xs text-slate-400">配当 <span className="text-amber-400 font-mono">{dividendYield}%</span></span>}
          {mix !== undefined && <MixBadge value={mix} />}
          {hasZeroDebt && <span className="text-xs text-emerald-400 border border-emerald-400/30 bg-emerald-400/10 px-1.5 py-0.5 rounded">有利子負債ゼロ◎</span>}
        </div>
      )}

      {/* Themes - shikiho ⭕ style */}
      {themes && themes.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {themes.map(t => (
            <span key={t} className="text-xs text-slate-300">⭕{t}</span>
          ))}
        </div>
      )}

      {/* Legacy sector */}
      {sector && !themes && (
        <div className="mb-2">
          <span className="text-xs text-slate-400 bg-slate-700/50 px-2 py-0.5 rounded">{sector}</span>
        </div>
      )}

      {price !== undefined && changePercent !== undefined && (
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-slate-300">{price.toLocaleString()}円</span>
          <span className={`text-xs font-mono ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
            {isPositive ? "+" : ""}{changePercent.toFixed(2)}%
          </span>
        </div>
      )}

      {!compact && (
        <>
          <p className="text-xs text-slate-300 leading-relaxed mb-2">{reason}</p>
          {catalysts && catalysts.length > 0 && (
            <div className="space-y-0.5">
              {catalysts.slice(0, 2).map((c, i) => (
                <p key={i} className="text-xs text-slate-400">▶ {c}</p>
              ))}
            </div>
          )}
          {tenbaggerScore !== undefined && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-slate-500">スコア</span>
              <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${tenbaggerScore}%`,
                    background: tenbaggerScore >= 80 ? "#10b981" : tenbaggerScore >= 65 ? "#3b82f6" : "#f59e0b"
                  }}
                />
              </div>
              <span className={`text-xs font-bold ${tenbaggerScore >= 80 ? "text-emerald-400" : tenbaggerScore >= 65 ? "text-blue-400" : "text-amber-400"}`}>
                {tenbaggerScore}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  )
}
