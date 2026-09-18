/**
 * ファイル実体の保存先を抽象化するインターフェース。
 *
 * 業務データ (ProjectFile のメタデータ) は DB に、ファイル実体はストレージに分離する。
 * ローカル開発では LocalStorageProvider を使い、本番では S3StorageProvider 等に
 * 差し替えるだけで画面・サービス層は変更不要。
 */
export interface StoredObject {
  /** プロバイダ内でファイルを一意に識別するキー */
  key: string;
  provider: string;
}

export interface StorageProvider {
  readonly name: string;
  /** ファイルを保存し、キーを返す */
  put(input: { data: Buffer; fileName: string; mimeType: string }): Promise<StoredObject>;
  /** ファイルを取得する (存在しない場合は null) */
  get(key: string): Promise<Buffer | null>;
  /** ファイルを削除する (存在しなくてもエラーにしない) */
  delete(key: string): Promise<void>;
}
