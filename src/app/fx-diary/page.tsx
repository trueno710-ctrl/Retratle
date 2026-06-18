"use client"
import { useState, useRef, useCallback, useEffect } from "react"
import type { FxTradeData } from "@/app/api/fx-diary/extract/route"

const CURRENCY_PAIRS = ["USD/JPY","EUR/JPY","GBP/JPY","EUR/USD","GBP/USD","AUD/JPY","NZD/USD","AUD/USD","USD/CHF","USD/CAD","その他"]
const SESSIONS = ["アジア時間","ロンドン時間","ニューヨーク時間","ロンドン/NY重複"] as const
const TIMEFRAMES = ["1分足","5分足","15分足","1時間足","4時間足","日足","週足"] as const
const DAYS = ["月曜","火曜","水曜","木曜","金曜"] as const

type TradeForm = FxTradeData & { tradeName: string }

const emptyForm = (): TradeForm => ({
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

const sessionColors: Record<string, string> = {
  "アジア時間": "#f59e0b",
  "ロンドン時間": "#3b82f6",
  "ニューヨーク時間": "#10b981",
  "ロンドン/NY重複": "#8b5cf6",
}

function Chip({ label, active, color, onClick }: { label: string; active: boolean; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
      style={active
        ? { background: color + "33", color, border: `1px solid ${color}66` }
        : { background: "#1f2937", color: "#6b7280", border: "1px solid #374151" }
      }
    >{label}</button>
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

// Single screenshot drop/paste zone
function ScreenshotZone({
  label, tag, file, preview, onFile, onClear,
}: {
  label: string; tag: string; file: File | null; preview: string | null
  onFile: (f: File) => void; onClear: () => void
}) {
  const [drag, setDrag] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: "#9ca3af" }}>{label}</span>
        {file && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.3)" }}>{tag}</span>}
      </div>
      <div
        onDragOver={e => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f?.type.startsWith("image/")) onFile(f) }}
        onClick={() => !preview && inputRef.current?.click()}
        className="rounded-xl border-2 border-dashed transition-all cursor-pointer overflow-hidden"
        style={{
          borderColor: drag ? "#6366f1" : file ? "#374151" : "#1f2937",
          background: drag ? "rgba(99,102,241,0.05)" : "#0a0f1e",
          minHeight: preview ? undefined : 120,
        }}
      >
        {preview ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt={label} className="w-full object-contain max-h-56 rounded-xl" />
            <button
              onClick={e => { e.stopPropagation(); onClear() }}
              className="absolute top-2 right-2 w-6 h-6 rounded-full text-xs flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.7)", color: "#fff" }}
            >✕</button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-28 gap-2 text-center p-3">
            <p className="text-2xl">{tag === "エントリー前" ? "📋" : "📸"}</p>
            <p className="text-xs" style={{ color: "#6b7280" }}>
              {tag === "エントリー前" ? "Ctrl+V または" : ""}ドロップ / クリック
            </p>
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
    </div>
  )
}

export default function FxDiaryPage() {
  const [form, setForm] = useState<TradeForm>(emptyForm())

  // Screenshot state
  const [beforeFile, setBeforeFile] = useState<File | null>(null)
  const [beforePreview, setBeforePreview] = useState<string | null>(null)
  const [afterFile, setAfterFile] = useState<File | null>(null)
  const [afterPreview, setAfterPreview] = useState<string | null>(null)

  const [extracting, setExtracting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState<{ ok: boolean; msg: string; url?: string; images?: number } | null>(null)

  const setImg = useCallback((which: "before" | "after", file: File) => {
    const url = URL.createObjectURL(file)
    if (which === "before") { setBeforeFile(file); setBeforePreview(url) }
    else { setAfterFile(file); setAfterPreview(url) }
    setSaveResult(null)
  }, [])

  // Global paste → before screenshot
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      for (const item of e.clipboardData?.items ?? []) {
        if (item.type.startsWith("image/")) {
          const f = item.getAsFile()
          if (f) setImg("before", f)
          break
        }
      }
    }
    window.addEventListener("paste", onPaste)
    return () => window.removeEventListener("paste", onPaste)
  }, [setImg])

  const set = <K extends keyof TradeForm>(k: K, v: TradeForm[K]) => setForm(p => ({ ...p, [k]: v }))

  async function handleExtract() {
    if (!beforeFile) return
    setExtracting(true)
    try {
      const fd = new FormData()
      fd.append("image", beforeFile)
      const res = await fetch("/api/fx-diary/extract", { method: "POST", body: fd })
      const json = await res.json()
      if (json.success) {
        const d = json.data as FxTradeData
        setForm(p => ({ ...p, ...d, tradeName: p.tradeName || `${d.currencyPair} ${d.direction} ${d.date}` }))
      }
    } finally { setExtracting(false) }
  }

  async function handleSave() {
    setSaving(true); setSaveResult(null)
    try {
      const fd = new FormData()
      fd.append("data", JSON.stringify(form))
      if (beforeFile) fd.append("image_before", beforeFile)
      if (afterFile) fd.append("image_after", afterFile)

      const res = await fetch("/api/fx-diary/save", { method: "POST", body: fd })
      const json = await res.json()

      if (json.success) {
        const imgMsg = json.attachedImages > 0 ? `（スクリーンショット${json.attachedImages}枚添付）` : ""
        setSaveResult({ ok: true, msg: `Notionに保存しました ✓ ${imgMsg}`, url: json.url, images: json.attachedImages })
        setForm(emptyForm()); setBeforeFile(null); setBeforePreview(null); setAfterFile(null); setAfterPreview(null)
      } else {
        setSaveResult({ ok: false, msg: json.error || "保存に失敗しました" })
      }
    } catch (e) { setSaveResult({ ok: false, msg: String(e) }) }
    finally { setSaving(false) }
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">📈 FXトレード日記</h1>
        <p className="text-sm mt-1" style={{ color: "#6b7280" }}>
          SMC × Lorentzian × EMA 25/75/200 戦略 ｜ スクリーンショット → AI解析 → Notionに保存
        </p>
      </div>

      <div className="grid grid-cols-5 gap-6">
        {/* Left column: screenshots */}
        <div className="col-span-2 space-y-4">

          {/* Before screenshot */}
          <ScreenshotZone
            label="エントリー前スクリーンショット"
            tag="エントリー前"
            file={beforeFile}
            preview={beforePreview}
            onFile={f => setImg("before", f)}
            onClear={() => { setBeforeFile(null); setBeforePreview(null) }}
          />

          {/* After screenshot */}
          <ScreenshotZone
            label="エントリー後スクリーンショット"
            tag="エントリー後"
            file={afterFile}
            preview={afterPreview}
            onFile={f => setImg("after", f)}
            onClear={() => { setAfterFile(null); setAfterPreview(null) }}
          />

          {/* AI extract button */}
          <button
            onClick={handleExtract}
            disabled={!beforeFile || extracting}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40"
            style={{ background: extracting ? "#374151" : "linear-gradient(135deg,#3b82f6,#8b5cf6)" }}
          >
            {extracting
              ? <span className="flex items-center justify-center gap-2"><span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full inline-block" />AI解析中...</span>
              : "エントリー前画像をAI解析"}
          </button>

          {/* Strategy legend */}
          <div className="rounded-lg p-3 space-y-1.5" style={{ background: "#0d1117", border: "1px solid #1f2937" }}>
            <p className="text-xs font-semibold mb-2" style={{ color: "#6b7280" }}>戦略チェック</p>
            {[
              ["EMA配列","200上=ロング / 200下=ショート"],
              ["SMC","CHoCH or BOS確認"],
              ["OB/FVG","エントリーゾーン到達"],
              ["Lorentzian","緑=Buy / 赤=Sell"],
              ["流動性","EQH/EQL ターゲット確認"],
            ].map(([k,v]) => (
              <div key={k} className="flex justify-between text-xs">
                <span style={{ color: "#818cf8" }}>{k}</span>
                <span style={{ color: "#4b5563" }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Session times */}
          <div className="rounded-lg p-3 space-y-1.5" style={{ background: "#0d1117", border: "1px solid #1f2937" }}>
            <p className="text-xs font-semibold mb-2" style={{ color: "#6b7280" }}>セッション（JST）</p>
            {[["アジア時間","#f59e0b","8:00〜15:00"],["ロンドン時間","#3b82f6","15:00〜22:00"],["ロンドン/NY重複","#8b5cf6","22:00〜0:00"],["ニューヨーク時間","#10b981","22:00〜6:00"]].map(([s,c,t]) => (
              <div key={s} className="flex justify-between text-xs">
                <span style={{ color: c as string }}>● {s}</span>
                <span style={{ color: "#4b5563" }}>{t}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right column: form */}
        <div className="col-span-3 space-y-4">
          <div className="rounded-xl p-5 space-y-4" style={{ background: "#111827", border: "1px solid #1f2937" }}>

            <Field label="タイトル（省略可）">
              <input placeholder={`${form.currencyPair} ${form.direction || "方向"} ${form.date}`} value={form.tradeName} onChange={e => set("tradeName", e.target.value)} className="fld" />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="日付">
                <input type="date" value={form.date}
                  onChange={e => {
                    set("date", e.target.value)
                    const days: TradeForm["dayOfWeek"][] = ["","月曜","火曜","水曜","木曜","金曜",""]
                    set("dayOfWeek", days[new Date(e.target.value).getDay()] || "")
                  }} className="fld" />
              </Field>
              <Field label="曜日">
                <div className="flex gap-1 flex-wrap">
                  {DAYS.map(d => <Chip key={d} label={d} active={form.dayOfWeek === d} color="#9ca3af" onClick={() => set("dayOfWeek", form.dayOfWeek === d ? "" : d)} />)}
                </div>
              </Field>
            </div>

            <Field label="セッション">
              <div className="flex gap-2 flex-wrap">
                {SESSIONS.map(s => <Chip key={s} label={s} active={form.session === s} color={sessionColors[s]} onClick={() => set("session", form.session === s ? "" : s)} />)}
              </div>
            </Field>

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
                    >{d === "買い（ロング）" ? "▲ ロング" : "▼ ショート"}</button>
                  ))}
                </div>
              </Field>
              <Field label="時間足">
                <select value={form.timeframe} onChange={e => set("timeframe", e.target.value as TradeForm["timeframe"])} className="fld">
                  <option value="">選択...</option>
                  {TIMEFRAMES.map(t => <option key={t}>{t}</option>)}
                </select>
              </Field>
            </div>

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

            <Field label="結果">
              <div className="flex gap-2">
                {(["勝ち","負け","引き分け"] as const).map(r => (
                  <button key={r} onClick={() => set("result", form.result === r ? "" : r)}
                    className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
                    style={form.result === r
                      ? { background: r === "勝ち" ? "rgba(16,185,129,0.2)" : r === "負け" ? "rgba(239,68,68,0.2)" : "rgba(107,114,128,0.2)", color: r === "勝ち" ? "#10b981" : r === "負け" ? "#ef4444" : "#9ca3af", border: `1px solid ${r === "勝ち" ? "#10b981" : r === "負け" ? "#ef4444" : "#6b7280"}` }
                      : { background: "#1f2937", color: "#6b7280", border: "1px solid #374151" }
                    }
                  >{r}</button>
                ))}
              </div>
            </Field>

            <Field label="エントリー根拠（AIが自動入力）">
              <textarea rows={5}
                placeholder="AIが解析後に自動入力します。手動入力例：EQH上抜け後Bearish CHoCH確認。フィボ0.382（0.58606）のBearish OBに到達。200EMA下・25＜75のショートバイアス。Lorentzian赤シグナル点灯。ターゲット：下方EQL（0.57782）"
                value={form.entryBasis} onChange={e => set("entryBasis", e.target.value)} className="fld resize-none" />
            </Field>

            <Field label="分析・メモ">
              <textarea rows={2} placeholder="反省点・気づき・次回改善点..." value={form.memo} onChange={e => set("memo", e.target.value)} className="fld resize-none" />
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

            {/* Screenshot attach status */}
            <div className="flex gap-2 text-xs">
              {[["エントリー前", beforeFile], ["エントリー後", afterFile]].map(([label, file]) => (
                <div key={label as string} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                  style={{ background: file ? "rgba(99,102,241,0.1)" : "#1f2937", border: `1px solid ${file ? "rgba(99,102,241,0.3)" : "#374151"}`, color: file ? "#818cf8" : "#4b5563" }}>
                  <span>{file ? "✓" : "○"}</span>
                  <span>{label as string}スクショ</span>
                </div>
              ))}
              {(beforeFile || afterFile) && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: "#10b981" }}>
                  <span>↑ Notionに直接添付</span>
                </div>
              )}
            </div>

            {/* Save result */}
            {saveResult && (
              <div className="rounded-lg p-3 text-sm"
                style={{ background: saveResult.ok ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${saveResult.ok ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`, color: saveResult.ok ? "#10b981" : "#ef4444" }}>
                {saveResult.msg}
                {saveResult.url && <a href={saveResult.url} target="_blank" rel="noopener noreferrer" className="ml-2 underline">Notionで開く →</a>}
              </div>
            )}

            <button onClick={handleSave} disabled={saving || !form.date || !form.currencyPair}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40"
              style={{ background: saving ? "#374151" : "#6366f1" }}>
              {saving
                ? <span className="flex items-center justify-center gap-2"><span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full inline-block" />Notionに保存中...</span>
                : `Notion に保存${(beforeFile || afterFile) ? "（スクショ添付あり）" : ""}`}
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
