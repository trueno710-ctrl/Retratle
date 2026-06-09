"use client"
import { useState, useRef, useCallback, useEffect } from "react"
import type { FxTradeData } from "@/app/api/fx-diary/extract/route"

const CURRENCY_PAIRS = ["USD/JPY", "EUR/JPY", "GBP/JPY", "EUR/USD", "GBP/USD", "AUD/JPY", "USD/CHF", "その他"]

const emptyForm = (): FxTradeData & { tradeName: string } => ({
  tradeName: "",
  date: new Date().toISOString().slice(0, 10),
  currencyPair: "USD/JPY",
  direction: "",
  lot: null,
  entryPrice: null,
  exitPrice: null,
  pnlPips: null,
  pnlJpy: null,
  result: "",
  memo: "",
})

export default function FxDiaryPage() {
  const [form, setForm] = useState(emptyForm())
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [csvText, setCsvText] = useState<string | null>(null)
  const [extracting, setExtracting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState<{ ok: boolean; msg: string; url?: string } | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)
  const csvInputRef = useRef<HTMLInputElement>(null)

  const handleImage = useCallback((file: File) => {
    setImageFile(file)
    setCsvText(null)
    const url = URL.createObjectURL(file)
    setImagePreview(url)
    setSaveResult(null)
  }, [])

  const handleCsv = useCallback((file: File) => {
    file.text().then(text => {
      setCsvText(text)
      setImageFile(null)
      setImagePreview(null)
      setSaveResult(null)
    })
  }, [])

  // Paste handler
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile()
          if (file) handleImage(file)
          break
        }
      }
    }
    window.addEventListener("paste", onPaste)
    return () => window.removeEventListener("paste", onPaste)
  }, [handleImage])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (!file) return
    if (file.type.startsWith("image/")) handleImage(file)
    else if (file.name.endsWith(".csv")) handleCsv(file)
  }, [handleImage, handleCsv])

  async function handleExtract() {
    if (!imageFile && !csvText) return
    setExtracting(true)
    try {
      const fd = new FormData()
      if (imageFile) fd.append("image", imageFile)
      else if (csvText) fd.append("csv", csvText)

      const res = await fetch("/api/fx-diary/extract", { method: "POST", body: fd })
      const json = await res.json()
      if (json.success) {
        setForm(f => ({
          ...f,
          ...json.data,
          tradeName: f.tradeName || `${json.data.currencyPair} ${json.data.direction} ${json.data.date}`,
        }))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setExtracting(false)
    }
  }

  async function handleSave() {
    if (!form.currencyPair || !form.date) return
    setSaving(true)
    setSaveResult(null)
    try {
      const res = await fetch("/api/fx-diary/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (json.success) {
        setSaveResult({ ok: true, msg: "Notionに保存しました", url: json.url })
        setForm(emptyForm())
        setImagePreview(null)
        setImageFile(null)
        setCsvText(null)
      } else {
        setSaveResult({ ok: false, msg: json.error || "保存に失敗しました" })
      }
    } catch (err) {
      setSaveResult({ ok: false, msg: String(err) })
    } finally {
      setSaving(false)
    }
  }

  const f = (label: string, children: React.ReactNode) => (
    <div className="space-y-1">
      <label className="text-xs font-medium" style={{ color: "#9ca3af" }}>{label}</label>
      {children}
    </div>
  )

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">📈 FXトレード日記</h1>
        <p className="text-sm mt-1" style={{ color: "#6b7280" }}>
          TradingViewのスクリーンショットまたはCSVを貼り付け → AIが自動解析 → Notionに保存
        </p>
      </div>

      <div className="grid grid-cols-5 gap-6">
        {/* Left: Upload area */}
        <div className="col-span-2 space-y-4">

          {/* Drop zone */}
          <div
            ref={dropRef}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className="rounded-xl border-2 border-dashed transition-all cursor-pointer"
            style={{
              borderColor: dragOver ? "#3b82f6" : "#1f2937",
              background: dragOver ? "rgba(59,130,246,0.05)" : "#0a0f1e",
              minHeight: 180,
            }}
          >
            {imagePreview ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="preview" className="w-full rounded-xl object-contain max-h-64" />
                <button
                  onClick={() => { setImagePreview(null); setImageFile(null) }}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full text-xs flex items-center justify-center"
                  style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}
                >✕</button>
              </div>
            ) : csvText ? (
              <div className="flex flex-col items-center justify-center h-44 gap-2">
                <p className="text-2xl">📄</p>
                <p className="text-sm text-white">CSV読み込み済み</p>
                <p className="text-xs" style={{ color: "#6b7280" }}>
                  {csvText.split("\n").length - 1} 行
                </p>
                <button onClick={() => setCsvText(null)} className="text-xs" style={{ color: "#ef4444" }}>削除</button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-44 gap-3 p-4 text-center">
                <p className="text-3xl">📋</p>
                <p className="text-sm text-white font-medium">スクリーンショットを貼り付け</p>
                <p className="text-xs" style={{ color: "#6b7280" }}>
                  Ctrl+V でペースト<br />またはここにドラッグ＆ドロップ
                </p>
              </div>
            )}
          </div>

          {/* CSV upload */}
          <div className="flex gap-2">
            <button
              onClick={() => csvInputRef.current?.click()}
              className="flex-1 py-2 rounded-lg text-xs transition-colors"
              style={{ background: "#1f2937", color: "#9ca3af", border: "1px solid #374151" }}
            >
              CSV ファイルを選択
            </button>
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleCsv(f) }}
            />
          </div>

          {/* Extract button */}
          <button
            onClick={handleExtract}
            disabled={(!imageFile && !csvText) || extracting}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40"
            style={{ background: extracting ? "#374151" : "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}
          >
            {extracting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                AI解析中...
              </span>
            ) : "AI で自動解析"}
          </button>

          {/* Usage hint */}
          <div className="rounded-lg p-3 text-xs space-y-1" style={{ background: "#0d1117", border: "1px solid #1f2937" }}>
            <p className="font-medium" style={{ color: "#6b7280" }}>使い方</p>
            <p style={{ color: "#4b5563" }}>1. TradingViewでチャート・取引画面をキャプチャ</p>
            <p style={{ color: "#4b5563" }}>2. Ctrl+V で貼り付け または CSVをドロップ</p>
            <p style={{ color: "#4b5563" }}>3.「AI で自動解析」をクリック</p>
            <p style={{ color: "#4b5563" }}>4. 内容を確認・編集して Notion に保存</p>
          </div>
        </div>

        {/* Right: Form */}
        <div className="col-span-3 space-y-4">
          <div className="rounded-xl p-6 space-y-4" style={{ background: "#111827", border: "1px solid #1f2937" }}>
            <h2 className="text-base font-semibold text-white">トレード情報</h2>

            {/* Title */}
            {f("タイトル（省略可）",
              <input
                placeholder={`${form.currencyPair} ${form.direction || "方向"} ${form.date}`}
                value={form.tradeName}
                onChange={e => setForm(p => ({ ...p, tradeName: e.target.value }))}
                className="field"
              />
            )}

            <div className="grid grid-cols-2 gap-3">
              {f("日付",
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                  className="field"
                />
              )}
              {f("通貨ペア",
                <select
                  value={form.currencyPair}
                  onChange={e => setForm(p => ({ ...p, currencyPair: e.target.value }))}
                  className="field"
                >
                  {CURRENCY_PAIRS.map(cp => <option key={cp} value={cp}>{cp}</option>)}
                </select>
              )}
              {f("方向",
                <select
                  value={form.direction}
                  onChange={e => setForm(p => ({ ...p, direction: e.target.value as FxTradeData["direction"] }))}
                  className="field"
                >
                  <option value="">選択...</option>
                  <option value="買い（ロング）">買い（ロング）</option>
                  <option value="売り（ショート）">売り（ショート）</option>
                </select>
              )}
              {f("ロット数",
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.10"
                  value={form.lot ?? ""}
                  onChange={e => setForm(p => ({ ...p, lot: e.target.value ? Number(e.target.value) : null }))}
                  className="field"
                />
              )}
              {f("エントリー価格",
                <input
                  type="number"
                  step="0.001"
                  placeholder="155.000"
                  value={form.entryPrice ?? ""}
                  onChange={e => setForm(p => ({ ...p, entryPrice: e.target.value ? Number(e.target.value) : null }))}
                  className="field"
                />
              )}
              {f("決済価格",
                <input
                  type="number"
                  step="0.001"
                  placeholder="156.200"
                  value={form.exitPrice ?? ""}
                  onChange={e => setForm(p => ({ ...p, exitPrice: e.target.value ? Number(e.target.value) : null }))}
                  className="field"
                />
              )}
              {f("損益（pips）",
                <input
                  type="number"
                  step="0.1"
                  placeholder="+12.0"
                  value={form.pnlPips ?? ""}
                  onChange={e => setForm(p => ({ ...p, pnlPips: e.target.value ? Number(e.target.value) : null }))}
                  className="field"
                />
              )}
              {f("損益（円）",
                <input
                  type="number"
                  placeholder="+12000"
                  value={form.pnlJpy ?? ""}
                  onChange={e => setForm(p => ({ ...p, pnlJpy: e.target.value ? Number(e.target.value) : null }))}
                  className="field"
                />
              )}
            </div>

            {f("結果",
              <div className="flex gap-2">
                {(["勝ち", "負け", "引き分け"] as const).map(r => (
                  <button
                    key={r}
                    onClick={() => setForm(p => ({ ...p, result: p.result === r ? "" : r }))}
                    className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
                    style={form.result === r ? {
                      background: r === "勝ち" ? "rgba(16,185,129,0.2)" : r === "負け" ? "rgba(239,68,68,0.2)" : "rgba(107,114,128,0.2)",
                      color: r === "勝ち" ? "#10b981" : r === "負け" ? "#ef4444" : "#9ca3af",
                      border: `1px solid ${r === "勝ち" ? "#10b981" : r === "負け" ? "#ef4444" : "#6b7280"}`,
                    } : {
                      background: "#1f2937",
                      color: "#6b7280",
                      border: "1px solid #374151",
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}

            {f("分析・メモ",
              <textarea
                rows={4}
                placeholder="エントリー根拠・相場の状況・反省点など..."
                value={form.memo}
                onChange={e => setForm(p => ({ ...p, memo: e.target.value }))}
                className="field resize-none"
              />
            )}

            {/* P&L preview */}
            {(form.pnlJpy != null || form.pnlPips != null) && (
              <div className="rounded-lg p-3 flex gap-6" style={{ background: "#0a0f1e", border: "1px solid #1f2937" }}>
                {form.pnlJpy != null && (
                  <div>
                    <p className="text-xs" style={{ color: "#6b7280" }}>損益（円）</p>
                    <p className="text-xl font-bold font-mono" style={{ color: form.pnlJpy > 0 ? "#10b981" : form.pnlJpy < 0 ? "#ef4444" : "#9ca3af" }}>
                      {form.pnlJpy > 0 ? "+" : ""}{form.pnlJpy.toLocaleString()}円
                    </p>
                  </div>
                )}
                {form.pnlPips != null && (
                  <div>
                    <p className="text-xs" style={{ color: "#6b7280" }}>損益（pips）</p>
                    <p className="text-xl font-bold font-mono" style={{ color: form.pnlPips > 0 ? "#10b981" : form.pnlPips < 0 ? "#ef4444" : "#9ca3af" }}>
                      {form.pnlPips > 0 ? "+" : ""}{form.pnlPips} pips
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Save result */}
            {saveResult && (
              <div
                className="rounded-lg p-3 text-sm"
                style={{
                  background: saveResult.ok ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                  border: `1px solid ${saveResult.ok ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
                  color: saveResult.ok ? "#10b981" : "#ef4444",
                }}
              >
                {saveResult.msg}
                {saveResult.url && (
                  <a href={saveResult.url} target="_blank" rel="noopener noreferrer" className="ml-2 underline">
                    Notionで開く →
                  </a>
                )}
              </div>
            )}

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={saving || !form.date || !form.currencyPair}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40"
              style={{ background: saving ? "#374151" : "#6366f1" }}
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Notionに保存中...
                </span>
              ) : "Notion に保存"}
            </button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .field {
          width: 100%;
          padding: 0.5rem 0.75rem;
          background: #0a0f1e;
          border: 1px solid #1f2937;
          border-radius: 0.5rem;
          color: #e2e8f0;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.15s;
        }
        .field:focus { border-color: #3b82f6; }
        .field option { background: #0a0f1e; }
      `}</style>
    </div>
  )
}
