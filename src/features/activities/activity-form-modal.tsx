"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { activitySchema, type ActivityInput } from "@/lib/validation/schemas";
import { ACTIVITY_TYPE_LIST } from "@/lib/constants";
import { api } from "@/lib/api-client";
import { formResolver } from "@/lib/validation/resolver";
import type { CustomerOption, ProjectOption } from "@/lib/types";
import { useApiSubmit } from "@/hooks/use-api-submit";
import { Button } from "@/components/ui/button";
import { FormError, FormField, Input, Select, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";

export interface ActivityFormValues {
  customerId: string;
  projectId: string;
  type: ActivityInput["type"];
  occurredAt: string;
  title: string;
  content: string;
}

export interface ActivityEditTarget {
  id: string;
  customerId: string;
  projectId: string | null;
  type: ActivityInput["type"];
  occurredAt: Date | string;
  title: string;
  content: string | null;
}

/**
 * 対応履歴の登録/編集モーダル。
 * customerId / projectId を固定して呼び出せば、顧客詳細・案件詳細から文脈付きで登録できる。
 */
export function ActivityFormModal({
  open,
  onClose,
  fixedCustomerId,
  fixedProjectId,
  customers,
  editing,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  fixedCustomerId?: string;
  fixedProjectId?: string;
  customers?: CustomerOption[];
  editing?: ActivityEditTarget | null;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>(customers ?? []);
  const isEdit = !!editing;

  const {
    register,
    handleSubmit,
    setError,
    reset,
    watch,
    formState: { errors },
  } = useForm<ActivityFormValues, unknown, ActivityInput>({
    resolver: formResolver<ActivityFormValues, ActivityInput>(activitySchema),
    defaultValues: {
      customerId: fixedCustomerId ?? "",
      projectId: fixedProjectId ?? "",
      type: "PHONE",
      occurredAt: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      title: "",
      content: "",
    },
  });
  const { run, submitting, formError } = useApiSubmit<ActivityFormValues>(setError);
  const customerId = watch("customerId");

  // 開いたときに初期値をセット
  useEffect(() => {
    if (!open) return;
    reset({
      customerId: editing?.customerId ?? fixedCustomerId ?? "",
      projectId: editing?.projectId ?? fixedProjectId ?? "",
      type: editing?.type ?? "PHONE",
      occurredAt: format(editing ? new Date(editing.occurredAt) : new Date(), "yyyy-MM-dd'T'HH:mm"),
      title: editing?.title ?? "",
      content: editing?.content ?? "",
    });
  }, [open, editing, fixedCustomerId, fixedProjectId, reset]);

  // 顧客の選択肢 (固定でない場合のみ取得)
  useEffect(() => {
    if (!open || fixedCustomerId || customers) return;
    api.get<{ items: CustomerOption[] }>("/api/customers?options=1").then((r) => setCustomerOptions(r.items)).catch(() => undefined);
  }, [open, fixedCustomerId, customers]);

  // 顧客に応じた案件の選択肢
  useEffect(() => {
    if (!open || !customerId) {
      setProjects([]);
      return;
    }
    api.get<{ items: ProjectOption[] }>(`/api/projects?options=1&customerId=${customerId}`).then((r) => setProjects(r.items)).catch(() => undefined);
  }, [open, customerId]);

  const onSubmit = (input: ActivityInput) =>
    run(() => (isEdit ? api.put(`/api/activities/${editing.id}`, input) : api.post("/api/activities", input)), {
      successMessage: isEdit ? "対応履歴を更新しました" : "対応履歴を登録しました",
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
      title={isEdit ? "対応履歴を編集" : "対応履歴を登録"}
      description="電話・メール・訪問などの対応内容を記録します。担当者が変わっても経緯を追えるよう、要点を残してください。"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            キャンセル
          </Button>
          <Button type="submit" form="activity-form" loading={submitting}>
            {isEdit ? "変更を保存" : "登録する"}
          </Button>
        </>
      }
    >
      <form id="activity-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <FormError message={formError} />
        <div className="grid gap-4 sm:grid-cols-2">
          {!fixedCustomerId && (
            <FormField label="顧客" htmlFor="a-customer" required error={errors.customerId?.message}>
              <Select id="a-customer" invalid={!!errors.customerId} {...register("customerId")}>
                <option value="">選択してください</option>
                {customerOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </FormField>
          )}
          {!fixedProjectId && (
            <FormField label="関連案件" htmlFor="a-project" error={errors.projectId?.message} hint="案件に紐づかない対応は未選択のままで構いません">
              <Select id="a-project" invalid={!!errors.projectId} disabled={!customerId} {...register("projectId")}>
                <option value="">(案件に紐づけない)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} {p.name}
                  </option>
                ))}
              </Select>
            </FormField>
          )}
          <FormField label="対応種別" htmlFor="a-type" required error={errors.type?.message}>
            <Select id="a-type" invalid={!!errors.type} {...register("type")}>
              {ACTIVITY_TYPE_LIST.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="対応日時" htmlFor="a-at" required error={errors.occurredAt?.message}>
            <Input id="a-at" type="datetime-local" invalid={!!errors.occurredAt} {...register("occurredAt")} />
          </FormField>
        </div>
        <FormField label="件名" htmlFor="a-title" required error={errors.title?.message}>
          <Input id="a-title" placeholder="例: 契約内容について確認" invalid={!!errors.title} {...register("title")} />
        </FormField>
        <FormField label="内容" htmlFor="a-content" error={errors.content?.message}>
          <Textarea id="a-content" rows={5} placeholder="先方の回答、決定事項、次のアクションなど" invalid={!!errors.content} {...register("content")} />
        </FormField>
      </form>
    </Modal>
  );
}
