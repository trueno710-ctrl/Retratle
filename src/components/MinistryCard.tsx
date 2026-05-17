import StockCard from "./StockCard"

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

interface MinistryCardProps {
  ministry: string
  handle: string
  sector: string
  color: string
  posts: Post[]
}

export default function MinistryCard({ ministry, handle, sector, color, posts }: MinistryCardProps) {
  const latestPost = posts[0]

  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl overflow-hidden">
      <div className="px-4 py-3 flex items-center gap-3" style={{ borderLeft: `3px solid ${color}` }}>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-100">{ministry}</span>
            <span className="text-xs text-slate-500">@{handle}</span>
          </div>
          <span className="text-xs px-2 py-0.5 rounded text-slate-400 bg-slate-700/50">{sector}</span>
        </div>
      </div>

      {latestPost && (
        <div className="p-4">
          <div className="bg-slate-900/60 rounded-lg p-3 mb-3">
            <p className="text-sm text-slate-300 leading-relaxed">{latestPost.text}</p>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-xs text-slate-500">
                {new Date(latestPost.created_at).toLocaleString("ja-JP")}
              </span>
              {latestPost.public_metrics && (
                <>
                  <span className="text-xs text-slate-500">❤️ {latestPost.public_metrics.like_count}</span>
                  <span className="text-xs text-slate-500">🔁 {latestPost.public_metrics.retweet_count}</span>
                </>
              )}
            </div>
          </div>

          {latestPost.recommendations.length > 0 && (
            <div>
              <div className="text-xs text-slate-400 mb-2">AI推薦銘柄</div>
              <div className="grid gap-2">
                {latestPost.recommendations.slice(0, 2).map((rec) => (
                  <StockCard key={rec.ticker} {...rec} compact />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
