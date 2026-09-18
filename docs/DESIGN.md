# 設計資料 (技術者向け)

## 1. アーキテクチャ

```
ブラウザ
  │  画面 (React Server Components + Client Components)   src/app, src/features, src/components
  │      ├ 一覧・詳細の読み取り: サーバーコンポーネントがサービス層を直接呼び出す
  │      └ 登録・更新・削除:   クライアントから REST API を呼び出す (src/lib/api-client.ts)
  ▼
REST API (Route Handlers)                                  src/app/api/**
  │  認証 (セッション) → 認可 (adminOnly) → 入力検証 (zod) → サービス呼び出し → エラーを HTTP へ変換
  │  共通処理: src/server/api/handler.ts
  ▼
Application / Service                                      src/server/services/**
  │  業務ルール (権限判定、ステータスと進捗率の整合、参照整合性チェック)
  │  変更操作は必ず監査ログを記録 (src/server/audit)
  ▼
Repository / Prisma                                        src/server/repositories/**, src/server/db.ts
  │  検索条件の組み立て、include の定義、採番
  ▼
Database (SQLite → PostgreSQL 等)                          prisma/schema.prisma

外部サービスは Provider インターフェースで分離:
  - ファイル実体: src/server/storage  (StorageProvider: local 実装 / S3 等へ差し替え)
  - AI 候補生成:  src/server/ai       (AiProvider: rule-based 実装 / Anthropic 実装)
```

### 主なディレクトリ

| パス | 役割 |
| --- | --- |
| `prisma/schema.prisma` | データモデル (単一の真実、SQLite 用)。`prisma/postgres/` は PostgreSQL 用の自動生成コピーとマイグレーション |
| `src/lib/constants.ts` | 列挙値の日本語ラベル・色 (表示は必ずここを通す) |
| `src/lib/policy.ts` | 認可ポリシー。UI のボタン表示と API の判定が同じ関数を使う |
| `src/lib/validation/schemas.ts` | zod スキーマ。フォームと API で共有 |
| `src/server/api/handler.ts` | API 共通ラッパー (認証・認可・検証・エラー変換) |
| `src/server/services/*` | 業務ロジック |
| `src/server/repositories/*` | Prisma クエリ |
| `src/server/audit/*` | 監査ログの差分検出・記録 |
| `src/server/csv/*` | CSV パース / エクスポート / インポート検証 |
| `src/server/storage/*` | ファイルストレージ抽象化 (local / database 実装) |
| `src/server/ai/*` | AI プロバイダ抽象化 |
| `src/server/seed/seed.ts` | サンプルデータ (日付は「今日」基準の相対値) |
| `src/features/*` | 画面ごとの UI (顧客・案件・タスク・対応履歴・ファイル・管理) |
| `src/components/ui/*` | デザインシステム (Button / Input / Badge / Table / Modal / Toast など) |
| `tests/*` | 単体テスト (vitest) |
| `scripts/*` | セットアップ (`setup.mjs`)、Vercel ビルド (`vercel-build.mjs`)、PostgreSQL スキーマ生成 (`sync-postgres-schema.mjs`) |

## 2. データモデル

| モデル | 主な項目 | 備考 |
| --- | --- | --- |
| User | name, email, passwordHash, department, role (ADMIN/MEMBER), status, lastLoginAt | パスワードは bcrypt |
| Session | token, userId, expiresAt | Cookie にはランダムトークンのみ。サーバー側で失効可能 |
| Customer | code (C-0001), name, nameKana, contactName, contactTitle, phone, email, address, industry, status, notes, assigneeId | 社内担当は User 参照 |
| Project | code (PJ-2026-001), name, description, customerId, assigneeId, status, priority, progress, startDate, dueDate, completedAt, budget | 完了時は progress=100 / completedAt を自動整合 |
| Task | projectId, title, description, assigneeId, status, priority, dueDate, completedAt, createdById | 案件削除で連鎖削除 |
| Activity | customerId, projectId?, userId, type, occurredAt, title, content | 案件削除時は projectId が NULL になり顧客側に残る |
| ProjectFile | projectId, name, category, mimeType, size, storageProvider, storageKey, uploadedById | 実体はストレージ。DB にはメタ情報のみ |
| AuditLog | userId, action, entityType, entityId, entityLabel, changes(JSON), summary, projectId?, customerId?, ipAddress | 案件・顧客ごとの変更履歴表示のため参照を保持 |
| SystemSetting | key, value | 組織名、期限間近日数 |
| FileBlob | data (bytes), size, mimeType | `FILE_STORAGE_PROVIDER=database` のときのファイル実体 (Vercel デモ用)。本番は S3 等へ |

列挙値 (ステータス等) は英字コードで保存し、`src/lib/constants.ts` で日本語ラベルへ変換します。

## 3. 認証・認可・セキュリティ

- **認証**: メール + パスワード。パスワードは bcrypt ハッシュ。セッションは DB 保存、Cookie は `httpOnly` / `sameSite=lax` / 本番 `secure`。12 時間で失効。ユーザー無効化・パスワード変更時は既存セッションを即時失効。
- **認可**: `src/lib/policy.ts` の関数を UI と API の両方で使用。`/admin/**` は layout で 403 表示、API は `apiHandler({ adminOnly: true })` で 403。担当者以外の更新はサービス層で `ForbiddenError`。
- **入力検証**: すべての API は zod スキーマで検証 (422 + 項目別エラー)。参照 ID (顧客・担当者・案件) の存在と、担当者が有効ユーザーかをサービス層で確認。
- **不正な ID アクセス**: 存在しない ID は 404。他人の対応履歴の編集・削除は 403。
- **XSS**: React の自動エスケープ。`dangerouslySetInnerHTML` は不使用。
- **SQL インジェクション**: Prisma のパラメータ化クエリのみ。
- **CSV**: 数式インジェクション対策 (先頭 `=+-@` をエスケープ)。取込は行数上限・サイズ上限・列名固定。
- **ファイル**: 保存キーは UUID (元ファイル名をパスに使わない)、パストラバーサル防止、サイズ・MIME 制限、ダウンロードは認証必須で直リンク非公開。
- **機密情報**: API レスポンスに passwordHash を含めない (`userSelect` で明示的に選択)。ログイン失敗時はメール・パスワードどちらが誤りか区別しない。
- **監査**: ログイン・ログアウト・作成・更新 (差分付き)・削除・CSV 取込 / 出力を記録。

本番化時の追加項目: CSRF トークン (現状は SameSite Cookie + JSON API)、レート制限、パスワードポリシー・多要素認証、HTTPS 強制、セッション更新 (スライディング)、ログの外部保管。

## 4. API 一覧

| メソッド / パス | 内容 | 権限 |
| --- | --- | --- |
| POST `/api/auth/login`, `/api/auth/logout`, GET `/api/auth/me` | 認証 | — |
| GET/POST `/api/customers`, GET/PUT/DELETE `/api/customers/:id`, GET `/api/customers/export` | 顧客 | 削除は管理者 |
| GET/POST `/api/projects`, GET/PUT/PATCH/DELETE `/api/projects/:id`, GET `/api/projects/export` | 案件 (PATCH は部分更新) | 編集は担当者 / 管理者 |
| POST `/api/projects/:id/ai` | AI 候補生成 (`suggest-tasks` / `summary`) | ログイン済 |
| GET/POST `/api/tasks`, GET/PUT/PATCH/DELETE `/api/tasks/:id`, GET `/api/tasks/export` | タスク | 編集は関係者 |
| GET/POST `/api/activities`, GET/PUT/DELETE `/api/activities/:id` | 対応履歴 | 編集は本人 / 管理者 |
| GET/POST `/api/files`, GET(download)/DELETE `/api/files/:id` | ファイル | — |
| GET/POST `/api/users`, GET/PUT `/api/users/:id` | ユーザー (`?options=1` は担当者選択用で全員可) | 管理者 |
| GET `/api/audit-logs` | 監査ログ | 管理者 |
| GET/PUT `/api/settings` | システム設定 | PUT は管理者 |
| POST `/api/import/:target` | CSV 取込 (`mode=preview|commit`) | 管理者 |
| POST `/api/admin/reset-demo` | デモデータ初期化 | 管理者 |

一覧 API は `?q=&status=A,B&assigneeId=&page=&pageSize=&sort=&order=` 形式。エラーは `{ error: { code, message, fieldErrors? } }`。

## 5. 画面一覧

| パス | 画面 |
| --- | --- |
| `/login` | ログイン (デモアカウント選択) |
| `/dashboard` | ダッシュボード (`?scope=mine|all`) |
| `/customers`, `/customers/new`, `/customers/:id`, `/customers/:id/edit` | 顧客 |
| `/projects`, `/projects/new`, `/projects/:id?tab=`, `/projects/:id/edit` | 案件 (tab: overview / tasks / activities / files / history) |
| `/tasks?due=overdue|today|soon|none` | タスク |
| `/activities` | 対応履歴 |
| `/files` | ファイル |
| `/admin/users`, `/admin/audit-logs`, `/admin/import`, `/admin/settings` | 管理者メニュー |

一覧の検索条件は URL クエリと同期しているため、条件付きの URL をそのまま共有・ブックマークできます。

## 6. 環境ごとの構成 (ローカル / Vercel / 本番)

| 項目 | ローカル | Vercel (デモ公開) | 本番 (想定) |
| --- | --- | --- | --- |
| DB | SQLite (`prisma/schema.prisma`) | PostgreSQL (`prisma/postgres/schema.prisma`) | PostgreSQL |
| ファイル実体 | ローカルディスク (`local`) | DB の FileBlob テーブル (`database`) | S3 等 (`S3StorageProvider` を追加) |
| マイグレーション | `prisma migrate dev` | ビルド時に `prisma migrate deploy` | CI/CD から `migrate deploy` |
| サンプルデータ | `npm run db:seed` | 初回ビルド時のみ (`--if-empty`) | 投入しない (`SEED_ON_BUILD=0`) |

### PostgreSQL 用スキーマの扱い

Prisma は `provider` を環境変数で切り替えられないため、モデル定義は `prisma/schema.prisma` (SQLite) を唯一の正とし、
`scripts/sync-postgres-schema.mjs` が datasource / generator ブロックだけを差し替えた `prisma/postgres/schema.prisma` を生成します (ビルド時にも自動実行)。

- 初期マイグレーション `prisma/postgres/migrations/20260918000000_init` は `prisma migrate diff --from-empty --to-schema-datamodel` で生成
- **モデルを変更したら**: SQLite 側は `npm run db:migrate`、PostgreSQL 側は `npm run db:pg:sync` の後、PostgreSQL に接続できる環境で
  `npx prisma migrate dev --schema prisma/postgres/schema.prisma --name <変更名>` を実行し、生成された SQL をコミットする
- Vercel のビルド (`scripts/vercel-build.mjs`) は `DATABASE_URL` / `DIRECT_URL` を Storage 連携の変数名 (`POSTGRES_PRISMA_URL`, `DATABASE_URL_UNPOOLED` など) から補完する

### タイムゾーン

サーバー (Vercel は UTC) とブラウザ (JST) で日時整形がずれないよう、`src/instrumentation.ts` で起動時に `process.env.TZ` を `APP_TIMEZONE` (既定 `Asia/Tokyo`) に固定します。ビルド時のサンプルデータ生成 (`scripts/vercel-build.mjs`) も同じ値を使います。多タイムゾーン運用が必要になった場合は、UTC 保存 + ユーザーごとの表示 TZ へ移行します。

### 接続の堅牢性

`src/server/db.ts` の Prisma Client は、接続確立に失敗した場合 (P1001 / P1002 / P2024) のみ短い待機後に再試行します。
サーバーレス + マネージド DB のコールドスタート直後 (Neon のスケールゼロからの復帰など) に発生する一時的な接続失敗を吸収するためで、クエリが送信された後のエラーは再試行しません。

### 本番環境への移行で追加すること

1. **ファイル**: `S3StorageProvider` を `src/server/storage` に追加し、`getStorageProvider()` の分岐へ登録。画面・サービスは無変更。
2. **AI**: `ANTHROPIC_API_KEY` を設定すると `AnthropicAiProvider` (Claude) に切り替わります。失敗時はルールベースへ自動フォールバック。
3. **通知等の外部連携**: サービス層のイベント (担当者変更・期限超過) に対して Notifier インターフェースを追加する想定。画面には外部サービス依存のコードを置かない方針です。
4. **デモ専用機能の削除**: ログイン画面のアカウント一覧 (`src/app/login/page.tsx`)、設定画面の「デモデータを初期化」(`/api/admin/reset-demo`)。
5. **保護**: Vercel の Deployment Protection、レート制限、パスワードポリシー、多要素認証、セッションのスライディング更新、ログの外部保管。

## 7. テスト

- `npm test` : 認可ポリシー / CSV パース・出力 / 入力検証 / 監査ログ差分 / 期限判定 / ルールベース AI
- 手動確認済みシナリオ: README の「おすすめの確認シナリオ」1〜7 (ブラウザ自動操作で検証)
