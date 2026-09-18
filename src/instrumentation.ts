/**
 * サーバー起動時に一度だけ実行される初期化 (Next.js instrumentation)。
 *
 * タイムゾーンの固定:
 *   Vercel 等のサーバーは UTC で動作するため、そのままだとサーバー側で整形した日時 (UTC) と
 *   ブラウザ側で整形した日時 (JST) が食い違い、「本日期限」の判定も UTC 基準になってしまう。
 *   業務システムの基準時刻を APP_TIMEZONE (既定: Asia/Tokyo) に揃える。
 *   ※ 多拠点・多タイムゾーン運用になった場合は、UTC 保存 + 表示時にユーザーごとの TZ で整形する方式へ移行する。
 */
export const APP_TIMEZONE = process.env.APP_TIMEZONE ?? "Asia/Tokyo";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && !process.env.TZ) {
    process.env.TZ = APP_TIMEZONE;
  }
}
