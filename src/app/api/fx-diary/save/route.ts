import { NextRequest, NextResponse } from "next/server"

const NOTION_API_KEY = process.env.NOTION_API_KEY
const NOTION_DATABASE_ID = "99cd29e6-29ec-47ec-8d39-35a2bce6fe7f"
const NOTION_VERSION = "2022-06-28"

async function uploadImageToNotion(buffer: Uint8Array, filename: string, contentType: string): Promise<string | null> {
  try {
    // Step 1: create upload session
    const createRes = await fetch("https://api.notion.com/v1/file-uploads", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${NOTION_API_KEY}`,
        "Content-Type": "application/json",
        "Notion-Version": NOTION_VERSION,
      },
      body: JSON.stringify({ filename, content_type: contentType }),
    })
    if (!createRes.ok) return null
    const { id, upload_url } = await createRes.json()

    // Step 2: upload binary
    const form = new FormData()
    form.append("file", new Blob([buffer.buffer as ArrayBuffer], { type: contentType }), filename)
    const uploadRes = await fetch(upload_url, {
      method: "POST",
      headers: { Authorization: `Bearer ${NOTION_API_KEY}` },
      body: form,
    })
    return uploadRes.ok ? id : null
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  if (!NOTION_API_KEY) {
    return NextResponse.json(
      { success: false, error: "NOTION_API_KEY が .env.local に設定されていません" },
      { status: 500 }
    )
  }

  // Accept multipart (with images) or JSON
  const contentType = req.headers.get("content-type") || ""
  let b: Record<string, unknown>
  let imageBefore: File | null = null
  let imageAfter: File | null = null

  if (contentType.includes("multipart/form-data")) {
    const fd = await req.formData()
    b = JSON.parse(fd.get("data") as string)
    imageBefore = fd.get("image_before") as File | null
    imageAfter = fd.get("image_after") as File | null
  } else {
    b = await req.json()
  }

  // Upload images if present
  const fileIds: string[] = []
  for (const [img, label] of [[imageBefore, "entry_before"], [imageAfter, "entry_after"]] as [File | null, string][]) {
    if (!img) continue
    const buf = await img.arrayBuffer()
    const id = await uploadImageToNotion(Buffer.from(buf), `${label}_${Date.now()}.png`, img.type || "image/png")
    if (id) fileIds.push(id)
  }

  const title = (b.tradeName as string) || `${b.currencyPair} ${b.direction} ${b.date}`

  const props: Record<string, unknown> = {
    "トレード": { title: [{ text: { content: title } }] },
    "日付": b.date ? { date: { start: b.date } } : undefined,
    "通貨ペア": b.currencyPair ? { select: { name: b.currencyPair } } : undefined,
    "方向": b.direction ? { select: { name: b.direction } } : undefined,
    "セッション": b.session ? { select: { name: b.session } } : undefined,
    "曜日": b.dayOfWeek ? { select: { name: b.dayOfWeek } } : undefined,
    "時間足": b.timeframe ? { select: { name: b.timeframe } } : undefined,
    "ロット数": b.lot != null ? { number: b.lot } : undefined,
    "エントリー価格": b.entryPrice != null ? { number: b.entryPrice } : undefined,
    "決済価格": b.exitPrice != null ? { number: b.exitPrice } : undefined,
    "損切り幅_pips": b.stopLossPips != null ? { number: b.stopLossPips } : undefined,
    "損益_pips": b.pnlPips != null ? { number: b.pnlPips } : undefined,
    "損益_円": b.pnlJpy != null ? { number: b.pnlJpy } : undefined,
    "結果": b.result ? { select: { name: b.result } } : undefined,
    "エントリー根拠": b.entryBasis ? { rich_text: [{ text: { content: b.entryBasis as string } }] } : undefined,
    "分析・メモ": b.memo ? { rich_text: [{ text: { content: b.memo as string } }] } : undefined,
    "更新日": { date: { start: new Date().toISOString().slice(0, 10) } },
    ...(fileIds.length > 0 ? {
      "スクリーンショット": {
        files: fileIds.map(id => ({ name: "screenshot.png", type: "file_upload", file_upload: { id } }))
      }
    } : {}),
  }

  const cleanProps = Object.fromEntries(Object.entries(props).filter(([, v]) => v !== undefined))

  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${NOTION_API_KEY}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_VERSION,
    },
    body: JSON.stringify({ parent: { database_id: NOTION_DATABASE_ID }, properties: cleanProps }),
  })

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ success: false, error: err }, { status: res.status })
  }

  const data = await res.json()
  return NextResponse.json({ success: true, url: data.url, attachedImages: fileIds.length })
}
