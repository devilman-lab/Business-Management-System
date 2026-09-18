import { prisma } from "@/server/db";
import { ForbiddenError, NotFoundError, ValidationError } from "@/server/errors";
import {
  diffEntities,
  recordAudit,
  summarizeChanges,
  type AuditContext,
  type FieldDef,
} from "@/server/audit/audit-service";
import {
  customerListInclude,
  findCustomerBasic,
  findCustomerById,
  listCustomers,
  nextCustomerCode,
  type CustomerListItem,
} from "@/server/repositories/customer-repository";
import { canCreateCustomer, canDeleteCustomer, canEditCustomer } from "@/lib/policy";
import { CUSTOMER_STATUS } from "@/lib/constants";
import type { CustomerInput, CustomerQuery } from "@/lib/validation/schemas";
import type { PagedResult } from "@/lib/types";

/** 監査ログの差分検出対象 */
const customerFields: FieldDef<CustomerListItem>[] = [
  { field: "name", label: "顧客名", get: (c) => c.name },
  { field: "nameKana", label: "フリガナ", get: (c) => c.nameKana },
  { field: "contactName", label: "先方担当者", get: (c) => c.contactName },
  { field: "contactTitle", label: "役職", get: (c) => c.contactTitle },
  { field: "phone", label: "電話番号", get: (c) => c.phone },
  { field: "email", label: "メールアドレス", get: (c) => c.email },
  { field: "address", label: "住所", get: (c) => c.address },
  { field: "industry", label: "業種", get: (c) => c.industry },
  { field: "status", label: "ステータス", get: (c) => CUSTOMER_STATUS[c.status].label },
  { field: "assigneeId", label: "社内担当", get: (c) => c.assignee?.name ?? null },
  { field: "notes", label: "備考", get: (c) => c.notes },
];

export async function getCustomerList(q: CustomerQuery): Promise<PagedResult<CustomerListItem>> {
  const { items, total } = await listCustomers(q);
  return {
    items,
    total,
    page: q.page,
    pageSize: q.pageSize,
    totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
  };
}

export async function getCustomerDetail(id: string) {
  const customer = await findCustomerById(id);
  if (!customer) throw new NotFoundError("顧客が見つかりません");
  return customer;
}

async function assertAssignee(assigneeId: string | null | undefined) {
  if (!assigneeId) return;
  const user = await prisma.user.findUnique({ where: { id: assigneeId }, select: { status: true } });
  if (!user) throw new ValidationError("入力内容に誤りがあります", { assigneeId: ["担当者が存在しません"] });
  if (user.status !== "ACTIVE")
    throw new ValidationError("入力内容に誤りがあります", { assigneeId: ["無効なユーザーは担当者にできません"] });
}

export async function createCustomer(ctx: AuditContext, input: CustomerInput) {
  if (!canCreateCustomer(ctx.user)) throw new ForbiddenError();
  await assertAssignee(input.assigneeId);

  const created = await prisma.$transaction(async (tx) => {
    const code = await nextCustomerCode(tx);
    const c = await tx.customer.create({
      data: {
        code,
        name: input.name,
        nameKana: input.nameKana ?? null,
        contactName: input.contactName ?? null,
        contactTitle: input.contactTitle ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        address: input.address ?? null,
        industry: input.industry ?? null,
        status: input.status,
        notes: input.notes ?? null,
        assigneeId: input.assigneeId ?? null,
        createdById: ctx.user?.id ?? null,
      },
      include: customerListInclude,
    });
    await recordAudit(
      ctx,
      {
        action: "CREATE",
        entityType: "customer",
        entityId: c.id,
        entityLabel: c.name,
        summary: `顧客「${c.name}」を登録`,
        customerId: c.id,
      },
      tx,
    );
    return c;
  });
  return created;
}

export async function updateCustomer(ctx: AuditContext, id: string, input: CustomerInput) {
  const before = await findCustomerBasic(id);
  if (!before) throw new NotFoundError("顧客が見つかりません");
  if (!canEditCustomer(ctx.user, before)) throw new ForbiddenError("この顧客を編集する権限がありません");
  await assertAssignee(input.assigneeId);

  return prisma.$transaction(async (tx) => {
    const after = await tx.customer.update({
      where: { id },
      data: {
        name: input.name,
        nameKana: input.nameKana ?? null,
        contactName: input.contactName ?? null,
        contactTitle: input.contactTitle ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        address: input.address ?? null,
        industry: input.industry ?? null,
        status: input.status,
        notes: input.notes ?? null,
        assigneeId: input.assigneeId ?? null,
      },
      include: customerListInclude,
    });
    const changes = diffEntities(before, after, customerFields);
    if (changes.length > 0) {
      await recordAudit(
        ctx,
        {
          action: "UPDATE",
          entityType: "customer",
          entityId: after.id,
          entityLabel: after.name,
          changes,
          summary: summarizeChanges(changes),
          customerId: after.id,
        },
        tx,
      );
    }
    return after;
  });
}

export async function deleteCustomer(ctx: AuditContext, id: string) {
  if (!canDeleteCustomer(ctx.user)) throw new ForbiddenError("顧客の削除は管理者のみ行えます");
  const target = await prisma.customer.findUnique({
    where: { id },
    include: { _count: { select: { projects: true } } },
  });
  if (!target) throw new NotFoundError("顧客が見つかりません");
  if (target._count.projects > 0) {
    throw new ValidationError(
      `この顧客には案件が${target._count.projects}件紐づいているため削除できません。先に案件を削除するか、ステータスを「取引終了」に変更してください。`,
    );
  }
  await prisma.$transaction(async (tx) => {
    await tx.customer.delete({ where: { id } });
    await recordAudit(
      ctx,
      {
        action: "DELETE",
        entityType: "customer",
        entityId: id,
        entityLabel: target.name,
        summary: `顧客「${target.name}」を削除`,
      },
      tx,
    );
  });
}
