import { prisma } from "../src/server/db";
import { seedDatabase, DEMO_PASSWORD } from "../src/server/seed/seed";

/**
 * サンプルデータ投入。
 *   tsx prisma/seed.ts             : 既存データを削除して再投入
 *   tsx prisma/seed.ts --if-empty  : DB が空のときだけ投入 (デプロイ時のビルドで使用)
 */
const ifEmpty = process.argv.includes("--if-empty");

async function main() {
  if (ifEmpty && (await prisma.user.count()) > 0) {
    console.log("既にデータが存在するため、サンプルデータの投入をスキップしました。");
    return;
  }
  console.log("サンプルデータを投入します...");
  const result = await seedDatabase(prisma, { log: (m) => console.log(`  - ${m}`) });
  console.log("完了:", result);
  console.log(`\nログイン情報 (全ユーザー共通パスワード: ${DEMO_PASSWORD})`);
  console.log("  管理者      : admin@example.com");
  console.log("  一般ユーザー: tanaka@example.com / sato@example.com / suzuki@example.com ...");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
