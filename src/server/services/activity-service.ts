import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { ForbiddenError, NotFoundError, ValidationError } from "@/server/errors";
import {
  diffEntities,
  recordAudit,
  summarizeChanges,
  type AuditContext,
  type FieldDef,
} from "@/server/audit/audit-service";
import { canCreateActivity, canDeleteActivity, canEditActivity } from "@/lib/policy";
import { ACTIVITY_TYPE } from "@/lib/constants";
import { addDays, formatDateTime } from "@/lib/utils";
import type { PagedResult } from "@/lib/types";
import type { ActivityInput, ActivityQuery } from "@/lib/validation/schemas";

export const activityInclude = {
  user: { select: { id: true, name: true, department: true } },
  customer: { select: { id: true, name: true, code: true } },
  project: { select: { id: true, name: true, code: true } },
} satisfies Prisma.ActivityInclude;

export type ActivityItem = Prisma.ActivityGetPayload<{ include: typeof activityInclude }>;

const activityFields: FieldDef<ActivityItem>[] = [
  { field: "type", label: "対応種別", get: (a) => ACTIVITY_TYPE[a.type].label },
  { field: "occurredAt", label: "対応日時", get: (a) => formatDateTime(a.occurredAt) },
  { field: "title", label: "件名", get: (a) => a.title },
  { field: "content", label: "内容", get: (a) => a.content },
  { field: "projectId", label: "関連案件", get: (a) => a.project?.name ?? null },
];

function buildWhere(q: ActivityQuery): Prisma.ActivityWhereInput {
  const and: Prisma.ActivityWhereInput[] = [];
  if (q.q) {
    and.push({
      OR: [
        { title: { contains: q.q } },
        { content: { contains: q.q } },
        { customer: { name: { contains: q.q } } },
        { project: { name: { contains: q.q } } },
      ],
    });
  }
  if (q.customerId) and.push({ customerId: q.customerId });
  if (q.projectId) and.push({ projectId: q.projectId });
  if (q.userId) and.push({ userId: q.userId });
  if (q.type?.length) and.push({ type: { in: q.type } });
  if (q.from) and.push({ occurredAt: { gte: q.from } });
  if (q.to) and.push({ occurredAt: { lt: addDays(q.to, 1) } });
  return and.length ? { AND: and } : {};
}

export async function getActivityList(q: ActivityQuery): Promise<PagedResult<ActivityItem>> {
  const where = buildWhere(q);
  const [items, total] = await Promise.all([
    prisma.activity.findMany({
      where,
      include: activityInclude,
      orderBy: { occurredAt: "desc" },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
    prisma.activity.count({ where }),
  ]);
  return { items, total, page: q.page, pageSize: q.pageSize, totalPages: Math.max(1, Math.ceil(total / q.pageSize)) };
}

export async function getActivity(id: string) {
  const a = await prisma.activity.findUnique({ where: { id }, include: activityInclude });
  if (!a) throw new NotFoundError("対応履歴が見つかりません");
  return a;
}

async function assertReferences(input: ActivityInput) {
  const fieldErrors: Record<string, string[]> = {};
  const customer = await prisma.customer.findUnique({ where: { id: input.customerId }, select: { id: true } });
  if (!customer) fieldErrors.customerId = ["顧客が存在しません"];
  if (input.projectId) {
    const project = await prisma.project.findUnique({
      where: { id: input.projectId },
      select: { customerId: true },
    });
    if (!project) fieldErrors.projectId = ["案件が存在しません"];
    else if (project.customerId !== input.customerId)
      fieldErrors.projectId = ["選択した案件は指定した顧客の案件ではありません"];
  }
  if (Object.keys(fieldErrors).length) throw new ValidationError("入力内容に誤りがあります", fieldErrors);
}

export async function createActivity(ctx: AuditContext, input: ActivityInput) {
  if (!ctx.user || !canCreateActivity(ctx.user)) throw new ForbiddenError();
  await assertReferences(input);
  const userId = ctx.user.id;

  return prisma.$transaction(async (tx) => {
    const a = await tx.activity.create({
      data: {
        customerId: input.customerId,
        projectId: input.projectId ?? null,
        userId,
        type: input.type,
        occurredAt: input.occurredAt ?? new Date(),
        title: input.title,
        content: input.content ?? null,
      },
      include: activityInclude,
    });
    await recordAudit(
      ctx,
      {
        action: "CREATE",
        entityType: "activity",
        entityId: a.id,
        entityLabel: a.title,
        summary: `対応履歴「${a.title}」(${ACTIVITY_TYPE[a.type].label})を登録`,
        projectId: a.projectId,
        customerId: a.customerId,
      },
      tx,
    );
    return a;
  });
}

export async function updateActivity(ctx: AuditContext, id: string, input: ActivityInput) {
  const before = await getActivity(id);
  if (!canEditActivity(ctx.user, before)) throw new ForbiddenError("他のユーザーの対応履歴は編集できません");
  await assertReferences(input);

  return prisma.$transaction(async (tx) => {
    const after = await tx.activity.update({
      where: { id },
      data: {
        customerId: input.customerId,
        projectId: input.projectId ?? null,
        type: input.type,
        occurredAt: input.occurredAt ?? before.occurredAt,
        title: input.title,
        content: input.content ?? null,
      },
      include: activityInclude,
    });
    const changes = diffEntities(before, after, activityFields);
    if (changes.length) {
      await recordAudit(
        ctx,
        {
          action: "UPDATE",
          entityType: "activity",
          entityId: after.id,
          entityLabel: after.title,
          changes,
          summary: summarizeChanges(changes),
          projectId: after.projectId,
          customerId: after.customerId,
        },
        tx,
      );
    }
    return after;
  });
}

export async function deleteActivity(ctx: AuditContext, id: string) {
  const target = await getActivity(id);
  if (!canDeleteActivity(ctx.user, target)) throw new ForbiddenError("他のユーザーの対応履歴は削除できません");
  await prisma.$transaction(async (tx) => {
    await tx.activity.delete({ where: { id } });
    await recordAudit(
      ctx,
      {
        action: "DELETE",
        entityType: "activity",
        entityId: id,
        entityLabel: target.title,
        summary: `対応履歴「${target.title}」を削除`,
        projectId: target.projectId,
        customerId: target.customerId,
      },
      tx,
    );
  });
}
