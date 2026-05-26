"use client";

import { useState } from "react";

const kpiCards = [
  {
    label: "今月の収益",
    value: "¥127,450",
    sub: "前月比 +18.3%",
    positive: true,
    color: "#10b981",
    icon: "💰",
  },
  {
    label: "クリック数",
    value: "48,320",
    sub: "前月比 +12.1%",
    positive: true,
    color: "#3b82f6",
    icon: "👆",
  },
  {
    label: "コンバージョン率",
    value: "3.2%",
    sub: "前月比 +0.4pt",
    positive: true,
    color: "#8b5cf6",
    icon: "🎯",
  },
  {
    label: "アクティブ商品数",
    value: "84",
    sub: "新規 +12",
    positive: true,
    color: "#f59e0b",
    icon: "🛍",
  },
];

const monthlyRevenue = [
  { month: "12月", revenue: 89200 },
  { month: "1月", revenue: 76400 },
  { month: "2月", revenue: 94100 },
  { month: "3月", revenue: 108300 },
  { month: "4月", revenue: 115600 },
  { month: "5月", revenue: 127450 },
];

const topProducts = [
  {
    id: 1,
    name: "Anker PowerCore 10000",
    category: "家電・PC",
    clicks: 4820,
    conversions: 187,
    cvr: 3.9,
    revenue: 18700,
    commission: 3.0,
    trend: "+8.2%",
    positive: true,
  },
  {
    id: 2,
    name: "ニトリ 低反発枕",
    category: "インテリア",
    clicks: 3940,
    conversions: 168,
    cvr: 4.3,
    revenue: 14280,
    commission: 2.5,
    trend: "+5.1%",
    positive: true,
  },
  {
    id: 3,
    name: "ふるさと納税 A5黒毛和牛",
    category: "食品・グルメ",
    clicks: 5200,
    conversions: 142,
    cvr: 2.7,
    revenue: 12780,
    commission: 1.0,
    trend: "+22.4%",
    positive: true,
  },
  {
    id: 4,
    name: "資生堂 エリクシール化粧水",
    category: "美容・コスメ",
    clicks: 2980,
    conversions: 134,
    cvr: 4.5,
    revenue: 10720,
    commission: 3.5,
    trend: "-2.1%",
    positive: false,
  },
  {
    id: 5,
    name: "コカ・コーラ 500ml 48本",
    category: "食品・飲料",
    clicks: 6100,
    conversions: 118,
    cvr: 1.9,
    revenue: 9440,
    commission: 1.5,
    trend: "+3.8%",
    positive: true,
  },
];

const campaigns = [
  {
    name: "楽天スーパーSALE特集",
    status: "active",
    startDate: "2026/05/15",
    endDate: "2026/05/21",
    products: 28,
    clicks: 18400,
    revenue: 42300,
    budget: 50000,
  },
  {
    name: "母の日ギフト特集",
    status: "active",
    startDate: "2026/05/01",
    endDate: "2026/05/19",
    products: 15,
    clicks: 9200,
    revenue: 21400,
    budget: 30000,
  },
  {
    name: "初夏の家電セール",
    status: "scheduled",
    startDate: "2026/05/25",
    endDate: "2026/06/05",
    products: 20,
    clicks: 0,
    revenue: 0,
    budget: 40000,
  },
  {
    name: "春のコスメ特集",
    status: "ended",
    startDate: "2026/04/01",
    endDate: "2026/04/30",
    products: 18,
    clicks: 22100,
    revenue: 38900,
    budget: 35000,
  },
];

const aiRecommendations = [
  {
    name: "ダイソン V15 掃除機",
    category: "家電",
    expectedRevenue: 28000,
    competitionScore: 72,
    demandScore: 91,
    reason: "楽天スーパーSALE期間中に掃除機カテゴリの検索が急増。高単価かつコミッション率3%で高収益が見込まれる。",
    commission: "3.0%",
    price: "¥89,000",
  },
  {
    name: "ふるさと納税 カニ 2kg",
    category: "食品",
    expectedRevenue: 19500,
    competitionScore: 58,
    demandScore: 88,
    reason: "ふるさと納税の年間上限額を使い切ろうとするユーザーが5月末に急増するパターンを検知。",
    commission: "1.0%",
    price: "¥39,000",
  },
  {
    name: "iPad Air M2",
    category: "PC・タブレット",
    expectedRevenue: 15200,
    competitionScore: 84,
    demandScore: 79,
    reason: "新学期・在宅ワーク需要が継続。楽天ポイント還元との組み合わせでコンバージョン率が高い傾向。",
    commission: "2.0%",
    price: "¥95,800",
  },
];

const goals = [
  { label: "月間収益目標", current: 127450, target: 150000, unit: "¥" },
  { label: "月間クリック目標", current: 48320, target: 60000, unit: "" },
  { label: "アクティブ商品数", current: 84, target: 100, unit: "" },
  { label: "平均CVR目標", current: 3.2, target: 4.0, unit: "%" },
];

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: "rgba(16,185,129,0.15)", text: "#10b981", label: "実施中" },
  scheduled: { bg: "rgba(59,130,246,0.15)", text: "#3b82f6", label: "予定" },
  ended: { bg: "rgba(107,114,128,0.15)", text: "#6b7280", label: "終了" },
};

function ProgressBar({ current, target }: { current: number; target: number }) {
  const pct = Math.min(100, Math.round((current / target) * 100));
  const color = pct >= 90 ? "#10b981" : pct >= 70 ? "#3b82f6" : "#f59e0b";
  return (
    <div>
      <div className="flex justify-between text-xs mb-1" style={{ color: "#9ca3af" }}>
        <span>{pct}% 達成</span>
        <span>残り {Math.round(((target - current) / target) * 100)}%</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: "#1f2937" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function RevenueChart() {
  const max = Math.max(...monthlyRevenue.map((d) => d.revenue));
  return (
    <div className="flex items-end gap-3 h-28">
      {monthlyRevenue.map((d, i) => {
        const h = Math.round((d.revenue / max) * 100);
        const isLatest = i === monthlyRevenue.length - 1;
        return (
          <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-xs font-mono" style={{ color: isLatest ? "#10b981" : "#6b7280" }}>
              ¥{(d.revenue / 1000).toFixed(0)}k
            </span>
            <div
              className="w-full rounded-t"
              style={{
                height: `${h}%`,
                background: isLatest ? "#10b981" : "#1f2937",
                border: isLatest ? "1px solid rgba(16,185,129,0.4)" : "1px solid #374151",
              }}
            />
            <span className="text-xs" style={{ color: "#6b7280" }}>
              {d.month}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function RakutenAffiliatePage() {
  const [activeTab, setActiveTab] = useState<"products" | "campaigns">("products");

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
              style={{ background: "linear-gradient(135deg, #bf0000, #ff4d4d)" }}
            >
              🛒
            </div>
            <h1 className="text-2xl font-bold text-white">楽天アフィリエイト 経営ダッシュボード</h1>
          </div>
          <p className="text-sm" style={{ color: "#6b7280" }}>
            2026年5月 | 収益・キャンペーン・商品を一元管理
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ background: "#bf0000", color: "white" }}
          >
            + 新規商品追加
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {kpiCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl p-5"
            style={{ background: "#111827", border: "1px solid #1f2937" }}
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-2xl">{card.icon}</span>
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  background: `${card.color}22`,
                  color: card.color,
                  border: `1px solid ${card.color}44`,
                }}
              >
                {card.sub}
              </span>
            </div>
            <p className="text-2xl font-bold text-white mb-1">{card.value}</p>
            <p className="text-xs" style={{ color: "#6b7280" }}>
              {card.label}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div
          className="col-span-2 rounded-xl p-5"
          style={{ background: "#111827", border: "1px solid #1f2937" }}
        >
          <h2 className="text-base font-semibold text-white mb-4">月次収益推移</h2>
          <RevenueChart />
        </div>

        {/* Goals */}
        <div
          className="rounded-xl p-5"
          style={{ background: "#111827", border: "1px solid #1f2937" }}
        >
          <h2 className="text-base font-semibold text-white mb-4">目標達成率</h2>
          <div className="space-y-4">
            {goals.map((g) => (
              <div key={g.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span style={{ color: "#d1d5db" }}>{g.label}</span>
                  <span className="text-white font-mono">
                    {g.unit}
                    {g.current.toLocaleString()}
                    {g.unit === "%" ? "" : ""}
                    <span style={{ color: "#6b7280" }}>
                      {" "}
                      / {g.unit}
                      {g.target.toLocaleString()}
                      {g.unit === "%" ? "%" : ""}
                    </span>
                  </span>
                </div>
                <ProgressBar current={g.current} target={g.target} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Recommendations */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">AI推奨商品 — 今週稼ぐべき商品</h2>
          <span
            className="text-xs px-3 py-1 rounded-full"
            style={{ background: "rgba(59,130,246,0.15)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.3)" }}
          >
            Claude AI分析
          </span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {aiRecommendations.map((rec) => (
            <div
              key={rec.name}
              className="rounded-xl p-4"
              style={{ background: "#111827", border: "1px solid #1f2937" }}
            >
              <div className="flex items-start justify-between mb-2">
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(191,0,0,0.15)", color: "#ff6b6b", border: "1px solid rgba(191,0,0,0.3)" }}
                >
                  {rec.category}
                </span>
                <span className="text-sm font-bold" style={{ color: "#10b981" }}>
                  +¥{rec.expectedRevenue.toLocaleString()}見込
                </span>
              </div>
              <p className="font-semibold text-white text-sm mb-2">{rec.name}</p>
              <p className="text-xs leading-relaxed mb-3" style={{ color: "#9ca3af" }}>
                {rec.reason}
              </p>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="text-center">
                  <p className="text-xs mb-1" style={{ color: "#6b7280" }}>需要</p>
                  <p className="text-sm font-bold" style={{ color: "#10b981" }}>{rec.demandScore}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs mb-1" style={{ color: "#6b7280" }}>競合</p>
                  <p className="text-sm font-bold" style={{ color: rec.competitionScore >= 80 ? "#ef4444" : "#f59e0b" }}>
                    {rec.competitionScore}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs mb-1" style={{ color: "#6b7280" }}>報酬率</p>
                  <p className="text-sm font-bold text-white">{rec.commission}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono" style={{ color: "#6b7280" }}>{rec.price}</span>
                <button
                  className="text-xs px-3 py-1 rounded-lg font-medium transition-colors"
                  style={{ background: "#bf0000", color: "white" }}
                >
                  追加する
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Products & Campaigns Tabs */}
      <div>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid #1f2937" }}>
            <button
              onClick={() => setActiveTab("products")}
              className="px-4 py-2 text-sm font-medium transition-colors"
              style={{
                background: activeTab === "products" ? "#1f2937" : "transparent",
                color: activeTab === "products" ? "white" : "#6b7280",
              }}
            >
              商品パフォーマンス
            </button>
            <button
              onClick={() => setActiveTab("campaigns")}
              className="px-4 py-2 text-sm font-medium transition-colors"
              style={{
                background: activeTab === "campaigns" ? "#1f2937" : "transparent",
                color: activeTab === "campaigns" ? "white" : "#6b7280",
              }}
            >
              キャンペーン管理
            </button>
          </div>
        </div>

        {activeTab === "products" && (
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: "#111827", border: "1px solid #1f2937" }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid #1f2937" }}>
                  {["商品名", "カテゴリ", "クリック", "CV数", "CVR", "収益", "報酬率", "推移"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium" style={{ color: "#6b7280" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p, i) => (
                  <tr
                    key={p.id}
                    className="hover:bg-white/5 transition-colors"
                    style={{ borderBottom: i < topProducts.length - 1 ? "1px solid #1f2937" : "none" }}
                  >
                    <td className="px-4 py-3 font-medium text-white">{p.name}</td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(107,114,128,0.2)", color: "#9ca3af" }}
                      >
                        {p.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono" style={{ color: "#d1d5db" }}>
                      {p.clicks.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono" style={{ color: "#d1d5db" }}>
                      {p.conversions}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold" style={{ color: "#3b82f6" }}>
                      {p.cvr}%
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-white">
                      ¥{p.revenue.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono" style={{ color: "#9ca3af" }}>
                      {p.commission}%
                    </td>
                    <td className="px-4 py-3 font-bold" style={{ color: p.positive ? "#10b981" : "#ef4444" }}>
                      {p.trend}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "campaigns" && (
          <div className="space-y-3">
            {campaigns.map((c) => {
              const status = statusColors[c.status];
              const pct = c.budget > 0 ? Math.min(100, Math.round((c.revenue / c.budget) * 100)) : 0;
              return (
                <div
                  key={c.name}
                  className="rounded-xl p-4"
                  style={{ background: "#111827", border: "1px solid #1f2937" }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: status.bg, color: status.text, border: `1px solid ${status.text}44` }}
                      >
                        {status.label}
                      </span>
                      <p className="font-semibold text-white">{c.name}</p>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-right">
                        <p className="text-xs mb-0.5" style={{ color: "#6b7280" }}>期間</p>
                        <p style={{ color: "#d1d5db" }}>
                          {c.startDate} 〜 {c.endDate}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs mb-0.5" style={{ color: "#6b7280" }}>商品数</p>
                        <p className="text-white font-bold">{c.products}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs mb-0.5" style={{ color: "#6b7280" }}>クリック</p>
                        <p className="font-mono" style={{ color: "#d1d5db" }}>{c.clicks.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs mb-0.5" style={{ color: "#6b7280" }}>収益</p>
                        <p className="font-mono font-bold text-white">¥{c.revenue.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                  {c.status !== "scheduled" && (
                    <div>
                      <div className="flex justify-between text-xs mb-1" style={{ color: "#6b7280" }}>
                        <span>予算達成率 {pct}%</span>
                        <span>目標: ¥{c.budget.toLocaleString()}</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#1f2937" }}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            background: pct >= 90 ? "#10b981" : pct >= 70 ? "#3b82f6" : "#f59e0b",
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Business Summary */}
      <div
        className="rounded-xl p-5"
        style={{ background: "#111827", border: "1px solid #1f2937" }}
      >
        <h2 className="text-base font-semibold text-white mb-4">📊 経営サマリー — 今月の状況</h2>
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "売上総利益", value: "¥127,450", note: "コミッション収益合計" },
            { label: "年間換算収益", value: "¥1,529,400", note: "現月ペースで換算" },
            { label: "最高CVR商品", value: "美容コスメ 4.5%", note: "資生堂 エリクシール" },
            { label: "次回セール予測", value: "¥182,000", note: "スーパーSALE効果含む" },
          ].map((item) => (
            <div key={item.label} className="rounded-lg p-4" style={{ background: "#0a0f1e" }}>
              <p className="text-xs mb-2" style={{ color: "#6b7280" }}>{item.label}</p>
              <p className="text-xl font-bold text-white mb-1">{item.value}</p>
              <p className="text-xs" style={{ color: "#4b5563" }}>{item.note}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
