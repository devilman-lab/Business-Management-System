import type { Db } from "@/server/db";
import type { StorageProvider, StoredObject } from "./storage-provider";

/**
 * ファイル実体をデータベース (FileBlob テーブル) に保存するプロバイダ。
 *
 * Vercel などファイルシステムが永続化されない環境で、外部ストレージを用意せずに
 * デモを動かすための実装。本番では S3 等のオブジェクトストレージへ切り替える想定
 * (このクラスと同じインターフェースを実装するだけで差し替え可能)。
 */
export class DatabaseStorageProvider implements StorageProvider {
  readonly name = "database";

  constructor(private readonly db: Db) {}

  async put({ data, mimeType }: { data: Buffer; fileName: string; mimeType: string }): Promise<StoredObject> {
    // Prisma の Bytes 型は Uint8Array<ArrayBuffer> を要求するため、Buffer から詰め替える
    const bytes = new Uint8Array(data.byteLength);
    bytes.set(data);
    const row = await this.db.fileBlob.create({
      data: { data: bytes, size: data.length, mimeType },
      select: { id: true },
    });
    return { key: row.id, provider: this.name };
  }

  async get(key: string): Promise<Buffer | null> {
    const row = await this.db.fileBlob.findUnique({ where: { id: key }, select: { data: true } });
    return row ? Buffer.from(row.data) : null;
  }

  async delete(key: string): Promise<void> {
    await this.db.fileBlob.deleteMany({ where: { id: key } });
  }
}
