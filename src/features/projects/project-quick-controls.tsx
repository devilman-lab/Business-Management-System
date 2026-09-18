"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Priority, ProjectStatus } from "@prisma/client";
import { PRIORITY, PRIORITY_LIST, PROJECT_STATUS, PROJECT_STATUS_LIST } from "@/lib/constants";
import { api } from "@/lib/api-client";
import type { UserOption } from "@/lib/types";
import { useToast } from "@/components/ui/toast";
import { OptionBadge } from "@/components/ui/badge";
import { Select } from "@/components/ui/form";
import { UserChip } from "@/components/ui/misc";
import { Spinner } from "@/components/ui/misc";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-xs font-medium text-slate-500">{label}</p>
      {children}
    </div>
  );
}

/**
 * 案件詳細のインライン更新 (ステータス・担当者・優先度・進捗率)。
 * 変更は即座に API へ送信され、監査ログに記録される。
 */
export function ProjectQuickControls({
  projectId,
  status,
  assigneeId,
  assigneeName,
  priority,
  progress,
  users,
  editable,
}: {
  projectId: string;
  status: ProjectStatus;
  assigneeId: string | null;
  assigneeName: string | null;
  priority: Priority;
  progress: number;
  users: UserOption[];
  editable: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  const patch = async (field: string, body: Record<string, unknown>, message: string) => {
    setBusy(field);
    try {
      await api.patch(`/api/projects/${projectId}`, body);
      toast.success(message, "変更内容は監査ログに記録されました");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "更新に失敗しました");
    } finally {
      setBusy(null);
    }
  };

  if (!editable) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Field label="ステータス">
          <OptionBadge option={PROJECT_STATUS[status]} />
        </Field>
        <Field label="担当者">
          <UserChip name={assigneeName} />
        </Field>
        <Field label="優先度">
          <OptionBadge option={PRIORITY[priority]} dot={false} />
        </Field>
        <Field label="進捗率">
          <span className="text-sm font-medium tabular-nums">{progress}%</span>
        </Field>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Field label="ステータス">
        <div className="flex items-center gap-2">
          <Select
            value={status}
            disabled={busy !== null}
            onChange={(e) => patch("status", { status: e.target.value }, `ステータスを「${PROJECT_STATUS[e.target.value as ProjectStatus].label}」に変更しました`)}
            aria-label="ステータス"
            className="h-9"
          >
            {PROJECT_STATUS_LIST.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
          {busy === "status" && <Spinner className="size-4" />}
        </div>
      </Field>
      <Field label="担当者">
        <div className="flex items-center gap-2">
          <Select
            value={assigneeId ?? ""}
            disabled={busy !== null}
            onChange={(e) => {
              const u = users.find((x) => x.id === e.target.value);
              void patch("assigneeId", { assigneeId: e.target.value || null }, u ? `担当者を「${u.name}」に変更しました` : "担当者を未設定にしました");
            }}
            aria-label="担当者"
            className="h-9"
          >
            <option value="">未設定</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
                {u.department ? ` (${u.department})` : ""}
              </option>
            ))}
          </Select>
          {busy === "assigneeId" && <Spinner className="size-4" />}
        </div>
      </Field>
      <Field label="優先度">
        <div className="flex items-center gap-2">
          <Select
            value={priority}
            disabled={busy !== null}
            onChange={(e) => patch("priority", { priority: e.target.value }, `優先度を「${PRIORITY[e.target.value as Priority].label}」に変更しました`)}
            aria-label="優先度"
            className="h-9"
          >
            {PRIORITY_LIST.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
          {busy === "priority" && <Spinner className="size-4" />}
        </div>
      </Field>
      <Field label="進捗率">
        <div className="flex items-center gap-2">
          <Select
            value={String(status === "COMPLETED" ? 100 : progress)}
            disabled={busy !== null || status === "COMPLETED"}
            onChange={(e) => patch("progress", { progress: Number(e.target.value) }, `進捗率を ${e.target.value}% に変更しました`)}
            aria-label="進捗率"
            className="h-9"
          >
            {Array.from({ length: 21 }, (_, i) => i * 5).map((v) => (
              <option key={v} value={v}>
                {v}%
              </option>
            ))}
          </Select>
          {busy === "progress" && <Spinner className="size-4" />}
        </div>
      </Field>
    </div>
  );
}
