"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import type { Customer } from "@prisma/client";
import { customerSchema, type CustomerInput } from "@/lib/validation/schemas";
import { CUSTOMER_STATUS_LIST } from "@/lib/constants";
import { api } from "@/lib/api-client";
import { formResolver } from "@/lib/validation/resolver";
import type { UserOption } from "@/lib/types";
import { useApiSubmit } from "@/hooks/use-api-submit";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { FormError, FormField, Input, Select, Textarea } from "@/components/ui/form";

type FormValues = {
  name: string;
  nameKana: string;
  contactName: string;
  contactTitle: string;
  phone: string;
  email: string;
  address: string;
  industry: string;
  status: CustomerInput["status"];
  notes: string;
  assigneeId: string;
};

export function CustomerForm({ customer, users, currentUserId }: { customer?: Customer; users: UserOption[]; currentUserId: string }) {
  const router = useRouter();
  const isEdit = !!customer;
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<FormValues, unknown, CustomerInput>({
    resolver: formResolver<FormValues, CustomerInput>(customerSchema),
    defaultValues: {
      name: customer?.name ?? "",
      nameKana: customer?.nameKana ?? "",
      contactName: customer?.contactName ?? "",
      contactTitle: customer?.contactTitle ?? "",
      phone: customer?.phone ?? "",
      email: customer?.email ?? "",
      address: customer?.address ?? "",
      industry: customer?.industry ?? "",
      status: customer?.status ?? "PROSPECT",
      notes: customer?.notes ?? "",
      assigneeId: customer?.assigneeId ?? currentUserId,
    },
  });
  const { run, submitting, formError } = useApiSubmit<FormValues>(setError);

  const onSubmit = (input: CustomerInput) =>
    run(
      () => (isEdit ? api.put<Customer>(`/api/customers/${customer.id}`, input) : api.post<Customer>("/api/customers", input)),
      {
        successMessage: isEdit ? "顧客情報を更新しました" : "顧客を登録しました",
        onSuccess: (c) => {
          router.push(`/customers/${c.id}`);
          router.refresh();
        },
      },
    );

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <FormError message={formError} />
      <Card>
        <CardHeader title="基本情報" />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <FormField label="顧客名 (会社名)" htmlFor="name" required error={errors.name?.message} className="sm:col-span-2">
            <Input id="name" placeholder="株式会社サンプル建設" invalid={!!errors.name} {...register("name")} />
          </FormField>
          <FormField label="フリガナ" htmlFor="nameKana" error={errors.nameKana?.message}>
            <Input id="nameKana" placeholder="サンプルケンセツ" invalid={!!errors.nameKana} {...register("nameKana")} />
          </FormField>
          <FormField label="業種" htmlFor="industry" error={errors.industry?.message}>
            <Input id="industry" placeholder="建設業" invalid={!!errors.industry} {...register("industry")} />
          </FormField>
          <FormField label="ステータス" htmlFor="status" required error={errors.status?.message}>
            <Select id="status" invalid={!!errors.status} {...register("status")}>
              {CUSTOMER_STATUS_LIST.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="社内担当" htmlFor="assigneeId" error={errors.assigneeId?.message} hint="この顧客の窓口となる社内の担当者">
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
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="連絡先" />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <FormField label="先方担当者" htmlFor="contactName" error={errors.contactName?.message}>
            <Input id="contactName" placeholder="大森 一郎" invalid={!!errors.contactName} {...register("contactName")} />
          </FormField>
          <FormField label="役職" htmlFor="contactTitle" error={errors.contactTitle?.message}>
            <Input id="contactTitle" placeholder="工事部 部長" invalid={!!errors.contactTitle} {...register("contactTitle")} />
          </FormField>
          <FormField label="電話番号" htmlFor="phone" error={errors.phone?.message}>
            <Input id="phone" type="tel" placeholder="03-1234-5678" invalid={!!errors.phone} {...register("phone")} />
          </FormField>
          <FormField label="メールアドレス" htmlFor="email" error={errors.email?.message}>
            <Input id="email" type="email" placeholder="contact@example.jp" invalid={!!errors.email} {...register("email")} />
          </FormField>
          <FormField label="住所" htmlFor="address" error={errors.address?.message} className="sm:col-span-2">
            <Input id="address" placeholder="東京都新宿区西新宿1-1-1" invalid={!!errors.address} {...register("address")} />
          </FormField>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="備考" />
        <CardBody>
          <FormField label="メモ" htmlFor="notes" error={errors.notes?.message} hint="引き継ぎ時に役立つ情報 (取引の経緯、注意点など)">
            <Textarea id="notes" rows={4} invalid={!!errors.notes} {...register("notes")} />
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
