import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { ForbiddenError } from "@/server/errors";
import { parseChanges } from "@/server/audit/audit-service";
import { canViewAuditLogs } from "@/lib/policy";
import { addDays } from "@/lib/utils";
import type { CurrentUser, FieldChange, PagedResult } from "@/lib/types";
import type { AuditQuery } from "@/lib/validation/schemas";

export const auditInclude = {
  user: { select: { id: true, name: true, department: true } },
  project: { select: { id: true, name: true, code: true } },
  customer: { select: { id: true, name: true, code: true } },
} satisfies Prisma.AuditLogInclude;

export type AuditLogItem = Omit<
  Prisma.AuditLogGetPayload<{ include: typeof auditInclude }>,
  "changes"
> & { changes: FieldChange[] };

export async function getAuditLogList(
  user: CurrentUser,
  q: AuditQuery,
): Promise<PagedResult<AuditLogItem>> {
  if (!canViewAuditLogs(user)) throw new ForbiddenError("監査ログは管理者のみ閲覧できます");
  const and: Prisma.AuditLogWhereInput[] = [];
  if (q.q) {
    and.push({
      OR: [
        { entityLabel: { contains: q.q } },
        { summary: { contains: q.q } },
        { user: { name: { contains: q.q } } },
      ],
    });
  }
  if (q.userId) and.push({ userId: q.userId });
  if (q.entityType) and.push({ entityType: q.entityType });
  if (q.entityId) and.push({ entityId: q.entityId });
  if (q.action?.length) and.push({ action: { in: q.action } });
  if (q.from) and.push({ createdAt: { gte: q.from } });
  if (q.to) and.push({ createdAt: { lt: addDays(q.to, 1) } });
  const where = and.length ? { AND: and } : {};

  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: auditInclude,
      orderBy: { createdAt: "desc" },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);
  return {
    items: rows.map((r) => ({ ...r, changes: parseChanges(r.changes) })),
    total,
    page: q.page,
    pageSize: q.pageSize,
    totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
  };
}
