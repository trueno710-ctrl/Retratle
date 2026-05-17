"use client";

import { useState, useEffect, useCallback } from "react";
import type { SalesAnalysis } from "@/lib/claude";

type Period = "weekly" | "monthly" | "yearly";

interface DataPoint { label: string; revenue: number; clicks: number; conversions: number }
interface TopProduct { name: string; revenue: number; cvr: number; trend: string }
interface CategoryItem { category: string; share: number; growth: string }

const PERIOD_LABELS: Record<Period, string> = {
  weekly: "週次（直近8週）",
  monthly: "月次（直近12ヶ月）",
  yearly: "年次（直近3年）",
};

const PRIORITY_COLOR: Record<string, string> = {
  "高": "#ef4444",
  "中": "#f59e0b",
  "低": "#3b82f6",
};

// SVG Line Chart
function LineChart({ data, valueKey }: { data: DataPoint[]; valueKey: "revenue" | "clicks" | "conversions" }) {
  const W = 600, H = 160, PAD = { t: 10, r: 20, b: 30, l: 60 };
  const iW = W - PAD.l - PAD.r;
  const iH = H - PAD.t - PAD.b;
  const vals = data.map(d => d[valueKey]);
  const max = Math.max(...vals) * 1.1;
  const min = 0;

  const x = (i: number) => PAD.l + (i / (data.length - 1)) * iW;
  const y = (v: number) => PAD.t + iH - ((v - min) / (max - min)) * iH;

  const pathD = data.map((d, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(d[valueKey])}`).join(" ");
  const areaD = pathD + ` L ${x(data.length - 1)} ${PAD.t + iH} L ${PAD.l} ${PAD.t + iH} Z`;

  const fmt = (v: number) =>
    valueKey === "revenue" ? `¥${(v / 10000).toFixed(0)}万` : v >= 10000 ? `${(v / 10000).toFixed(1)}万` : `${v}`;

  // Y gridlines
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(t => min + (max - min) * t);

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
      {/* Grid */}
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)}
            stroke="#1f2937" strokeWidth="1" />
          <text x={PAD.l - 8} y={y(t) + 4} textAnchor="end" fontSize="10" fill="#6b7280">
            {fmt(t)}
          </text>
        </g>
      ))}
      {/* Area fill */}
      <path d={areaD} fill="url(#lineGrad)" opacity="0.3" />
      {/* Line */}
      <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinejoin="round" />
      {/* Dots + labels */}
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(d[valueKey])} r="4" fill="#3b82f6" />
          {i % Math.ceil(data.length / 6) === 0 && (
            <text x={x(i)} y={H - 6} textAnchor="middle" fontSize="9" fill="#6b7280">
              {d.label.replace("2025/", "").replace("2026/", "")}
            </text>
          )}
        </g>
      ))}
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// SVG Bar Chart
function BarChart({ data }: { data: DataPoint[] }) {
  const W = 600, H = 140, PAD = { t: 10, r: 10, b: 30, l: 50 };
  const iW = W - PAD.l - PAD.r;
  const iH = H - PAD.t - PAD.b;
  const max = Math.max(...data.map(d => d.revenue)) * 1.1;
  const barW = iW / data.length * 0.6;
  const gap = iW / data.length;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
      {[0, 0.5, 1].map((t, i) => {
        const v = max * t;
        const yv = PAD.t + iH - t * iH;
        return (
          <g key={i}>
            <line x1={PAD.l} x2={W - PAD.r} y1={yv} y2={yv} stroke="#1f2937" strokeWidth="1" />
            <text x={PAD.l - 6} y={yv + 4} textAnchor="end" fontSize="9" fill="#6b7280">
              ¥{(v / 10000).toFixed(0)}万
            </text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const bh = (d.revenue / max) * iH;
        const bx = PAD.l + i * gap + gap * 0.2;
        const by = PAD.t + iH - bh;
        const isLatest = i === data.length - 1;
        return (
          <g key={i}>
            <rect x={bx} y={by} width={barW} height={bh}
              fill={isLatest ? "#3b82f6" : "#1f2937"}
              rx="2" />
            {i % Math.ceil(data.length / 8) === 0 && (
              <text x={bx + barW / 2} y={H - 6} textAnchor="middle" fontSize="8" fill="#6b7280">
                {d.label.replace("2025/", "").replace("2026/", "")}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// Donut chart for category breakdown
function DonutChart({ items }: { items: CategoryItem[] }) {
  const colors = ["#3b82f6","#10b981","#f59e0b","#8b5cf6","#ef4444","#6b7280"];
  const r = 50, cx = 70, cy = 70;
  let cumAngle = -Math.PI / 2;

  const arcs = items.map((item, i) => {
    const angle = (item.share / 100) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(cumAngle);
    const y1 = cy + r * Math.sin(cumAngle);
    cumAngle += angle;
    const x2 = cx + r * Math.cos(cumAngle);
    const y2 = cy + r * Math.sin(cumAngle);
    const large = angle > Math.PI ? 1 : 0;
    return { path: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`, color: colors[i] };
  });

  return (
    <div className="flex items-center gap-4">
      <svg width="140" height="140" viewBox="0 0 140 140">
        {arcs.map((a, i) => <path key={i} d={a.path} fill={a.color} stroke="#111827" strokeWidth="2" />)}
        <circle cx={cx} cy={cy} r={r * 0.55} fill="#111827" />
        <text x={cx} y={cy + 4} textAnchor="middle" fontSize="10" fill="#9ca3af">内訳</text>
      </svg>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={item.category} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: colors[i] }} />
            <span style={{ color: "#d1d5db" }}>{item.category}</span>
            <span className="font-bold text-white">{item.share}%</span>
            <span style={{ color: item.growth.startsWith("+") ? "#10b981" : "#ef4444" }}>{item.growth}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>("monthly");
  const [chartType, setChartType] = useState<"line" | "bar">("line");
  const [metricKey, setMetricKey] = useState<"revenue" | "clicks" | "conversions">("revenue");
  const [data, setData] = useState<DataPoint[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [analysis, setAnalysis] = useState<SalesAnalysis | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  const fetchData = useCallback(async (p: Period) => {
    setLoadingData(true);
    setAnalysis(null);
    const res = await fetch(`/api/analytics?period=${p}`);
    const json = await res.json();
    setData(json.data ?? []);
    setTopProducts(json.topProducts ?? []);
    setCategories(json.categoryBreakdown ?? []);
    setLoadingData(false);
  }, []);

  useEffect(() => { fetchData(period) }, [period, fetchData]);

  const handleAnalyze = async () => {
    setLoadingAnalysis(true);
    const res = await fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ period }),
    });
    const json = await res.json();
    setAnalysis(json.analysis ?? null);
    setLoadingAnalysis(false);
  };

  const totalRevenue = data.reduce((s, d) => s + d.revenue, 0);
  const totalClicks = data.reduce((s, d) => s + d.clicks, 0);
  const totalConversions = data.reduce((s, d) => s + d.conversions, 0);
  const avgCVR = totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(2) : "0";
  const latest = data[data.length - 1];
  const prev = data[data.length - 2];
  const growth = prev && prev.revenue > 0 ? (((latest?.revenue ?? 0) - prev.revenue) / prev.revenue * 100).toFixed(1) : null;

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">📊 売上分析 & AI改善提案</h1>
          <p className="text-sm mt-1" style={{ color: "#6b7280" }}>
            週次・月次・年次で売上を可視化し、Claude AIが改善策を提案
          </p>
        </div>
        <button onClick={handleAnalyze} disabled={loadingAnalysis}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
          style={{ background: "linear-gradient(135deg,#1d4ed8,#7c3aed)", color: "white" }}>
          {loadingAnalysis
            ? <><span className="live-dot w-2 h-2 rounded-full" style={{ background: "white" }} />分析中...</>
            : "🤖 Claude AIで分析・改善提案"}
        </button>
      </div>

      {/* Period Tabs */}
      <div className="flex items-center gap-3">
        <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid #1f2937" }}>
          {(["weekly","monthly","yearly"] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className="px-5 py-2 text-sm font-medium transition-colors"
              style={{
                background: period === p ? "#1f2937" : "transparent",
                color: period === p ? "white" : "#6b7280",
              }}>
              {p === "weekly" ? "週次" : p === "monthly" ? "月次" : "年次"}
            </button>
          ))}
        </div>
        <span className="text-sm" style={{ color: "#6b7280" }}>{PERIOD_LABELS[period]}</span>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "総収益", value: `¥${totalRevenue.toLocaleString()}`, color: "#10b981", growth: growth ? `${Number(growth) >= 0 ? "+" : ""}${growth}%` : null },
          { label: "総クリック", value: totalClicks.toLocaleString(), color: "#3b82f6", growth: null },
          { label: "コンバージョン", value: totalConversions.toLocaleString(), color: "#8b5cf6", growth: null },
          { label: "平均CVR", value: `${avgCVR}%`, color: "#f59e0b", growth: null },
        ].map(k => (
          <div key={k.label} className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1f2937" }}>
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs" style={{ color: "#6b7280" }}>{k.label}</p>
              {k.growth && (
                <span className="text-xs px-1.5 py-0.5 rounded"
                  style={{ background: Number(k.growth) >= 0 ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                           color: Number(k.growth) >= 0 ? "#10b981" : "#ef4444" }}>
                  {k.growth}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-white">{loadingData ? "..." : k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="col-span-2 rounded-xl p-5" style={{ background: "#111827", border: "1px solid #1f2937" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">収益推移</h2>
            <div className="flex items-center gap-3">
              {/* Metric selector */}
              <div className="flex rounded-lg overflow-hidden text-xs" style={{ border: "1px solid #1f2937" }}>
                {([["revenue","収益"],["clicks","クリック"],["conversions","CV"]] as const).map(([k,l]) => (
                  <button key={k} onClick={() => setMetricKey(k)}
                    className="px-3 py-1 transition-colors"
                    style={{ background: metricKey === k ? "#1f2937" : "transparent", color: metricKey === k ? "white" : "#6b7280" }}>
                    {l}
                  </button>
                ))}
              </div>
              {/* Chart type */}
              <div className="flex rounded-lg overflow-hidden text-xs" style={{ border: "1px solid #1f2937" }}>
                {([["line","〰"],["bar","▌▌"]] as const).map(([t,l]) => (
                  <button key={t} onClick={() => setChartType(t)}
                    className="px-3 py-1 transition-colors"
                    style={{ background: chartType === t ? "#1f2937" : "transparent", color: chartType === t ? "white" : "#6b7280" }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {loadingData ? (
            <div className="h-40 flex items-center justify-center" style={{ color: "#6b7280" }}>読み込み中...</div>
          ) : chartType === "line" ? (
            <LineChart data={data} valueKey={metricKey} />
          ) : (
            <BarChart data={data} />
          )}
        </div>

        {/* Category Breakdown */}
        <div className="rounded-xl p-5" style={{ background: "#111827", border: "1px solid #1f2937" }}>
          <h2 className="text-sm font-semibold text-white mb-4">カテゴリ別シェア</h2>
          {loadingData ? (
            <div className="h-40 flex items-center justify-center" style={{ color: "#6b7280" }}>...</div>
          ) : (
            <DonutChart items={categories} />
          )}
        </div>
      </div>

      {/* Top Products Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: "#111827", border: "1px solid #1f2937" }}>
        <div className="px-5 py-3" style={{ borderBottom: "1px solid #1f2937" }}>
          <h2 className="text-sm font-semibold text-white">上位商品ランキング</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid #1f2937" }}>
              {["#","商品名","収益","CVR","推移","シェア"].map(h => (
                <th key={h} className="text-left px-5 py-3 text-xs font-medium" style={{ color: "#6b7280" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {topProducts.map((p, i) => {
              const share = totalRevenue > 0 ? (p.revenue / totalRevenue * 100).toFixed(1) : "0";
              return (
                <tr key={p.name} className="hover:bg-white/5 transition-colors"
                  style={{ borderBottom: i < topProducts.length - 1 ? "1px solid #1f2937" : "none" }}>
                  <td className="px-5 py-3 text-xs font-bold" style={{ color: i < 3 ? "#f59e0b" : "#6b7280" }}>
                    {i + 1}
                  </td>
                  <td className="px-5 py-3 font-medium text-white">{p.name}</td>
                  <td className="px-5 py-3 font-mono font-bold text-white">¥{p.revenue.toLocaleString()}</td>
                  <td className="px-5 py-3 font-bold" style={{ color: "#3b82f6" }}>{p.cvr}%</td>
                  <td className="px-5 py-3 font-bold"
                    style={{ color: p.trend.startsWith("+") ? "#10b981" : "#ef4444" }}>{p.trend}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 rounded-full" style={{ background: "#1f2937" }}>
                        <div className="h-full rounded-full" style={{ width: `${share}%`, background: "#3b82f6" }} />
                      </div>
                      <span className="text-xs font-mono" style={{ color: "#9ca3af" }}>{share}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* AI Analysis */}
      {loadingAnalysis && (
        <div className="rounded-xl p-8 text-center" style={{ background: "#111827", border: "1px solid #1f2937" }}>
          <span className="live-dot w-3 h-3 rounded-full inline-block mr-2" style={{ background: "#3b82f6" }} />
          <span className="text-sm" style={{ color: "#3b82f6" }}>Claude AIがデータを分析中...</span>
        </div>
      )}

      {analysis && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="rounded-xl p-5" style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.25)" }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs px-2 py-0.5 rounded" style={{ background: "rgba(59,130,246,0.2)", color: "#60a5fa" }}>
                Claude AI 分析レポート
              </span>
            </div>
            <p className="text-sm leading-relaxed text-white">{analysis.summary}</p>
            <p className="text-sm mt-2 font-medium" style={{ color: "#60a5fa" }}>
              📈 次期予測: {analysis.nextPeriodForecast}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Strengths */}
            <div className="rounded-xl p-5" style={{ background: "#111827", border: "1px solid #1f2937" }}>
              <h3 className="text-sm font-semibold mb-3" style={{ color: "#10b981" }}>✅ 強み</h3>
              <ul className="space-y-2">
                {analysis.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="mt-1 shrink-0 w-1.5 h-1.5 rounded-full" style={{ background: "#10b981" }} />
                    <span style={{ color: "#d1d5db" }}>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Weaknesses */}
            <div className="rounded-xl p-5" style={{ background: "#111827", border: "1px solid #1f2937" }}>
              <h3 className="text-sm font-semibold mb-3" style={{ color: "#ef4444" }}>⚠️ 課題</h3>
              <ul className="space-y-2">
                {analysis.weaknesses.map((w, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="mt-1 shrink-0 w-1.5 h-1.5 rounded-full" style={{ background: "#ef4444" }} />
                    <span style={{ color: "#d1d5db" }}>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Improvement Plan */}
          <div className="rounded-xl overflow-hidden" style={{ background: "#111827", border: "1px solid #1f2937" }}>
            <div className="px-5 py-3" style={{ borderBottom: "1px solid #1f2937" }}>
              <h3 className="text-sm font-semibold text-white">🚀 改善アクションプラン</h3>
            </div>
            <div className="p-5 space-y-3">
              {analysis.improvements.map((imp, i) => (
                <div key={i} className="rounded-xl p-4"
                  style={{ background: "#0a0f1e", border: `1px solid ${PRIORITY_COLOR[imp.priority]}33` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs px-2 py-0.5 rounded font-bold"
                      style={{ background: `${PRIORITY_COLOR[imp.priority]}22`, color: PRIORITY_COLOR[imp.priority] }}>
                      優先度：{imp.priority}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded"
                      style={{ background: "#1f2937", color: "#9ca3af" }}>
                      {imp.category}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded ml-auto"
                      style={{ background: "#1f2937", color: "#6b7280" }}>
                      ⏰ {imp.timeline}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-white mb-1">{imp.action}</p>
                  <p className="text-xs" style={{ color: "#10b981" }}>期待効果: {imp.expectedImpact}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
