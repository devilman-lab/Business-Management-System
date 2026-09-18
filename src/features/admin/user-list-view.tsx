"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Pencil, ShieldCheck, UserPlus } from "lucide-react";
import type { UserItem } from "@/server/services/user-service";
import type { PagedResult } from "@/lib/types";
import { ROLE, ROLE_LIST, USER_STATUS, USER_STATUS_LIST } from "@/lib/constants";
import { userCreateSchema, userUpdateSchema, type UserCreateInput, type UserUpdateInput } from "@/lib/validation/schemas";
import { api } from "@/lib/api-client";
import { formResolver } from "@/lib/validation/resolver";
import { formatDateTime } from "@/lib/utils";
import { useListFilters, useSearchInput } from "@/hooks/use-list-filters";
import { useApiSubmit } from "@/hooks/use-api-submit";
import { useCurrentUser } from "@/components/layout/current-user-context";
import { Button } from "@/components/ui/button";
import { Badge, OptionBadge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { FormError, FormField, Input, Select } from "@/components/ui/form";
import { FilterBar, FilterChips, SearchInput } from "@/components/ui/filter-bar";
import { Modal } from "@/components/ui/modal";
import { Avatar, EmptyState, PageHeader } from "@/components/ui/misc";
import { Pagination } from "@/components/ui/pagination";
import { Table, TableWrapper, TBody, Td, Th, THead, Tr } from "@/components/ui/table";

interface FormValues {
  name: string;
  email: string;
  password: string;
  department: string;
  role: "ADMIN" | "MEMBER";
  status: "ACTIVE" | "INACTIVE";
}

function UserFormModal({ open, onClose, editing }: { open: boolean; onClose: () => void; editing: UserItem | null }) {
  const router = useRouter();
  const isEdit = !!editing;
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<FormValues, unknown, UserCreateInput | UserUpdateInput>({
    resolver: formResolver<FormValues, UserCreateInput | UserUpdateInput>(isEdit ? userUpdateSchema : userCreateSchema),
    defaultValues: { name: "", email: "", password: "", department: "", role: "MEMBER", status: "ACTIVE" },
  });
  const { run, submitting, formError } = useApiSubmit<FormValues>(setError);

  useEffect(() => {
    if (!open) return;
    reset({
      name: editing?.name ?? "",
      email: editing?.email ?? "",
      password: "",
      department: editing?.department ?? "",
      role: editing?.role ?? "MEMBER",
      status: editing?.status ?? "ACTIVE",
    });
  }, [open, editing, reset]);

  const onSubmit = (input: UserCreateInput | UserUpdateInput) =>
    run(() => (isEdit ? api.put(`/api/users/${editing.id}`, input) : api.post("/api/users", input)), {
      successMessage: isEdit ? "ユーザー情報を更新しました" : "ユーザーを登録しました",
      onSuccess: () => {
        onClose();
        router.refresh();
      },
    });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "ユーザーを編集" : "ユーザーを登録"}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            キャンセル
          </Button>
          <Button type="submit" form="user-form" loading={submitting}>
            {isEdit ? "変更を保存" : "登録する"}
          </Button>
        </>
      }
    >
      <form id="user-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <FormError message={formError} />
        <FormField label="氏名" htmlFor="u-name" required error={errors.name?.message}>
          <Input id="u-name" placeholder="山田 太郎" invalid={!!errors.name} {...register("name")} />
        </FormField>
        <FormField label="メールアドレス" htmlFor="u-email" required error={errors.email?.message} hint="ログインIDとして使用します">
          <Input id="u-email" type="email" autoComplete="off" invalid={!!errors.email} {...register("email")} />
        </FormField>
        <FormField label={isEdit ? "パスワード (変更する場合のみ)" : "初期パスワード"} htmlFor="u-password" required={!isEdit} error={errors.password?.message} hint="8文字以上。パスワードはハッシュ化して保存されます">
          <Input id="u-password" type="password" autoComplete="new-password" invalid={!!errors.password} {...register("password")} />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="部署" htmlFor="u-dept" error={errors.department?.message}>
            <Input id="u-dept" placeholder="営業部" invalid={!!errors.department} {...register("department")} />
          </FormField>
          <FormField label="権限" htmlFor="u-role" required error={errors.role?.message}>
            <Select id="u-role" invalid={!!errors.role} {...register("role")}>
              {ROLE_LIST.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="ステータス" htmlFor="u-status" required error={errors.status?.message}>
            <Select id="u-status" invalid={!!errors.status} {...register("status")}>
              {USER_STATUS_LIST.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
        <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
          <ShieldCheck className="mr-1 inline size-3.5 text-primary-600" />
          <strong>管理者</strong>: 全データの閲覧・編集、ユーザー管理、監査ログ、CSV取込、設定。
          <strong className="ml-2">一般ユーザー</strong>: 全データの閲覧、担当する顧客・案件・タスクの更新、対応履歴の登録。
          <br />
          ユーザーを「無効」にするとログインできなくなり、既存のセッションも失効します (担当していたデータはそのまま残ります)。
        </p>
      </form>
    </Modal>
  );
}

export function UserListView({ result }: { result: PagedResult<UserItem> }) {
  const me = useCurrentUser();
  const f = useListFilters();
  const [q, setQ] = useSearchInput("q", f);
  const [modal, setModal] = useState<{ open: boolean; editing: UserItem | null }>({ open: false, editing: null });

  return (
    <div>
      <PageHeader
        title="ユーザー・権限管理"
        description="ログインユーザーと権限を管理します。権限によって表示されるメニューと操作可能な範囲が変わります"
        actions={
          <Button icon={<UserPlus className="size-4" />} onClick={() => setModal({ open: true, editing: null })}>
            ユーザーを登録
          </Button>
        }
      />

      <Card className="mb-4">
        <CardHeader title="権限の考え方" />
        <CardBody className="grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
          <div className="rounded-lg border border-violet-100 bg-violet-50/50 p-3">
            <p className="mb-1 flex items-center gap-1.5 font-semibold text-violet-800">
              <Badge tone="purple">管理者</Badge>
            </p>
            <ul className="list-inside list-disc space-y-0.5 text-xs">
              <li>全データの閲覧・登録・編集・削除</li>
              <li>ユーザー管理・権限管理</li>
              <li>監査ログの確認、CSV取込、システム設定</li>
            </ul>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
            <p className="mb-1 flex items-center gap-1.5 font-semibold text-slate-800">
              <Badge tone="gray">一般ユーザー</Badge>
            </p>
            <ul className="list-inside list-disc space-y-0.5 text-xs">
              <li>顧客・案件・タスク・対応履歴の閲覧、CSV出力</li>
              <li>担当する顧客・案件、担当タスクの更新</li>
              <li>対応履歴の登録 (自分の記録のみ編集・削除可)</li>
            </ul>
          </div>
        </CardBody>
      </Card>

      <FilterBar onReset={f.reset} hasFilters={f.hasFilters} isPending={f.isPending} className="mb-4">
        <SearchInput value={q} onChange={setQ} placeholder="氏名・メール・部署で検索" />
        <FilterChips label="権限" values={f.getAll("role")} onChange={(v) => f.update({ role: v })} options={ROLE_LIST} />
        <FilterChips label="ステータス" values={f.getAll("status")} onChange={(v) => f.update({ status: v })} options={USER_STATUS_LIST} />
      </FilterBar>

      <Card>
        {result.items.length === 0 ? (
          <EmptyState title="条件に一致するユーザーがいません" />
        ) : (
          <TableWrapper>
            <Table>
              <THead>
                <tr>
                  <Th>氏名</Th>
                  <Th>メールアドレス</Th>
                  <Th>部署</Th>
                  <Th>権限</Th>
                  <Th>ステータス</Th>
                  <Th align="right">担当案件</Th>
                  <Th align="right">担当タスク</Th>
                  <Th>最終ログイン</Th>
                  <Th align="right"></Th>
                </tr>
              </THead>
              <TBody>
                {result.items.map((u) => (
                  <Tr key={u.id} className={u.status === "INACTIVE" ? "opacity-60" : ""}>
                    <Td>
                      <span className="inline-flex items-center gap-2 font-medium text-slate-900">
                        <Avatar name={u.name} /> {u.name}
                        {u.id === me.id && <span className="text-[11px] font-normal text-slate-400">(自分)</span>}
                      </span>
                    </Td>
                    <Td className="text-slate-600">{u.email}</Td>
                    <Td>{u.department ?? <span className="text-slate-400">—</span>}</Td>
                    <Td>
                      <OptionBadge option={ROLE[u.role]} dot={false} />
                    </Td>
                    <Td>
                      <OptionBadge option={USER_STATUS[u.status]} />
                    </Td>
                    <Td align="right" className="tabular-nums">
                      {u._count.assignedProjects}
                    </Td>
                    <Td align="right" className="tabular-nums">
                      {u._count.assignedTasks}
                    </Td>
                    <Td className="text-xs tabular-nums text-slate-500">{formatDateTime(u.lastLoginAt)}</Td>
                    <Td align="right">
                      <Button variant="ghost" size="xs" icon={<Pencil className="size-3.5" />} onClick={() => setModal({ open: true, editing: u })}>
                        編集
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </TableWrapper>
        )}
        <Pagination page={result.page} totalPages={result.totalPages} total={result.total} pageSize={result.pageSize} onChange={f.setPage} />
      </Card>

      <UserFormModal open={modal.open} onClose={() => setModal({ open: false, editing: null })} editing={modal.editing} />
    </div>
  );
}
