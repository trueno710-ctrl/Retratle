"use client"
import { useState, useRef, useCallback, useEffect } from "react"
import type { FxTradeData } from "@/app/api/fx-diary/extract/route"

const CURRENCY_PAIRS = ["USD/JPY","EUR/JPY","GBP/JPY","EUR/USD","GBP/USD","AUD/JPY","NZD/USD","AUD/USD","USD/CHF","USD/CAD","その他"]
const SESSIONS = ["アジア時間","ロンドン時間","ニューヨーク時間","ロンドン/NY重複"] as const
const TIMEFRAMES = ["1分足","5分足","15分足","1時間足","4時間足","日足","週足"] as const
const DAYS = ["月曜","火曜","水曜","木曜","金曜"] as const

type FormData = FxTradeData & { tradeName: string }

const emptyForm = (): FormData => ({
  tradeName: "",
  date: new Date().toISOString().slice(0, 10),
  dayOfWeek: "",
  currencyPair: "NZD/USD",
  direction: "",
  session: "",
  timeframe: "1時間足",
  lot: null,
  entryPrice: null,
  exitPrice: null,
  stopLossPips: null,
  pnlPips: null,
  pnlJpy: null,
  result: "",
  entryBasis: "",
  memo: "",
})

function Chip({ label, active, color, onClick }: { label: string; active: boolean; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
      style={active
        ? { background: color + "33", color, border: `1px solid ${color}66` }
        : { background: "#1f2937", color: "#6b7280", border: "1px solid #374151" }
      }
    >
      {label}
    </button>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium" style={{ color: "#9ca3af" }}>{label}</label>
      {children}
    </div>
  )
}

export default function FxDiaryPage() {
  const [form, setForm] = useState<FormData>(emptyForm())
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [csvText, setCsvText] = useState<string | null>(null)
  const [extracting, setExtracting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState<{ ok: boolean; msg: string; url?: string } | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const csvInputRef = useRef<HTMLInputElement>(null)

  const handleImage = useCallback((file: File) => {
    setImageFile(file)
    setCsvText(null)
    setImagePreview(URL.createObjectURL(file))
    setSaveResult(null)
  }, [])

  const handleCsv = useCallback((file: File) => {
    file.text().then(t => { setCsvText(t); setImageFile(null); setImagePreview(null); setSaveResult(null) })
  }, [])

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      for (const item of e.clipboardData?.items ?? []) {
        if (item.type.startsWith("image/")) { const f = item.getAsFile(); if (f) handleImage(f); break }
      }
    }
    window.addEventListener("paste", onPaste)
    return () => window.removeEventListener("paste", onPaste)
  }, [handleImage])

  const set = <K extends keyof FormData>(k: K, v: FormData[K]) => setForm(p => ({ ...p, [k]: v }))

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
        const d = json.data as FxTradeData
        setForm(p => ({
          ...p, ...d,
          tradeName: p.tradeName || `${d.currencyPair} ${d.direction} ${d.date}`,
        }))
      }
    } finally { setExtracting(false) }
  }

  async function handleSave() {
    setSaving(true); setSaveResult(null)
    try {
      const res = await fetch("/api/fx-diary/save", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      })
      const json = await res.json()
      setSaveResult(json.success
        ? { ok: true, msg: "Notionに保存しました ✓", url: json.url }
        : { ok: false, msg: json.error || "保存に失敗しました" }
      )
      if (json.success) { setForm(emptyForm()); setImagePreview(null); setImageFile(null); setCsvText(null) }
    } catch (e) { setSaveResult({ ok: false, msg: String(e) }) }
    finally { setSaving(false) }
  }

  const sessionColors: Record<string, string> = {
    "アジア時間": "#f59e0b",
    "ロンドン時間": "#3b82f6",
    "ニューヨーク時間": "#10b981",
    "ロンドン/NY重複": "#8b5cf6",
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">📈 FXトレード日記</h1>
        <p className="text-sm mt-1" style={{ color: "#6b7280" }}>
          TradingViewのスクリーンショットを貼り付け → AIが自動解析 → Notionに保存
        </p>
      </div>

      <div className="grid grid-cols-5 gap-6">
        {/* Left: Upload */}
        <div className="col-span-2 space-y-3">
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) { if (f.type.startsWith("image/")) handleImage(f); else if (f.name.endsWith(".csv")) handleCsv(f) } }}
            className="rounded-xl border-2 border-dashed transition-all"
            style={{ borderColor: dragOver ? "#3b82f6" : "#1f2937", background: dragOver ? "rgba(59,130,246,0.05)" : "#0a0f1e", minHeight: 200 }}
          >
            {imagePreview ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="preview" className="w-full rounded-xl object-contain max-h-72" />
                <button
                  onClick={() => { setImagePreview(null); setImageFile(null) }}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full text-xs flex items-center justify-center"
                  style={{ background: "rgba(0,0,0,0.7)", color: "#fff" }}
                >✕</button>
              </div>
            ) : csvText ? (
              <div className="flex flex-col items-center justify-center h-48 gap-2">
                <p className="text-2xl">📄</p>
                <p className="text-sm text-white">CSV読み込み済み</p>
                <button onClick={() => setCsvText(null)} className="text-xs" style={{ color: "#ef4444" }}>削除</button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 gap-3 p-4 text-center">
                <p className="text-4xl">📋</p>
                <p className="text-sm text-white font-medium">Ctrl+V でスクショを貼り付け</p>
                <p className="text-xs" style={{ color: "#6b7280" }}>またはここにドラッグ＆ドロップ</p>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={() => csvInputRef.current?.click()} className="flex-1 py-2 rounded-lg text-xs" style={{ background: "#1f2937", color: "#9ca3af", border: "1px solid #374151" }}>
              CSV ファイルを選択
            </button>
            <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleCsv(f) }} />
          </div>

          <button
            onClick={handleExtract}
            disabled={(!imageFile && !csvText) || extracting}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40"
            style={{ background: extracting ? "#374151" : "linear-gradient(135deg,#3b82f6,#8b5cf6)" }}
          >
            {extracting
              ? <span className="flex items-center justify-center gap-2"><span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full inline-block" />AI解析中...</span>
              : "AI で自動解析"}
          </button>

          {/* Session legend */}
          <div className="rounded-lg p-3 space-y-2" style={{ background: "#0d1117", border: "1px solid #1f2937" }}>
            <p className="text-xs font-medium" style={{ color: "#6b7280" }}>セッション時間（JST）</p>
            {[["アジア時間","#f59e0b","8:00〜15:00"],["ロンドン時間","#3b82f6","15:00〜22:00"],["ロンドン/NY重複","#8b5cf6","22:00〜0:00"],["ニューヨーク時間","#10b981","22:00〜6:00"]].map(([s,c,t]) => (
              <div key={s} className="flex items-center justify-between">
                <span className="text-xs" style={{ color: c as string }}>● {s}</span>
                <span className="text-xs" style={{ color: "#4b5563" }}>{t}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Form */}
        <div className="col-span-3 space-y-4">
          <div className="rounded-xl p-5 space-y-4" style={{ background: "#111827", border: "1px solid #1f2937" }}>

            <Field label="タイトル（省略可）">
              <input placeholder={`${form.currencyPair} ${form.direction || "方向"} ${form.date}`} value={form.tradeName} onChange={e => set("tradeName", e.target.value)} className="fld" />
            </Field>

            {/* Date + Day */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="日付">
                <input type="date" value={form.date} onChange={e => { set("date", e.target.value); const d = new Date(e.target.value); const days: FormData["dayOfWeek"][] = ["","月曜","火曜","水曜","木曜","金曜",""]; set("dayOfWeek", days[d.getDay()] || "") }} className="fld" />
              </Field>
              <Field label="曜日">
                <div className="flex gap-1 flex-wrap">
                  {DAYS.map(d => <Chip key={d} label={d} active={form.dayOfWeek === d} color="#9ca3af" onClick={() => set("dayOfWeek", form.dayOfWeek === d ? "" : d)} />)}
                </div>
              </Field>
            </div>

            {/* Session */}
            <Field label="セッション">
              <div className="flex gap-2 flex-wrap">
                {SESSIONS.map(s => <Chip key={s} label={s} active={form.session === s} color={sessionColors[s]} onClick={() => set("session", form.session === s ? "" : s)} />)}
              </div>
            </Field>

            {/* Currency + Direction + Timeframe */}
            <div className="grid grid-cols-3 gap-3">
              <Field label="通貨ペア">
                <select value={form.currencyPair} onChange={e => set("currencyPair", e.target.value)} className="fld">
                  {CURRENCY_PAIRS.map(cp => <option key={cp}>{cp}</option>)}
                </select>
              </Field>
              <Field label="方向">
                <div className="flex gap-2 h-[38px] items-center">
                  {(["買い（ロング）","売り（ショート）"] as const).map(d => (
                    <button key={d} onClick={() => set("direction", form.direction === d ? "" : d)}
                      className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={form.direction === d
                        ? { background: d === "買い（ロング）" ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)", color: d === "買い（ロング）" ? "#10b981" : "#ef4444", border: `1px solid ${d === "買い（ロング）" ? "#10b981" : "#ef4444"}` }
                        : { background: "#1f2937", color: "#6b7280", border: "1px solid #374151" }
                      }
                    >
                      {d === "買い（ロング）" ? "▲ ロング" : "▼ ショート"}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="時間足">
                <select value={form.timeframe} onChange={e => set("timeframe", e.target.value as FormData["timeframe"])} className="fld">
                  <option value="">選択...</option>
                  {TIMEFRAMES.map(t => <option key={t}>{t}</option>)}
                </select>
              </Field>
            </div>

            {/* Prices */}
            <div className="grid grid-cols-3 gap-3">
              <Field label="エントリー価格">
                <input type="number" step="0.00001" placeholder="0.58498" value={form.entryPrice ?? ""} onChange={e => set("entryPrice", e.target.value ? Number(e.target.value) : null)} className="fld" />
              </Field>
              <Field label="決済価格">
                <input type="number" step="0.00001" placeholder="0.58121" value={form.exitPrice ?? ""} onChange={e => set("exitPrice", e.target.value ? Number(e.target.value) : null)} className="fld" />
              </Field>
              <Field label="損切り幅 (pips)">
                <input type="number" step="0.1" placeholder="20.0" value={form.stopLossPips ?? ""} onChange={e => set("stopLossPips", e.target.value ? Number(e.target.value) : null)} className="fld" />
              </Field>
            </div>

            {/* P&L + Lot */}
            <div className="grid grid-cols-3 gap-3">
              <Field label="ロット数">
                <input type="number" step="0.01" placeholder="1.59" value={form.lot ?? ""} onChange={e => set("lot", e.target.value ? Number(e.target.value) : null)} className="fld" />
              </Field>
              <Field label="損益 (pips)">
                <input type="number" step="0.1" placeholder="-37.7" value={form.pnlPips ?? ""} onChange={e => set("pnlPips", e.target.value ? Number(e.target.value) : null)} className="fld" />
              </Field>
              <Field label="損益 (円)">
                <input type="number" placeholder="-12000" value={form.pnlJpy ?? ""} onChange={e => set("pnlJpy", e.target.value ? Number(e.target.value) : null)} className="fld" />
              </Field>
            </div>

            {/* Result */}
            <Field label="結果">
              <div className="flex gap-2">
                {(["勝ち","負け","引き分け"] as const).map(r => (
                  <button key={r} onClick={() => set("result", form.result === r ? "" : r)}
                    className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
                    style={form.result === r
                      ? { background: r === "勝ち" ? "rgba(16,185,129,0.2)" : r === "負け" ? "rgba(239,68,68,0.2)" : "rgba(107,114,128,0.2)", color: r === "勝ち" ? "#10b981" : r === "負け" ? "#ef4444" : "#9ca3af", border: `1px solid ${r === "勝ち" ? "#10b981" : r === "負け" ? "#ef4444" : "#6b7280"}` }
                      : { background: "#1f2937", color: "#6b7280", border: "1px solid #374151" }
                    }
                  >
                    {r}
                  </button>
                ))}
              </div>
            </Field>

            {/* Entry basis */}
            <Field label="エントリー根拠（AIが自動入力）">
              <textarea
                rows={4}
                placeholder="AIが自動解析します。または手動で入力：フィボ0.382でリバウンド、CHoCH確認後ショートエントリー..."
                value={form.entryBasis}
                onChange={e => set("entryBasis", e.target.value)}
                className="fld resize-none"
              />
            </Field>

            {/* Memo */}
            <Field label="分析・メモ">
              <textarea rows={2} placeholder="補足メモ..." value={form.memo} onChange={e => set("memo", e.target.value)} className="fld resize-none" />
            </Field>

            {/* P&L preview */}
            {(form.pnlJpy != null || form.pnlPips != null) && (
              <div className="rounded-lg p-3 flex gap-6 items-center" style={{ background: "#0a0f1e", border: "1px solid #1f2937" }}>
                {form.pnlJpy != null && (
                  <div>
                    <p className="text-xs mb-0.5" style={{ color: "#6b7280" }}>損益（円）</p>
                    <p className="text-xl font-bold font-mono" style={{ color: form.pnlJpy > 0 ? "#10b981" : form.pnlJpy < 0 ? "#ef4444" : "#9ca3af" }}>
                      {form.pnlJpy > 0 ? "+" : ""}{form.pnlJpy.toLocaleString()}円
                    </p>
                  </div>
                )}
                {form.pnlPips != null && (
                  <div>
                    <p className="text-xs mb-0.5" style={{ color: "#6b7280" }}>損益（pips）</p>
                    <p className="text-xl font-bold font-mono" style={{ color: form.pnlPips > 0 ? "#10b981" : form.pnlPips < 0 ? "#ef4444" : "#9ca3af" }}>
                      {form.pnlPips > 0 ? "+" : ""}{form.pnlPips} pips
                    </p>
                  </div>
                )}
                {form.stopLossPips != null && (
                  <div>
                    <p className="text-xs mb-0.5" style={{ color: "#6b7280" }}>損切り幅</p>
                    <p className="text-lg font-bold font-mono" style={{ color: "#f59e0b" }}>{form.stopLossPips} pips</p>
                  </div>
                )}
              </div>
            )}

            {/* Save result */}
            {saveResult && (
              <div className="rounded-lg p-3 text-sm" style={{ background: saveResult.ok ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${saveResult.ok ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`, color: saveResult.ok ? "#10b981" : "#ef4444" }}>
                {saveResult.msg}
                {saveResult.url && <a href={saveResult.url} target="_blank" rel="noopener noreferrer" className="ml-2 underline">Notionで開く →</a>}
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={saving || !form.date || !form.currencyPair}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40"
              style={{ background: saving ? "#374151" : "#6366f1" }}
            >
              {saving
                ? <span className="flex items-center justify-center gap-2"><span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full inline-block" />保存中...</span>
                : "Notion に保存"}
            </button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .fld { width:100%; padding:0.5rem 0.75rem; background:#0a0f1e; border:1px solid #1f2937; border-radius:0.5rem; color:#e2e8f0; font-size:0.875rem; outline:none; transition:border-color .15s; }
        .fld:focus { border-color:#3b82f6; }
        .fld option { background:#0a0f1e; }
      `}</style>
    </div>
  )
}
