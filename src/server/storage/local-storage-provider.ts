import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { StorageProvider, StoredObject } from "./storage-provider";

/**
 * ローカルファイルシステムへ保存するプロバイダ (開発・デモ用)。
 * 保存キーは日付ディレクトリ + UUID とし、元ファイル名をパスに使わない
 * (パストラバーサルや文字化けの問題を避ける)。
 */
export class LocalStorageProvider implements StorageProvider {
  readonly name = "local";

  constructor(private readonly baseDir: string) {}

  private resolve(key: string) {
    // key の形式を限定し、baseDir の外へ出られないようにする
    if (!/^[0-9]{4}\/[0-9]{2}\/[0-9a-f-]{36}(\.[a-z0-9]{1,10})?$/i.test(key)) {
      throw new Error("不正なストレージキーです");
    }
    const abs = path.resolve(this.baseDir, key);
    if (!abs.startsWith(path.resolve(this.baseDir))) throw new Error("不正なストレージキーです");
    return abs;
  }

  async put({ data, fileName }: { data: Buffer; fileName: string; mimeType: string }): Promise<StoredObject> {
    const now = new Date();
    const ext = path.extname(fileName).toLowerCase().replace(/[^a-z0-9.]/g, "").slice(0, 11);
    const key = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${randomUUID()}${ext}`;
    const abs = this.resolve(key);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, data);
    return { key, provider: this.name };
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      return await fs.readFile(this.resolve(key));
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await fs.unlink(this.resolve(key));
    } catch {
      /* 既に存在しない場合は無視 */
    }
  }
}
