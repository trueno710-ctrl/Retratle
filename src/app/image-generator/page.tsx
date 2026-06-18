"use client"

import { useState } from "react"

const PRESET_PROMPTS = [
  {
    label: "赤澤トシ - YouTubeアイコン",
    prompt:
      "AKATOSHI YouTube channel logo, Japanese male trader in his 30s, cool and intellectual appearance, red and black color theme, stock charts and space background, anime illustration style, professional atmosphere, high quality",
  },
  {
    label: "赤澤トシ - サムネイル風",
    prompt:
      "YouTube thumbnail for AKATOSHI channel, Japanese stock market analyst, dramatic lighting, red and black color scheme, financial charts in background, confident expression, cinematic style",
  },
  {
    label: "株式チャート背景",
    prompt:
      "Futuristic stock market trading dashboard, candlestick charts, green and red indicators, dark background with glowing neon lines, professional financial technology aesthetic",
  },
  {
    label: "宇宙×投資テーマ",
    prompt:
      "Space and stock market fusion artwork, SpaceX rocket launch with financial charts overlay, dark space background, red and gold colors, Japanese investment theme, cinematic quality",
  },
]

const ASPECT_RATIOS = [
  { value: "1:1", label: "正方形 1:1（アイコン）" },
  { value: "16:9", label: "横長 16:9（サムネイル）" },
  { value: "9:16", label: "縦長 9:16（ショート動画）" },
  { value: "4:3", label: "4:3" },
]

export default function ImageGeneratorPage() {
  const [prompt, setPrompt] = useState("")
  const [aspectRatio, setAspectRatio] = useState("1:1")
  const [images, setImages] = useState<{ base64: string; mimeType: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleGenerate = async () => {
    if (!prompt.trim()) return
    setLoading(true)
    setError("")
    setImages([])

    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, aspectRatio }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "生成に失敗しました")
      setImages(data.images || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました")
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = (base64: string, mimeType: string, index: number) => {
    const ext = mimeType.split("/")[1] || "png"
    const link = document.createElement("a")
    link.href = `data:${mimeType};base64,${base64}`
    link.download = `akatoshi-image-${Date.now()}-${index + 1}.${ext}`
    link.click()
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-red-400">画像生成 AI</h1>
        <p className="text-gray-400 mb-8">Google Imagen 3 powered by Vertex AI</p>

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
            placeholder="生成したい画像の説明を入力（日本語・英語どちらでもOK）"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-500 resize-none"
          />
        </div>

        {/* アスペクト比 */}
        <div className="mb-6">
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

        {/* 生成ボタン */}
        <button
          onClick={handleGenerate}
          disabled={loading || !prompt.trim()}
          className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-3 rounded-lg transition mb-6"
        >
          {loading ? "生成中..." : "画像を生成する"}
        </button>

        {/* エラー */}
        {error && (
          <div className="bg-red-900/30 border border-red-500 text-red-300 rounded-lg px-4 py-3 mb-6">
            {error}
          </div>
        )}

        {/* 生成結果 */}
        {images.length > 0 && (
          <div>
            <p className="text-sm text-gray-400 mb-3">生成結果</p>
            <div className="grid gap-4">
              {images.map((img, i) => (
                <div key={i} className="relative group">
                  <img
                    src={`data:${img.mimeType};base64,${img.base64}`}
                    alt={`生成画像 ${i + 1}`}
                    className="w-full rounded-xl border border-gray-700"
                  />
                  <button
                    onClick={() => handleDownload(img.base64, img.mimeType, i)}
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
