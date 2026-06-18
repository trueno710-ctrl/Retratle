"use client"

import { useState, useRef } from "react"

const PRESET_PROMPTS = [
  {
    label: "AKATOSHI - YouTubeオープニング",
    prompt:
      "AKATOSHI YouTube channel intro animation, Japanese male stock trader in his 30s, red and black cinematic style, stock charts flying in background, neon glow effects, dramatic camera zoom, professional broadcast quality, 8 seconds",
  },
  {
    label: "株式チャート演出",
    prompt:
      "Dynamic stock market visualization, candlestick charts rising dramatically, green and red numbers floating, dark background with glowing neon lines, financial technology aesthetic, cinematic camera movement, 8 seconds",
  },
  {
    label: "宇宙×投資テーマ",
    prompt:
      "SpaceX rocket launch with stock market charts overlay, space background with stars, red and gold color theme, Japanese investment channel cinematic intro, epic orchestral atmosphere, 8 seconds",
  },
  {
    label: "テンバガー爆発演出",
    prompt:
      "Ten-bagger stock explosion animation, stock price chart going parabolic upward, fireworks and particles, dramatic red and gold colors, Japanese stock market analysis channel, exciting cinematic style, 8 seconds",
  },
]

const ASPECT_RATIOS = [
  { value: "16:9", label: "横長 16:9（YouTube）" },
  { value: "9:16", label: "縦長 9:16（ショート）" },
  { value: "1:1", label: "正方形 1:1" },
]

const DURATIONS = [
  { value: 5, label: "5秒" },
  { value: 8, label: "8秒（推奨）" },
]

type Status = "idle" | "starting" | "polling" | "done" | "error"

export default function VideoGeneratorPage() {
  const [prompt, setPrompt] = useState("")
  const [aspectRatio, setAspectRatio] = useState("16:9")
  const [duration, setDuration] = useState(8)
  const [status, setStatus] = useState<Status>("idle")
  const [videos, setVideos] = useState<{ base64: string; mimeType: string }[]>([])
  const [error, setError] = useState("")
  const [elapsed, setElapsed] = useState(0)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopTimers = () => {
    if (pollingRef.current) clearInterval(pollingRef.current)
    if (elapsedRef.current) clearInterval(elapsedRef.current)
  }

  const startElapsed = () => {
    setElapsed(0)
    elapsedRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) return
    setStatus("starting")
    setError("")
    setVideos([])
    setElapsed(0)
    stopTimers()

    try {
      const res = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, aspectRatio, durationSeconds: duration }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "ジョブ開始に失敗しました")

      const operationName = data.operationName
      setStatus("polling")
      startElapsed()

      pollingRef.current = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/generate-video?op=${encodeURIComponent(operationName)}`)
          const pollData = await pollRes.json()

          if (!pollRes.ok || pollData.error) {
            stopTimers()
            setStatus("error")
            setError(pollData.error || "ポーリングエラー")
            return
          }

          if (pollData.done) {
            stopTimers()
            setStatus("done")
            setVideos(pollData.videos || [])
          }
        } catch {
          stopTimers()
          setStatus("error")
          setError("ポーリング中にエラーが発生しました")
        }
      }, 5000)
    } catch (e) {
      stopTimers()
      setStatus("error")
      setError(e instanceof Error ? e.message : "エラーが発生しました")
    }
  }

  const handleDownload = (base64: string, mimeType: string, index: number) => {
    const ext = mimeType.split("/")[1] || "mp4"
    const link = document.createElement("a")
    link.href = `data:${mimeType};base64,${base64}`
    link.download = `akatoshi-video-${Date.now()}-${index + 1}.${ext}`
    link.click()
  }

  const isLoading = status === "starting" || status === "polling"

  const statusMessage = () => {
    if (status === "starting") return "ジョブを開始しています..."
    if (status === "polling") return `生成中... ${elapsed}秒経過（通常1〜3分かかります）`
    return ""
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-red-400">動画生成 AI</h1>
        <p className="text-gray-400 mb-8">Google Veo 3 powered by Vertex AI</p>

        {/* プリセット */}
        <div className="mb-6">
          <p className="text-sm text-gray-400 mb-2">プリセット</p>
          <div className="grid grid-cols-2 gap-2">
            {PRESET_PROMPTS.map((p) => (
              <button
                key={p.label}
                onClick={() => setPrompt(p.prompt)}
                className="text-left text-sm bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg border border-gray-700 transition"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* プロンプト入力 */}
        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-1">プロンプト</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            placeholder="生成したい動画の説明を入力（英語推奨）"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-500 resize-none"
          />
        </div>

        {/* アスペクト比 */}
        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-1">アスペクト比</label>
          <div className="flex gap-2 flex-wrap">
            {ASPECT_RATIOS.map((r) => (
              <button
                key={r.value}
                onClick={() => setAspectRatio(r.value)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                  aspectRatio === r.value
                    ? "bg-red-500 border-red-500 text-white"
                    : "bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* 尺 */}
        <div className="mb-6">
          <label className="block text-sm text-gray-400 mb-1">動画の長さ</label>
          <div className="flex gap-2">
            {DURATIONS.map((d) => (
              <button
                key={d.value}
                onClick={() => setDuration(d.value)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                  duration === d.value
                    ? "bg-red-500 border-red-500 text-white"
                    : "bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* 生成ボタン */}
        <button
          onClick={handleGenerate}
          disabled={isLoading || !prompt.trim()}
          className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-3 rounded-lg transition mb-4"
        >
          {isLoading ? "生成中..." : "動画を生成する"}
        </button>

        {/* ステータス */}
        {isLoading && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 mb-6 flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-300 text-sm">{statusMessage()}</span>
          </div>
        )}

        {/* エラー */}
        {status === "error" && (
          <div className="bg-red-900/30 border border-red-500 text-red-300 rounded-lg px-4 py-3 mb-6">
            {error}
          </div>
        )}

        {/* 生成結果 */}
        {videos.length > 0 && (
          <div>
            <p className="text-sm text-gray-400 mb-3">生成結果</p>
            <div className="grid gap-4">
              {videos.map((vid, i) => (
                <div key={i} className="relative group">
                  <video
                    src={`data:${vid.mimeType};base64,${vid.base64}`}
                    controls
                    className="w-full rounded-xl border border-gray-700"
                  />
                  <button
                    onClick={() => handleDownload(vid.base64, vid.mimeType, i)}
                    className="absolute bottom-3 right-3 bg-black/70 hover:bg-black text-white text-sm px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition"
                  >
                    ダウンロード
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
