"use client";

import { useState, useEffect, useRef } from "react";
import type { CMConcept } from "@/lib/claude";

const PRESET_PRODUCTS = [
  { name: "ダイソン V15 Detect",    category: "家電",   trend: "#楽天スーパーSALE ダイソン掃除機" },
  { name: "資生堂 エリクシール",     category: "美容",   trend: "#夏コスメ2026 スキンケア"         },
  { name: "ふるさと納税 A5和牛 2kg", category: "食品",   trend: "ふるさと納税 グルメ"              },
  { name: "iPad Air M2",            category: "PC",     trend: "#iPad新型 タブレット"             },
  { name: "山崎実業 収納ラック",     category: "インテリア", trend: "山崎実業 収納 部屋づくり"    },
];

const STYLES = [
  { id: "bright",   label: "明るくポップ",   desc: "カラフルで元気な印象" },
  { id: "premium",  label: "高級感・洗練",   desc: "落ち着いた上品な雰囲気" },
  { id: "natural",  label: "ナチュラル",     desc: "温かみのある日常感" },
  { id: "dramatic", label: "ドラマチック",   desc: "映画的な迫力ある演出" },
];

const AUDIENCES = ["20代女性", "30代主婦", "30〜40代男性", "50代以上", "全年代"];

type Step = "input" | "concept" | "image" | "video" | "post";

interface VideoJob {
  jobId: string;
  status: "queued" | "processing" | "completed" | "failed";
  videoUrl?: string;
  mock?: boolean;
}

export default function CMStudioPage() {
  const [step, setStep] = useState<Step>("input");

  // Inputs
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [trendContext, setTrendContext] = useState("");
  const [style, setStyle] = useState("bright");
  const [audience, setAudience] = useState("30代主婦");
  const [affiliateUrl, setAffiliateUrl] = useState("https://hb.afl.rakuten.co.jp/xxx");

  // Results
  const [concept, setConcept] = useState<CMConcept | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [imageMock, setImageMock] = useState(false);
  const [videoJob, setVideoJob] = useState<VideoJob | null>(null);
  const [postCaption, setPostCaption] = useState("");
  const [postResult, setPostResult] = useState<"success" | "error" | null>(null);

  // Loading
  const [loadingConcept, setLoadingConcept]  = useState(false);
  const [loadingImage, setLoadingImage]      = useState(false);
  const [loadingVideo, setLoadingVideo]      = useState(false);
  const [loadingPost, setLoadingPost]        = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, []);

  function applyPreset(p: (typeof PRESET_PRODUCTS)[number]) {
    setProductName(p.name);
    setCategory(p.category);
    setTrendContext(p.trend);
  }

  async function handleGenerateConcept() {
    setLoadingConcept(true);
    const res = await fetch("/api/cm-studio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "concept",
        productName, category, trendContext,
        style: STYLES.find(s => s.id === style)?.label ?? style,
        targetAudience: audience,
      }),
    });
    const data = await res.json();
    if (data.concept) {
      setConcept(data.concept);
      setPostCaption(
        data.concept.xCaption.replace("[URL]", affiliateUrl) +
        " " + data.concept.hashtags.join(" ")
      );
      setStep("concept");
    }
    setLoadingConcept(false);
  }

  async function handleGenerateImage() {
    if (!concept) return;
    setLoadingImage(true);
    const res = await fetch("/api/cm-studio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "image", imagePrompt: concept.imagePrompt }),
    });
    const data = await res.json();
    if (data.image) {
      setImageUrl(data.image.url);
      setImageMock(!!data.image.mock);
      setStep("image");
    }
    setLoadingImage(false);
  }

  async function handleStartVideo() {
    if (!concept || !imageUrl) return;
    setLoadingVideo(true);
    const res = await fetch("/api/cm-studio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "video-start",
        imageUrl,
        motionPrompt: concept.videoScript.motionPrompt,
      }),
    });
    const data = await res.json();
    if (data.job) {
      setVideoJob(data.job);
      if (data.job.status !== "completed") {
        pollRef.current = setInterval(async () => {
          const r = await fetch("/api/cm-studio", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "video-status", jobId: data.job.jobId }),
          });
          const d = await r.json();
          if (d.job) {
            setVideoJob(d.job);
            if (d.job.status === "completed" || d.job.status === "failed") {
              clearInterval(pollRef.current!);
              setLoadingVideo(false);
              setStep("video");
            }
          }
        }, 5000);
      } else {
        setStep("video");
        setLoadingVideo(false);
      }
    } else {
      setLoadingVideo(false);
    }
  }

  // 直接投稿せず承認キューに送る
  async function handlePost() {
    setLoadingPost(true);
    setPostResult(null);
    const res = await fetch("/api/approval", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "submit",
        item: {
          source: "cm-studio",
          product: productName,
          trend: trendContext,
          caption: postCaption,
          imageUrl: imageUrl || undefined,
          videoUrl: videoJob?.videoUrl || undefined,
          platforms: ["instagram", "threads", "x"],
        },
      }),
    });
    setPostResult(res.ok ? "success" : "error");
    setLoadingPost(false);
    if (res.ok) setStep("post");
  }

  const stepList: { id: Step; label: string; icon: string }[] = [
    { id: "input",   label: "商品入力",   icon: "1" },
    { id: "concept", label: "CMコンセプト", icon: "2" },
    { id: "image",   label: "AI画像生成", icon: "3" },
    { id: "video",   label: "AI動画生成", icon: "4" },
    { id: "post",    label: "承認キューへ",icon: "5" },
  ];
  const stepOrder: Step[] = ["input","concept","image","video","post"];

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">🎬 CM スタジオ</h1>
        <p className="text-sm mt-1" style={{ color: "#6b7280" }}>
          商品情報を入力 → Claude がコンセプト生成 → DALL-E 3 で画像 → Runway ML で動画 → X に投稿
        </p>
      </div>

      {/* Step Progress */}
      <div className="flex items-center gap-0">
        {stepList.map((s, i) => {
          const done = stepOrder.indexOf(step) > i;
          const active = step === s.id;
          return (
            <div key={s.id} className="flex items-center">
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm"
                style={{
                  background: active ? "#1e3a5f" : done ? "rgba(16,185,129,0.1)" : "#111827",
                  border: active ? "1px solid #3b82f6" : done ? "1px solid rgba(16,185,129,0.4)" : "1px solid #1f2937",
                  color: active ? "#60a5fa" : done ? "#10b981" : "#6b7280",
                }}>
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: active ? "#3b82f6" : done ? "#10b981" : "#374151", color: "white" }}>
                  {done ? "✓" : s.icon}
                </span>
                {s.label}
              </div>
              {i < stepList.length - 1 && (
                <div className="w-6 h-px mx-1" style={{ background: done ? "#10b981" : "#374151" }} />
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* ===== LEFT: Input / Concept ===== */}
        <div className="col-span-5 space-y-4">
          {/* Product Input */}
          <div className="rounded-xl p-5" style={{ background: "#111827", border: "1px solid #1f2937" }}>
            <h2 className="text-sm font-semibold text-white mb-4">商品情報</h2>

            <div className="flex flex-wrap gap-2 mb-4">
              {PRESET_PRODUCTS.map(p => (
                <button key={p.name} onClick={() => applyPreset(p)}
                  className="text-xs px-2 py-1 rounded-lg transition-colors"
                  style={{ background: "#1f2937", color: "#9ca3af", border: "1px solid #374151" }}>
                  {p.name.split(" ")[0]}
                </button>
              ))}
            </div>

            {[
              { label: "商品名", value: productName, set: setProductName, placeholder: "例: ダイソン V15 Detect" },
              { label: "カテゴリ", value: category, set: setCategory, placeholder: "例: 家電・掃除機" },
              { label: "トレンド文脈", value: trendContext, set: setTrendContext, placeholder: "例: #楽天スーパーSALE" },
            ].map(f => (
              <div key={f.label} className="mb-3">
                <label className="text-xs mb-1 block" style={{ color: "#9ca3af" }}>{f.label}</label>
                <input type="text" value={f.value} onChange={e => f.set(e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full px-3 py-2 rounded-lg text-sm text-white"
                  style={{ background: "#0a0f1e", border: "1px solid #374151" }} />
              </div>
            ))}

            <div className="mb-3">
              <label className="text-xs mb-1 block" style={{ color: "#9ca3af" }}>アフィリエイトURL</label>
              <input type="text" value={affiliateUrl} onChange={e => setAffiliateUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm text-white"
                style={{ background: "#0a0f1e", border: "1px solid #374151" }} />
            </div>

            <div className="mb-4">
              <label className="text-xs mb-2 block" style={{ color: "#9ca3af" }}>スタイル</label>
              <div className="grid grid-cols-2 gap-2">
                {STYLES.map(s => (
                  <button key={s.id} onClick={() => setStyle(s.id)}
                    className="text-left p-2.5 rounded-lg text-xs transition-all"
                    style={{
                      background: style === s.id ? "#1e3a5f" : "#0a0f1e",
                      border: style === s.id ? "1px solid #3b82f6" : "1px solid #1f2937",
                      color: style === s.id ? "#60a5fa" : "#9ca3af",
                    }}>
                    <p className="font-medium">{s.label}</p>
                    <p style={{ color: "#6b7280" }}>{s.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="text-xs mb-2 block" style={{ color: "#9ca3af" }}>ターゲット</label>
              <div className="flex flex-wrap gap-2">
                {AUDIENCES.map(a => (
                  <button key={a} onClick={() => setAudience(a)}
                    className="text-xs px-3 py-1.5 rounded-full transition-all"
                    style={{
                      background: audience === a ? "#3b82f6" : "#1f2937",
                      color: audience === a ? "white" : "#9ca3af",
                    }}>
                    {a}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={handleGenerateConcept}
              disabled={!productName || loadingConcept}
              className="w-full py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-40"
              style={{ background: "linear-gradient(135deg,#1d4ed8,#7c3aed)", color: "white" }}>
              {loadingConcept ? "🤖 Claudeがコンセプト生成中..." : "🎨 CMコンセプトを生成"}
            </button>
          </div>

          {/* Concept Panel */}
          {concept && (
            <div className="rounded-xl p-5 space-y-4" style={{ background: "#111827", border: "1px solid #1f2937" }}>
              <h2 className="text-sm font-semibold text-white">📋 生成されたコンセプト</h2>

              <div className="rounded-lg p-3" style={{ background: "#0a0f1e" }}>
                <p className="text-xs font-medium mb-1" style={{ color: "#6b7280" }}>画像プロンプト（DALL-E 3用）</p>
                <p className="text-xs leading-relaxed" style={{ color: "#9ca3af" }}>{concept.imagePrompt}</p>
              </div>

              <div className="rounded-lg p-3" style={{ background: "#0a0f1e" }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium" style={{ color: "#6b7280" }}>動画スクリプト ({concept.videoScript.duration})</p>
                  <span className="text-xs px-2 py-0.5 rounded" style={{ background: "#1f2937", color: "#9ca3af" }}>
                    BGM: {concept.videoScript.bgm}
                  </span>
                </div>
                <div className="space-y-2">
                  {concept.videoScript.scenes.map((sc, i) => (
                    <div key={i} className="rounded p-2" style={{ background: "#111827" }}>
                      <p className="text-xs font-medium mb-1" style={{ color: "#3b82f6" }}>{sc.time}</p>
                      <p className="text-xs mb-0.5" style={{ color: "#d1d5db" }}>🎬 {sc.visual}</p>
                      <p className="text-xs mb-0.5" style={{ color: "#f59e0b" }}>💬 {sc.text}</p>
                      <p className="text-xs" style={{ color: "#9ca3af" }}>🎤 {sc.voice}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs mt-2 font-medium" style={{ color: "#10b981" }}>CTA: {concept.videoScript.cta}</p>
              </div>

              <button onClick={handleGenerateImage} disabled={loadingImage}
                className="w-full py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-40"
                style={{ background: "#1e3a5f", color: "#60a5fa", border: "1px solid #3b82f6" }}>
                {loadingImage ? "🎨 DALL-E 3 で画像生成中..." : "🖼 AI画像を生成する →"}
              </button>
            </div>
          )}
        </div>

        {/* ===== RIGHT: Image / Video / Post ===== */}
        <div className="col-span-7 space-y-4">
          {/* Image Preview */}
          <div className="rounded-xl overflow-hidden" style={{ background: "#111827", border: "1px solid #1f2937" }}>
            <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid #1f2937" }}>
              <h2 className="text-sm font-semibold text-white">🖼 AI生成画像</h2>
              {imageMock && (
                <span className="text-xs px-2 py-0.5 rounded" style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}>
                  GOOGLE_API_KEY 未設定 — プレースホルダー表示
                </span>
              )}
            </div>
            <div className="p-5">
              {!imageUrl ? (
                <div className="h-72 rounded-xl flex flex-col items-center justify-center gap-3"
                  style={{ background: "#0a0f1e", border: "2px dashed #1f2937" }}>
                  <span className="text-4xl">🖼</span>
                  <p className="text-sm" style={{ color: "#4b5563" }}>左でコンセプトを生成後、画像生成ボタンを押してください</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <img src={imageUrl} alt="Generated CM visual"
                    className="w-full rounded-xl object-cover"
                    style={{ maxHeight: "400px", border: "1px solid #1f2937" }} />
                  {concept && !videoJob && (
                    <button onClick={handleStartVideo} disabled={loadingVideo}
                      className="w-full py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-40"
                      style={{ background: "linear-gradient(135deg,#7c3aed,#db2777)", color: "white" }}>
                      {loadingVideo ? "⚙️ Runway ML で動画生成中（〜30秒）..." : "🎬 AI動画（15秒CM）を生成する →"}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Video Preview */}
          {videoJob && (
            <div className="rounded-xl overflow-hidden" style={{ background: "#111827", border: "1px solid #1f2937" }}>
              <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid #1f2937" }}>
                <h2 className="text-sm font-semibold text-white">🎬 AI生成動画</h2>
                <div className="flex items-center gap-2">
                  {videoJob.mock && (
                    <span className="text-xs px-2 py-0.5 rounded" style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}>
                      GOOGLE_API_KEY 未設定 — サンプル動画
                    </span>
                  )}
                  <span className="text-xs px-2 py-0.5 rounded"
                    style={{
                      background: videoJob.status === "completed" ? "rgba(16,185,129,0.15)" : "rgba(59,130,246,0.15)",
                      color: videoJob.status === "completed" ? "#10b981" : "#3b82f6",
                    }}>
                    {videoJob.status === "completed" ? "✅ 完成" : videoJob.status === "processing" ? "⚙️ 生成中..." : "⏳ 待機中"}
                  </span>
                </div>
              </div>
              <div className="p-5">
                {videoJob.status === "completed" && videoJob.videoUrl ? (
                  <video src={videoJob.videoUrl} controls
                    className="w-full rounded-xl"
                    style={{ border: "1px solid #1f2937", maxHeight: "300px" }} />
                ) : (
                  <div className="h-48 rounded-xl flex items-center justify-center gap-3"
                    style={{ background: "#0a0f1e" }}>
                    <span className="live-dot w-3 h-3 rounded-full" style={{ background: "#3b82f6" }} />
                    <span className="text-sm" style={{ color: "#3b82f6" }}>生成中... しばらくお待ちください</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Post Editor */}
          <div className="rounded-xl p-5" style={{ background: "#111827", border: "1px solid #1f2937" }}>
            <h2 className="text-sm font-semibold text-white mb-3">📣 X投稿</h2>
            <textarea
              value={postCaption}
              onChange={e => setPostCaption(e.target.value)}
              rows={4}
              className="w-full px-3 py-2.5 rounded-lg text-sm text-white resize-none mb-3"
              style={{ background: "#0a0f1e", border: "1px solid #374151" }}
              placeholder="CMコンセプトを生成すると自動で投稿文が入力されます" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs" style={{ color: postCaption.length > 280 ? "#ef4444" : "#6b7280" }}>
                {postCaption.length}/280
              </span>
              {concept && (
                <div className="flex gap-1">
                  {concept.hashtags.map(h => (
                    <span key={h} className="text-xs px-2 py-0.5 rounded"
                      style={{ background: "rgba(59,130,246,0.15)", color: "#3b82f6" }}>
                      {h}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {postResult === "success" && (
              <div className="mb-3 space-y-2">
                <div className="text-sm text-center py-2 rounded-lg"
                  style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}>
                  ✅ 承認キューに送りました！
                </div>
                <a href="/approval"
                  className="block text-center text-xs py-1.5 rounded-lg transition-colors"
                  style={{ background: "#1f2937", color: "#60a5fa" }}>
                  ✅ 編集・承認部で確認する →
                </a>
              </div>
            )}
            {postResult === "error" && (
              <div className="mb-3 text-sm text-center py-2 rounded-lg"
                style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>
                ❌ 送信失敗
              </div>
            )}
            <button onClick={handlePost}
              disabled={!postCaption || loadingPost}
              className="w-full py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-40"
              style={{ background: "linear-gradient(135deg,#1d4ed8,#7c3aed)", color: "white" }}>
              {loadingPost ? "送信中..." : "📋 承認キューに送る（Instagram / Threads / X）"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
