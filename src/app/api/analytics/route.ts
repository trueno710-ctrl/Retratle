import { NextResponse } from "next/server"
import { analyzeAffiliateSales } from "@/lib/claude"

// 週次モックデータ（直近8週）
const weeklyData = [
  { label: "3/24週", revenue: 24800, clicks: 8200,  conversions: 246 },
  { label: "3/31週", revenue: 28400, clicks: 9100,  conversions: 289 },
  { label: "4/7週",  revenue: 31200, clicks: 10400, conversions: 318 },
  { label: "4/14週", revenue: 27600, clicks: 9800,  conversions: 276 },
  { label: "4/21週", revenue: 34100, clicks: 11200, conversions: 362 },
  { label: "4/28週", revenue: 38900, clicks: 12800, conversions: 401 },
  { label: "5/5週",  revenue: 36200, clicks: 12100, conversions: 385 },
  { label: "5/12週", revenue: 41800, clicks: 13600, conversions: 445 },
]

// 月次モックデータ（直近12ヶ月）
const monthlyData = [
  { label: "2025/6",  revenue: 68400,  clicks: 22800, conversions: 684  },
  { label: "2025/7",  revenue: 89200,  clicks: 29700, conversions: 892  },
  { label: "2025/8",  revenue: 94100,  clicks: 31400, conversions: 941  },
  { label: "2025/9",  revenue: 76300,  clicks: 25400, conversions: 763  },
  { label: "2025/10", revenue: 82100,  clicks: 27400, conversions: 821  },
  { label: "2025/11", revenue: 108400, clicks: 36100, conversions: 1084 },
  { label: "2025/12", revenue: 142600, clicks: 47500, conversions: 1426 },
  { label: "2026/1",  revenue: 76400,  clicks: 25500, conversions: 764  },
  { label: "2026/2",  revenue: 94100,  clicks: 31400, conversions: 941  },
  { label: "2026/3",  revenue: 108300, clicks: 36100, conversions: 1083 },
  { label: "2026/4",  revenue: 115600, clicks: 38500, conversions: 1156 },
  { label: "2026/5",  revenue: 127450, clicks: 42500, conversions: 1274 },
]

// 年次モックデータ（直近3年）
const yearlyData = [
  { label: "2024年", revenue: 820000,  clicks: 273000, conversions: 8200  },
  { label: "2025年", revenue: 1148000, clicks: 382700, conversions: 11480 },
  { label: "2026年", revenue: 621850,  clicks: 207300, conversions: 6218  },
]

const topProducts = [
  { name: "Anker PowerCore 10000",   revenue: 18700,  cvr: 3.9, trend: "+8.2%"  },
  { name: "ニトリ 低反発枕",         revenue: 14280,  cvr: 4.3, trend: "+5.1%"  },
  { name: "ふるさと納税 A5黒毛和牛", revenue: 12780,  cvr: 2.7, trend: "+22.4%" },
  { name: "資生堂 エリクシール",      revenue: 10720,  cvr: 4.5, trend: "-2.1%"  },
  { name: "コカ・コーラ 48本",        revenue: 9440,   cvr: 1.9, trend: "+3.8%"  },
]

const categoryBreakdown = [
  { category: "家電・PC",     share: 34, growth: "+18.2%" },
  { category: "食品・グルメ", share: 22, growth: "+31.4%" },
  { category: "美容・コスメ", share: 18, growth: "+8.7%"  },
  { category: "インテリア",   share: 14, growth: "+12.1%" },
  { category: "ファッション", share: 8,  growth: "+3.2%"  },
  { category: "その他",       share: 4,  growth: "-1.4%"  },
]

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const period = (searchParams.get("period") ?? "monthly") as "weekly" | "monthly" | "yearly"
  const data = period === "weekly" ? weeklyData : period === "yearly" ? yearlyData : monthlyData
  return NextResponse.json({ data, topProducts, categoryBreakdown })
}

export async function POST(req: Request) {
  const { period } = await req.json() as { period: "weekly" | "monthly" | "yearly" }
  const data = period === "weekly" ? weeklyData : period === "yearly" ? yearlyData : monthlyData
  const analysis = await analyzeAffiliateSales(period, data, topProducts, categoryBreakdown)
  if (!analysis) return NextResponse.json({ error: "分析失敗" }, { status: 500 })
  return NextResponse.json({ analysis })
}
