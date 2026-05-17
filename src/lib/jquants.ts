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

// shikiho_10スタイルの完全な銘柄情報
export interface ShikihoStockInfo {
  ticker: string
  name: string
  sector: string
  marketCapBillion: number  // 時価総額（億円）
  per: number               // PER倍
  pbr: number               // PBR倍
  psr: number               // PSR（時価総額/売上高）
  roe: number               // ROE%（予）
  roa: number               // ROA%（予）
  equityRatio: number       // 自己資本比率%
  dividendYield: number     // 配当利回り%
  mixCoefficient: number    // ミックス係数（PER×PBR）
  hasZeroDebt: boolean      // 有利子負債ゼロか
  eps: number               // EPS円
  bps: number               // BPS円
  growthRate: number        // 売上成長率%
  consecutiveDividendGrowth: number  // 連続増配年数
  themes: string[]          // 国策テーマ
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

export function getMockMovers(threshold: number): StockPrice[] {
  const today = new Date().toISOString().slice(0, 10)
  const mockData: StockPrice[] = [
    { ticker: "8035", name: "東京エレクトロン", price: 36800, change: 1650, changePercent: 4.70, volume: 3100000, high: 37200, low: 35800, open: 35150, date: today },
    { ticker: "4568", name: "第一三共", price: 5840, change: 245, changePercent: 4.38, volume: 5200000, high: 5890, low: 5610, open: 5595, date: today },
    { ticker: "6758", name: "ソニーグループ", price: 14250, change: 580, changePercent: 4.24, volume: 8500000, high: 14350, low: 13820, open: 13670, date: today },
    { ticker: "4307", name: "野村総合研究所", price: 3980, change: 155, changePercent: 4.05, volume: 2800000, high: 4010, low: 3840, open: 3825, date: today },
    { ticker: "9984", name: "ソフトバンクグループ", price: 8920, change: -380, changePercent: -4.09, volume: 12000000, high: 9050, low: 8880, open: 9300, date: today },
    { ticker: "6367", name: "ダイキン工業", price: 22100, change: -890, changePercent: -3.87, volume: 980000, high: 22450, low: 21950, open: 22990, date: today },
    { ticker: "6140", name: "旭ダイヤモンド工業", price: 852, change: 48, changePercent: 5.97, volume: 1250000, high: 875, low: 810, open: 804, date: today },
    { ticker: "3655", name: "ブレインパッド", price: 1845, change: -88, changePercent: -4.55, volume: 890000, high: 1890, low: 1820, open: 1933, date: today },
  ]
  return mockData.filter((s) => Math.abs(s.changePercent) >= threshold)
}

// shikiho_10スタイルのテンバガー候補（2026年国策テーマ銘柄中心）
export function getMockTenbaggerCandidates(): ShikihoStockInfo[] {
  return [
    {
      ticker: "6140",
      name: "旭ダイヤモンド工業",
      sector: "精密工具・次世代半導体素材",
      marketCapBillion: 437,
      per: 11.53,
      pbr: 0.69,
      psr: 0.62,
      roe: 4.6,
      roa: 3.9,
      equityRatio: 84.2,
      dividendYield: 4.26,
      mixCoefficient: 7.96,
      hasZeroDebt: true,
      eps: 74,
      bps: 1234,
      growthRate: 12.5,
      consecutiveDividendGrowth: 3,
      themes: ["合成ダイヤモンド関連", "次世代半導体関連", "グローバルニッチ"],
    },
    {
      ticker: "4125",
      name: "三和油化工業",
      sector: "化学・廃棄物処理",
      marketCapBillion: 85,
      per: 8.52,
      pbr: 0.67,
      psr: 0.53,
      roe: 6.1,
      roa: 3.7,
      equityRatio: 60.0,
      dividendYield: 2.17,
      mixCoefficient: 5.71,
      hasZeroDebt: false,
      eps: 232,
      bps: 2950,
      growthRate: 8.2,
      consecutiveDividendGrowth: 2,
      themes: ["レアメタル関連", "産業廃棄物関連", "半導体関連", "割安成長株"],
    },
    {
      ticker: "4320",
      name: "CEホールディングス",
      sector: "医療IT・DX",
      marketCapBillion: 102,
      per: 8.55,
      pbr: 1.63,
      psr: 0.89,
      roe: 13.5,
      roa: 7.3,
      equityRatio: 54.2,
      dividendYield: 3.33,
      mixCoefficient: 13.94,
      hasZeroDebt: false,
      eps: 117,
      bps: 615,
      growthRate: 18.4,
      consecutiveDividendGrowth: 4,
      themes: ["医療DX関連", "電子カルテ関連", "上方修正狙い", "割安成長株"],
    },
    {
      ticker: "3655",
      name: "ブレインパッド",
      sector: "AIデータ分析",
      marketCapBillion: 247,
      per: 21.61,
      pbr: 3.90,
      psr: 1.42,
      roe: 18.1,
      roa: 14.0,
      equityRatio: 77.5,
      dividendYield: 0.72,
      mixCoefficient: 84.28,
      hasZeroDebt: true,
      eps: 85,
      bps: 472,
      growthRate: 22.3,
      consecutiveDividendGrowth: 5,
      themes: ["AI関連", "ビッグデータ関連", "医療データ分析", "フィジカルAI"],
    },
    {
      ticker: "5821",
      name: "平河ヒューテック",
      sector: "電線・通信ケーブル",
      marketCapBillion: 488,
      per: 12.43,
      pbr: 1.00,
      psr: 0.71,
      roe: 7.0,
      roa: 5.2,
      equityRatio: 74.4,
      dividendYield: 1.69,
      mixCoefficient: 12.43,
      hasZeroDebt: true,
      eps: 223,
      bps: 2771,
      growthRate: 9.8,
      consecutiveDividendGrowth: 3,
      themes: ["5G・6G関連", "データセンター関連", "医療機器関連", "ペロブスカイト太陽電池"],
    },
    {
      ticker: "7456",
      name: "松田産業",
      sector: "貴金属リサイクル・都市鉱山",
      marketCapBillion: 1415,
      per: 11.82,
      pbr: 1.32,
      psr: 0.48,
      roe: 11.2,
      roa: 6.3,
      equityRatio: 56.0,
      dividendYield: 1.9,
      mixCoefficient: 15.60,
      hasZeroDebt: false,
      eps: 445,
      bps: 3985,
      growthRate: 14.2,
      consecutiveDividendGrowth: 6,
      themes: ["貴金属リサイクル", "都市鉱山関連", "レアメタル関連", "半導体・電子材料"],
    },
    {
      ticker: "6584",
      name: "三桜工業",
      sector: "自動車部品・冷却システム",
      marketCapBillion: 358,
      per: 8.24,
      pbr: 0.77,
      psr: 0.41,
      roe: 9.4,
      roa: 3.8,
      equityRatio: 40.2,
      dividendYield: 2.89,
      mixCoefficient: 6.34,
      hasZeroDebt: false,
      eps: 321,
      bps: 2649,
      growthRate: 11.5,
      consecutiveDividendGrowth: 3,
      themes: ["データセンター冷却関連", "自動車関連", "インド関連", "割安成長株"],
    },
    {
      ticker: "4078",
      name: "堺化学工業",
      sector: "電子材料・化学",
      marketCapBillion: 485,
      per: 10.77,
      pbr: 0.62,
      psr: 0.58,
      roe: 5.8,
      roa: 3.4,
      equityRatio: 59.3,
      dividendYield: 4.37,
      mixCoefficient: 6.68,
      hasZeroDebt: false,
      eps: 185,
      bps: 2984,
      growthRate: 7.8,
      consecutiveDividendGrowth: 4,
      themes: ["MLCC電子材料関連", "高配当株", "ニッチトップ", "増収増益"],
    },
  ]
}
