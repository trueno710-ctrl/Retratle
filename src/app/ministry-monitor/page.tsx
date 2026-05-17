"use client"
import { useState, useEffect } from "react"
import { MINISTRIES } from "@/lib/ministries"
import MinistryCard from "@/components/MinistryCard"
import StockCard from "@/components/StockCard"

interface Recommendation {
  ticker: string
  name: string
  reason: string
  confidence: "高" | "中" | "低"
  sector: string
  expectedImpact: string
}

interface Post {
  id: string
  text: string
  created_at: string
  recommendations: Recommendation[]
  public_metrics?: { like_count: number; retweet_count: number; reply_count: number }
}

interface MinistryData {
  ministry: string
  handle: string
  sector: string
  color: string
  posts: Post[]
}

export default function MinistryMonitorPage() {
  const [data, setData] = useState<MinistryData[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<MinistryData | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string>("")

  async function fetchData() {
    setLoading(true)
    try {
      const res = await fetch("/api/ministry-monitor")
      const json = await res.json()
      if (json.success) {
        setData(json.data)
        setSelected(json.data[0] || null)
        setLastUpdated(new Date().toLocaleTimeString("ja-JP"))
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const allRecommendations = selected?.posts.flatMap(p => p.recommendations) || []

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">省庁モニター</h1>
          <p className="text-sm text-slate-400 mt-1">
            関係省庁のX投稿を監視し、恩恵を受ける銘柄をAIが自動分析
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && <span className="text-xs text-slate-500">最終更新: {lastUpdated}</span>}
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white text-sm rounded-lg transition-colors"
          >
            {loading ? "更新中..." : "更新"}
          </button>
        </div>
      </div>

      {/* Ministry status bar */}
      <div className="grid grid-cols-4 gap-3">
        {MINISTRIES.map((m) => (
          <button
            key={m.handle}
            onClick={() => {
              const found = data.find(d => d.handle === m.handle)
              if (found) setSelected(found)
            }}
            className={`p-3 rounded-lg text-left transition-all border ${
              selected?.handle === m.handle
                ? "border-blue-500/60 bg-blue-500/10"
                : "border-slate-700/50 bg-slate-800/40 hover:border-slate-600"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full live-dot" style={{ background: m.color }} />
              <span className="text-xs font-medium text-slate-100">{m.name}</span>
            </div>
            <span className="text-xs text-slate-500">{m.sector}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: Post list */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-300">最新投稿</h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-slate-800/40 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : data.length === 0 ? (
            <p className="text-sm text-slate-500">データなし</p>
          ) : (
            <div className="space-y-3">
              {data.map(d => (
                <button
                  key={d.handle}
                  className="w-full text-left"
                  onClick={() => setSelected(d)}
                >
                  <MinistryCard {...d} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Recommendations */}
        <div className="col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-300">
              {selected ? `${selected.ministry} の AI推薦銘柄` : "銘柄を選択してください"}
            </h2>
            {selected && (
              <span className="text-xs text-slate-500">{allRecommendations.length}件の推薦</span>
            )}
          </div>

          {selected && selected.posts.map(post => (
            <div key={post.id} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
              <div className="bg-slate-900/60 rounded-lg p-3 mb-4">
                <p className="text-sm text-slate-300 leading-relaxed">{post.text}</p>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-xs text-slate-500">
                    {new Date(post.created_at).toLocaleString("ja-JP")}
                  </span>
                  {post.public_metrics && (
                    <>
                      <span className="text-xs text-slate-500">❤️ {post.public_metrics.like_count}</span>
                      <span className="text-xs text-slate-500">🔁 {post.public_metrics.retweet_count}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {post.recommendations.map(rec => (
                  <StockCard key={rec.ticker} {...rec} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
