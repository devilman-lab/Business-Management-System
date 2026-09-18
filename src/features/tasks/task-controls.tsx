"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import type { TaskStatus } from "@prisma/client";
import { TASK_STATUS, TASK_STATUS_LIST } from "@/lib/constants";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/modal";
import { OptionBadge } from "@/components/ui/badge";

/** タスクのステータスをその場で変更するセレクト (権限がない場合はバッジ表示) */
export function TaskStatusSelect({ taskId, status, editable }: { taskId: string; status: TaskStatus; editable: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  if (!editable) return <OptionBadge option={TASK_STATUS[status]} />;

  const change = async (next: TaskStatus) => {
    if (next === status) return;
    setBusy(true);
    try {
      await api.patch(`/api/tasks/${taskId}`, { status: next });
      toast.success(`ステータスを「${TASK_STATUS[next].label}」に変更しました`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "更新に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  const tone = TASK_STATUS[status].tone;
  return (
    <select
      value={status}
      disabled={busy}
      onChange={(e) => change(e.target.value as TaskStatus)}
      aria-label="ステータスを変更"
      className={cn(
        "h-7 cursor-pointer rounded-md border-0 py-0 pl-2 pr-7 text-xs font-medium ring-1 ring-inset focus:ring-2 focus:ring-primary-300 disabled:opacity-60",
        tone === "green" && "bg-emerald-50 text-emerald-700 ring-emerald-200",
        tone === "blue" && "bg-blue-50 text-blue-700 ring-blue-200",
        tone === "gray" && "bg-slate-100 text-slate-700 ring-slate-200",
      )}
    >
      {TASK_STATUS_LIST.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}

/** 行の編集・削除ボタン + 削除確認 */
export function TaskRowActions({ taskId, title, editable, deletable, onEdit }: { taskId: string; title: string; editable: boolean; deletable: boolean; onEdit: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    setBusy(true);
    try {
      await api.delete(`/api/tasks/${taskId}`);
      toast.success("タスクを削除しました");
      setConfirm(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "削除に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  if (!editable && !deletable) return null;
  return (
    <span className="inline-flex items-center gap-1">
      {editable && (
        <Button variant="ghost" size="xs" onClick={onEdit} icon={<Pencil className="size-3.5" />} aria-label="編集" />
      )}
      {deletable && (
        <Button variant="ghost" size="xs" className="text-red-600 hover:bg-red-50" onClick={() => setConfirm(true)} icon={<Trash2 className="size-3.5" />} aria-label="削除" />
      )}
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={remove} loading={busy} danger title="タスクを削除しますか？" confirmLabel="削除する" message={<>「{title}」を削除します。この操作は取り消せません。</>} />
    </span>
  );
}
