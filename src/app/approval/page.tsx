"use client";

import { useState, useEffect, useCallback } from "react";
import type { ApprovalItem, Platform, PostResult } from "@/lib/approvalStore";

const PLATFORM_META: Record<Platform, { label: string; color: string; icon: string }> = {
  instagram: { label: "Instagram", color: "#e1306c", icon: "📸" },
  threads:   { label: "Threads",   color: "#000000", icon: "🧵" },
  x:         { label: "X",         color: "#1d9bf0", icon: "𝕏" },
};

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  compliance_checking: { label: "チェック中",  color: "#f59e0b", bg: "rgba(245,158,11,0.15)"  },
  awaiting_approval:   { label: "承認待ち",    color: "#3b82f6", bg: "rgba(59,130,246,0.15)"  },
  approved:            { label: "承認済み",    color: "#10b981", bg: "rgba(16,185,129,0.15)"  },
  rejected:            { label: "却下",        color: "#ef4444", bg: "rgba(239,68,68,0.15)"   },
  posted:              { label: "投稿済み",    color: "#8b5cf6", bg: "rgba(139,92,246,0.15)"  },
  pending:             { label: "準備中",      color: "#6b7280", bg: "rgba(107,114,128,0.15)" },
};

function ComplianceBadge({ score, passed }: { score: number; passed: boolean }) {
  const color = passed ? (score >= 90 ? "#10b981" : "#f59e0b") : "#ef4444";
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
        style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}>
        {passed ? "✓" : "!"}
      </div>
      <span className="text-xs font-bold" style={{ color }}>{score}点</span>
      <span className="text-xs" style={{ color: "#6b7280" }}>{passed ? "通過" : "要修正"}</span>
    </div>
  );
}

function PlatformToggle({
  platforms,
  selected,
  onChange,
}: {
  platforms: Platform[];
  selected: Platform[];
  onChange: (p: Platform[]) => void;
}) {
  return (
    <div className="flex gap-2">
      {platforms.map(p => {
        const meta = PLATFORM_META[p];
        const on = selected.includes(p);
        return (
          <button key={p} onClick={() => onChange(on ? selected.filter(x => x !== p) : [...selected, p])}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: on ? `${meta.color}22` : "#1f2937",
              color: on ? meta.color : "#6b7280",
              border: on ? `1px solid ${meta.color}55` : "1px solid #374151",
            }}>
            <span>{meta.icon}</span>{meta.label}
          </button>
        );
      })}
    </div>
  );
}

export default function ApprovalPage() {
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [selected, setSelected] = useState<ApprovalItem | null>(null);
  const [filter, setFilter] = useState<"all" | ApprovalItem["status"]>("all");
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionDraft, setCaptionDraft] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [postResults, setPostResults] = useState<PostResult[] | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);
  const [loadingPublish, setLoadingPublish] = useState(false);
  const [loadingRecheck, setLoadingRecheck] = useState(false);

  const fetchItems = useCallback(async () => {
    const res = await fetch("/api/approval");
    const data = await res.json();
    setItems(data.items ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems() }, [fetchItems]);

  // ポーリング: compliance_checking 状態のアイテムがある間
  useEffect(() => {
    const checking = items.some(i => i.status === "compliance_checking");
    if (!checking) return;
    const t = setInterval(fetchItems, 4000);
    return () => clearInterval(t);
  }, [items, fetchItems]);

  function openItem(item: ApprovalItem) {
    setSelected(item);
    setCaptionDraft(item.compliance?.revisedCaption ?? item.caption);
    setSelectedPlatforms([...item.platforms]);
    setEditingCaption(false);
    setPostResults(null);
  }

  const handleApprove = useCallback(async () => {
    if (!selected) return;
    setLoadingAction(true);
    await fetch("/api/approval", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve", id: selected.id }),
    });
    await fetchItems();
    const updated = items.find(i => i.id === selected.id);
    if (updated) setSelected({ ...updated, status: "approved" });
    setLoadingAction(false);
  }, [selected, fetchItems, items]);

  const handleReject = useCallback(async () => {
    if (!selected) return;
    setLoadingAction(true);
    await fetch("/api/approval", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject", id: selected.id, rejectionReason }),
    });
    setShowRejectModal(false);
    setRejectionReason("");
    await fetchItems();
    setLoadingAction(false);
    setSelected(null);
  }, [selected, rejectionReason, fetchItems]);

  const handleUpdateCaption = useCallback(async () => {
    if (!selected) return;
    setLoadingRecheck(true);
    const res = await fetch("/api/approval", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update-caption", id: selected.id, caption: captionDraft }),
    });
    const data = await res.json();
    setSelected(data.item);
    setEditingCaption(false);
    await fetchItems();
    setLoadingRecheck(false);
  }, [selected, captionDraft, fetchItems]);

  const handlePublish = useCallback(async () => {
    if (!selected) return;
    // まずプラットフォーム更新
    await fetch("/api/approval", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update-platforms", id: selected.id, platforms: selectedPlatforms }),
    });
    setLoadingPublish(true);
    const res = await fetch("/api/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selected.id }),
    });
    const data = await res.json();
    setPostResults(data.results ?? []);
    await fetchItems();
    setLoadingPublish(false);
  }, [selected, selectedPlatforms, fetchItems]);

  const filtered = filter === "all" ? items : items.filter(i => i.status === filter);
  const awaitingCount = items.filter(i => i.status === "awaiting_approval").length;

  return (
    <div className="flex h-screen overflow-hidden" style={{ marginTop: 0 }}>
      {/* ===== Left: List ===== */}
      <div className="w-80 shrink-0 flex flex-col border-r overflow-hidden" style={{ borderColor: "#1f2937", background: "#080d1a" }}>
        <div className="p-4 border-b" style={{ borderColor: "#1f2937" }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white">✅ 編集・承認部</h2>
            {awaitingCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                style={{ background: "rgba(239,68,68,0.2)", color: "#ef4444" }}>
                {awaitingCount}件待ち
              </span>
            )}
          </div>
          {/* Filter tabs */}
          <div className="flex flex-wrap gap-1">
            {(["all","awaiting_approval","approved","posted","rejected"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className="text-xs px-2 py-1 rounded-md transition-colors"
                style={{
                  background: filter === f ? "#1f2937" : "transparent",
                  color: filter === f ? "white" : "#6b7280",
                }}>
                {f === "all" ? "すべて" : STATUS_META[f]?.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-6 text-center text-sm" style={{ color: "#6b7280" }}>読み込み中...</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-sm" style={{ color: "#6b7280" }}>該当する投稿がありません</div>
          ) : (
            filtered.map(item => {
              const st = STATUS_META[item.status] ?? STATUS_META.pending;
              const isSelected = selected?.id === item.id;
              return (
                <button key={item.id} onClick={() => openItem(item)}
                  className="w-full text-left p-4 transition-colors border-b"
                  style={{
                    borderColor: "#1f2937",
                    background: isSelected ? "#111827" : "transparent",
                  }}>
                  <div className="flex items-start justify-between mb-1.5">
                    <p className="text-sm font-medium text-white truncate pr-2">{item.product}</p>
                    <span className="text-xs px-1.5 py-0.5 rounded shrink-0"
                      style={{ background: st.bg, color: st.color }}>{st.label}</span>
                  </div>
                  <p className="text-xs mb-2 truncate" style={{ color: "#6b7280" }}>{item.trend}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      {item.platforms.map(p => (
                        <span key={p} className="text-xs">{PLATFORM_META[p]?.icon}</span>
                      ))}
                    </div>
                    {item.compliance && (
                      <ComplianceBadge score={item.compliance.complianceScore} passed={item.compliance.passed} />
                    )}
                  </div>
                  <p className="text-xs mt-1.5" style={{ color: "#4b5563" }}>
                    {new Date(item.createdAt).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ===== Right: Detail ===== */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {!selected ? (
          <div className="h-full flex flex-col items-center justify-center gap-4" style={{ color: "#4b5563" }}>
            <p className="text-5xl">👈</p>
            <p className="text-sm">左のリストから投稿を選択してください</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">{selected.product}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs" style={{ color: "#6b7280" }}>{selected.trend}</span>
                  <span className="text-xs" style={{ color: "#4b5563" }}>·</span>
                  <span className="text-xs" style={{ color: "#4b5563" }}>
                    {new Date(selected.createdAt).toLocaleString("ja-JP")}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded"
                    style={{ background: STATUS_META[selected.status]?.bg, color: STATUS_META[selected.status]?.color }}>
                    {STATUS_META[selected.status]?.label}
                  </span>
                </div>
              </div>
            </div>

            {/* Post preview */}
            <div className="grid grid-cols-2 gap-4">
              {/* Media */}
              <div className="rounded-xl overflow-hidden" style={{ background: "#111827", border: "1px solid #1f2937" }}>
                <div className="px-4 py-2.5 border-b text-xs font-medium text-white" style={{ borderColor: "#1f2937" }}>
                  メディアプレビュー
                </div>
                <div className="p-4">
                  {selected.videoUrl ? (
                    <video src={selected.videoUrl} controls className="w-full rounded-lg" style={{ maxHeight: "200px" }} />
                  ) : selected.imageUrl ? (
                    <img src={selected.imageUrl} alt="preview" className="w-full rounded-lg object-cover" style={{ maxHeight: "200px" }} />
                  ) : (
                    <div className="h-32 rounded-lg flex items-center justify-center" style={{ background: "#0a0f1e" }}>
                      <span className="text-xs" style={{ color: "#4b5563" }}>画像・動画なし</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Schedule */}
              {selected.schedule && (
                <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1f2937" }}>
                  <p className="text-xs font-medium text-white mb-3">
                    📅 AI推奨スケジュール — {selected.schedule.frequency}
                  </p>
                  <div className="space-y-2">
                    {selected.schedule.nextSlots.slice(0, 3).map((slot, i) => (
                      <div key={i} className="rounded-lg p-2.5" style={{ background: "#0a0f1e" }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-white">{slot.time}</span>
                          <div className="flex gap-1">
                            {slot.platforms.map(p => (
                              <span key={p} className="text-xs px-1.5 py-0.5 rounded"
                                style={{ background: `${PLATFORM_META[p]?.color}22`, color: PLATFORM_META[p]?.color }}>
                                {PLATFORM_META[p]?.icon}
                              </span>
                            ))}
                          </div>
                        </div>
                        <p className="text-xs" style={{ color: "#6b7280" }}>{slot.reasoning}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs mt-2" style={{ color: "#4b5563" }}>{selected.schedule.weeklyPlan}</p>
                </div>
              )}
            </div>

            {/* Caption */}
            <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1f2937" }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-white">投稿文</p>
                {selected.status !== "posted" && (
                  <button onClick={() => setEditingCaption(!editingCaption)}
                    className="text-xs px-2 py-1 rounded transition-colors"
                    style={{ background: "#1f2937", color: "#9ca3af" }}>
                    {editingCaption ? "キャンセル" : "✏️ 編集"}
                  </button>
                )}
              </div>
              {editingCaption ? (
                <div className="space-y-2">
                  <textarea value={captionDraft} onChange={e => setCaptionDraft(e.target.value)}
                    rows={5} className="w-full px-3 py-2 rounded-lg text-sm text-white resize-none"
                    style={{ background: "#0a0f1e", border: "1px solid #374151" }} />
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: "#6b7280" }}>{captionDraft.length}文字</span>
                    <button onClick={handleUpdateCaption} disabled={loadingRecheck}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-50"
                      style={{ background: "#1d4ed8", color: "white" }}>
                      {loadingRecheck ? "再チェック中..." : "保存して再チェック"}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm leading-relaxed" style={{ color: "#d1d5db", whiteSpace: "pre-wrap" }}>
                  {selected.caption}
                </p>
              )}
            </div>

            {/* Compliance Report */}
            {selected.status === "compliance_checking" ? (
              <div className="rounded-xl p-6 text-center" style={{ background: "#111827", border: "1px solid #1f2937" }}>
                <span className="live-dot w-3 h-3 rounded-full inline-block mr-2" style={{ background: "#f59e0b" }} />
                <span className="text-sm" style={{ color: "#f59e0b" }}>⚖️ コンプライアンス部がチェック中...</span>
              </div>
            ) : selected.compliance ? (
              <div className="rounded-xl overflow-hidden" style={{ background: "#111827", border: `1px solid ${selected.compliance.passed ? "#374151" : "#ef444455"}` }}>
                <div className="px-4 py-3 flex items-center justify-between border-b" style={{ borderColor: "#1f2937" }}>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-semibold text-white">⚖️ コンプライアンスチェック結果</p>
                    <ComplianceBadge score={selected.compliance.complianceScore} passed={selected.compliance.passed} />
                  </div>
                  <span className="text-xs" style={{ color: "#4b5563" }}>
                    {new Date(selected.compliance.checkedAt).toLocaleString("ja-JP")}
                  </span>
                </div>
                <div className="p-4 space-y-3">
                  {!selected.compliance.prDisclosure.present && (
                    <div className="rounded-lg p-3" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                      <p className="text-xs font-medium mb-1" style={{ color: "#ef4444" }}>
                        ⚠️ PR表記なし（2023年ステマ規制）
                      </p>
                      <p className="text-xs" style={{ color: "#9ca3af" }}>{selected.compliance.prDisclosure.suggested}</p>
                    </div>
                  )}
                  {selected.compliance.issues.map((issue, i) => (
                    <div key={i} className="rounded-lg p-3"
                      style={{
                        background: issue.severity === "error" ? "rgba(239,68,68,0.08)"
                          : issue.severity === "warning" ? "rgba(245,158,11,0.08)"
                          : "rgba(59,130,246,0.08)",
                        border: `1px solid ${issue.severity === "error" ? "rgba(239,68,68,0.2)" : issue.severity === "warning" ? "rgba(245,158,11,0.2)" : "rgba(59,130,246,0.2)"}`,
                      }}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold"
                          style={{ color: issue.severity === "error" ? "#ef4444" : issue.severity === "warning" ? "#f59e0b" : "#3b82f6" }}>
                          {issue.severity === "error" ? "🚫 ERROR" : issue.severity === "warning" ? "⚠️ WARNING" : "ℹ️ INFO"}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 rounded"
                          style={{ background: "#1f2937", color: "#9ca3af" }}>{issue.law}</span>
                      </div>
                      <p className="text-xs mb-1" style={{ color: "#d1d5db" }}>{issue.description}</p>
                      <p className="text-xs" style={{ color: "#9ca3af" }}>→ {issue.suggestion}</p>
                    </div>
                  ))}
                  {selected.compliance.revisedCaption && selected.compliance.revisedCaption !== selected.caption && (
                    <div className="rounded-lg p-3" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium" style={{ color: "#10b981" }}>✅ AI修正案</p>
                        <button
                          onClick={() => { setCaptionDraft(selected.compliance!.revisedCaption); setEditingCaption(true); }}
                          className="text-xs px-2 py-0.5 rounded transition-colors"
                          style={{ background: "rgba(16,185,129,0.2)", color: "#10b981" }}>
                          この文章を使う
                        </button>
                      </div>
                      <p className="text-xs leading-relaxed" style={{ color: "#9ca3af", whiteSpace: "pre-wrap" }}>
                        {selected.compliance.revisedCaption}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {/* Platform Selection */}
            {selected.status !== "posted" && (
              <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1f2937" }}>
                <p className="text-xs font-medium text-white mb-3">投稿プラットフォームを選択</p>
                <PlatformToggle
                  platforms={["instagram","threads","x"]}
                  selected={selectedPlatforms}
                  onChange={setSelectedPlatforms}
                />
              </div>
            )}

            {/* Post Results */}
            {postResults && (
              <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1f2937" }}>
                <p className="text-sm font-medium text-white mb-3">投稿結果</p>
                <div className="space-y-2">
                  {postResults.map(r => (
                    <div key={r.platform} className="flex items-center justify-between rounded-lg p-2.5"
                      style={{ background: "#0a0f1e" }}>
                      <div className="flex items-center gap-2">
                        <span>{PLATFORM_META[r.platform]?.icon}</span>
                        <span className="text-sm text-white">{PLATFORM_META[r.platform]?.label}</span>
                      </div>
                      {r.success ? (
                        <span className="text-xs px-2 py-1 rounded font-medium"
                          style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}>
                          ✅ 投稿完了
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded"
                          style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>
                          ❌ {r.error ?? "失敗"}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {(selected.status === "awaiting_approval" || selected.status === "approved") && (
              <div className="flex gap-3">
                {selected.status === "awaiting_approval" && (
                  <>
                    <button onClick={() => setShowRejectModal(true)}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                      style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>
                      ✗ 却下
                    </button>
                    <button onClick={handleApprove} disabled={loadingAction}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                      style={{ background: "#10b981", color: "white" }}>
                      {loadingAction ? "処理中..." : "✓ 承認する"}
                    </button>
                  </>
                )}
                {selected.status === "approved" && (
                  <button onClick={handlePublish}
                    disabled={loadingPublish || selectedPlatforms.length === 0}
                    className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-50 transition-all"
                    style={{ background: "linear-gradient(135deg,#1d4ed8,#7c3aed)", color: "white" }}>
                    {loadingPublish ? "投稿中..." : `📤 ${selectedPlatforms.map(p => PLATFORM_META[p]?.label).join(" / ")} に投稿する`}
                  </button>
                )}
              </div>
            )}

            {selected.status === "posted" && (
              <div className="rounded-xl p-4 text-center" style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.3)" }}>
                <p className="text-sm font-bold" style={{ color: "#a78bfa" }}>
                  ✅ 投稿済み — {selected.postedAt && new Date(selected.postedAt).toLocaleString("ja-JP")}
                </p>
                <div className="flex justify-center gap-2 mt-2">
                  {selected.postResults?.map(r => (
                    <span key={r.platform} className="text-xs px-2 py-0.5 rounded"
                      style={{ background: r.success ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                               color: r.success ? "#10b981" : "#ef4444" }}>
                      {PLATFORM_META[r.platform]?.icon} {r.success ? "✓" : "✗"}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="rounded-2xl p-6 w-96 space-y-4" style={{ background: "#111827", border: "1px solid #374151" }}>
            <h3 className="text-base font-semibold text-white">却下の理由を入力</h3>
            <textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)}
              rows={4} placeholder="例: コンプライアンス上の問題を修正後、再提出してください"
              className="w-full px-3 py-2.5 rounded-lg text-sm text-white resize-none"
              style={{ background: "#0a0f1e", border: "1px solid #374151" }} />
            <div className="flex gap-3">
              <button onClick={() => setShowRejectModal(false)}
                className="flex-1 py-2 rounded-lg text-sm"
                style={{ background: "#1f2937", color: "#9ca3af" }}>
                キャンセル
              </button>
              <button onClick={handleReject} disabled={loadingAction}
                className="flex-1 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                style={{ background: "#ef4444", color: "white" }}>
                却下する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
