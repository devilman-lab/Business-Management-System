"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, ListChecks, Sparkles, WandSparkles } from "lucide-react";
import type { ProjectSummary, TaskSuggestion } from "@/server/ai";
import { PRIORITY_LIST } from "@/lib/constants";
import { api, ApiError } from "@/lib/api-client";
import type { UserOption } from "@/lib/types";
import { addDays, toDateInputValue } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { FormError, Input, Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { LoadingBlock } from "@/components/ui/misc";

interface Candidate extends TaskSuggestion {
  selected: boolean;
  dueDate: string;
  assigneeId: string;
}

/**
 * AI 支援 (Human-in-the-loop)。
 *   AI が候補を生成 → 担当者が内容を確認・編集 → 承認 (登録) → 通常のタスク登録 API で正式登録
 * AI は候補を出すだけで、データを直接書き換えない。
 */
export function AiAssistModal({
  open,
  onClose,
  projectId,
  users,
  defaultAssigneeId,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  users: UserOption[];
  defaultAssigneeId: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [mode, setMode] = useState<"menu" | "summary" | "tasks">("menu");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ProjectSummary | null>(null);
  const [provider, setProvider] = useState<string>("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setMode("menu");
    setSummary(null);
    setCandidates([]);
    setError(null);
  };
  const close = () => {
    reset();
    onClose();
  };

  const runSummary = async () => {
    setMode("summary");
    setLoading(true);
    setError(null);
    try {
      setSummary(await api.post<ProjectSummary>(`/api/projects/${projectId}/ai`, { action: "summary" }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "要約の生成に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const runTasks = async () => {
    setMode("tasks");
    setLoading(true);
    setError(null);
    try {
      const r = await api.post<{ provider: string; suggestions: TaskSuggestion[] }>(`/api/projects/${projectId}/ai`, { action: "suggest-tasks" });
      setProvider(r.provider);
      setCandidates(
        r.suggestions.map((s) => ({
          ...s,
          selected: true,
          dueDate: s.dueInDays !== null ? toDateInputValue(addDays(new Date(), s.dueInDays)) : "",
          assigneeId: defaultAssigneeId ?? "",
        })),
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "候補の生成に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const updateCandidate = (i: number, patch: Partial<Candidate>) => setCandidates((prev) => prev.map((c, j) => (j === i ? { ...c, ...patch } : c)));

  const approve = async () => {
    const selected = candidates.filter((c) => c.selected && c.title.trim());
    if (selected.length === 0) return setError("登録するタスクを選択してください");
    setSaving(true);
    setError(null);
    let ok = 0;
    for (const c of selected) {
      try {
        await api.post("/api/tasks", {
          projectId,
          title: c.title,
          description: c.description || null,
          assigneeId: c.assigneeId || null,
          status: "NOT_STARTED",
          priority: c.priority,
          dueDate: c.dueDate || null,
        });
        ok++;
      } catch (e) {
        setError(`「${c.title}」の登録に失敗しました: ${e instanceof ApiError ? e.message : ""}`);
      }
    }
    setSaving(false);
    if (ok > 0) {
      toast.success(`${ok} 件のタスクを登録しました`);
      router.refresh();
      close();
    }
  };

  const providerLabel = provider === "anthropic" ? "Claude (Anthropic API)" : "ルールベース (API未接続)";

  return (
    <Modal
      open={open}
      onClose={close}
      title={
        <span className="inline-flex items-center gap-2">
          <Sparkles className="size-4 text-violet-600" /> AI支援
        </span>
      }
      description="AIは候補を提示するだけで、データを直接変更しません。内容を確認・修正のうえ承認してください。"
      size={mode === "tasks" ? "xl" : "lg"}
      footer={
        mode === "tasks" && candidates.length > 0 ? (
          <>
            <Button variant="outline" onClick={reset} disabled={saving}>
              戻る
            </Button>
            <Button onClick={approve} loading={saving} icon={<CheckCircle2 className="size-4" />}>
              選択した {candidates.filter((c) => c.selected).length} 件を承認して登録
            </Button>
          </>
        ) : mode !== "menu" ? (
          <Button variant="outline" onClick={reset}>
            戻る
          </Button>
        ) : undefined
      }
    >
      {mode === "menu" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={runSummary} className="rounded-xl border border-slate-200 p-4 text-left transition-colors hover:border-violet-300 hover:bg-violet-50/50">
            <WandSparkles className="mb-2 size-5 text-violet-600" />
            <p className="text-sm font-semibold text-slate-900">案件の要約を生成</p>
            <p className="mt-1 text-xs text-slate-500">概要・タスク・対応履歴から現状を要約し、懸念点と次のアクションを整理します。担当者の引き継ぎに便利です。</p>
          </button>
          <button type="button" onClick={runTasks} className="rounded-xl border border-slate-200 p-4 text-left transition-colors hover:border-violet-300 hover:bg-violet-50/50">
            <ListChecks className="mb-2 size-5 text-violet-600" />
            <p className="text-sm font-semibold text-slate-900">タスク候補を生成</p>
            <p className="mt-1 text-xs text-slate-500">案件の状況から次に行うべきタスクの候補を提案します。確認・編集して承認したものだけが登録されます。</p>
          </button>
        </div>
      )}

      {mode === "summary" && (
        <div className="space-y-4">
          <FormError message={error} />
          {loading ? (
            <LoadingBlock label="要約を生成しています..." />
          ) : summary ? (
            <>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-sm leading-relaxed text-slate-800">{summary.summary}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                    <AlertTriangle className="size-3.5" /> 懸念点
                  </p>
                  {summary.risks.length === 0 ? (
                    <p className="text-xs text-slate-500">特に懸念点はありません</p>
                  ) : (
                    <ul className="list-inside list-disc space-y-1 text-sm text-slate-700">
                      {summary.risks.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-primary-700">
                    <ListChecks className="size-3.5" /> 次のアクション
                  </p>
                  {summary.nextActions.length === 0 ? (
                    <p className="text-xs text-slate-500">未完了のタスクはありません</p>
                  ) : (
                    <ul className="list-inside list-disc space-y-1 text-sm text-slate-700">
                      {summary.nextActions.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-slate-400">生成元: {summary.source === "anthropic" ? "Claude (Anthropic API)" : "ルールベース (API未接続)"} — 内容は参考情報です。正式な記録は対応履歴に残してください。</p>
            </>
          ) : null}
        </div>
      )}

      {mode === "tasks" && (
        <div className="space-y-3">
          <FormError message={error} />
          {loading ? (
            <LoadingBlock label="タスク候補を生成しています..." />
          ) : (
            <>
              <p className="text-xs text-slate-500">
                生成元: {providerLabel}。チェックした候補のみ登録されます。タイトル・優先度・期限・担当者はここで編集できます。
              </p>
              <div className="space-y-2">
                {candidates.map((c, i) => (
                  <div key={i} className={`rounded-lg border p-3 ${c.selected ? "border-violet-200 bg-violet-50/30" : "border-slate-200 bg-white opacity-70"}`}>
                    <div className="flex items-start gap-3">
                      <input type="checkbox" className="mt-1 size-4" checked={c.selected} onChange={(e) => updateCandidate(i, { selected: e.target.checked })} aria-label="この候補を登録する" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <Input value={c.title} onChange={(e) => updateCandidate(i, { title: e.target.value })} className="font-medium" aria-label="タスク名" />
                        <Input value={c.description} onChange={(e) => updateCandidate(i, { description: e.target.value })} className="text-xs" placeholder="内容" aria-label="内容" />
                        <div className="grid gap-2 sm:grid-cols-3">
                          <Select value={c.priority} onChange={(e) => updateCandidate(i, { priority: e.target.value as Candidate["priority"] })} aria-label="優先度" className="h-8 text-xs">
                            {PRIORITY_LIST.map((p) => (
                              <option key={p.value} value={p.value}>
                                優先度: {p.label}
                              </option>
                            ))}
                          </Select>
                          <Input type="date" value={c.dueDate} onChange={(e) => updateCandidate(i, { dueDate: e.target.value })} aria-label="期限" className="h-8 text-xs" />
                          <Select value={c.assigneeId} onChange={(e) => updateCandidate(i, { assigneeId: e.target.value })} aria-label="担当者" className="h-8 text-xs">
                            <option value="">担当者: 未設定</option>
                            {users.map((u) => (
                              <option key={u.id} value={u.id}>
                                担当者: {u.name}
                              </option>
                            ))}
                          </Select>
                        </div>
                        <p className="text-[11px] text-violet-700">
                          <Sparkles className="mr-1 inline size-3" />
                          提案理由: {c.reason}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
