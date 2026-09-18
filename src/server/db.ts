import { Prisma, PrismaClient } from "@prisma/client";

/**
 * 接続文字列の解決。
 * ローカルは DATABASE_URL (SQLite)。Vercel の Storage 連携 (Neon / Supabase 等) では
 * POSTGRES_PRISMA_URL / POSTGRES_URL という名前で提供されることがあるため順に探す。
 */
export function resolveDatabaseUrl(): string | undefined {
  return process.env.DATABASE_URL ?? process.env.POSTGRES_PRISMA_URL ?? process.env.POSTGRES_URL;
}

/**
 * 接続確立に失敗した場合のみ再試行する (クエリ自体は送信されていないため副作用なし)。
 *   P1001: DB に到達できない / P1002: 接続タイムアウト / P2024: 接続プール待ちタイムアウト
 * サーバーレス + マネージド DB (Neon 等) のコールドスタート直後に発生しやすい。
 */
const RETRYABLE = new Set(["P1001", "P1002", "P2024"]);
const RETRY_DELAYS_MS = [250, 750];

function createClient(): PrismaClient {
  const base = new PrismaClient({
    datasourceUrl: resolveDatabaseUrl(),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
  const extended = base.$extends({
    query: {
      async $allOperations({ args, query }) {
        for (let attempt = 0; ; attempt++) {
          try {
            return await query(args);
          } catch (e) {
            const code = e instanceof Prisma.PrismaClientKnownRequestError ? e.code : (e as { errorCode?: string })?.errorCode;
            if (!RETRYABLE.has(code ?? "") || attempt >= RETRY_DELAYS_MS.length) throw e;
            await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
          }
        }
      },
    },
  });
  // メソッドを追加していないため API は PrismaClient と同一。サービス層の型 (Prisma.TransactionClient 等) を保つため素の型で公開する
  return extended as unknown as PrismaClient;
}

/**
 * Prisma Client のシングルトン。
 * 開発時のホットリロードで接続が増え続けないよう globalThis に保持する。
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export type Db = typeof prisma;
