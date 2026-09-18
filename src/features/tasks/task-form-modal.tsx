"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { taskSchema, type TaskInput } from "@/lib/validation/schemas";
import { PRIORITY_LIST, TASK_STATUS_LIST } from "@/lib/constants";
import { api } from "@/lib/api-client";
import { formResolver } from "@/lib/validation/resolver";
import { toDateInputValue } from "@/lib/utils";
import type { ProjectOption, UserOption } from "@/lib/types";
import { useApiSubmit } from "@/hooks/use-api-submit";
import { Button } from "@/components/ui/button";
import { FormError, FormField, Input, Select, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";

export interface TaskFormValues {
  projectId: string;
  title: string;
  description: string;
  assigneeId: string;
  status: TaskInput["status"];
  priority: TaskInput["priority"];
  dueDate: string;
}

export interface TaskEditTarget {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  assigneeId: string | null;
  status: TaskInput["status"];
  priority: TaskInput["priority"];
  dueDate: Date | string | null;
}

/** タスク候補などから初期値を渡す場合 */
export interface TaskPreset {
  title?: string;
  description?: string;
  priority?: TaskInput["priority"];
  dueDate?: string;
  assigneeId?: string;
}

export function TaskFormModal({
  open,
  onClose,
  fixedProjectId,
  users,
  editing,
  preset,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  fixedProjectId?: string;
  users: UserOption[];
  editing?: TaskEditTarget | null;
  preset?: TaskPreset | null;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const isEdit = !!editing;

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<TaskFormValues, unknown, TaskInput>({
    resolver: formResolver<TaskFormValues, TaskInput>(taskSchema),
    defaultValues: { projectId: fixedProjectId ?? "", title: "", description: "", assigneeId: "", status: "NOT_STARTED", priority: "MEDIUM", dueDate: "" },
  });
  const { run, submitting, formError } = useApiSubmit<TaskFormValues>(setError);

  useEffect(() => {
    if (!open) return;
    reset({
      projectId: editing?.projectId ?? fixedProjectId ?? "",
      title: editing?.title ?? preset?.title ?? "",
      description: editing?.description ?? preset?.description ?? "",
      assigneeId: editing?.assigneeId ?? preset?.assigneeId ?? "",
      status: editing?.status ?? "NOT_STARTED",
      priority: editing?.priority ?? preset?.priority ?? "MEDIUM",
      dueDate: editing ? toDateInputValue(editing.dueDate) : (preset?.dueDate ?? ""),
    });
  }, [open, editing, preset, fixedProjectId, reset]);

  useEffect(() => {
    if (!open || fixedProjectId) return;
    api.get<{ items: ProjectOption[] }>("/api/projects?options=1").then((r) => setProjects(r.items)).catch(() => undefined);
  }, [open, fixedProjectId]);

  const onSubmit = (input: TaskInput) =>
    run(() => (isEdit ? api.put(`/api/tasks/${editing.id}`, input) : api.post("/api/tasks", input)), {
      successMessage: isEdit ? "タスクを更新しました" : "タスクを登録しました",
      onSuccess: () => {
        onClose();
        onSaved?.();
        router.refresh();
      },
    });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "タスクを編集" : "タスクを登録"}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            キャンセル
          </Button>
          <Button type="submit" form="task-form" loading={submitting}>
            {isEdit ? "変更を保存" : "登録する"}
          </Button>
        </>
      }
    >
      <form id="task-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <FormError message={formError} />
        {!fixedProjectId && (
          <FormField label="関連案件" htmlFor="t-project" required error={errors.projectId?.message}>
            <Select id="t-project" invalid={!!errors.projectId} {...register("projectId")}>
              <option value="">選択してください</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} {p.name}
                </option>
              ))}
            </Select>
          </FormField>
        )}
        <FormField label="タスク名" htmlFor="t-title" required error={errors.title?.message}>
          <Input id="t-title" placeholder="例: 見積書の作成" invalid={!!errors.title} {...register("title")} />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="担当者" htmlFor="t-assignee" error={errors.assigneeId?.message}>
            <Select id="t-assignee" invalid={!!errors.assigneeId} {...register("assigneeId")}>
              <option value="">未設定</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                  {u.department ? ` (${u.department})` : ""}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="期限" htmlFor="t-due" error={errors.dueDate?.message}>
            <Input id="t-due" type="date" invalid={!!errors.dueDate} {...register("dueDate")} />
          </FormField>
          <FormField label="ステータス" htmlFor="t-status" required error={errors.status?.message}>
            <Select id="t-status" invalid={!!errors.status} {...register("status")}>
              {TASK_STATUS_LIST.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="優先度" htmlFor="t-priority" required error={errors.priority?.message}>
            <Select id="t-priority" invalid={!!errors.priority} {...register("priority")}>
              {PRIORITY_LIST.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
        <FormField label="内容" htmlFor="t-desc" error={errors.description?.message}>
          <Textarea id="t-desc" rows={3} invalid={!!errors.description} {...register("description")} />
        </FormField>
      </form>
    </Modal>
  );
}
