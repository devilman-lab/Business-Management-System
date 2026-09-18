import { apiHandler, ok } from "@/server/api/handler";
import { prisma } from "@/server/db";
import { seedDatabase } from "@/server/seed/seed";
import { clearSessionCookie } from "@/server/auth/session";

/** リモート DB では投入に数秒かかるため、サーバーレス関数の上限を延長 (Vercel) */
export const maxDuration = 60;

/**
 * デモデータのリセット (管理者のみ)。
 * すべてのデータを削除してサンプルデータを再投入する。セッションも失効するため再ログインが必要。
 */
export const POST = apiHandler(
  async () => {
    const result = await seedDatabase(prisma);
    await clearSessionCookie();
    return ok({ ok: true, result });
  },
  { adminOnly: true },
);
