import { Prisma, PrismaClient } from "@prisma/client";

/**
 * 接続文字列の解決。
 * ローカルは DATABASE_URL (SQLite)。Vercel の Storage 連携では提供元によって変数名が異なる
 * (Neon: DATABASE_URL、Prisma Postgres: PRISMA_DATABASE_URL / POSTGRES_URL、Supabase: POSTGRES_PRISMA_URL 等)
 * ため、候補名を順に見た後、名前のパターンと値の形式 (postgres:// 等) で探索する。
 * ※ scripts/vercel-build.mjs と同じ規則
 */
const URL_CANDIDATES = ["DATABASE_URL", "PRISMA_DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL", "DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING"];
const isDbUrl = (v: string | undefined): v is string => typeof v === "string" && /^(postgres|postgresql|prisma|prisma\+postgres|file):/.test(v);

export function resolveDatabaseUrl(): string | undefined {
  for (const k of URL_CANDIDATES) if (isDbUrl(process.env[k])) return process.env[k];
  for (const [k, v] of Object.entries(process.env)) if (/(DATABASE|POSTGRES|PRISMA|PG)/i.test(k) && isDbUrl(v)) return v;
  return undefined;
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
