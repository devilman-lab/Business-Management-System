import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/server/errors";
import {
  diffEntities,
  recordAudit,
  summarizeChanges,
  type AuditContext,
  type FieldDef,
} from "@/server/audit/audit-service";
import { hashPassword } from "@/server/auth/password";
import { destroyAllSessions } from "@/server/auth/session";
import { canManageUsers } from "@/lib/policy";
import { ROLE, USER_STATUS } from "@/lib/constants";
import type { PagedResult, UserOption } from "@/lib/types";
import type { UserCreateInput, UserQuery, UserUpdateInput } from "@/lib/validation/schemas";

/** 画面へ返すユーザー情報 (passwordHash は絶対に含めない) */
export const userSelect = {
  id: true,
  name: true,
  email: true,
  department: true,
  role: true,
  status: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { assignedProjects: true, assignedTasks: true } },
} satisfies Prisma.UserSelect;

export type UserItem = Prisma.UserGetPayload<{ select: typeof userSelect }>;

const userFields: FieldDef<UserItem>[] = [
  { field: "name", label: "氏名", get: (u) => u.name },
  { field: "email", label: "メールアドレス", get: (u) => u.email },
  { field: "department", label: "部署", get: (u) => u.department },
  { field: "role", label: "権限", get: (u) => ROLE[u.role].label },
  { field: "status", label: "ステータス", get: (u) => USER_STATUS[u.status].label },
];

export async function getUserList(ctx: AuditContext, q: UserQuery): Promise<PagedResult<UserItem>> {
  if (!canManageUsers(ctx.user)) throw new ForbiddenError("ユーザー管理は管理者のみ利用できます");
  const and: Prisma.UserWhereInput[] = [];
  if (q.q) and.push({ OR: [{ name: { contains: q.q } }, { email: { contains: q.q } }, { department: { contains: q.q } }] });
  if (q.role?.length) and.push({ role: { in: q.role } });
  if (q.status?.length) and.push({ status: { in: q.status } });
  const where = and.length ? { AND: and } : {};
  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: userSelect,
      orderBy: [{ status: "asc" }, { role: "asc" }, { name: "asc" }],
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
    prisma.user.count({ where }),
  ]);
  return { items, total, page: q.page, pageSize: q.pageSize, totalPages: Math.max(1, Math.ceil(total / q.pageSize)) };
}

/** 担当者セレクト用 (全ユーザーが参照可) */
export async function listUserOptions(includeInactive = false): Promise<UserOption[]> {
  return prisma.user.findMany({
    where: includeInactive ? undefined : { status: "ACTIVE" },
    select: { id: true, name: true, department: true, status: true },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });
}

export async function getUser(ctx: AuditContext, id: string) {
  if (!canManageUsers(ctx.user)) throw new ForbiddenError();
  const u = await prisma.user.findUnique({ where: { id }, select: userSelect });
  if (!u) throw new NotFoundError("ユーザーが見つかりません");
  return u;
}

export async function createUser(ctx: AuditContext, input: UserCreateInput) {
  if (!canManageUsers(ctx.user)) throw new ForbiddenError("ユーザーの登録は管理者のみ行えます");
  const exists = await prisma.user.findUnique({ where: { email: input.email } });
  if (exists) throw new ConflictError("このメールアドレスは既に登録されています");
  const passwordHash = await hashPassword(input.password);

  return prisma.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        department: input.department ?? null,
        role: input.role,
        status: input.status,
      },
      select: userSelect,
    });
    await recordAudit(
      ctx,
      { action: "CREATE", entityType: "user", entityId: u.id, entityLabel: u.name, summary: `ユーザー「${u.name}」を登録` },
      tx,
    );
    return u;
  });
}

export async function updateUser(ctx: AuditContext, id: string, input: UserUpdateInput) {
  if (!canManageUsers(ctx.user)) throw new ForbiddenError("ユーザーの編集は管理者のみ行えます");
  const before = await prisma.user.findUnique({ where: { id }, select: userSelect });
  if (!before) throw new NotFoundError("ユーザーが見つかりません");

  // 自分自身の権限降格・無効化は誤操作防止のため禁止 (管理者が0人になることを防ぐ)
  if (ctx.user?.id === id) {
    if (input.role !== "ADMIN") throw new ValidationError("自分自身の権限は変更できません", { role: ["自分自身の権限は変更できません"] });
    if (input.status !== "ACTIVE") throw new ValidationError("自分自身を無効にすることはできません", { status: ["自分自身を無効にすることはできません"] });
  }
  const dup = await prisma.user.findFirst({ where: { email: input.email, NOT: { id } } });
  if (dup) throw new ConflictError("このメールアドレスは既に登録されています");

  const result = await prisma.$transaction(async (tx) => {
    const after = await tx.user.update({
      where: { id },
      data: {
        name: input.name,
        email: input.email,
        department: input.department ?? null,
        role: input.role,
        status: input.status,
        ...(input.password ? { passwordHash: await hashPassword(input.password) } : {}),
      },
      select: userSelect,
    });
    const changes = diffEntities(before, after, userFields);
    if (input.password) changes.push({ field: "password", label: "パスワード", before: "********", after: "(再設定)" });
    if (changes.length) {
      await recordAudit(
        ctx,
        { action: "UPDATE", entityType: "user", entityId: after.id, entityLabel: after.name, changes, summary: summarizeChanges(changes) },
        tx,
      );
    }
    return after;
  });

  // 無効化 or パスワード変更時は既存セッションを失効させる
  if (result.status === "INACTIVE" || input.password) await destroyAllSessions(id);
  return result;
}
