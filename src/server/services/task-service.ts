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
  findTaskById,
  listTasks,
  taskListInclude,
  type TaskListItem,
} from "@/server/repositories/task-repository";
import { canCreateTask, canDeleteTask, canEditTask } from "@/lib/policy";
import { PRIORITY, TASK_STATUS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { CurrentUser, PagedResult } from "@/lib/types";
import type { TaskInput, TaskQuery, TaskQuickUpdateInput } from "@/lib/validation/schemas";
import { getDueSoonDays } from "./settings-service";

const taskFields: FieldDef<TaskListItem>[] = [
  { field: "title", label: "タスク名", get: (t) => t.title },
  { field: "assigneeId", label: "担当者", get: (t) => t.assignee?.name ?? null },
  { field: "status", label: "ステータス", get: (t) => TASK_STATUS[t.status].label },
  { field: "priority", label: "優先度", get: (t) => PRIORITY[t.priority].label },
  { field: "dueDate", label: "期限", get: (t) => (t.dueDate ? formatDate(t.dueDate) : null) },
  { field: "description", label: "内容", get: (t) => t.description },
];

export async function getTaskList(q: TaskQuery, user: CurrentUser): Promise<PagedResult<TaskListItem>> {
  const dueSoonDays = await getDueSoonDays();
  const { items, total } = await listTasks(q, user.id, dueSoonDays);
  return {
    items,
    total,
    page: q.page,
    pageSize: q.pageSize,
    totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
  };
}

export async function getTask(id: string) {
  const task = await findTaskById(id);
  if (!task) throw new NotFoundError("タスクが見つかりません");
  return task;
}

async function assertReferences(input: { projectId?: string; assigneeId?: string | null }) {
  const fieldErrors: Record<string, string[]> = {};
  if (input.projectId) {
    const p = await prisma.project.findUnique({ where: { id: input.projectId }, select: { id: true } });
    if (!p) fieldErrors.projectId = ["案件が存在しません"];
  }
  if (input.assigneeId) {
    const u = await prisma.user.findUnique({ where: { id: input.assigneeId }, select: { status: true } });
    if (!u) fieldErrors.assigneeId = ["担当者が存在しません"];
    else if (u.status !== "ACTIVE") fieldErrors.assigneeId = ["無効なユーザーは担当者にできません"];
  }
  if (Object.keys(fieldErrors).length) throw new ValidationError("入力内容に誤りがあります", fieldErrors);
}

function completedAtFor(status: TaskListItem["status"], prev: Date | null) {
  if (status === "COMPLETED") return prev ?? new Date();
  return null;
}

export async function createTask(ctx: AuditContext, input: TaskInput) {
  if (!canCreateTask(ctx.user)) throw new ForbiddenError();
  await assertReferences(input);

  return prisma.$transaction(async (tx) => {
    const t = await tx.task.create({
      data: {
        projectId: input.projectId,
        title: input.title,
        description: input.description ?? null,
        assigneeId: input.assigneeId ?? null,
        status: input.status,
        priority: input.priority,
        dueDate: input.dueDate ?? null,
        completedAt: completedAtFor(input.status, null),
        createdById: ctx.user?.id ?? null,
      },
      include: taskListInclude,
    });
    await recordAudit(
      ctx,
      {
        action: "CREATE",
        entityType: "task",
        entityId: t.id,
        entityLabel: t.title,
        summary: `タスク「${t.title}」を登録 (案件: ${t.project.name})`,
        projectId: t.projectId,
        customerId: t.project.customer.id,
      },
      tx,
    );
    return t;
  });
}

export async function updateTask(ctx: AuditContext, id: string, input: TaskInput) {
  const before = await findTaskById(id);
  if (!before) throw new NotFoundError("タスクが見つかりません");
  if (!canEditTask(ctx.user, before)) throw new ForbiddenError("このタスクを編集する権限がありません");
  await assertReferences(input);

  return prisma.$transaction(async (tx) => {
    const after = await tx.task.update({
      where: { id },
      data: {
        projectId: input.projectId,
        title: input.title,
        description: input.description ?? null,
        assigneeId: input.assigneeId ?? null,
        status: input.status,
        priority: input.priority,
        dueDate: input.dueDate ?? null,
        completedAt: completedAtFor(input.status, before.completedAt),
      },
      include: taskListInclude,
    });
    await writeUpdateAudit(ctx, before, after, tx);
    return after;
  });
}

export async function quickUpdateTask(ctx: AuditContext, id: string, input: TaskQuickUpdateInput) {
  const before = await findTaskById(id);
  if (!before) throw new NotFoundError("タスクが見つかりません");
  if (!canEditTask(ctx.user, before)) throw new ForbiddenError("このタスクを更新する権限がありません");
  if (input.assigneeId !== undefined) await assertReferences({ assigneeId: input.assigneeId });

  return prisma.$transaction(async (tx) => {
    const status = input.status ?? before.status;
    const after = await tx.task.update({
      where: { id },
      data: {
        status,
        completedAt: completedAtFor(status, before.completedAt),
        ...(input.assigneeId !== undefined ? { assigneeId: input.assigneeId ?? null } : {}),
      },
      include: taskListInclude,
    });
    await writeUpdateAudit(ctx, before, after, tx);
    return after;
  });
}

async function writeUpdateAudit(
  ctx: AuditContext,
  before: TaskListItem,
  after: TaskListItem,
  tx: Parameters<typeof recordAudit>[2],
) {
  const changes = diffEntities(before, after, taskFields);
  if (changes.length === 0) return;
  await recordAudit(
    ctx,
    {
      action: "UPDATE",
      entityType: "task",
      entityId: after.id,
      entityLabel: after.title,
      changes,
      summary: summarizeChanges(changes),
      projectId: after.projectId,
      customerId: after.project.customer.id,
    },
    tx,
  );
}

export async function deleteTask(ctx: AuditContext, id: string) {
  const target = await findTaskById(id);
  if (!target) throw new NotFoundError("タスクが見つかりません");
  if (!canDeleteTask(ctx.user, target)) throw new ForbiddenError("このタスクを削除する権限がありません");
  await prisma.$transaction(async (tx) => {
    await tx.task.delete({ where: { id } });
    await recordAudit(
      ctx,
      {
        action: "DELETE",
        entityType: "task",
        entityId: id,
        entityLabel: target.title,
        summary: `タスク「${target.title}」を削除`,
        projectId: target.projectId,
        customerId: target.project.customer.id,
      },
      tx,
    );
  });
}
