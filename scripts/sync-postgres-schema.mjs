/**
 * prisma/schema.prisma (SQLite / ローカル用) から PostgreSQL 用スキーマを生成する。
 *
 * Prisma はスキーマ内の provider を環境変数で切り替えられないため、
 * モデル定義を単一の真実 (prisma/schema.prisma) とし、本番 (Vercel + PostgreSQL) 向けには
 * datasource / generator ブロックだけを差し替えたコピーを prisma/postgres/schema.prisma に出力する。
 *
 * 実行: npm run db:pg:sync   (Vercel のビルド時にも自動実行される)
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const src = readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");

const generator = `generator client {
  provider      = "prisma-client-js"
  // Vercel (Amazon Linux 2023) 向けのエンジンを同梱する
  binaryTargets = ["native", "rhel-openssl-3.0.x"]
}`;

const datasource = `datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  // マイグレーション用の直接接続 (コネクションプーラーを経由しない)
  directUrl = env("DIRECT_URL")
}`;

let out = src
  .replace(/generator client \{[\s\S]*?\n\}/, generator)
  .replace(/datasource db \{[\s\S]*?\n\}/, datasource);

out = `// ============================================================
// このファイルは scripts/sync-postgres-schema.mjs により
// prisma/schema.prisma から自動生成されます。直接編集しないでください。
// ============================================================

${out}`;

const dest = path.join(root, "prisma/postgres/schema.prisma");
mkdirSync(path.dirname(dest), { recursive: true });
writeFileSync(dest, out);
console.log(`generated ${path.relative(root, dest)}`);
