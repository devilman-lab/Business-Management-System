/**
 * Vercel 用ビルド (vercel.json の buildCommand から実行):
 *   1. PostgreSQL 用スキーマを生成
 *   2. Prisma Client 生成 (PostgreSQL)
 *   3. マイグレーション適用
 *   4. DB が空なら サンプルデータ投入 (SEED_ON_BUILD=0 で無効化)
 *   5. next build
 *
 * 必要な環境変数: DATABASE_URL (Neon / Vercel Postgres の Storage 連携で自動設定)
 */
import { spawnSync } from "node:child_process";

const env = { ...process.env };

// Storage 連携ごとの環境変数名の違いを吸収する
env.DATABASE_URL ??= env.POSTGRES_PRISMA_URL ?? env.POSTGRES_URL;
env.DIRECT_URL ??= env.DATABASE_URL_UNPOOLED ?? env.POSTGRES_URL_NON_POOLING ?? env.DATABASE_URL;

if (!env.DATABASE_URL) {
  console.error("DATABASE_URL が設定されていません。Vercel の Storage で PostgreSQL (Neon 等) を接続してください。");
  process.exit(1);
}

const run = (line) => {
  console.log(`\n> ${line}`);
  const r = spawnSync(line, { stdio: "inherit", shell: true, env });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

const schema = "prisma/postgres/schema.prisma";
run("node scripts/sync-postgres-schema.mjs");
run(`npx prisma generate --schema ${schema}`);
run(`npx prisma migrate deploy --schema ${schema}`);
if (env.SEED_ON_BUILD !== "0") run("npx tsx prisma/seed.ts --if-empty");
run("npx next build");
