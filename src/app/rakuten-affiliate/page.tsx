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
  postedInstagram: boolean
  postedThreads: boolean
  instagramPostId?: string
  threadsPostId?: string
  note?: string
}

const STORAGE_KEY = "rakuten_affiliate_posts"

function loadPosts(): SavedPost[] {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")
  } catch {
    return []
  }
}

function savePosts(posts: SavedPost[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts))
}

export default function RakutenAffiliatePage() {
  const [tab, setTab] = useState<Tab>("search")
  const [keyword, setKeyword] = useState("")
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<RakutenItem[]>([])
  const [selectedItem, setSelectedItem] = useState<RakutenItem | null>(null)
  const [tone, setTone] = useState<Tone>("カジュアル")
  const [generating, setGenerating] = useState(false)
  const [generatedPost, setGeneratedPost] = useState<GeneratedPost | null>(null)
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([])
  const [posting, setPosting] = useState<"instagram" | "threads" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [expandedPost, setExpandedPost] = useState<string | null>(null)
  const [editNote, setEditNote] = useState<{ id: string; text: string } | null>(null)

  useEffect(() => {
    setSavedPosts(loadPosts())
  }, [])

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!keyword.trim()) return
    setSearching(true)
    setError(null)
    try {
      const res = await fetch(`/api/rakuten/search?keyword=${encodeURIComponent(keyword)}&hits=12`)
      const json = await res.json()
      if (json.success) {
        setSearchResults(json.data)
      } else {
        setError(json.error)
      }
    } catch {
      setError("検索に失敗しました")
    } finally {
      setSearching(false)
    }
  }

  async function handleGenerate() {
    if (!selectedItem) return
    setGenerating(true)
    setError(null)
    setGeneratedPost(null)
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
        }),
      })
      const json = await res.json()
      if (json.success) {
        setGeneratedPost(json.data)
      } else {
        setError(json.error)
      }
    } catch {
      setError("投稿文の生成に失敗しました")
    } finally {
      setGenerating(false)
    }
  }

  function handleSavePost() {
    if (!selectedItem || !generatedPost) return
    const post: SavedPost = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      item: selectedItem,
      generated: generatedPost,
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
    platform: "instagram" | "threads",
    imageUrl?: string
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
          imageUrl: imageUrl || post.item.mediumImageUrls[0]?.imageUrl,
        }),
      })
      const json = await res.json()
      if (json.success) {
        const updated = savedPosts.map(p =>
          p.id === postId
            ? {
                ...p,
                postedInstagram: platform === "instagram" ? true : p.postedInstagram,
                postedThreads: platform === "threads" ? true : p.postedThreads,
                instagramPostId: platform === "instagram" ? json.postId : p.instagramPostId,
                threadsPostId: platform === "threads" ? json.postId : p.threadsPostId,
              }
            : p
        )
        setSavedPosts(updated)
        savePosts(updated)
        setSuccess(`${platform === "instagram" ? "Instagram" : "Threads"}に投稿しました`)
        setTimeout(() => setSuccess(null), 3000)
      } else if (json.setupRequired) {
        setError(`セットアップが必要です: ${json.error}`)
      } else {
        setError(json.error)
      }
    } catch {
      setError("投稿に失敗しました")
    } finally {
      setPosting(null)
    }
  }, [savedPosts])

  function handleDeletePost(id: string) {
    const updated = savedPosts.filter(p => p.id !== id)
    setSavedPosts(updated)
    savePosts(updated)
  }

  function handleSaveNote(id: string) {
    if (!editNote) return
    const updated = savedPosts.map(p =>
      p.id === id ? { ...p, note: editNote.text } : p
    )
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
          <p className="text-sm text-slate-400 mt-1">商品リサーチ → AI投稿文生成 → Instagram/Threads 自動投稿</p>
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
          ✓ {success}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ background: "#111827", border: "1px solid #1f2937" }}>
        {(["search", "posts", "settings"] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm rounded-md transition-all ${
              tab === t ? "bg-slate-700 text-white font-medium" : "text-slate-400 hover:text-white"
            }`}
          >
            {t === "search" ? "🔍 商品リサーチ" : t === "posts" ? "📋 投稿管理" : "⚙️ 設定"}
          </button>
        ))}
      </div>

      {/* Search Tab */}
      {tab === "search" && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-6">
            {/* Left: Search */}
            <div className="col-span-1 space-y-4">
              <form onSubmit={handleSearch} className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">キーワード検索</label>
                  <input
                    type="text"
                    value={keyword}
                    onChange={e => setKeyword(e.target.value)}
                    placeholder="例: 投資入門 書籍, 家電 おすすめ"
                    className="w-full px-3 py-2 rounded-lg text-sm text-white bg-transparent outline-none focus:ring-1 focus:ring-blue-500"
                    style={{ background: "#111827", border: "1px solid #1f2937" }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={searching}
                  className="w-full py-2 text-sm rounded-lg font-medium transition-colors disabled:opacity-50"
                  style={{ background: "#3b82f6", color: "white" }}
                >
                  {searching ? "検索中..." : "楽天で検索"}
                </button>
              </form>

              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {searchResults.map(item => (
                    <button
                      key={item.itemCode}
                      onClick={() => { setSelectedItem(item); setGeneratedPost(null) }}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        selectedItem?.itemCode === item.itemCode
                          ? "border-blue-500/60 bg-blue-500/10"
                          : "border-slate-700/50 bg-slate-800/40 hover:border-slate-600"
                      }`}
                    >
                      <div className="flex gap-2">
                        {item.mediumImageUrls[0] && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.mediumImageUrls[0].imageUrl}
                            alt={item.itemName}
                            className="w-12 h-12 object-cover rounded"
                          />
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
                  {/* Selected item preview */}
                  <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1f2937" }}>
                    <div className="flex gap-4">
                      {selectedItem.mediumImageUrls[0] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={selectedItem.mediumImageUrls[0].imageUrl}
                          alt={selectedItem.itemName}
                          className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm leading-tight mb-1">{selectedItem.itemName}</p>
                        <p className="text-emerald-400 font-bold text-lg">¥{selectedItem.itemPrice.toLocaleString()}</p>
                        <p className="text-xs text-slate-400">{selectedItem.shopName} · ★{selectedItem.reviewAverage}（{selectedItem.reviewCount}件）</p>
                        <p className="text-xs text-slate-300 mt-1 line-clamp-2">{selectedItem.catchcopy}</p>
                        <a
                          href={selectedItem.affiliateUrl || selectedItem.itemUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-400 hover:underline mt-1 block"
                        >
                          楽天で見る →
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Tone selector */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 whitespace-nowrap">投稿トーン:</span>
                    {(["カジュアル", "丁寧", "熱量高め"] as Tone[]).map(t => (
                      <button
                        key={t}
                        onClick={() => setTone(t)}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                          tone === t
                            ? "border-purple-500 bg-purple-500/20 text-purple-300"
                            : "border-slate-700 text-slate-400 hover:text-white"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                    <button
                      onClick={handleGenerate}
                      disabled={generating}
                      className="ml-auto px-4 py-1.5 text-sm rounded-lg font-medium transition-colors disabled:opacity-50"
                      style={{ background: "#8b5cf6", color: "white" }}
                    >
                      {generating ? "生成中..." : "✨ 投稿文を生成"}
                    </button>
                  </div>

                  {/* Generated post */}
                  {generatedPost && (
                    <div className="space-y-4">
                      {/* Instagram */}
                      <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1f2937" }}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-pink-400">📸 Instagram</span>
                          <button
                            onClick={() => navigator.clipboard.writeText(generatedPost.instagram)}
                            className="text-xs text-slate-400 hover:text-white transition-colors"
                          >
                            コピー
                          </button>
                        </div>
                        <pre className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed font-sans max-h-48 overflow-y-auto">
                          {generatedPost.instagram}
                        </pre>
                      </div>

                      {/* Threads */}
                      <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1f2937" }}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-slate-300">🧵 Threads</span>
                          <button
                            onClick={() => navigator.clipboard.writeText(generatedPost.threads)}
                            className="text-xs text-slate-400 hover:text-white transition-colors"
                          >
                            コピー
                          </button>
                        </div>
                        <pre className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed font-sans max-h-48 overflow-y-auto">
                          {generatedPost.threads}
                        </pre>
                      </div>

                      {/* Hashtags */}
                      <div className="flex flex-wrap gap-1.5">
                        {generatedPost.hashtags.map(tag => (
                          <span key={tag} className="text-xs text-blue-400 bg-blue-400/10 border border-blue-400/20 px-2 py-0.5 rounded-full">
                            #{tag}
                          </span>
                        ))}
                      </div>

                      <button
                        onClick={handleSavePost}
                        className="w-full py-2.5 text-sm font-semibold rounded-lg transition-colors"
                        style={{ background: "#10b981", color: "white" }}
                      >
                        💾 投稿を保存
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center h-48 text-slate-500 text-sm rounded-xl" style={{ border: "1px dashed #374151" }}>
                  左の検索結果から商品を選択してください
                </div>
              )}
            </div>
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
              <button onClick={() => setTab("search")} className="text-xs text-blue-400 hover:underline">
                商品リサーチへ
              </button>
            </div>
          ) : (
            savedPosts.map(post => (
              <div
                key={post.id}
                className="rounded-xl overflow-hidden"
                style={{ background: "#111827", border: "1px solid #1f2937" }}
              >
                {/* Post header */}
                <div className="p-4 flex items-start gap-4">
                  {post.item.mediumImageUrls[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.item.mediumImageUrls[0].imageUrl}
                      alt={post.item.itemName}
                      className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm leading-tight">{post.item.itemName}</p>
                    <p className="text-emerald-400 font-bold text-base mt-0.5">¥{post.item.itemPrice.toLocaleString()}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {new Date(post.createdAt).toLocaleDateString("ja-JP")} 保存
                    </p>
                    {/* Status badges */}
                    <div className="flex gap-2 mt-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${
                        post.postedInstagram
                          ? "text-pink-300 bg-pink-400/10 border-pink-400/30"
                          : "text-slate-500 bg-slate-800 border-slate-700"
                      }`}>
                        📸 Instagram {post.postedInstagram ? "投稿済" : "未投稿"}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${
                        post.postedThreads
                          ? "text-slate-200 bg-slate-600/50 border-slate-500"
                          : "text-slate-500 bg-slate-800 border-slate-700"
                      }`}>
                        🧵 Threads {post.postedThreads ? "投稿済" : "未投稿"}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white transition-colors"
                    >
                      {expandedPost === post.id ? "折りたたむ" : "投稿文を見る"}
                    </button>
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="text-xs px-2 py-1.5 rounded-lg border border-red-900/50 text-red-400 hover:bg-red-400/10 transition-colors"
                    >
                      削除
                    </button>
                  </div>
                </div>

                {/* Expanded content */}
                {expandedPost === post.id && (
                  <div className="px-4 pb-4 space-y-3" style={{ borderTop: "1px solid #1f2937" }}>
                    <div className="pt-3 grid grid-cols-2 gap-3">
                      {/* Instagram */}
                      <div className="rounded-lg p-3" style={{ background: "#0d1117" }}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-pink-400">📸 Instagram</span>
                          <button
                            onClick={() => handlePostToSocial(post.id, "instagram")}
                            disabled={posting === "instagram" || post.postedInstagram}
                            className="text-xs px-2 py-1 rounded bg-pink-600 hover:bg-pink-500 disabled:opacity-40 text-white transition-colors"
                          >
                            {posting === "instagram" ? "投稿中..." : post.postedInstagram ? "投稿済" : "投稿する"}
                          </button>
                        </div>
                        <pre className="text-xs text-slate-400 whitespace-pre-wrap font-sans max-h-32 overflow-y-auto leading-relaxed">
                          {post.generated.instagram}
                        </pre>
                      </div>
                      {/* Threads */}
                      <div className="rounded-lg p-3" style={{ background: "#0d1117" }}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-slate-300">🧵 Threads</span>
                          <button
                            onClick={() => handlePostToSocial(post.id, "threads")}
                            disabled={posting === "threads" || post.postedThreads}
                            className="text-xs px-2 py-1 rounded bg-slate-600 hover:bg-slate-500 disabled:opacity-40 text-white transition-colors"
                          >
                            {posting === "threads" ? "投稿中..." : post.postedThreads ? "投稿済" : "投稿する"}
                          </button>
                        </div>
                        <pre className="text-xs text-slate-400 whitespace-pre-wrap font-sans max-h-32 overflow-y-auto leading-relaxed">
                          {post.generated.threads}
                        </pre>
                      </div>
                    </div>

                    {/* Note section */}
                    <div>
                      {editNote?.id === post.id ? (
                        <div className="flex gap-2">
                          <input
                            autoFocus
                            value={editNote.text}
                            onChange={e => setEditNote({ id: post.id, text: e.target.value })}
                            placeholder="反省点・メモを入力..."
                            className="flex-1 px-3 py-1.5 text-xs rounded-lg text-white bg-transparent outline-none focus:ring-1 focus:ring-blue-500"
                            style={{ background: "#0d1117", border: "1px solid #374151" }}
                          />
                          <button
                            onClick={() => handleSaveNote(post.id)}
                            className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white"
                          >
                            保存
                          </button>
                          <button
                            onClick={() => setEditNote(null)}
                            className="text-xs px-2 py-1.5 rounded-lg border border-slate-700 text-slate-400"
                          >
                            キャンセル
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditNote({ id: post.id, text: post.note || "" })}
                          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                        >
                          {post.note ? `📝 ${post.note}` : "+ 反省点・メモを追加"}
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
        <div className="max-w-xl space-y-6">
          <div className="rounded-xl p-5 space-y-4" style={{ background: "#111827", border: "1px solid #1f2937" }}>
            <h2 className="text-sm font-semibold text-white">🔑 環境変数の設定方法</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              以下の環境変数を <code className="text-blue-400">.env.local</code> に追加してください。
            </p>

            <div className="space-y-3">
              {[
                { key: "RAKUTEN_APP_ID", label: "楽天 App ID", desc: "楽天ウェブサービスのアプリID", required: true },
                { key: "RAKUTEN_AFFILIATE_ID", label: "楽天 Affiliate ID", desc: "楽天アフィリエイトのID", required: true },
                { key: "INSTAGRAM_ACCESS_TOKEN", label: "Instagram アクセストークン", desc: "Meta Graph API アクセストークン", required: false },
                { key: "INSTAGRAM_USER_ID", label: "Instagram ユーザーID", desc: "InstagramビジネスアカウントのユーザーID", required: false },
                { key: "THREADS_ACCESS_TOKEN", label: "Threads アクセストークン", desc: "Threads API アクセストークン", required: false },
                { key: "THREADS_USER_ID", label: "Threads ユーザーID", desc: "ThreadsアカウントのユーザーID", required: false },
              ].map(item => (
                <div key={item.key} className="rounded-lg p-3" style={{ background: "#0d1117", border: "1px solid #1f2937" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <code className="text-xs text-emerald-400 font-mono">{item.key}</code>
                    {item.required && (
                      <span className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 px-1.5 rounded">必須</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">{item.desc}</p>
                </div>
              ))}
            </div>

            <div className="rounded-lg p-3 text-xs" style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)" }}>
              <p className="text-blue-300 font-semibold mb-1">Instagram/Threads トークン取得方法</p>
              <ol className="text-blue-200/70 space-y-1 list-decimal list-inside">
                <li>Meta for Developers でアプリを作成</li>
                <li>Instagram Basic Display API または Threads API を有効化</li>
                <li>OAuth 認証フローでアクセストークンを取得</li>
                <li>長期トークン（60日）に変換して .env.local に設定</li>
              </ol>
            </div>
          </div>

          <div className="rounded-xl p-5 space-y-3" style={{ background: "#111827", border: "1px solid #1f2937" }}>
            <h2 className="text-sm font-semibold text-white">📊 楽天アフィリエイト報酬確認</h2>
            <p className="text-xs text-slate-400">
              クリック数・成果報酬は楽天アフィリエイトの管理画面で確認できます。
              このサイトでは投稿管理と反省点の記録を行い、成果改善をサポートします。
            </p>
            <a
              href="https://affiliate.rakuten.co.jp/"
              target="_blank"
              rel="noopener noreferrer"
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
