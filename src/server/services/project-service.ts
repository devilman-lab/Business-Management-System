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
  findProjectBasic,
  findProjectById,
  listProjects,
  nextProjectCode,
  projectListInclude,
  type ProjectListItem,
} from "@/server/repositories/project-repository";
import { canCreateProject, canDeleteProject, canEditProject } from "@/lib/policy";
import { PRIORITY, PROJECT_STATUS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { CurrentUser, PagedResult } from "@/lib/types";
import type {
  ProjectInput,
  ProjectQuery,
  ProjectQuickUpdateInput,
} from "@/lib/validation/schemas";

const projectFields: FieldDef<ProjectListItem>[] = [
  { field: "name", label: "案件名", get: (p) => p.name },
  { field: "customerId", label: "顧客", get: (p) => p.customer.name },
  { field: "assigneeId", label: "担当者", get: (p) => p.assignee?.name ?? null },
  { field: "status", label: "ステータス", get: (p) => PROJECT_STATUS[p.status].label },
  { field: "priority", label: "優先度", get: (p) => PRIORITY[p.priority].label },
  { field: "progress", label: "進捗率", get: (p) => `${p.progress}%` },
  { field: "startDate", label: "開始日", get: (p) => (p.startDate ? formatDate(p.startDate) : null) },
  { field: "dueDate", label: "期限", get: (p) => (p.dueDate ? formatDate(p.dueDate) : null) },
  { field: "budget", label: "予算", get: (p) => (p.budget != null ? `¥${p.budget.toLocaleString()}` : null) },
  { field: "description", label: "概要", get: (p) => p.description },
];

export async function getProjectList(
  q: ProjectQuery,
  user: CurrentUser,
): Promise<PagedResult<ProjectListItem>> {
  const { items, total } = await listProjects(q, user.id);
  return {
    items,
    total,
    page: q.page,
    pageSize: q.pageSize,
    totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
  };
}

export async function getProjectDetail(id: string) {
  const project = await findProjectById(id);
  if (!project) throw new NotFoundError("案件が見つかりません");
  return project;
}

async function assertReferences(input: { customerId?: string; assigneeId?: string | null }) {
  const fieldErrors: Record<string, string[]> = {};
  if (input.customerId) {
    const c = await prisma.customer.findUnique({ where: { id: input.customerId }, select: { id: true } });
    if (!c) fieldErrors.customerId = ["顧客が存在しません"];
  }
  if (input.assigneeId) {
    const u = await prisma.user.findUnique({ where: { id: input.assigneeId }, select: { status: true } });
    if (!u) fieldErrors.assigneeId = ["担当者が存在しません"];
    else if (u.status !== "ACTIVE") fieldErrors.assigneeId = ["無効なユーザーは担当者にできません"];
  }
  if (Object.keys(fieldErrors).length) throw new ValidationError("入力内容に誤りがあります", fieldErrors);
}

/** ステータスと進捗率・完了日の整合を取る */
function reconcileStatus(data: {
  status: ProjectListItem["status"];
  progress: number;
  completedAt: Date | null;
}) {
  if (data.status === "COMPLETED") {
    return { ...data, progress: 100, completedAt: data.completedAt ?? new Date() };
  }
  return { ...data, completedAt: null };
}

export async function createProject(ctx: AuditContext, input: ProjectInput) {
  if (!canCreateProject(ctx.user)) throw new ForbiddenError();
  await assertReferences(input);

  return prisma.$transaction(async (tx) => {
    const code = await nextProjectCode(tx);
    const st = reconcileStatus({ status: input.status, progress: input.progress, completedAt: null });
    const p = await tx.project.create({
      data: {
        code,
        name: input.name,
        description: input.description ?? null,
        customerId: input.customerId,
        assigneeId: input.assigneeId ?? null,
        status: st.status,
        priority: input.priority,
        progress: st.progress,
        startDate: input.startDate ?? null,
        dueDate: input.dueDate ?? null,
        completedAt: st.completedAt,
        budget: input.budget ?? null,
        createdById: ctx.user?.id ?? null,
      },
      include: projectListInclude,
    });
    await recordAudit(
      ctx,
      {
        action: "CREATE",
        entityType: "project",
        entityId: p.id,
        entityLabel: p.name,
        summary: `案件「${p.name}」を登録`,
        projectId: p.id,
        customerId: p.customerId,
      },
      tx,
    );
    return p;
  });
}

export async function updateProject(ctx: AuditContext, id: string, input: ProjectInput) {
  const before = await findProjectBasic(id);
  if (!before) throw new NotFoundError("案件が見つかりません");
  if (!canEditProject(ctx.user, before)) throw new ForbiddenError("この案件を編集する権限がありません");
  await assertReferences(input);

  return prisma.$transaction(async (tx) => {
    const st = reconcileStatus({
      status: input.status,
      progress: input.progress,
      completedAt: before.completedAt,
    });
    const after = await tx.project.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description ?? null,
        customerId: input.customerId,
        assigneeId: input.assigneeId ?? null,
        status: st.status,
        priority: input.priority,
        progress: st.progress,
        startDate: input.startDate ?? null,
        dueDate: input.dueDate ?? null,
        completedAt: st.completedAt,
        budget: input.budget ?? null,
      },
      include: projectListInclude,
    });
    await writeUpdateAudit(ctx, before, after, tx);
    return after;
  });
}

/** 詳細画面からのクイック更新 (ステータス・担当者・進捗・優先度) */
export async function quickUpdateProject(
  ctx: AuditContext,
  id: string,
  input: ProjectQuickUpdateInput,
) {
  const before = await findProjectBasic(id);
  if (!before) throw new NotFoundError("案件が見つかりません");
  if (!canEditProject(ctx.user, before)) throw new ForbiddenError("この案件を更新する権限がありません");
  if (input.assigneeId !== undefined) await assertReferences({ assigneeId: input.assigneeId });

  return prisma.$transaction(async (tx) => {
    const st = reconcileStatus({
      status: input.status ?? before.status,
      progress: input.progress ?? before.progress,
      completedAt: before.completedAt,
    });
    const after = await tx.project.update({
      where: { id },
      data: {
        status: st.status,
        progress: st.progress,
        completedAt: st.completedAt,
        ...(input.assigneeId !== undefined ? { assigneeId: input.assigneeId ?? null } : {}),
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
      },
      include: projectListInclude,
    });
    await writeUpdateAudit(ctx, before, after, tx);
    return after;
  });
}

async function writeUpdateAudit(
  ctx: AuditContext,
  before: ProjectListItem,
  after: ProjectListItem,
  tx: Parameters<typeof recordAudit>[2],
) {
  const changes = diffEntities(before, after, projectFields);
  if (changes.length === 0) return;
  await recordAudit(
    ctx,
    {
      action: "UPDATE",
      entityType: "project",
      entityId: after.id,
      entityLabel: after.name,
      changes,
      summary: summarizeChanges(changes),
      projectId: after.id,
      customerId: after.customerId,
    },
    tx,
  );
}

export async function deleteProject(ctx: AuditContext, id: string) {
  if (!canDeleteProject(ctx.user)) throw new ForbiddenError("案件の削除は管理者のみ行えます");
  const target = await prisma.project.findUnique({ where: { id }, select: { id: true, name: true, customerId: true } });
  if (!target) throw new NotFoundError("案件が見つかりません");
  await prisma.$transaction(async (tx) => {
    // タスク・ファイルは onDelete: Cascade、対応履歴は projectId が NULL になり顧客側に残る
    await tx.project.delete({ where: { id } });
    await recordAudit(
      ctx,
      {
        action: "DELETE",
        entityType: "project",
        entityId: id,
        entityLabel: target.name,
        summary: `案件「${target.name}」を削除`,
        customerId: target.customerId,
      },
      tx,
    );
  });
}
