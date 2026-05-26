"use client"

import { useState, useEffect, useCallback } from "react"
import type { RakutenItem } from "@/app/api/rakuten/search/route"
import type { GeneratedPost } from "@/app/api/rakuten/generate-post/route"

type Tab = "search" | "posts" | "settings"
type Tone = "カジュアル" | "丁寧" | "熱量高め"

interface SavedPost {
  id: string
  createdAt: string
  item: RakutenItem
  generated: GeneratedPost
  cmImageUrl?: string
  postedInstagram: boolean
  postedThreads: boolean
  instagramPostId?: string
  threadsPostId?: string
  note?: string
}

const STORAGE_KEY = "rakuten_affiliate_posts"

function loadPosts(): SavedPost[] {
  if (typeof window === "undefined") return []
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") } catch { return [] }
}
function savePosts(posts: SavedPost[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts))
}

function buildCmImageUrl(item: RakutenItem): string {
  const base = typeof window !== "undefined" ? window.location.origin : ""
  const params = new URLSearchParams({
    itemName: item.itemName,
    price: String(item.itemPrice),
    imageUrl: item.mediumImageUrls[0]?.imageUrl || "",
    reviewAverage: String(item.reviewAverage),
    reviewCount: String(item.reviewCount),
    shopName: item.shopName,
    account: "@otoku_ai_life",
  })
  return `${base}/api/rakuten/generate-image?${params.toString()}`
}

export default function RakutenAffiliatePage() {
  const [tab, setTab] = useState<Tab>("search")
  const [keyword, setKeyword] = useState("")
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<RakutenItem[]>([])
  const [selectedItem, setSelectedItem] = useState<RakutenItem | null>(null)
  const [tone, setTone] = useState<Tone>("熱量高め")
  const [generating, setGenerating] = useState(false)
  const [generatedPost, setGeneratedPost] = useState<GeneratedPost | null>(null)
  const [cmImageUrl, setCmImageUrl] = useState<string | null>(null)
  const [showCmPreview, setShowCmPreview] = useState(false)
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([])
  const [posting, setPosting] = useState<"instagram" | "threads" | "auto" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [expandedPost, setExpandedPost] = useState<string | null>(null)
  const [editNote, setEditNote] = useState<{ id: string; text: string } | null>(null)

  useEffect(() => { setSavedPosts(loadPosts()) }, [])

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!keyword.trim()) return
    setSearching(true)
    setError(null)
    try {
      const res = await fetch(`/api/rakuten/search?keyword=${encodeURIComponent(keyword)}&hits=12`)
      const json = await res.json()
      if (json.success) setSearchResults(json.data)
      else setError(json.error)
    } catch { setError("検索に失敗しました") }
    finally { setSearching(false) }
  }

  async function handleGenerate() {
    if (!selectedItem) return
    setGenerating(true)
    setError(null)
    setGeneratedPost(null)
    setShowCmPreview(false)
    try {
      const res = await fetch("/api/rakuten/generate-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemName: selectedItem.itemName,
          itemPrice: selectedItem.itemPrice,
          catchcopy: selectedItem.catchcopy,
          itemCaption: selectedItem.itemCaption,
          shopName: selectedItem.shopName,
          reviewAverage: selectedItem.reviewAverage,
          reviewCount: selectedItem.reviewCount,
          affiliateUrl: selectedItem.affiliateUrl || selectedItem.itemUrl,
          tone,
          isAnime: true,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setGeneratedPost(json.data)
        setCmImageUrl(buildCmImageUrl(selectedItem))
        setShowCmPreview(true)
      } else setError(json.error)
    } catch { setError("投稿文の生成に失敗しました") }
    finally { setGenerating(false) }
  }

  // ワンクリック全自動投稿
  async function handleAutoPost() {
    if (!selectedItem || !generatedPost) return
    setPosting("auto")
    setError(null)

    const imageUrl = cmImageUrl || selectedItem.mediumImageUrls[0]?.imageUrl

    try {
      const res = await fetch("/api/rakuten/post-instagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption: generatedPost.instagram,
          imageUrl,
        }),
      })
      const json = await res.json()
      if (json.success) {
        // 保存して完了
        const post: SavedPost = {
          id: Date.now().toString(),
          createdAt: new Date().toISOString(),
          item: selectedItem,
          generated: generatedPost,
          cmImageUrl: imageUrl,
          postedInstagram: true,
          postedThreads: false,
          instagramPostId: json.postId,
        }
        const updated = [post, ...savedPosts]
        setSavedPosts(updated)
        savePosts(updated)
        setSuccess("🎉 Instagramに投稿しました！")
        setGeneratedPost(null)
        setSelectedItem(null)
        setShowCmPreview(false)
        setTab("posts")
        setTimeout(() => setSuccess(null), 5000)
      } else if (json.setupRequired) {
        setError(`設定が必要: ${json.error}`)
      } else {
        setError(json.error)
      }
    } catch { setError("投稿に失敗しました") }
    finally { setPosting(null) }
  }

  function handleSavePost() {
    if (!selectedItem || !generatedPost) return
    const post: SavedPost = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      item: selectedItem,
      generated: generatedPost,
      cmImageUrl: cmImageUrl || undefined,
      postedInstagram: false,
      postedThreads: false,
    }
    const updated = [post, ...savedPosts]
    setSavedPosts(updated)
    savePosts(updated)
    setSuccess("投稿を保存しました")
    setTab("posts")
    setTimeout(() => setSuccess(null), 3000)
  }

  const handlePostToSocial = useCallback(async (
    postId: string,
    platform: "instagram" | "threads"
  ) => {
    const post = savedPosts.find(p => p.id === postId)
    if (!post) return
    setPosting(platform)
    setError(null)
    const text = platform === "instagram" ? post.generated.instagram : post.generated.threads
    const endpoint = platform === "instagram" ? "/api/rakuten/post-instagram" : "/api/rakuten/post-threads"
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption: text,
          text,
          imageUrl: post.cmImageUrl || post.item.mediumImageUrls[0]?.imageUrl,
        }),
      })
      const json = await res.json()
      if (json.success) {
        const updated = savedPosts.map(p =>
          p.id === postId ? {
            ...p,
            postedInstagram: platform === "instagram" ? true : p.postedInstagram,
            postedThreads: platform === "threads" ? true : p.postedThreads,
            instagramPostId: platform === "instagram" ? json.postId : p.instagramPostId,
            threadsPostId: platform === "threads" ? json.postId : p.threadsPostId,
          } : p
        )
        setSavedPosts(updated)
        savePosts(updated)
        setSuccess(`${platform === "instagram" ? "Instagram" : "Threads"}に投稿しました`)
        setTimeout(() => setSuccess(null), 3000)
      } else if (json.setupRequired) {
        setError(`設定が必要: ${json.error}`)
      } else {
        setError(json.error)
      }
    } catch { setError("投稿に失敗しました") }
    finally { setPosting(null) }
  }, [savedPosts])

  function handleDeletePost(id: string) {
    const updated = savedPosts.filter(p => p.id !== id)
    setSavedPosts(updated)
    savePosts(updated)
  }

  function handleSaveNote(id: string) {
    if (!editNote) return
    const updated = savedPosts.map(p => p.id === id ? { ...p, note: editNote.text } : p)
    setSavedPosts(updated)
    savePosts(updated)
    setEditNote(null)
  }

  const postedCount = savedPosts.filter(p => p.postedInstagram || p.postedThreads).length

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">🛒 楽天アフィリエイト管理</h1>
          <p className="text-sm text-slate-400 mt-1">商品リサーチ → CM画像生成 → Instagram自動投稿</p>
        </div>
        <div className="flex gap-3 text-center">
          {[
            { label: "保存済み投稿", value: savedPosts.length },
            { label: "投稿済み", value: postedCount },
          ].map(stat => (
            <div key={stat.label} className="px-4 py-2 rounded-lg text-sm" style={{ background: "#111827", border: "1px solid #1f2937" }}>
              <p className="text-xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-slate-400">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="px-4 py-3 rounded-lg text-sm text-red-300" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
          ⚠️ {error}
        </div>
      )}
      {success && (
        <div className="px-4 py-3 rounded-lg text-sm text-emerald-300" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)" }}>
          {success}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ background: "#111827", border: "1px solid #1f2937" }}>
        {(["search", "posts", "settings"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm rounded-md transition-all ${tab === t ? "bg-slate-700 text-white font-medium" : "text-slate-400 hover:text-white"}`}
          >
            {t === "search" ? "🔍 商品リサーチ" : t === "posts" ? `📋 投稿管理 (${savedPosts.length})` : "⚙️ 設定"}
          </button>
        ))}
      </div>

      {/* Search Tab */}
      {tab === "search" && (
        <div className="grid grid-cols-3 gap-6">
          {/* Left: Search */}
          <div className="col-span-1 space-y-4">
            <form onSubmit={handleSearch} className="space-y-3">
              <input
                type="text" value={keyword} onChange={e => setKeyword(e.target.value)}
                placeholder="例: フィギュア アニメ, 推しグッズ"
                className="w-full px-3 py-2 rounded-lg text-sm text-white bg-transparent outline-none focus:ring-1 focus:ring-blue-500"
                style={{ background: "#111827", border: "1px solid #1f2937" }}
              />
              <button type="submit" disabled={searching}
                className="w-full py-2 text-sm rounded-lg font-medium transition-colors disabled:opacity-50"
                style={{ background: "#3b82f6", color: "white" }}
              >
                {searching ? "検索中..." : "🔍 楽天で検索"}
              </button>
            </form>

            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {searchResults.map(item => (
                  <button key={item.itemCode} onClick={() => { setSelectedItem(item); setGeneratedPost(null); setShowCmPreview(false) }}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${selectedItem?.itemCode === item.itemCode ? "border-blue-500/60 bg-blue-500/10" : "border-slate-700/50 bg-slate-800/40 hover:border-slate-600"}`}
                  >
                    <div className="flex gap-2">
                      {item.mediumImageUrls[0] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.mediumImageUrls[0].imageUrl} alt="" className="w-12 h-12 object-cover rounded" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white font-medium line-clamp-2 leading-tight">{item.itemName}</p>
                        <p className="text-xs text-emerald-400 font-bold mt-1">¥{item.itemPrice.toLocaleString()}</p>
                        <p className="text-xs text-slate-500">★{item.reviewAverage} ({item.reviewCount}件)</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Generator */}
          <div className="col-span-2 space-y-4">
            {selectedItem ? (
              <>
                {/* Selected item */}
                <div className="rounded-xl p-4 flex gap-4" style={{ background: "#111827", border: "1px solid #1f2937" }}>
                  {selectedItem.mediumImageUrls[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={selectedItem.mediumImageUrls[0].imageUrl} alt="" className="w-20 h-20 object-cover rounded-lg flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm leading-tight mb-1">{selectedItem.itemName}</p>
                    <p className="text-emerald-400 font-bold text-lg">¥{selectedItem.itemPrice.toLocaleString()}</p>
                    <p className="text-xs text-slate-400">{selectedItem.shopName} · ★{selectedItem.reviewAverage}（{selectedItem.reviewCount}件）</p>
                  </div>
                </div>

                {/* Tone + Generate */}
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs text-slate-400">トーン:</span>
                  {(["カジュアル", "丁寧", "熱量高め"] as Tone[]).map(t => (
                    <button key={t} onClick={() => setTone(t)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${tone === t ? "border-purple-500 bg-purple-500/20 text-purple-300" : "border-slate-700 text-slate-400 hover:text-white"}`}
                    >
                      {t}
                    </button>
                  ))}
                  <button onClick={handleGenerate} disabled={generating}
                    className="ml-auto px-4 py-2 text-sm rounded-lg font-medium transition-colors disabled:opacity-50"
                    style={{ background: "#8b5cf6", color: "white" }}
                  >
                    {generating ? "✨ 生成中..." : "✨ CM＆投稿文を生成"}
                  </button>
                </div>

                {/* CM Image Preview */}
                {showCmPreview && cmImageUrl && (
                  <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1f2937" }}>
                    <div className="px-4 py-2 flex items-center justify-between" style={{ background: "#111827" }}>
                      <span className="text-sm font-semibold text-pink-400">🎬 CM画像プレビュー</span>
                      <span className="text-xs text-slate-400">Instagram用 1080×1080</span>
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={cmImageUrl} alt="CM" className="w-full" style={{ maxHeight: 400, objectFit: "contain", background: "#0d1117" }} />
                  </div>
                )}

                {/* Generated post */}
                {generatedPost && (
                  <div className="space-y-3">
                    {/* Instagram */}
                    <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1f2937" }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-pink-400">📸 Instagram 投稿文</span>
                        <button onClick={() => navigator.clipboard.writeText(generatedPost.instagram)} className="text-xs text-slate-400 hover:text-white">コピー</button>
                      </div>
                      <pre className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed font-sans max-h-40 overflow-y-auto">{generatedPost.instagram}</pre>
                    </div>

                    {/* Threads */}
                    <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1f2937" }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-slate-300">🧵 Threads 投稿文</span>
                        <button onClick={() => navigator.clipboard.writeText(generatedPost.threads)} className="text-xs text-slate-400 hover:text-white">コピー</button>
                      </div>
                      <pre className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed font-sans max-h-32 overflow-y-auto">{generatedPost.threads}</pre>
                    </div>

                    {/* Action buttons */}
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={handleSavePost}
                        className="py-2.5 text-sm font-semibold rounded-lg transition-colors"
                        style={{ background: "#374151", color: "white" }}
                      >
                        💾 保存（後で投稿）
                      </button>
                      <button onClick={handleAutoPost} disabled={posting === "auto"}
                        className="py-2.5 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                        style={{ background: posting === "auto" ? "#374151" : "linear-gradient(135deg, #ec4899, #8b5cf6)", color: "white" }}
                      >
                        {posting === "auto" ? "📤 投稿中..." : "🚀 今すぐInstagramに投稿！"}
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-48 text-slate-500 text-sm rounded-xl" style={{ border: "1px dashed #374151" }}>
                左から商品を選択してください
              </div>
            )}
          </div>
        </div>
      )}

      {/* Posts Tab */}
      {tab === "posts" && (
        <div className="space-y-4">
          {savedPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500 space-y-3">
              <p className="text-4xl">📭</p>
              <p className="text-sm">保存済みの投稿がありません</p>
              <button onClick={() => setTab("search")} className="text-xs text-blue-400 hover:underline">商品リサーチへ</button>
            </div>
          ) : (
            savedPosts.map(post => (
              <div key={post.id} className="rounded-xl overflow-hidden" style={{ background: "#111827", border: "1px solid #1f2937" }}>
                <div className="p-4 flex items-start gap-4">
                  {/* CM image or product image */}
                  {post.cmImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.cmImageUrl} alt="" className="w-16 h-16 object-cover rounded-lg flex-shrink-0" />
                  ) : post.item.mediumImageUrls[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.item.mediumImageUrls[0].imageUrl} alt="" className="w-16 h-16 object-cover rounded-lg flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm leading-tight">{post.item.itemName}</p>
                    <p className="text-emerald-400 font-bold">¥{post.item.itemPrice.toLocaleString()}</p>
                    <p className="text-xs text-slate-500">{new Date(post.createdAt).toLocaleDateString("ja-JP")} 保存</p>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${post.postedInstagram ? "text-pink-300 bg-pink-400/10 border-pink-400/30" : "text-slate-500 bg-slate-800 border-slate-700"}`}>
                        📸 {post.postedInstagram ? "Instagram投稿済" : "未投稿"}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${post.postedThreads ? "text-slate-200 bg-slate-600/50 border-slate-500" : "text-slate-500 bg-slate-800 border-slate-700"}`}>
                        🧵 {post.postedThreads ? "Threads投稿済" : "未投稿"}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white transition-colors"
                    >
                      {expandedPost === post.id ? "閉じる" : "詳細"}
                    </button>
                    <button onClick={() => handleDeletePost(post.id)}
                      className="text-xs px-2 py-1.5 rounded-lg border border-red-900/50 text-red-400 hover:bg-red-400/10 transition-colors"
                    >
                      削除
                    </button>
                  </div>
                </div>

                {expandedPost === post.id && (
                  <div className="px-4 pb-4 space-y-3" style={{ borderTop: "1px solid #1f2937" }}>
                    <div className="pt-3 grid grid-cols-2 gap-3">
                      <div className="rounded-lg p-3" style={{ background: "#0d1117" }}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-pink-400">📸 Instagram</span>
                          <button onClick={() => handlePostToSocial(post.id, "instagram")}
                            disabled={posting === "instagram" || post.postedInstagram}
                            className="text-xs px-2 py-1 rounded bg-pink-600 hover:bg-pink-500 disabled:opacity-40 text-white"
                          >
                            {posting === "instagram" ? "投稿中..." : post.postedInstagram ? "投稿済" : "投稿する"}
                          </button>
                        </div>
                        <pre className="text-xs text-slate-400 whitespace-pre-wrap font-sans max-h-28 overflow-y-auto leading-relaxed">{post.generated.instagram}</pre>
                      </div>
                      <div className="rounded-lg p-3" style={{ background: "#0d1117" }}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-slate-300">🧵 Threads</span>
                          <button onClick={() => handlePostToSocial(post.id, "threads")}
                            disabled={posting === "threads" || post.postedThreads}
                            className="text-xs px-2 py-1 rounded bg-slate-600 hover:bg-slate-500 disabled:opacity-40 text-white"
                          >
                            {posting === "threads" ? "投稿中..." : post.postedThreads ? "投稿済" : "投稿する"}
                          </button>
                        </div>
                        <pre className="text-xs text-slate-400 whitespace-pre-wrap font-sans max-h-28 overflow-y-auto leading-relaxed">{post.generated.threads}</pre>
                      </div>
                    </div>

                    {/* Note */}
                    <div>
                      {editNote?.id === post.id ? (
                        <div className="flex gap-2">
                          <input autoFocus value={editNote.text} onChange={e => setEditNote({ id: post.id, text: e.target.value })}
                            placeholder="反省点・改善メモ..."
                            className="flex-1 px-3 py-1.5 text-xs rounded-lg text-white bg-transparent outline-none focus:ring-1 focus:ring-blue-500"
                            style={{ background: "#0d1117", border: "1px solid #374151" }}
                          />
                          <button onClick={() => handleSaveNote(post.id)} className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white">保存</button>
                          <button onClick={() => setEditNote(null)} className="text-xs px-2 py-1.5 rounded-lg border border-slate-700 text-slate-400">×</button>
                        </div>
                      ) : (
                        <button onClick={() => setEditNote({ id: post.id, text: post.note || "" })}
                          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                        >
                          {post.note ? `📝 ${post.note}` : "+ 反省点・改善メモを追加"}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Settings Tab */}
      {tab === "settings" && (
        <div className="max-w-xl space-y-4">
          <div className="rounded-xl p-5 space-y-3" style={{ background: "#111827", border: "1px solid #1f2937" }}>
            <h2 className="text-sm font-semibold text-white">✅ 設定済みの環境変数</h2>
            {[
              { key: "RAKUTEN_APP_ID", status: true },
              { key: "RAKUTEN_AFFILIATE_ID", status: true },
              { key: "ANTHROPIC_API_KEY", status: true },
              { key: "INSTAGRAM_ACCESS_TOKEN", status: true },
              { key: "INSTAGRAM_USER_ID", status: true },
              { key: "THREADS_ACCESS_TOKEN", status: false },
              { key: "THREADS_USER_ID", status: false },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between text-xs rounded-lg p-2" style={{ background: "#0d1117" }}>
                <code className="text-slate-300 font-mono">{item.key}</code>
                <span className={item.status ? "text-emerald-400" : "text-slate-500"}>
                  {item.status ? "✅ 設定済み" : "⏳ 未設定"}
                </span>
              </div>
            ))}
          </div>
          <div className="rounded-xl p-5 space-y-2" style={{ background: "#111827", border: "1px solid #1f2937" }}>
            <h2 className="text-sm font-semibold text-white">📊 楽天アフィリエイト成果確認</h2>
            <a href="https://affiliate.rakuten.co.jp/" target="_blank" rel="noopener noreferrer"
              className="inline-block text-xs text-blue-400 hover:underline"
            >
              楽天アフィリエイト管理画面を開く →
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
