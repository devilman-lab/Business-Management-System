import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import type { TaskQuery } from "@/lib/validation/schemas";
import { addDays, startOfToday, startOfTomorrow } from "@/lib/utils";

export const taskListInclude = {
  project: {
    select: {
      id: true,
      name: true,
      code: true,
      assigneeId: true,
      customer: { select: { id: true, name: true } },
    },
  },
  assignee: { select: { id: true, name: true, department: true } },
  createdBy: { select: { id: true, name: true } },
} satisfies Prisma.TaskInclude;

export type TaskListItem = Prisma.TaskGetPayload<{ include: typeof taskListInclude }>;

export function buildTaskWhere(
  q: TaskQuery,
  currentUserId?: string,
  dueSoonDays = 3,
): Prisma.TaskWhereInput {
  const and: Prisma.TaskWhereInput[] = [];
  const today = startOfToday();
  const tomorrow = startOfTomorrow();

  if (q.q) {
    and.push({
      OR: [
        { title: { contains: q.q } },
        { description: { contains: q.q } },
        { project: { name: { contains: q.q } } },
        { project: { customer: { name: { contains: q.q } } } },
      ],
    });
  }
  if (q.projectId) and.push({ projectId: q.projectId });
  if (q.customerId) and.push({ project: { customerId: q.customerId } });
  if (q.assigneeId) and.push({ assigneeId: q.assigneeId === "none" ? null : q.assigneeId });
  if (q.mine && currentUserId) and.push({ assigneeId: currentUserId });
  if (q.status?.length) and.push({ status: { in: q.status } });
  if (q.priority?.length) and.push({ priority: { in: q.priority } });
  if (q.dueFrom) and.push({ dueDate: { gte: q.dueFrom } });
  if (q.dueTo) and.push({ dueDate: { lt: addDays(q.dueTo, 1) } });

  switch (q.due) {
    case "overdue":
      and.push({ dueDate: { lt: today }, status: { not: "COMPLETED" } });
      break;
    case "today":
      and.push({ dueDate: { gte: today, lt: tomorrow }, status: { not: "COMPLETED" } });
      break;
    case "soon":
      and.push({
        dueDate: { gte: today, lt: addDays(today, dueSoonDays + 1) },
        status: { not: "COMPLETED" },
      });
      break;
    case "none":
      and.push({ dueDate: null });
      break;
  }
  return and.length ? { AND: and } : {};
}

export async function listTasks(q: TaskQuery, currentUserId?: string, dueSoonDays?: number) {
  const where = buildTaskWhere(q, currentUserId, dueSoonDays);
  const orderBy: Prisma.TaskOrderByWithRelationInput[] =
    q.sort === "dueDate"
      ? [{ dueDate: { sort: q.order, nulls: "last" } }, { priority: "asc" }]
      : [{ [q.sort]: q.order }];
  const [items, total] = await Promise.all([
    prisma.task.findMany({
      where,
      include: taskListInclude,
      orderBy,
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
    prisma.task.count({ where }),
  ]);
  return { items, total };
}

export function findAllTasksForExport(q: TaskQuery, currentUserId?: string) {
  return prisma.task.findMany({
    where: buildTaskWhere(q, currentUserId),
    include: taskListInclude,
    orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }],
  });
}

export function findTaskById(id: string) {
  return prisma.task.findUnique({ where: { id }, include: taskListInclude });
}
