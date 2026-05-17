"use client";

import Link from "next/link";

const summaryCards = [
  {
    label: "監視中の省庁数",
    value: "8",
    sub: "アクティブ",
    color: "#3b82f6",
    icon: "🏛",
    href: "/ministry-monitor",
  },
  {
    label: "今週の推奨銘柄数",
    value: "24",
    sub: "前週比 +6",
    color: "#10b981",
    icon: "📈",
    href: "/ministry-monitor",
  },
  {
    label: "テンバガー候補",
    value: "12",
    sub: "スコア80点以上",
    color: "#8b5cf6",
    icon: "🚀",
    href: "/tenbagger",
  },
  {
    label: "アラート件数",
    value: "7",
    sub: "本日 ±3%超",
    color: "#f59e0b",
    icon: "⚡",
    href: "/price-alerts",
  },
];

const recentPosts = [
  {
    ministry: "経済産業省",
    handle: "@meti_NIPPON",
    time: "2時間前",
    content:
      "半導体産業支援パッケージの拡充について、国内製造拠点整備に向けた補助金制度の詳細を発表しました。総額5,000億円規模の支援を予定しています。",
    stocks: ["東京エレクトロン", "信越化学工業", "アドバンテスト"],
    sector: "産業・エネルギー",
  },
  {
    ministry: "デジタル庁",
    handle: "@digital_jpn",
    time: "4時間前",
    content:
      "行政DX推進計画の第3フェーズを開始。クラウドファーストの原則に基づき、2025年度末までに主要行政サービスの完全デジタル化を目指します。",
    stocks: ["富士通", "NTTデータ", "NEC"],
    sector: "IT・DX",
  },
  {
    ministry: "環境省",
    handle: "@Kankyo_Jpn",
    time: "6時間前",
    content:
      "再生可能エネルギーの導入加速に向け、洋上風力発電の新規区域を指定。2030年までに45GW達成を目標とした具体的ロードマップを公表。",
    stocks: ["丸紅", "三菱商事", "日本製鋼所"],
    sector: "環境・再エネ",
  },
];

const recentPicks = [
  {
    ticker: "8035",
    name: "東京エレクトロン",
    price: "23,450",
    change: "+3.2%",
    positive: true,
    confidence: 92,
    reason: "経済産業省の半導体支援策発表を受け、国内半導体製造装置需要の増加が見込まれる。同社は主要サプライヤーとして直接恩恵を受ける可能性が高い。",
    source: "省庁モニター",
  },
  {
    ticker: "9984",
    name: "ソフトバンクグループ",
    price: "8,920",
    change: "+1.8%",
    positive: true,
    confidence: 78,
    reason: "デジタル庁のDX推進加速により、AI・クラウドへの政府支出増加が期待される。関連ポートフォリオ企業への間接的恩恵も見込まれる。",
    source: "省庁モニター",
  },
  {
    ticker: "6674",
    name: "GSユアサ",
    price: "4,210",
    change: "+5.7%",
    positive: true,
    confidence: 85,
    reason: "再エネ拡大政策の加速により、大型蓄電池需要が急増する見通し。EV・定置用蓄電池の両分野で成長が期待される。",
    source: "テンバガー候補",
  },
  {
    ticker: "7974",
    name: "任天堂",
    price: "7,850",
    change: "-0.4%",
    positive: false,
    confidence: 65,
    reason: "次世代ゲーム機の発売延期観測が浮上。短期的な下押し圧力が続く可能性があるが、長期的なIPポートフォリオの価値は変わらない。",
    source: "値動きアラート",
  },
];

const priceAlerts = [
  { ticker: "6501", name: "日立製作所", change: "+4.8%", positive: true, time: "14:32" },
  { ticker: "7203", name: "トヨタ自動車", change: "-3.1%", positive: false, time: "13:15" },
  { ticker: "4519", name: "中外製薬", change: "+6.2%", positive: true, time: "11:48" },
  { ticker: "9433", name: "KDDI", change: "+3.5%", positive: true, time: "10:22" },
  { ticker: "6367", name: "ダイキン工業", change: "-4.1%", positive: false, time: "09:55" },
];

export default function Dashboard() {
  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">ダッシュボード</h1>
          <p className="text-sm mt-1" style={{ color: "#6b7280" }}>
            {new Date().toLocaleDateString("ja-JP", {
              year: "numeric",
              month: "long",
              day: "numeric",
              weekday: "long",
            })}
            &nbsp;| リアルタイム更新
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm" style={{ background: "#111827", border: "1px solid #1f2937" }}>
          <span className="live-dot w-2 h-2 rounded-full" style={{ background: "#10b981" }} />
          <span style={{ color: "#10b981" }}>ライブ</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-xl p-5 transition-transform hover:scale-[1.02] block"
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
            <p className="text-3xl font-bold text-white mb-1">{card.value}</p>
            <p className="text-xs" style={{ color: "#6b7280" }}>
              {card.label}
            </p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Recent Ministry Posts */}
        <div className="col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">省庁の最新投稿</h2>
            <Link
              href="/ministry-monitor"
              className="text-xs hover:text-white transition-colors"
              style={{ color: "#3b82f6" }}
            >
              すべて見る →
            </Link>
          </div>
          <div className="space-y-3">
            {recentPosts.map((post, i) => (
              <div
                key={i}
                className="rounded-xl p-4"
                style={{ background: "#111827", border: "1px solid #1f2937" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                      style={{ background: "#1e3a5f" }}
                    >
                      官
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{post.ministry}</p>
                      <p className="text-xs" style={{ color: "#6b7280" }}>
                        {post.handle}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background: "rgba(59,130,246,0.15)",
                        color: "#3b82f6",
                        border: "1px solid rgba(59,130,246,0.3)",
                      }}
                    >
                      {post.sector}
                    </span>
                    <span className="text-xs" style={{ color: "#6b7280" }}>
                      {post.time}
                    </span>
                  </div>
                </div>
                <p className="text-sm mb-3 leading-relaxed" style={{ color: "#d1d5db" }}>
                  {post.content}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs" style={{ color: "#6b7280" }}>
                    AI推奨銘柄:
                  </span>
                  {post.stocks.map((s) => (
                    <span
                      key={s}
                      className="text-xs px-2 py-0.5 rounded-md"
                      style={{
                        background: "rgba(16,185,129,0.15)",
                        color: "#10b981",
                        border: "1px solid rgba(16,185,129,0.3)",
                      }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Price Alert Feed */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">値動きアラート</h2>
            <Link
              href="/price-alerts"
              className="text-xs hover:text-white transition-colors"
              style={{ color: "#3b82f6" }}
            >
              すべて見る →
            </Link>
          </div>
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: "#111827", border: "1px solid #1f2937" }}
          >
            {priceAlerts.map((alert, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
                style={{ borderBottom: i < priceAlerts.length - 1 ? "1px solid #1f2937" : "none" }}
              >
                <div>
                  <p className="text-sm font-medium text-white">{alert.name}</p>
                  <p className="text-xs" style={{ color: "#6b7280" }}>
                    {alert.ticker} · {alert.time}
                  </p>
                </div>
                <span
                  className="text-sm font-bold px-2 py-1 rounded-md"
                  style={{
                    background: alert.positive
                      ? "rgba(16,185,129,0.15)"
                      : "rgba(239,68,68,0.15)",
                    color: alert.positive ? "#10b981" : "#ef4444",
                  }}
                >
                  {alert.change}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Stock Picks */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">AIの最新推奨銘柄</h2>
          <span className="text-xs px-3 py-1 rounded-full" style={{ background: "rgba(59,130,246,0.15)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.3)" }}>
            Claude AI分析
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {recentPicks.map((pick) => (
            <div
              key={pick.ticker}
              className="rounded-xl p-4"
              style={{ background: "#111827", border: "1px solid #1f2937" }}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ background: "#1f2937", color: "#9ca3af" }}>
                      {pick.ticker}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background: "rgba(59,130,246,0.15)",
                        color: "#3b82f6",
                        border: "1px solid rgba(59,130,246,0.3)",
                      }}
                    >
                      {pick.source}
                    </span>
                  </div>
                  <p className="font-semibold text-white">{pick.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-white font-mono">¥{pick.price}</p>
                  <p
                    className="text-sm font-bold"
                    style={{ color: pick.positive ? "#10b981" : "#ef4444" }}
                  >
                    {pick.change}
                  </p>
                </div>
              </div>
              <p className="text-xs leading-relaxed mb-3" style={{ color: "#9ca3af" }}>
                {pick.reason}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: "#6b7280" }}>
                  信頼度スコア
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: "#1f2937" }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pick.confidence}%`,
                        background:
                          pick.confidence >= 85
                            ? "#10b981"
                            : pick.confidence >= 70
                            ? "#3b82f6"
                            : "#f59e0b",
                      }}
                    />
                  </div>
                  <span
                    className="text-xs font-medium"
                    style={{
                      color:
                        pick.confidence >= 85
                          ? "#10b981"
                          : pick.confidence >= 70
                          ? "#3b82f6"
                          : "#f59e0b",
                    }}
                  >
                    {pick.confidence}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
