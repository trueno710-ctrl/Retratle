import { NextResponse } from "next/server"
import { getStockPrice, getTopMovers, getStockInfo } from "@/lib/jquants"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const ticker = searchParams.get("ticker")
  const action = searchParams.get("action") || "price"

  try {
    if (action === "movers") {
      const threshold = Number(searchParams.get("threshold") || "3")
      const movers = await getTopMovers(threshold)
      return NextResponse.json({ success: true, data: movers })
    }

    if (action === "info" && ticker) {
      const info = await getStockInfo(ticker)
      return NextResponse.json({ success: true, data: info })
    }

    if (ticker) {
      const price = await getStockPrice(ticker)
      return NextResponse.json({ success: true, data: price })
    }

    return NextResponse.json({ success: false, error: "ticker or action required" }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
