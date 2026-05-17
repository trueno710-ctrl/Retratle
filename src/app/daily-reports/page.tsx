"use client"
import { useState, useEffect, useCallback } from "react"

interface StockPick {
  ticker: string
  name: string
  marketCapBillion: number
  per: number
  pbr: number
  mixCoefficient: number
  equityRatio: number
  dividendYield: number
  hasZeroDebt: boolean
  themes: string[]
  reason: string
  confidence: "高" | "中" | "低"
  catalysts: string[]
  tenbaggerScore: number
  sourceMinistry: string
}

interface MinistryPostResult {
  ministry: string
  handle: string
  postId?: string
  sector: string
  color: string
  postText: string
  postedAt: string
  likes: number
  retweets: number
  picks: StockPick[]
}

interface DailyReport {
  id: string
  date: string
  generatedAt: string
  ministryPosts: MinistryPostResult[]
  allPicks: StockPick[]
  topPicks: StockPick[]
  daySummary: string
  xPostText: string
  totalPostsAnalyzed: number
  totalMinistries: number
  postedToX: boolean
  postedAt?: string
}

const CONFIDENCE_STYLE: Record<string, string> = {
  "高": "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
  "中": "text-amber-400 bg-amber-400/10 border-amber-400/30",
  "低": "text-slate-400 bg-slate-400/10 border-slate-400/30",
}

function MixBadge({ value }: { value: number }) {
  const good = value <= 10
  return (
    <span className={`text-xs font-mono px-1.5 py-0.5 rounded border ${good ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/30" : "text-slate-400 bg-slate-700/50 border-slate-600/50"}`}>
      Mix {value.toFixed(2)}{good ? " ◎" : ""}
    </span>
  )
}

export default function DailyReportsPage() {
  const [reports, setReports] = useState<DailyReport[]>([])
  const [selected, setSelected] = useState<DailyReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [posting, setPosting] = useState(false)
  const [activeTab, setActiveTab] = useState<"topPicks" | "all" | "posts">("topPicks")
  const [lastRunInfo, setLastRunInfo] = useState<string>("")

  const fetchReports = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/daily-report?limit=30")
      const json = await res.json()
      if (json.success) {
        setReports(json.data)
        setSelected(json.data[0] || null)
        if (json.data.length > 0) {
          const latest = json.data[0]
          setLastRunInfo(`最終実行: ${new Date(latest.generatedAt).toLocaleString("ja-JP")}`)
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchReports() }, [fetchReports])

  async function generateReport() {
    setGenerating(true)
    try {
      const res = await fetch("/api/daily-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postToX: false }),
      })
      const json = await res.json()
      if (json.success) {
        await fetchReports()
      }
    } catch {
      // ignore
    } finally {
      setGenerating(false)
    }
  }

  async function postToX(date: string) {
    setPosting(true)
    try {
      const res = await fetch("/api/daily-report", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      })
      const json = await res.json()
      if (json.success) {
        await fetchReports()
      }
    } catch {
      // ignore
    } finally {
      setPosting(false)
    }
  }

  const todayDate = new Date().toISOString().slice(0, 10)
  const hasToday = reports.some(r => r.date === todayDate)

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">📋 日次レポート</h1>
          <p className="text-sm text-slate-400 mt-1">
            省庁X投稿を毎日自動分析 → 恩恵銘柄をAIが選定
          </p>
          {lastRunInfo && <p className="text-xs text-slate-500 mt-0.5">{lastRunInfo}</p>}
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right text-xs text-slate-400 leading-relaxed">
            <p>自動実行: 毎日 07:00 JST</p>
            <p className={hasToday ? "text-emerald-400" : "text-amber-400"}>
              {hasToday ? "✓ 本日分生成済み" : "⚠ 本日分未生成"}
            </p>
          </div>
          <button
            onClick={generateReport}
            disabled={generating}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
          >
            {generating ? (
              <>
                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                分析中...
              </>
            ) : "今すぐ実行"}
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "過去レポート数", value: reports.length, sub: "最大60日分保存" },
          { label: "累計選定銘柄", value: reports.reduce((s, r) => s + r.allPicks.length, 0), sub: "ユニーク銘柄" },
          { label: "高確信度銘柄", value: reports.reduce((s, r) => s + r.allPicks.filter(p => p.confidence === "高").length, 0), sub: "確信度「高」のみ" },
          { label: "X投稿済み", value: reports.filter(r => r.postedToX).length, sub: `全${reports.length}レポート中` },
        ].map((stat, i) => (
          <div key={i} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-xs text-slate-400">{stat.label}</p>
            <p className="text-xs text-slate-500 mt-0.5">{stat.sub}</p>
          </div>
        ))}
      </div>

      {loading && reports.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-slate-400 text-sm">レポートを読み込み中...</p>
          </div>
        </div>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-slate-400">まだレポートがありません</p>
          <p className="text-slate-500 text-sm">「今すぐ実行」ボタンで最初のレポートを生成してください</p>
          <button
            onClick={generateReport}
            disabled={generating}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
          >
            {generating ? "分析中..." : "最初のレポートを生成"}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-6">
          {/* Calendar sidebar */}
          <div className="col-span-1 space-y-2">
            <p className="text-xs text-slate-400 font-semibold px-1">レポート履歴</p>
            <div className="space-y-1.5 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
              {reports.map(r => {
                const isToday = r.date === todayDate
                const isSelected = selected?.date === r.date
                return (
                  <button
                    key={r.date}
                    onClick={() => setSelected(r)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${
                      isSelected
                        ? "border-blue-500/60 bg-blue-500/10"
                        : "border-slate-700/50 bg-slate-800/40 hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-semibold ${isToday ? "text-blue-400" : "text-slate-300"}`}>
                        {isToday ? "今日 " : ""}{r.date}
                      </span>
                      <div className="flex items-center gap-1">
                        {r.postedToX && <span className="text-xs text-blue-400">𝕏</span>}
                        <span className={`text-xs w-2 h-2 rounded-full ${r.allPicks.filter(p => p.confidence === "高").length > 0 ? "bg-emerald-400" : "bg-slate-600"}`} />
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">
                      {r.totalMinistries}省庁 / {r.allPicks.length}銘柄
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {new Date(r.generatedAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}生成
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Report detail */}
          <div className="col-span-3 space-y-4">
            {selected && (
              <>
                {/* Report header */}
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-lg font-bold text-white">
                          {selected.date === todayDate ? "本日" : selected.date} のレポート
                        </h2>
                        {selected.postedToX && (
                          <span className="text-xs px-2 py-0.5 rounded text-blue-400 bg-blue-400/10 border border-blue-400/30">𝕏 投稿済み</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        生成: {new Date(selected.generatedAt).toLocaleString("ja-JP")} ·
                        {selected.totalMinistries}省庁 · {selected.allPicks.length}銘柄選定
                      </p>
                    </div>
                    <button
                      onClick={() => postToX(selected.date)}
                      disabled={posting || selected.postedToX}
                      className={`text-sm px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                        selected.postedToX
                          ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                          : posting
                          ? "bg-blue-600/50 text-blue-300 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-500 text-white"
                      }`}
                    >
                      {selected.postedToX ? "✓ 投稿済み" : posting ? "投稿中..." : "𝕏 に投稿"}
                    </button>
                  </div>

                  {/* Summary */}
                  <div className="bg-slate-900/60 rounded-lg p-4">
                    <p className="text-xs text-slate-400 mb-2">📝 AI総括（四季報スタイル）</p>
                    <p className="text-sm text-slate-300 leading-relaxed">{selected.daySummary}</p>
                  </div>
                </div>

                {/* X post preview */}
                <div className="bg-slate-800/40 border border-blue-500/20 rounded-xl p-4">
                  <p className="text-xs text-blue-400 font-semibold mb-2">𝕏 投稿プレビュー（{selected.xPostText.length}字）</p>
                  <pre className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed font-sans">{selected.xPostText}</pre>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-2 border-b border-slate-700/50 pb-0">
                  {[
                    { key: "topPicks", label: `🏆 TOP5銘柄 (${selected.topPicks.length})` },
                    { key: "all", label: `📋 全選定銘柄 (${selected.allPicks.length})` },
                    { key: "posts", label: `🏛 省庁投稿 (${selected.ministryPosts.length})` },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setActiveTab(key as typeof activeTab)}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                        activeTab === key
                          ? "border-blue-500 text-blue-400"
                          : "border-transparent text-slate-400 hover:text-white"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                {(activeTab === "topPicks" || activeTab === "all") && (
                  <div className="space-y-3">
                    {(activeTab === "topPicks" ? selected.topPicks : selected.allPicks).map((pick, i) => (
                      <div key={`${pick.ticker}-${i}`} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 hover:border-blue-500/30 transition-colors">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              {activeTab === "topPicks" && (
                                <span className="text-xs font-bold text-slate-500">#{i + 1}</span>
                              )}
                              <span className="text-xs font-mono text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded font-bold">{pick.ticker}</span>
                              <span className="font-semibold text-white">{pick.name}</span>
                              <span className={`text-xs px-2 py-0.5 rounded border ${CONFIDENCE_STYLE[pick.confidence]}`}>確信:{pick.confidence}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                              <span>時価総額 <span className={`font-mono ${pick.marketCapBillion <= 500 ? "text-emerald-400 font-bold" : "text-slate-200"}`}>{pick.marketCapBillion}億{pick.marketCapBillion <= 500 ? "◎" : ""}</span></span>
                              <span>PER <span className="text-slate-200 font-mono">{pick.per}倍</span></span>
                              <span>PBR <span className={`font-mono ${pick.pbr < 1 ? "text-emerald-400 font-bold" : "text-slate-200"}`}>{pick.pbr}倍</span></span>
                              <MixBadge value={pick.mixCoefficient} />
                              {pick.hasZeroDebt && <span className="text-emerald-400">有利子負債ゼロ◎</span>}
                              {pick.dividendYield > 0 && <span>配当 <span className="text-amber-400 font-mono">{pick.dividendYield}%</span></span>}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className={`text-lg font-bold ${pick.tenbaggerScore >= 80 ? "text-emerald-400" : pick.tenbaggerScore >= 65 ? "text-blue-400" : "text-amber-400"}`}>
                              {pick.tenbaggerScore}
                            </div>
                            <div className="text-xs text-slate-500">スコア</div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1 mb-2">
                          {pick.themes.map(t => (
                            <span key={t} className="text-xs text-slate-300">⭕{t}</span>
                          ))}
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed mb-2">{pick.reason}</p>

                        <div className="flex items-center justify-between">
                          <div className="flex gap-2 flex-wrap">
                            {pick.catalysts.map((c, ci) => (
                              <span key={ci} className="text-xs text-slate-400">▶ {c}</span>
                            ))}
                          </div>
                          <span className="text-xs text-slate-500 shrink-0 ml-2">出所: {pick.sourceMinistry}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === "posts" && (
                  <div className="space-y-4">
                    {selected.ministryPosts.map(mp => (
                      <div key={mp.postId || mp.ministry} className="bg-slate-800/40 border border-slate-700/50 rounded-xl overflow-hidden">
                        <div className="px-4 py-3 flex items-center gap-3" style={{ borderLeft: `3px solid ${mp.color}` }}>
                          <div>
                            <span className="text-sm font-bold text-slate-100">{mp.ministry}</span>
                            <span className="text-xs text-slate-500 ml-2">@{mp.handle}</span>
                          </div>
                          <span className="ml-auto flex items-center gap-3 text-xs text-slate-500">
                            <span>❤️ {mp.likes}</span>
                            <span>🔁 {mp.retweets}</span>
                          </span>
                        </div>
                        <div className="p-4">
                          <p className="text-sm text-slate-300 leading-relaxed mb-3">{mp.postText}</p>
                          {mp.picks.length > 0 && (
                            <div>
                              <p className="text-xs text-slate-400 mb-2">AI選定銘柄:</p>
                              <div className="flex flex-wrap gap-2">
                                {mp.picks.map(p => (
                                  <span key={p.ticker} className="text-xs px-2 py-1 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                                    {p.ticker} {p.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
