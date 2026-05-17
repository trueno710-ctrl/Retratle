import { NextResponse } from "next/server"
import { checkPostCompliance } from "@/lib/claude"
import { updateItem } from "@/lib/approvalStore"

export async function POST(req: Request) {
  const { id, caption, productName, platforms } = await req.json() as {
    id: string
    caption: string
    productName: string
    platforms: string[]
  }

  const report = await checkPostCompliance(caption, productName, platforms)
  if (!report) return NextResponse.json({ error: "コンプライアンスチェック失敗" }, { status: 500 })

  const compliance = { ...report, checkedAt: new Date().toISOString() }

  if (id) {
    updateItem(id, { compliance, status: "awaiting_approval" })
  }

  return NextResponse.json({ compliance })
}
