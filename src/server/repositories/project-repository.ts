import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import type { ProjectQuery } from "@/lib/validation/schemas";
import { startOfToday } from "@/lib/utils";

export const projectListInclude = {
  customer: { select: { id: true, name: true, code: true } },
  assignee: { select: { id: true, name: true, department: true } },
  _count: { select: { tasks: true, activities: true, files: true } },
} satisfies Prisma.ProjectInclude;

export type ProjectListItem = Prisma.ProjectGetPayload<{ include: typeof projectListInclude }>;

export const projectDetailInclude = {
  customer: {
    include: { assignee: { select: { id: true, name: true } } },
  },
  assignee: { select: { id: true, name: true, department: true, email: true } },
  createdBy: { select: { id: true, name: true } },
  tasks: {
    include: {
      assignee: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
  },
  activities: {
    include: { user: { select: { id: true, name: true } } },
    orderBy: { occurredAt: "desc" },
  },
  files: {
    include: { uploadedBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  },
  auditLogs: {
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  },
} satisfies Prisma.ProjectInclude;

export type ProjectDetail = Prisma.ProjectGetPayload<{ include: typeof projectDetailInclude }>;

export function buildProjectWhere(q: ProjectQuery, currentUserId?: string): Prisma.ProjectWhereInput {
  const where: Prisma.ProjectWhereInput = {};
  const and: Prisma.ProjectWhereInput[] = [];

  if (q.q) {
    and.push({
      OR: [
        { name: { contains: q.q } },
        { code: { contains: q.q } },
        { description: { contains: q.q } },
        { customer: { name: { contains: q.q } } },
      ],
    });
  }
  if (q.customerId) and.push({ customerId: q.customerId });
  if (q.assigneeId) and.push({ assigneeId: q.assigneeId === "none" ? null : q.assigneeId });
  if (q.mine && currentUserId) and.push({ assigneeId: currentUserId });
  if (q.status?.length) and.push({ status: { in: q.status } });
  if (q.priority?.length) and.push({ priority: { in: q.priority } });
  if (q.dueFrom) and.push({ dueDate: { gte: q.dueFrom } });
  if (q.dueTo) {
    const end = new Date(q.dueTo);
    end.setDate(end.getDate() + 1);
    and.push({ dueDate: { lt: end } });
  }
  if (q.overdue) {
    and.push({ dueDate: { lt: startOfToday() }, status: { not: "COMPLETED" } });
  }
  if (and.length) where.AND = and;
  return where;
}

export async function listProjects(q: ProjectQuery, currentUserId?: string) {
  const where = buildProjectWhere(q, currentUserId);
  const orderBy: Prisma.ProjectOrderByWithRelationInput[] =
    q.sort === "dueDate"
      ? [{ dueDate: { sort: q.order, nulls: "last" } }, { updatedAt: "desc" }]
      : [{ [q.sort]: q.order }];
  const [items, total] = await Promise.all([
    prisma.project.findMany({
      where,
      include: projectListInclude,
      orderBy,
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
    prisma.project.count({ where }),
  ]);
  return { items, total };
}

export async function findAllProjectsForExport(q: ProjectQuery, currentUserId?: string) {
  return prisma.project.findMany({
    where: buildProjectWhere(q, currentUserId),
    include: projectListInclude,
    orderBy: { [q.sort]: q.order },
  });
}

export function findProjectById(id: string) {
  return prisma.project.findUnique({ where: { id }, include: projectDetailInclude });
}

export function findProjectBasic(id: string) {
  return prisma.project.findUnique({ where: { id }, include: projectListInclude });
}

export function listProjectOptions(customerId?: string) {
  return prisma.project.findMany({
    where: customerId ? { customerId } : undefined,
    select: { id: true, name: true, code: true, customerId: true },
    orderBy: { updatedAt: "desc" },
  });
}

/** 案件番号採番 (PJ-2026-001 形式) */
export async function nextProjectCode(tx: Prisma.TransactionClient, now = new Date()): Promise<string> {
  const prefix = `PJ-${now.getFullYear()}-`;
  const last = await tx.project.findFirst({
    where: { code: { startsWith: prefix } },
    orderBy: { code: "desc" },
    select: { code: true },
  });
  const n = last ? Number(last.code.replace(prefix, "")) + 1 : 1;
  return `${prefix}${String(n).padStart(3, "0")}`;
}
