/**
 * Vercel 用ビルド (vercel.json の buildCommand から実行):
 *   1. PostgreSQL 用スキーマを生成
 *   2. Prisma Client 生成 (PostgreSQL)
 *   3. マイグレーション適用
 *   4. DB が空なら サンプルデータ投入 (SEED_ON_BUILD=0 で無効化)
 *   5. next build
 *
 * 接続文字列は Storage 連携ごとに変数名が異なるため (Neon: DATABASE_URL / DATABASE_URL_UNPOOLED、
 * Prisma Postgres: PRISMA_DATABASE_URL / POSTGRES_URL、Supabase: POSTGRES_PRISMA_URL / POSTGRES_URL_NON_POOLING、
 * プレフィックス付きの場合もある)、名前と値の形式から自動で探索する。
 */
import { spawnSync } from "node:child_process";

const env = { ...process.env };
// サンプルデータの日付を業務上の基準タイムゾーン (既定: 日本時間) で生成する (src/instrumentation.ts と同じ既定値)
env.TZ ??= env.APP_TIMEZONE ?? "Asia/Tokyo";
const isDbUrl = (v) => typeof v === "string" && /^(postgres|postgresql|prisma|prisma\+postgres):\/\//.test(v);
const isDirectUrl = (v) => typeof v === "string" && /^(postgres|postgresql):\/\//.test(v);

/** 優先順に候補名を見て、無ければ名前のパターンと値の形式で探す */
function discover(preferred, match, accept) {
  for (const k of preferred) if (accept(env[k])) return k;
  for (const [k, v] of Object.entries(env)) if (match.test(k) && accept(v)) return k;
  return undefined;
}

// アプリ実行用 (プーラー / Accelerate 経由でよい)
const urlKey = discover(
  ["DATABASE_URL", "PRISMA_DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL", "DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING"],
  /(DATABASE|POSTGRES|PRISMA|PG)/i,
  isDbUrl,
);
if (!urlKey) {
  const names = Object.keys(env).filter((k) => /(DATABASE|POSTGRES|PRISMA|PG|URL)/i.test(k)).sort();
  console.error("PostgreSQL の接続文字列が見つかりません。");
  console.error("Vercel の Storage で PostgreSQL (Prisma Postgres / Neon 等) をこのプロジェクトに接続し、環境変数 DATABASE_URL に接続文字列を設定してください。");
  console.error(`参考: 現在ビルド環境に存在する関連しそうな変数名: ${names.length ? names.join(", ") : "(なし)"}`);
  process.exit(1);
}
env.DATABASE_URL = env[urlKey];
console.log(`接続文字列: ${urlKey} を DATABASE_URL として使用します`);

// マイグレーション用 (直接接続を優先。無ければアプリ用と同じものを使う)
const directKey = discover(
  ["DIRECT_URL", "DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING", "POSTGRES_URL", "DATABASE_URL"],
  /(UNPOOLED|NON_POOLING|DIRECT|POSTGRES_URL$)/i,
  isDirectUrl,
);
env.DIRECT_URL = directKey ? env[directKey] : env.DATABASE_URL;
console.log(`マイグレーション用: ${directKey ?? urlKey} を DIRECT_URL として使用します`);

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
