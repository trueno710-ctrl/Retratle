"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { ApprovalItem } from "@/lib/approvalStore";

const departments = [
  {
    id: "marketing",
    name: "マーケティング部",
    icon: "📣",
    color: "#10b981",
    href: "/trend-post",
    desc: "Xトレンド・季節イベントから商品提案・投稿文生成",
    kpiLabel: "今週の提案数",
    kpiValue: "24件",
  },
  {
    id: "creative",
    name: "クリエイティブ部",
    icon: "🎬",
    color: "#8b5cf6",
    href: "/cm-studio",
    desc: "AI画像・AI動画でCMを自動制作",
    kpiLabel: "制作済みCM数",
    kpiValue: "8本",
  },
  {
    id: "compliance",
    name: "コンプライアンス部",
    icon: "⚖️",
    color: "#f59e0b",
    href: "/approval",
    desc: "景品表示法・ステマ規制・各SNS規約の自動チェック",
    kpiLabel: "今週のチェック数",
    kpiValue: "—",
  },
  {
    id: "approval",
    name: "編集・承認部",
    icon: "✅",
    color: "#3b82f6",
    href: "/approval",
    desc: "投稿前の人間による最終確認・承認フロー",
    kpiLabel: "承認待ち件数",
    kpiValue: "—",
  },
  {
    id: "publishing",
    name: "投稿管理部",
    icon: "📤",
    color: "#ec4899",
    href: "/approval",
    desc: "Instagram・Threads・X への一括投稿・スケジュール管理",
    kpiLabel: "今月の投稿数",
    kpiValue: "—",
  },
  {
    id: "analytics",
    name: "分析部",
    icon: "📊",
    color: "#06b6d4",
    href: "/analytics",
    desc: "週次・月次・年次の売上分析と AI 改善提案",
    kpiLabel: "今月収益",
    kpiValue: "¥127,450",
  },
];

const FLOW_STEPS = [
  { icon: "📣", label: "トレンド分析", dept: "マーケティング部", color: "#10b981" },
  { icon: "🎬", label: "CM制作",       dept: "クリエイティブ部", color: "#8b5cf6" },
  { icon: "⚖️", label: "法令チェック", dept: "コンプライアンス部", color: "#f59e0b" },
  { icon: "✅", label: "人間が承認",   dept: "編集・承認部",     color: "#3b82f6" },
  { icon: "📤", label: "一括投稿",     dept: "投稿管理部",       color: "#ec4899" },
  { icon: "📊", label: "効果分析",     dept: "分析部",           color: "#06b6d4" },
];

export default function CompanyPage() {
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [schedule, setSchedule] = useState<{ frequency: string; weeklyPlan: string } | null>(null);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  useEffect(() => {
    fetch("/api/approval").then(r => r.json()).then(d => setItems(d.items ?? []));
  }, []);

  async function fetchSchedule() {
    setLoadingSchedule(true);
    const res = await fetch("/api/schedule");
    const data = await res.json();
    setSchedule(data.schedule ?? null);
    setLoadingSchedule(false);
  }

  const pendingCount = items.filter(i => i.status === "awaiting_approval").length;
  const postedCount = items.filter(i => i.status === "posted").length;
  const checkCount = items.filter(i => i.compliance).length;

  const deptKpis: Record<string, string> = {
    compliance: `${checkCount}件`,
    approval:   `${pendingCount}件`,
    publishing: `${postedCount}件`,
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold"
              style={{ background: "linear-gradient(135deg,#3b82f6,#8b5cf6)" }}>
              🏢
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Retratle アフィリエイト事業部</h1>
              <p className="text-xs" style={{ color: "#6b7280" }}>会社経営ダッシュボード — 6部署による分業体制</p>
            </div>
          </div>
        </div>
        <button onClick={fetchSchedule} disabled={loadingSchedule}
          className="px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
          style={{ background: "linear-gradient(135deg,#1d4ed8,#7c3aed)", color: "white" }}>
          {loadingSchedule ? "生成中..." : "🤖 最適投稿スケジュールを生成"}
        </button>
      </div>

      {/* Schedule Banner */}
      {schedule && (
        <div className="rounded-xl p-4" style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.25)" }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs px-2 py-0.5 rounded" style={{ background: "rgba(59,130,246,0.2)", color: "#60a5fa" }}>
              Claude AI 推奨スケジュール
            </span>
            <span className="text-xs font-bold text-white">頻度: {schedule.frequency}</span>
          </div>
          <p className="text-sm" style={{ color: "#d1d5db" }}>{schedule.weeklyPlan}</p>
        </div>
      )}

      {/* Workflow */}
      <div className="rounded-xl p-5" style={{ background: "#111827", border: "1px solid #1f2937" }}>
        <h2 className="text-sm font-semibold text-white mb-4">📋 投稿業務フロー</h2>
        <div className="flex items-center gap-0 overflow-x-auto pb-2">
          {FLOW_STEPS.map((step, i) => (
            <div key={step.label} className="flex items-center shrink-0">
              <div className="flex flex-col items-center gap-2 w-28">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{ background: `${step.color}18`, border: `1px solid ${step.color}44` }}>
                  {step.icon}
                </div>
                <p className="text-xs font-medium text-white text-center">{step.label}</p>
                <p className="text-xs text-center" style={{ color: "#6b7280" }}>{step.dept}</p>
              </div>
              {i < FLOW_STEPS.length - 1 && (
                <div className="flex flex-col items-center w-8 shrink-0">
                  <div className="w-6 h-px" style={{ background: "#374151" }} />
                  <div className="text-xs mt-0.5" style={{ color: "#4b5563" }}>→</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Department Grid */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">部署一覧</h2>
        <div className="grid grid-cols-3 gap-4">
          {departments.map(dept => (
            <Link key={dept.id} href={dept.href}
              className="rounded-xl p-5 transition-all hover:scale-[1.01] block group"
              style={{ background: "#111827", border: "1px solid #1f2937" }}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                  style={{ background: `${dept.color}18`, border: `1px solid ${dept.color}33` }}>
                  {dept.icon}
                </div>
                <span className="text-xs px-2 py-0.5 rounded"
                  style={{ background: `${dept.color}18`, color: dept.color }}>
                  稼働中
                </span>
              </div>
              <h3 className="text-sm font-semibold text-white mb-1 group-hover:text-blue-400 transition-colors">
                {dept.name}
              </h3>
              <p className="text-xs mb-3 leading-relaxed" style={{ color: "#6b7280" }}>{dept.desc}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: "#4b5563" }}>{dept.kpiLabel}</span>
                <span className="text-sm font-bold" style={{ color: dept.color }}>
                  {deptKpis[dept.id] ?? dept.kpiValue}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Today's Activity */}
      <div className="rounded-xl overflow-hidden" style={{ background: "#111827", border: "1px solid #1f2937" }}>
        <div className="px-5 py-3 border-b" style={{ borderColor: "#1f2937" }}>
          <h2 className="text-sm font-semibold text-white">📰 最近の承認キュー</h2>
        </div>
        {items.length === 0 ? (
          <div className="p-8 text-center text-sm" style={{ color: "#6b7280" }}>
            まだ投稿がありません — トレンド×投稿 または CMスタジオ から投稿を作成してください
          </div>
        ) : (
          items.slice(0, 5).map((item, i) => {
            const st = item.status;
            const statusColor = st === "posted" ? "#8b5cf6" : st === "approved" ? "#10b981" : st === "awaiting_approval" ? "#3b82f6" : st === "rejected" ? "#ef4444" : "#f59e0b";
            const statusLabel = st === "posted" ? "投稿済" : st === "approved" ? "承認済" : st === "awaiting_approval" ? "承認待ち" : st === "rejected" ? "却下" : "チェック中";
            return (
              <Link key={item.id} href="/approval"
                className="flex items-center justify-between px-5 py-3 hover:bg-white/5 transition-colors"
                style={{ borderBottom: i < 4 ? "1px solid #1f2937" : "none" }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0"
                    style={{ background: "#0a0f1e" }}>
                    {item.imageUrl
                      ? <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: "#4b5563" }}>🖼</div>}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{item.product}</p>
                    <p className="text-xs" style={{ color: "#6b7280" }}>{item.trend}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    {item.platforms.map(p => (
                      <span key={p} className="text-xs">{({ instagram: "📸", threads: "🧵", x: "𝕏" } as const)[p]}</span>
                    ))}
                  </div>
                  {item.compliance && (
                    <span className="text-xs font-bold" style={{ color: item.compliance.passed ? "#10b981" : "#ef4444" }}>
                      {item.compliance.complianceScore}点
                    </span>
                  )}
                  <span className="text-xs px-2 py-0.5 rounded"
                    style={{ background: `${statusColor}18`, color: statusColor }}>
                    {statusLabel}
                  </span>
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* API Key Status */}
      <div className="rounded-xl p-5" style={{ background: "#111827", border: "1px solid #1f2937" }}>
        <h2 className="text-sm font-semibold text-white mb-4">🔑 APIキー設定状況</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { name: "Anthropic API", env: "ANTHROPIC_API_KEY", required: true, dept: "全部署" },
            { name: "X (Twitter) API", env: "X_BEARER_TOKEN", required: true, dept: "投稿管理部" },
            { name: "Instagram API", env: "INSTAGRAM_ACCESS_TOKEN", required: true, dept: "投稿管理部" },
            { name: "Threads API", env: "THREADS_ACCESS_TOKEN", required: true, dept: "投稿管理部" },
            { name: "DALL-E 3 (OpenAI)", env: "OPENAI_API_KEY", required: false, dept: "クリエイティブ部" },
            { name: "Runway ML", env: "RUNWAY_API_KEY", required: false, dept: "クリエイティブ部" },
          ].map(api => (
            <div key={api.env} className="rounded-lg p-3" style={{ background: "#0a0f1e" }}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-white">{api.name}</p>
                <span className="text-xs px-1.5 py-0.5 rounded"
                  style={{ background: api.required ? "rgba(239,68,68,0.15)" : "rgba(107,114,128,0.15)",
                           color: api.required ? "#ef4444" : "#6b7280" }}>
                  {api.required ? "必須" : "任意"}
                </span>
              </div>
              <p className="text-xs font-mono mb-1" style={{ color: "#6b7280" }}>{api.env}</p>
              <p className="text-xs" style={{ color: "#4b5563" }}>{api.dept}</p>
            </div>
          ))}
        </div>
        <p className="text-xs mt-3" style={{ color: "#4b5563" }}>
          * .env.local に設定してください。未設定の場合はモックデータで動作します。
        </p>
      </div>
    </div>
  );
}
