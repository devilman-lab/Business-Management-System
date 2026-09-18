/**
 * 初回セットアップ:
 *   1. .env が無ければ .env.example からコピー
 *   2. DB マイグレーション適用 (SQLite ファイルを作成)
 *   3. サンプルデータ投入
 */
import { copyFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const run = (cmd, args) => {
  const line = `${cmd} ${args.join(" ")}`;
  console.log(`\n> ${line}`);
  // Windows では npx が .cmd のためシェル経由で実行する (引数は固定値のみ)
  const r = spawnSync(line, { stdio: "inherit", shell: true });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

if (!existsSync(".env")) {
  copyFileSync(".env.example", ".env");
  console.log(".env を作成しました (.env.example をコピー)");
}

run("npx", ["prisma", "generate"]);
run("npx", ["prisma", "migrate", "deploy"]);
run("npx", ["tsx", "prisma/seed.ts"]);

console.log("\nセットアップ完了。`npm run dev` で起動し、http://localhost:3000 を開いてください。");
