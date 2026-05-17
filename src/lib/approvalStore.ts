/**
 * 承認キューの共有インメモリストア。
 * 本番環境では DB（PostgreSQL/Supabase 等）に置き換えること。
 */

export type Platform = "instagram" | "threads" | "x"
export type ApprovalStatus = "pending" | "compliance_checking" | "awaiting_approval" | "approved" | "rejected" | "posted"

export interface ComplianceIssue {
  severity: "error" | "warning" | "info"
  law: string
  description: string
  suggestion: string
}

export interface ComplianceResult {
  passed: boolean
  complianceScore: number
  prDisclosure: { present: boolean; suggested: string }
  issues: ComplianceIssue[]
  revisedCaption: string
  checkedAt: string
}

export interface ScheduleRecommendation {
  frequency: string
  nextSlots: Array<{ time: string; platforms: Platform[]; reasoning: string }>
  weeklyPlan: string
}

export interface PostResult {
  platform: Platform
  success: boolean
  postId?: string
  error?: string
}

export interface ApprovalItem {
  id: string
  createdAt: string
  source: "cm-studio" | "trend-post" | "manual"
  product: string
  trend: string
  caption: string
  imageUrl?: string
  videoUrl?: string
  platforms: Platform[]
  compliance?: ComplianceResult
  schedule?: ScheduleRecommendation
  status: ApprovalStatus
  approvedAt?: string
  postedAt?: string
  rejectionReason?: string
  postResults?: PostResult[]
}

// モジュールレベルのストア（サーバープロセス内で共有）
const store = new Map<string, ApprovalItem>()

// デモ用の初期データ
const seed: ApprovalItem[] = [
  {
    id: "demo-1",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    source: "trend-post",
    product: "ダイソン V15 Detect",
    trend: "#楽天スーパーSALE",
    caption: "楽天スーパーSALE開催中！ダイソンV15が今なら1.5万円引き✨ 吸引力はそのままに、軽量化で毎日の掃除がラクになります。レビュー4.8★で満足度も高い🏠 https://hb.afl.rakuten.co.jp/xxx #楽天スーパーSALE #家電 #掃除機",
    imageUrl: "https://placehold.co/1080x1080/1a1a2e/3b82f6?text=Dyson+V15",
    platforms: ["x", "instagram", "threads"],
    status: "awaiting_approval",
    compliance: {
      passed: false,
      complianceScore: 62,
      prDisclosure: { present: false, suggested: "#PR または「広告」の表記が必要です" },
      issues: [
        { severity: "error", law: "景品表示法", description: "PR/広告表記がありません", suggestion: "「#PR」または「広告：」を投稿冒頭に追加してください" },
        { severity: "warning", law: "アフィリエイト規約", description: "アフィリエイトリンクであることが不明瞭", suggestion: "「楽天アフィリエイト」または「広告リンク」と明示してください" },
      ],
      revisedCaption: "【広告】楽天スーパーSALE開催中！ダイソンV15が今なら1.5万円引き✨ 吸引力はそのままに、軽量化で毎日の掃除がラクになります。レビュー4.8★で満足度も高い🏠 https://hb.afl.rakuten.co.jp/xxx #楽天スーパーSALE #家電 #掃除機 #PR",
      checkedAt: new Date(Date.now() - 3000000).toISOString(),
    },
    schedule: {
      frequency: "1日2投稿",
      nextSlots: [
        { time: "2026/05/17 07:00", platforms: ["x","threads"], reasoning: "朝のスクロールタイムにSALE情報は閲覧率が高い" },
        { time: "2026/05/17 12:00", platforms: ["instagram"], reasoning: "昼休みのInstagramチェックに合わせる" },
      ],
      weeklyPlan: "月・水・金の朝7時とInstagram昼12時に投稿",
    },
  },
  {
    id: "demo-2",
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    source: "cm-studio",
    product: "資生堂 エリクシール",
    trend: "#夏コスメ2026",
    caption: "夏に向けてスキンケアを見直すなら今！資生堂エリクシールの化粧水が楽天でポイント10倍中🌸 毎年完売する人気商品なので早めにチェックを https://hb.afl.rakuten.co.jp/xxx #夏コスメ2026 #スキンケア",
    imageUrl: "https://placehold.co/1080x1080/1a1a2e/ec4899?text=Elixir",
    platforms: ["instagram", "threads"],
    status: "awaiting_approval",
    compliance: {
      passed: true,
      complianceScore: 88,
      prDisclosure: { present: false, suggested: "#PR の追記を推奨します" },
      issues: [
        { severity: "warning", law: "景品表示法", description: "「ポイント10倍」の根拠が不明確", suggestion: "楽天のポイント倍率は変動するため「ポイント還元あり（詳細はリンク先で確認）」とする方が安全" },
        { severity: "info", law: "アフィリエイト規約", description: "#PR 表記を追記することを推奨", suggestion: "任意ですが透明性向上のため #PR を追加することを推奨します" },
      ],
      revisedCaption: "夏に向けてスキンケアを見直すなら今！資生堂エリクシールの化粧水が楽天でポイント還元中🌸 毎年完売する人気商品なので早めにチェックを https://hb.afl.rakuten.co.jp/xxx #夏コスメ2026 #スキンケア #PR",
      checkedAt: new Date(Date.now() - 1200000).toISOString(),
    },
    schedule: {
      frequency: "1日2投稿",
      nextSlots: [
        { time: "2026/05/17 19:00", platforms: ["instagram"], reasoning: "夜のInstagramは美容コンテンツの閲覧が最も多い時間帯" },
        { time: "2026/05/17 22:00", platforms: ["threads"], reasoning: "Threadsはナイトタイムの拡散率が高い" },
      ],
      weeklyPlan: "火・木・土の夜19〜22時に美容系コンテンツを投稿",
    },
  },
]
seed.forEach(item => store.set(item.id, item))

export function getAllItems(): ApprovalItem[] {
  return Array.from(store.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

export function getItem(id: string): ApprovalItem | undefined {
  return store.get(id)
}

export function upsertItem(item: ApprovalItem): ApprovalItem {
  store.set(item.id, item)
  return item
}

export function updateItem(id: string, patch: Partial<ApprovalItem>): ApprovalItem | null {
  const existing = store.get(id)
  if (!existing) return null
  const updated = { ...existing, ...patch }
  store.set(id, updated)
  return updated
}

export function getPendingCount(): number {
  return Array.from(store.values()).filter(i => i.status === "awaiting_approval").length
}
