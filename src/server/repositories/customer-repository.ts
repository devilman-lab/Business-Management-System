import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import type { CustomerQuery } from "@/lib/validation/schemas";

/**
 * 顧客リポジトリ: DB アクセスのみを担当し、業務ルールは持たない。
 */

export const customerListInclude = {
  assignee: { select: { id: true, name: true, department: true } },
  _count: { select: { projects: true, activities: true } },
} satisfies Prisma.CustomerInclude;

export type CustomerListItem = Prisma.CustomerGetPayload<{ include: typeof customerListInclude }>;

export const customerDetailInclude = {
  assignee: { select: { id: true, name: true, department: true } },
  createdBy: { select: { id: true, name: true } },
  projects: {
    include: {
      assignee: { select: { id: true, name: true } },
      _count: { select: { tasks: true } },
    },
    orderBy: { updatedAt: "desc" },
  },
  activities: {
    include: {
      user: { select: { id: true, name: true } },
      project: { select: { id: true, name: true, code: true } },
    },
    orderBy: { occurredAt: "desc" },
    take: 50,
  },
} satisfies Prisma.CustomerInclude;

export type CustomerDetail = Prisma.CustomerGetPayload<{ include: typeof customerDetailInclude }>;

export function buildCustomerWhere(q: CustomerQuery): Prisma.CustomerWhereInput {
  const where: Prisma.CustomerWhereInput = {};
  if (q.q) {
    where.OR = [
      { name: { contains: q.q } },
      { nameKana: { contains: q.q } },
      { code: { contains: q.q } },
      { contactName: { contains: q.q } },
      { email: { contains: q.q } },
      { phone: { contains: q.q } },
    ];
  }
  if (q.status?.length) where.status = { in: q.status };
  if (q.assigneeId) where.assigneeId = q.assigneeId === "none" ? null : q.assigneeId;
  return where;
}

export async function listCustomers(q: CustomerQuery) {
  const where = buildCustomerWhere(q);
  const [items, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      include: customerListInclude,
      orderBy: { [q.sort]: q.order },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
    prisma.customer.count({ where }),
  ]);
  return { items, total };
}

export async function findAllCustomersForExport(q: CustomerQuery) {
  return prisma.customer.findMany({
    where: buildCustomerWhere(q),
    include: customerListInclude,
    orderBy: { [q.sort]: q.order },
  });
}

export function findCustomerById(id: string) {
  return prisma.customer.findUnique({ where: { id }, include: customerDetailInclude });
}

export function findCustomerBasic(id: string) {
  return prisma.customer.findUnique({ where: { id }, include: customerListInclude });
}

export function listCustomerOptions() {
  return prisma.customer.findMany({
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });
}

/** 顧客コード採番 (C-0001 形式)。本番では採番テーブル/シーケンスを利用する想定 */
export async function nextCustomerCode(tx: Prisma.TransactionClient): Promise<string> {
  const last = await tx.customer.findFirst({
    where: { code: { startsWith: "C-" } },
    orderBy: { code: "desc" },
    select: { code: true },
  });
  const n = last ? Number(last.code.replace("C-", "")) + 1 : 1;
  return `C-${String(n).padStart(4, "0")}`;
}
