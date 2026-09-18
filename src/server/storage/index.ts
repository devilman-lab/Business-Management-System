import path from "node:path";
import { prisma } from "@/server/db";
import { DatabaseStorageProvider } from "./database-storage-provider";
import { LocalStorageProvider } from "./local-storage-provider";
import type { StorageProvider } from "./storage-provider";

export type { StorageProvider, StoredObject } from "./storage-provider";

/**
 * 環境変数 FILE_STORAGE_PROVIDER に応じてストレージプロバイダを選択する。
 *
 *   local    : ローカルディスク (開発・デモ既定)
 *   database : DB の FileBlob テーブル (Vercel 等、ファイルシステムが永続化されない環境の既定)
 *
 * 本番で S3 を使う場合は、@aws-sdk/client-s3 を利用した S3StorageProvider
 * (put → PutObject / get → GetObject / delete → DeleteObject) を追加し、ここへ分岐を足す。
 * サービス層・画面は変更不要。
 */
let cached: StorageProvider | undefined;

export function resolveStorageProviderName(): string {
  if (process.env.FILE_STORAGE_PROVIDER) return process.env.FILE_STORAGE_PROVIDER;
  // Vercel のサーバーレス実行環境は書き込み可能な永続ディスクを持たない
  return process.env.VERCEL ? "database" : "local";
}

export function getStorageProvider(): StorageProvider {
  if (cached) return cached;
  const provider = resolveStorageProviderName();
  switch (provider) {
    case "local": {
      const dir = process.env.FILE_STORAGE_DIR ?? "./storage/uploads";
      // 保存先は環境変数で決まるため静的解析できない (Turbopack のトレース対象から除外)
      cached = new LocalStorageProvider(path.resolve(/*turbopackIgnore: true*/ process.cwd(), dir));
      return cached;
    }
    case "database":
      cached = new DatabaseStorageProvider(prisma);
      return cached;
    default:
      throw new Error(`未対応のストレージプロバイダです: ${provider}`);
  }
}
