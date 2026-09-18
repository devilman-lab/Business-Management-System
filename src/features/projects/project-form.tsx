"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import type { Project } from "@prisma/client";
import { projectSchema, type ProjectInput } from "@/lib/validation/schemas";
import { PRIORITY_LIST, PROJECT_STATUS_LIST } from "@/lib/constants";
import { api } from "@/lib/api-client";
import { formResolver } from "@/lib/validation/resolver";
import { toDateInputValue } from "@/lib/utils";
import type { CustomerOption, UserOption } from "@/lib/types";
import { useApiSubmit } from "@/hooks/use-api-submit";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { FormError, FormField, Input, Select, Textarea } from "@/components/ui/form";

type FormValues = {
  name: string;
  description: string;
  customerId: string;
  assigneeId: string;
  status: ProjectInput["status"];
  priority: ProjectInput["priority"];
  progress: string;
  startDate: string;
  dueDate: string;
  budget: string;
};

export function ProjectForm({
  project,
  customers,
  users,
  defaultCustomerId,
  currentUserId,
}: {
  project?: Project;
  customers: CustomerOption[];
  users: UserOption[];
  defaultCustomerId?: string;
  currentUserId: string;
}) {
  const router = useRouter();
  const isEdit = !!project;
  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormValues, unknown, ProjectInput>({
    resolver: formResolver<FormValues, ProjectInput>(projectSchema),
    defaultValues: {
      name: project?.name ?? "",
      description: project?.description ?? "",
      customerId: project?.customerId ?? defaultCustomerId ?? "",
      assigneeId: project?.assigneeId ?? currentUserId,
      status: project?.status ?? "NOT_STARTED",
      priority: project?.priority ?? "MEDIUM",
      progress: String(project?.progress ?? 0),
      startDate: toDateInputValue(project?.startDate),
      dueDate: toDateInputValue(project?.dueDate),
      budget: project?.budget != null ? String(project.budget) : "",
    },
  });
  const { run, submitting, formError } = useApiSubmit<FormValues>(setError);
  const status = watch("status");

  const onSubmit = (input: ProjectInput) =>
    run(() => (isEdit ? api.put<Project>(`/api/projects/${project.id}`, input) : api.post<Project>("/api/projects", input)), {
      successMessage: isEdit ? "案件を更新しました" : "案件を登録しました",
      onSuccess: (p) => {
        router.push(`/projects/${p.id}`);
        router.refresh();
      },
    });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <FormError message={formError} />
      <Card>
        <CardHeader title="案件情報" />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <FormField label="案件名" htmlFor="name" required error={errors.name?.message} className="sm:col-span-2">
            <Input id="name" placeholder="例: 新社屋Webサイト構築" invalid={!!errors.name} {...register("name")} />
          </FormField>
          <FormField label="顧客" htmlFor="customerId" required error={errors.customerId?.message}>
            <Select id="customerId" invalid={!!errors.customerId} {...register("customerId")}>
              <option value="">選択してください</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="担当者" htmlFor="assigneeId" error={errors.assigneeId?.message} hint="担当者は一般ユーザーでもこの案件を更新できるようになります">
            <Select id="assigneeId" invalid={!!errors.assigneeId} {...register("assigneeId")}>
              <option value="">未設定</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                  {u.department ? ` (${u.department})` : ""}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="ステータス" htmlFor="status" required error={errors.status?.message}>
            <Select id="status" invalid={!!errors.status} {...register("status")}>
              {PROJECT_STATUS_LIST.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="優先度" htmlFor="priority" required error={errors.priority?.message}>
            <Select id="priority" invalid={!!errors.priority} {...register("priority")}>
              {PRIORITY_LIST.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="進捗率 (%)" htmlFor="progress" required error={errors.progress?.message} hint={status === "COMPLETED" ? "完了時は自動的に100%になります" : "0〜100"}>
            <Input id="progress" type="number" min={0} max={100} step={5} invalid={!!errors.progress} disabled={status === "COMPLETED"} {...register("progress")} />
          </FormField>
          <FormField label="予算 (円)" htmlFor="budget" error={errors.budget?.message}>
            <Input id="budget" type="number" min={0} step={10000} placeholder="例: 4800000" invalid={!!errors.budget} {...register("budget")} />
          </FormField>
          <FormField label="開始日" htmlFor="startDate" error={errors.startDate?.message}>
            <Input id="startDate" type="date" invalid={!!errors.startDate} {...register("startDate")} />
          </FormField>
          <FormField label="期限" htmlFor="dueDate" error={errors.dueDate?.message}>
            <Input id="dueDate" type="date" invalid={!!errors.dueDate} {...register("dueDate")} />
          </FormField>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="案件概要" />
        <CardBody>
          <FormField label="概要" htmlFor="description" error={errors.description?.message} hint="目的・範囲・前提条件など、担当者が変わっても背景が分かる内容">
            <Textarea id="description" rows={5} invalid={!!errors.description} {...register("description")} />
          </FormField>
        </CardBody>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={submitting}>
          キャンセル
        </Button>
        <Button type="submit" loading={submitting} disabled={isEdit && !isDirty}>
          {isEdit ? "変更を保存" : "登録する"}
        </Button>
      </div>
    </form>
  );
}
