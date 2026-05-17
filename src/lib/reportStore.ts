import fs from "fs"
import path from "path"

const REPORTS_FILE = path.join(process.cwd(), "data", "daily-reports.json")
const MAX_REPORTS = 60  // 最大60日分保持

export interface StockPick {
  ticker: string
  name: string
  marketCapBillion: number
  per: number
  pbr: number
  mixCoefficient: number
  equityRatio: number
  dividendYield: number
  hasZeroDebt: boolean
  themes: string[]
  reason: string
  confidence: "高" | "中" | "低"
  catalysts: string[]
  tenbaggerScore: number
  sourceMinistry: string
  sourcePostId: string
}

export interface MinistryPostResult {
  ministry: string
  handle: string
  sector: string
  color: string
  postId: string
  postText: string
  postedAt: string
  likes: number
  retweets: number
  picks: StockPick[]
}

export interface DailyReport {
  id: string
  date: string          // YYYY-MM-DD
  generatedAt: string   // ISO timestamp
  ministryPosts: MinistryPostResult[]
  allPicks: StockPick[] // 重複除去済み全推薦銘柄
  topPicks: StockPick[] // 上位5銘柄（confidence高・score順）
  daySummary: string    // AI生成の一日総括
  xPostText: string     // X投稿用テキスト（280字以内）
  totalPostsAnalyzed: number
  totalMinistries: number
  postedToX: boolean
  postedAt?: string
}

function ensureDataDir() {
  const dir = path.dirname(REPORTS_FILE)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

export function loadReports(): DailyReport[] {
  ensureDataDir()
  if (!fs.existsSync(REPORTS_FILE)) return []
  try {
    const raw = fs.readFileSync(REPORTS_FILE, "utf-8")
    return JSON.parse(raw) as DailyReport[]
  } catch {
    return []
  }
}

export function saveReport(report: DailyReport): void {
  ensureDataDir()
  const reports = loadReports()

  // 同日のレポートがあれば上書き
  const idx = reports.findIndex(r => r.date === report.date)
  if (idx >= 0) {
    reports[idx] = report
  } else {
    reports.unshift(report)
  }

  // 最大件数を超えた古いものを削除
  const trimmed = reports
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, MAX_REPORTS)

  fs.writeFileSync(REPORTS_FILE, JSON.stringify(trimmed, null, 2), "utf-8")
}

export function getReportByDate(date: string): DailyReport | null {
  const reports = loadReports()
  return reports.find(r => r.date === date) || null
}

export function markPostedToX(date: string): void {
  const reports = loadReports()
  const idx = reports.findIndex(r => r.date === date)
  if (idx >= 0) {
    reports[idx].postedToX = true
    reports[idx].postedAt = new Date().toISOString()
    fs.writeFileSync(REPORTS_FILE, JSON.stringify(reports, null, 2), "utf-8")
  }
}
