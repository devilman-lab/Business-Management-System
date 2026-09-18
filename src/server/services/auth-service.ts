import { prisma } from "@/server/db";
import { UnauthorizedError } from "@/server/errors";
import { verifyPassword } from "@/server/auth/password";
import {
  cleanupExpiredSessions,
  createSession,
  destroySession,
  toCurrentUser,
} from "@/server/auth/session";
import { recordAudit } from "@/server/audit/audit-service";
import type { LoginInput } from "@/lib/validation/schemas";

/**
 * ログイン。メール・パスワードのどちらが誤っていても同じメッセージを返す
 * (存在するアカウントの推測を防ぐ)。
 */
export async function login(input: LoginInput, ipAddress?: string | null) {
  const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  const ok = user ? await verifyPassword(input.password, user.passwordHash) : false;
  if (!user || !ok) {
    throw new UnauthorizedError("メールアドレスまたはパスワードが正しくありません");
  }
  if (user.status !== "ACTIVE") {
    throw new UnauthorizedError("このアカウントは無効化されています。管理者にお問い合わせください");
  }

  const token = await createSession(user.id);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  const current = toCurrentUser(user);
  await recordAudit(
    { user: current, ipAddress },
    { action: "LOGIN", entityType: "session", entityId: user.id, entityLabel: user.name, summary: "ログイン" },
  );
  void cleanupExpiredSessions().catch(() => undefined);
  return { token, user: current };
}

export async function logout(token: string, user: { id: string; name: string; email: string; role: "ADMIN" | "MEMBER"; department: string | null } | null) {
  await destroySession(token);
  if (user) {
    await recordAudit(
      { user },
      { action: "LOGOUT", entityType: "session", entityId: user.id, entityLabel: user.name, summary: "ログアウト" },
    );
  }
}
