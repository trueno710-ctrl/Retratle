"use client";

import { useState, useEffect, useCallback } from "react";
import type { TrendingTopic, SeasonalEvent } from "@/lib/xapi";
import type { AffiliateProductSuggestion, DraftPost } from "@/lib/claude";

const CATEGORY_COLORS: Record<string, string> = {
  "エンタメ":       "#8b5cf6",
  "テクノロジー":   "#3b82f6",
  "ライフスタイル": "#10b981",
  "食品・グルメ":   "#f59e0b",
  "ファッション":   "#ec4899",
  "スポーツ":       "#06b6d4",
  "ニュース":       "#6b7280",
  "季節イベント":   "#ef4444",
};

const URGENCY_COLOR: Record<string, string> = {
  "今すぐ": "#ef4444",
  "今週中": "#f59e0b",
  "今月中": "#3b82f6",
};

const DEMAND_COLOR: Record<string, string> = {
  "高": "#10b981",
  "中": "#f59e0b",
  "低": "#6b7280",
};

function formatVolume(n: number) {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  return n.toLocaleString();
}

type PostStatus = "draft" | "scheduled" | "posted";

interface PostHistory {
  id: string;
  text: string;
  product: string;
  trend: string;
  status: PostStatus;
  scheduledAt?: string;
  postedAt?: string;
}

const MOCK_HISTORY: PostHistory[] = [
  {
    id: "1",
    text: "母の日まであと3日！今年は楽天で人気No.1のスキンケアセットをプレゼントしてみては？ポイント10倍でお得です✨ [URL] #母の日 #楽天ギフト",
    product: "資生堂 エリクシールセット",
    trend: "#母の日",
    status: "posted",
    postedAt: "2026/05/14 07:02",
  },
  {
    id: "2",
    text: "ダイソン掃除機がSALE中！普段より1.5万円安くなってます。レビュー4.8★で吸引力も折り紙付き🏠 [URL] #楽天スーパーSALE #家電",
    product: "ダイソン V15",
    trend: "ダイソン掃除機",
    status: "posted",
    postedAt: "2026/05/15 12:15",
  },
  {
    id: "3",
    text: "梅雨前に除湿機を買っておくのが正解。去年の梅雨で後悔した人に贈る、コスパ最強モデルです☂️ [URL] #梅雨対策 #家電",
    product: "パナソニック 除湿機",
    trend: "#梅雨対策",
    status: "scheduled",
    scheduledAt: "2026/05/20 07:00",
  },
];

export default function TrendPostPage() {
  const [trends, setTrends] = useState<TrendingTopic[]>([]);
  const [seasonal, setSeasonal] = useState<SeasonalEvent[]>([]);
  const [selectedTrend, setSelectedTrend] = useState<TrendingTopic | null>(null);
  const [suggestions, setSuggestions] = useState<AffiliateProductSuggestion[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<AffiliateProductSuggestion | null>(null);
  const [draft, setDraft] = useState<DraftPost | null>(null);
  const [editedText, setEditedText] = useState("");
  const [affiliateUrl, setAffiliateUrl] = useState("https://hb.afl.rakuten.co.jp/xxx");
  const [postHistory, setPostHistory] = useState<PostHistory[]>(MOCK_HISTORY);

  const [loadingTrends, setLoadingTrends] = useState(true);
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [loadingPost, setLoadingPost] = useState(false);
  const [postResult, setPostResult] = useState<"success" | "error" | null>(null);

  useEffect(() => {
    fetch("/api/trend-post")
      .then((r) => r.json())
      .then((data) => {
        setTrends(data.trends ?? []);
        setSeasonal(data.seasonal ?? []);
      })
      .finally(() => setLoadingTrends(false));
  }, []);

  const handleSelectTrend = useCallback(async (trend: TrendingTopic) => {
    setSelectedTrend(trend);
    setSuggestions([]);
    setSelectedProduct(null);
    setDraft(null);
    setEditedText("");
    setLoadingSuggest(true);

    const currentMonth = new Date().getMonth() + 1;
    const events = seasonal.find((s) => s.month === currentMonth)?.events ?? [];
    const seasonalContext = events.map((e) => e.name).join("、") || "通常期";

    const res = await fetch("/api/trend-post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "suggest", trendTopic: trend.topic, seasonalContext }),
    });
    const data = await res.json();
    setSuggestions(data.products ?? []);
    setLoadingSuggest(false);
  }, [seasonal]);

  const handleGenerateDraft = useCallback(async (product: AffiliateProductSuggestion) => {
    setSelectedProduct(product);
    setDraft(null);
    setEditedText("");
    setLoadingDraft(true);

    const res = await fetch("/api/trend-post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "draft",
        trendTopic: selectedTrend?.topic ?? "",
        productName: product.name,
        productPrice: product.estimatedPrice,
        affiliateUrl,
        postAngle: product.postAngle,
      }),
    });
    const data = await res.json();
    const d: DraftPost = data.draft;
    setDraft(d);
    const fullText = d.text
      .replace("[URL]", affiliateUrl)
      .trimEnd() + " " + d.hashtags.join(" ");
    setEditedText(fullText);
    setLoadingDraft(false);
  }, [selectedTrend, affiliateUrl]);

  // 直接投稿せず承認キューへ送信
  const handlePost = useCallback(async () => {
    if (!editedText || !selectedProduct || !selectedTrend) return;
    setLoadingPost(true);
    setPostResult(null);

    const res = await fetch("/api/approval", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "submit",
        item: {
          source: "trend-post",
          product: selectedProduct.name,
          trend: selectedTrend.topic,
          caption: editedText,
          platforms: ["x", "instagram", "threads"],
        },
      }),
    });

    if (res.ok) {
      setPostResult("success");
      setPostHistory((prev) => [
        {
          id: Date.now().toString(),
          text: editedText,
          product: selectedProduct.name,
          trend: selectedTrend.topic,
          status: "scheduled",
          scheduledAt: "承認キュー確認中",
        },
        ...prev,
      ]);
      setEditedText("");
      setDraft(null);
    } else {
      setPostResult("error");
    }
    setLoadingPost(false);
  }, [editedText, selectedProduct, selectedTrend]);

  // 承認キューへ送信（handlePostと同じ動作）
  const handleSchedule = handlePost;

  const charCount = editedText.length;

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">トレンド分析 × アフィリエイト投稿</h1>
          <p className="text-sm mt-1" style={{ color: "#6b7280" }}>
            Xトレンド・季節イベントから商品を提案 → Claude AIが投稿文を生成 → そのままX投稿
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm" style={{ background: "#111827", border: "1px solid #1f2937" }}>
          <span className="w-2 h-2 rounded-full" style={{ background: "#10b981" }} />
          <span style={{ color: "#10b981" }}>X API 接続中</span>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-5">
        {/* ===== LEFT: Trends ===== */}
        <div className="col-span-3 space-y-4">
          {/* X Trending */}
          <div className="rounded-xl overflow-hidden" style={{ background: "#111827", border: "1px solid #1f2937" }}>
            <div className="px-4 py-3" style={{ borderBottom: "1px solid #1f2937" }}>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <span>𝕏</span> 今日のトレンド
              </h2>
            </div>
            {loadingTrends ? (
              <div className="px-4 py-6 text-center text-sm" style={{ color: "#6b7280" }}>読み込み中...</div>
            ) : (
              <div className="overflow-y-auto" style={{ maxHeight: "380px" }}>
                {trends.map((t) => (
                  <button
                    key={t.rank}
                    onClick={() => t.affiliateOpportunity && handleSelectTrend(t)}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-left transition-colors"
                    style={{
                      borderBottom: "1px solid #1f2937",
                      background: selectedTrend?.topic === t.topic ? "#1f2937" : "transparent",
                      cursor: t.affiliateOpportunity ? "pointer" : "default",
                      opacity: t.affiliateOpportunity ? 1 : 0.5,
                    }}
                  >
                    <span className="text-xs w-5 text-right shrink-0" style={{ color: "#4b5563" }}>
                      {t.rank}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{t.topic}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className="text-xs px-1.5 py-0.5 rounded"
                          style={{
                            background: `${CATEGORY_COLORS[t.category] ?? "#6b7280"}22`,
                            color: CATEGORY_COLORS[t.category] ?? "#6b7280",
                          }}
                        >
                          {t.category}
                        </span>
                        {t.tweetVolume > 0 && (
                          <span className="text-xs" style={{ color: "#6b7280" }}>
                            {formatVolume(t.tweetVolume)}件
                          </span>
                        )}
                      </div>
                    </div>
                    {t.affiliateOpportunity && (
                      <span className="text-xs px-1.5 py-0.5 rounded shrink-0" style={{ background: "rgba(191,0,0,0.15)", color: "#ff6b6b" }}>
                        稼げる
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Seasonal Calendar */}
          <div className="rounded-xl overflow-hidden" style={{ background: "#111827", border: "1px solid #1f2937" }}>
            <div className="px-4 py-3" style={{ borderBottom: "1px solid #1f2937" }}>
              <h2 className="text-sm font-semibold text-white">📅 季節イベント</h2>
            </div>
            <div className="p-3 space-y-2">
              {seasonal.flatMap((s) =>
                s.events.map((e) => (
                  <button
                    key={`${s.month}-${e.name}`}
                    onClick={() =>
                      handleSelectTrend({
                        rank: 0,
                        topic: e.name,
                        tweetVolume: 0,
                        category: "季節イベント",
                        affiliateOpportunity: true,
                      })
                    }
                    className="w-full rounded-lg p-2.5 text-left transition-colors hover:bg-white/5"
                    style={{ background: "#0a0f1e" }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-white">{e.name}</p>
                      <span className="text-xs" style={{ color: DEMAND_COLOR[e.demandLevel] }}>
                        需要{e.demandLevel}
                      </span>
                    </div>
                    <p className="text-xs mb-1.5" style={{ color: "#6b7280" }}>
                      {s.month}月 {e.peakWeek}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {e.categories.slice(0, 3).map((c) => (
                        <span key={c} className="text-xs px-1.5 py-0.5 rounded" style={{ background: "#1f2937", color: "#9ca3af" }}>
                          {c}
                        </span>
                      ))}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ===== CENTER: AI Suggestions ===== */}
        <div className="col-span-5 space-y-4">
          <div className="rounded-xl overflow-hidden" style={{ background: "#111827", border: "1px solid #1f2937" }}>
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid #1f2937" }}>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                🤖 AI商品提案
                {selectedTrend && (
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(59,130,246,0.15)", color: "#3b82f6" }}>
                    {selectedTrend.topic}
                  </span>
                )}
              </h2>
              <span className="text-xs" style={{ color: "#6b7280" }}>
                {selectedTrend ? "左のトレンドを変更して再提案" : "左のトレンドをクリック"}
              </span>
            </div>
            <div className="p-4">
              {!selectedTrend && (
                <div className="py-12 text-center" style={{ color: "#4b5563" }}>
                  <p className="text-4xl mb-3">👆</p>
                  <p className="text-sm">左のトレンドまたは季節イベントを選択してください</p>
                </div>
              )}
              {loadingSuggest && (
                <div className="py-12 text-center space-y-3">
                  <div className="inline-flex items-center gap-2 text-sm" style={{ color: "#3b82f6" }}>
                    <span className="live-dot w-2 h-2 rounded-full" style={{ background: "#3b82f6" }} />
                    Claude AIが商品を分析中...
                  </div>
                </div>
              )}
              {!loadingSuggest && suggestions.length > 0 && (
                <div className="space-y-3">
                  {suggestions.map((p, i) => (
                    <div
                      key={i}
                      className="rounded-lg p-3 cursor-pointer transition-all"
                      style={{
                        background: selectedProduct?.name === p.name ? "#1e3a5f" : "#0a0f1e",
                        border: selectedProduct?.name === p.name ? "1px solid #3b82f6" : "1px solid #1f2937",
                      }}
                      onClick={() => handleGenerateDraft(p)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <span className="text-xs px-1.5 py-0.5 rounded mr-2" style={{ background: "#1f2937", color: "#9ca3af" }}>
                            {p.category}
                          </span>
                          <span
                            className="text-xs px-1.5 py-0.5 rounded"
                            style={{ background: `${URGENCY_COLOR[p.urgency]}22`, color: URGENCY_COLOR[p.urgency] }}
                          >
                            {p.urgency}
                          </span>
                        </div>
                        <span className="text-sm font-bold" style={{ color: "#10b981" }}>
                          +¥{p.expectedRevenue.toLocaleString()}見込
                        </span>
                      </div>
                      <p className="font-semibold text-white text-sm mb-1">{p.name}</p>
                      <p className="text-xs mb-2" style={{ color: "#9ca3af" }}>{p.reason}</p>
                      <div className="flex items-center justify-between text-xs">
                        <span style={{ color: "#6b7280" }}>
                          {p.estimatedPrice} · 報酬率 {p.commissionRate}
                        </span>
                        <span style={{ color: "#3b82f6" }}>→ 投稿文を生成</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Affiliate URL input */}
          <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1f2937" }}>
            <label className="text-xs font-medium mb-2 block" style={{ color: "#9ca3af" }}>
              アフィリエイトURL（楽天アフィリエイトから取得したURLを入力）
            </label>
            <input
              type="text"
              value={affiliateUrl}
              onChange={(e) => setAffiliateUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm text-white"
              style={{ background: "#0a0f1e", border: "1px solid #374151" }}
              placeholder="https://hb.afl.rakuten.co.jp/xxx"
            />
          </div>
        </div>

        {/* ===== RIGHT: Post Editor & History ===== */}
        <div className="col-span-4 space-y-4">
          {/* Post Editor */}
          <div className="rounded-xl overflow-hidden" style={{ background: "#111827", border: "1px solid #1f2937" }}>
            <div className="px-4 py-3" style={{ borderBottom: "1px solid #1f2937" }}>
              <h2 className="text-sm font-semibold text-white">✏️ 投稿エディター</h2>
            </div>
            <div className="p-4 space-y-3">
              {loadingDraft && (
                <div className="py-6 text-center">
                  <span className="text-sm" style={{ color: "#3b82f6" }}>
                    投稿文を生成中...
                  </span>
                </div>
              )}
              {draft && !loadingDraft && (
                <div className="rounded-lg p-3 space-y-2" style={{ background: "#0a0f1e", border: "1px solid #1f2937" }}>
                  <div className="flex items-center gap-3 text-xs" style={{ color: "#6b7280" }}>
                    <span>⏰ 推奨投稿時間: <strong style={{ color: "#d1d5db" }}>{draft.bestPostTime}</strong></span>
                    <span>CTA: <strong style={{ color: "#d1d5db" }}>{draft.callToAction}</strong></span>
                  </div>
                </div>
              )}
              <div className="relative">
                <textarea
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  rows={7}
                  className="w-full px-3 py-2.5 rounded-lg text-sm text-white resize-none"
                  style={{ background: "#0a0f1e", border: "1px solid #374151", lineHeight: "1.6" }}
                  placeholder={selectedProduct ? "← 商品を選択すると自動生成されます" : "← トレンドと商品を選んでください"}
                />
                <div
                  className="absolute bottom-2 right-3 text-xs"
                  style={{ color: charCount > 280 ? "#ef4444" : charCount > 240 ? "#f59e0b" : "#6b7280" }}
                >
                  {charCount}/280
                </div>
              </div>

              {postResult === "success" && (
                <div className="space-y-1.5">
                  <div className="text-sm text-center py-2 rounded-lg" style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}>
                    ✅ 承認キューに送りました！
                  </div>
                  <a href="/approval" className="block text-center text-xs py-1.5 rounded-lg"
                    style={{ background: "#1f2937", color: "#60a5fa" }}>
                    ✅ 編集・承認部で確認する →
                  </a>
                </div>
              )}
              {postResult === "error" && (
                <div className="text-sm text-center py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>
                  ❌ 送信失敗
                </div>
              )}

              <button
                onClick={handlePost}
                disabled={!editedText || loadingPost}
                className="w-full py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-40"
                style={{ background: "linear-gradient(135deg,#1d4ed8,#7c3aed)", color: "white" }}
              >
                {loadingPost ? "送信中..." : "📋 承認キューに送る（Instagram / Threads / X）"}
              </button>
            </div>
          </div>

          {/* Post History */}
          <div className="rounded-xl overflow-hidden" style={{ background: "#111827", border: "1px solid #1f2937" }}>
            <div className="px-4 py-3" style={{ borderBottom: "1px solid #1f2937" }}>
              <h2 className="text-sm font-semibold text-white">📋 投稿履歴</h2>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: "300px" }}>
              {postHistory.map((p) => (
                <div
                  key={p.id}
                  className="px-4 py-3"
                  style={{ borderBottom: "1px solid #1f2937" }}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-full"
                      style={{
                        background:
                          p.status === "posted"
                            ? "rgba(16,185,129,0.15)"
                            : p.status === "scheduled"
                            ? "rgba(59,130,246,0.15)"
                            : "rgba(107,114,128,0.15)",
                        color:
                          p.status === "posted" ? "#10b981" : p.status === "scheduled" ? "#3b82f6" : "#6b7280",
                      }}
                    >
                      {p.status === "posted" ? "投稿済" : p.status === "scheduled" ? "予約済" : "下書き"}
                    </span>
                    <span className="text-xs" style={{ color: "#6b7280" }}>
                      {p.status === "posted" ? p.postedAt : p.scheduledAt ?? ""}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed mb-1.5" style={{ color: "#d1d5db" }}>
                    {p.text.length > 80 ? p.text.slice(0, 80) + "…" : p.text}
                  </p>
                  <div className="flex items-center gap-2 text-xs" style={{ color: "#4b5563" }}>
                    <span>{p.product}</span>
                    <span>·</span>
                    <span>{p.trend}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
