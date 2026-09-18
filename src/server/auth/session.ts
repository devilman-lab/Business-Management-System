import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import type { User } from "@prisma/client";
import type { CurrentUser } from "@/lib/types";
import { prisma } from "@/server/db";

export type { CurrentUser };

/**
 * セッション管理。
 * - セッションはDBに保存し、Cookie にはランダムなトークンのみを持たせる
 *   (ユーザーIDや権限を Cookie に載せないため、改ざんによる権限昇格ができない)
 * - Cookie は httpOnly / sameSite=lax / 本番では secure
 * - ログアウト時・ユーザー無効化時はサーバー側で即時失効できる
 */

export const SESSION_COOKIE = "bms_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12時間

export function toCurrentUser(user: User): CurrentUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
  };
}

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await prisma.session.create({
    data: { token, userId, expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
  });
  return token;
}

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export async function destroySession(token: string) {
  await prisma.session.deleteMany({ where: { token } });
}

export async function destroyAllSessions(userId: string) {
  await prisma.session.deleteMany({ where: { userId } });
}

/**
 * 現在のリクエストのログインユーザーを取得する。
 * 同一リクエスト内では React cache により1回だけDBを参照する。
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  if (session.user.status !== "ACTIVE") return null;
  return toCurrentUser(session.user);
});

/** 期限切れセッションの掃除 (ログイン時に軽く実行) */
export async function cleanupExpiredSessions() {
  await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
}
