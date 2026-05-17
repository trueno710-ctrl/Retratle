import axios from "axios"

const BASE_URL = "https://api.jquants.com/v1"

export interface StockPrice {
  ticker: string
  name: string
  price: number
  change: number
  changePercent: number
  volume: number
  high: number
  low: number
  open: number
  date: string
}

export interface StockInfo {
  ticker: string
  name: string
  sector: string
  marketCap: number
  per: number
  pbr: number
  dividendYield: number
  eps: number
  bps: number
}

let idToken: string | null = null

async function getIdToken(): Promise<string> {
  if (idToken) return idToken

  const refreshToken = process.env.JQUANTS_REFRESH_TOKEN
  if (!refreshToken) throw new Error("JQUANTS_REFRESH_TOKEN not set")

  const res = await axios.post(`${BASE_URL}/token/auth_refresh`, {}, {
    params: { refreshtoken: refreshToken },
  })
  idToken = res.data.idToken
  return idToken!
}

async function apiGet<T>(path: string, params?: Record<string, string>): Promise<T> {
  const token = await getIdToken()
  const res = await axios.get(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    params,
  })
  return res.data as T
}

export async function getStockPrice(ticker: string): Promise<StockPrice | null> {
  try {
    const data = await apiGet<{ daily_quotes: Array<Record<string, unknown>> }>("/prices/daily_quotes", {
      code: ticker,
    })
    const quote = data.daily_quotes?.[0]
    if (!quote) return null

    const close = Number(quote.Close)
    const open = Number(quote.Open)
    const change = close - open
    return {
      ticker,
      name: String(quote.CompanyName || ticker),
      price: close,
      change,
      changePercent: (change / open) * 100,
      volume: Number(quote.Volume),
      high: Number(quote.High),
      low: Number(quote.Low),
      open,
      date: String(quote.Date),
    }
  } catch {
    return null
  }
}

export async function getTopMovers(threshold = 3): Promise<StockPrice[]> {
  try {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "")
    const data = await apiGet<{ daily_quotes: Array<Record<string, unknown>> }>("/prices/daily_quotes", {
      date: today,
    })

    return (data.daily_quotes || [])
      .map((q) => {
        const close = Number(q.Close)
        const open = Number(q.Open)
        const change = close - open
        return {
          ticker: String(q.Code),
          name: String(q.CompanyName || q.Code),
          price: close,
          change,
          changePercent: (change / open) * 100,
          volume: Number(q.Volume),
          high: Number(q.High),
          low: Number(q.Low),
          open,
          date: String(q.Date),
        }
      })
      .filter((s) => Math.abs(s.changePercent) >= threshold)
      .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
      .slice(0, 20)
  } catch {
    return getMockMovers(threshold)
  }
}

export async function getStockInfo(ticker: string): Promise<StockInfo | null> {
  try {
    const data = await apiGet<{ info: Array<Record<string, unknown>> }>("/listed/info", { code: ticker })
    const info = data.info?.[0]
    if (!info) return null
    return {
      ticker,
      name: String(info.CompanyName),
      sector: String(info.Sector17CodeName || info.Sector33CodeName || ""),
      marketCap: Number(info.MarketCapitalization || 0),
      per: Number(info.PER || 0),
      pbr: Number(info.PBR || 0),
      dividendYield: Number(info.DividendYield || 0),
      eps: Number(info.EPS || 0),
      bps: Number(info.BPS || 0),
    }
  } catch {
    return null
  }
}

function getMockMovers(threshold: number): StockPrice[] {
  const mockData: StockPrice[] = [
    { ticker: "6758", name: "ソニーグループ", price: 14250, change: 580, changePercent: 4.24, volume: 8500000, high: 14350, low: 13820, open: 13670, date: new Date().toISOString().slice(0, 10) },
    { ticker: "9984", name: "ソフトバンクグループ", price: 8920, change: -380, changePercent: -4.09, volume: 12000000, high: 9050, low: 8880, open: 9300, date: new Date().toISOString().slice(0, 10) },
    { ticker: "4568", name: "第一三共", price: 5840, change: 245, changePercent: 4.38, volume: 5200000, high: 5890, low: 5610, open: 5595, date: new Date().toISOString().slice(0, 10) },
    { ticker: "6367", name: "ダイキン工業", price: 22100, change: -890, changePercent: -3.87, volume: 980000, high: 22450, low: 21950, open: 22990, date: new Date().toISOString().slice(0, 10) },
    { ticker: "8035", name: "東京エレクトロン", price: 36800, change: 1650, changePercent: 4.70, volume: 3100000, high: 37200, low: 35800, open: 35150, date: new Date().toISOString().slice(0, 10) },
    { ticker: "4307", name: "野村総合研究所", price: 3980, change: 155, changePercent: 4.05, volume: 2800000, high: 4010, low: 3840, open: 3825, date: new Date().toISOString().slice(0, 10) },
  ]
  return mockData.filter((s) => Math.abs(s.changePercent) >= threshold)
}

export function getMockTenbaggerCandidates(): Array<StockInfo & { growthRate: number }> {
  return [
    { ticker: "4385", name: "メルカリ", sector: "IT・サービス", marketCap: 850000, per: 45.2, pbr: 8.1, dividendYield: 0, eps: 88, bps: 490, growthRate: 28.5 },
    { ticker: "3659", name: "넥슨", sector: "ゲーム", marketCap: 1200000, per: 22.1, pbr: 3.2, dividendYield: 0.8, eps: 180, bps: 1250, growthRate: 18.2 },
    { ticker: "4661", name: "オリエンタルランド", sector: "レジャー", marketCap: 3500000, per: 80.5, pbr: 12.3, dividendYield: 0.2, eps: 55, bps: 360, growthRate: 22.0 },
    { ticker: "6098", name: "リクルートホールディングス", sector: "人材・IT", marketCap: 8200000, per: 38.7, pbr: 6.5, dividendYield: 1.1, eps: 155, bps: 920, growthRate: 15.8 },
    { ticker: "4478", name: "フリー", sector: "SaaS", marketCap: 280000, per: -1, pbr: 12.8, dividendYield: 0, eps: -45, bps: 320, growthRate: 42.1 },
    { ticker: "3697", name: "SHIFT", sector: "IT品質", marketCap: 180000, per: 68.4, pbr: 18.2, dividendYield: 0, eps: 220, bps: 580, growthRate: 35.6 },
  ]
}
