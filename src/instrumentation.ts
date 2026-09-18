/**
 * サーバー起動時に一度だけ実行される初期化 (Next.js instrumentation)。
 *
 * タイムゾーンの固定:
 *   Vercel (AWS Lambda) 等のサーバーは TZ=UTC で動作するため、そのままだとサーバー側で整形した日時 (UTC) と
 *   ブラウザ側で整形した日時 (JST) が食い違い、「本日期限」の判定も UTC 基準になってしまう。
 *   実行環境が TZ を持っていても、業務システムの基準時刻 APP_TIMEZONE (既定: Asia/Tokyo) で必ず上書きする。
 *   ※ 多拠点・多タイムゾーン運用になった場合は、UTC 保存 + 表示時にユーザーごとの TZ で整形する方式へ移行する。
 */
export const APP_TIMEZONE = process.env.APP_TIMEZONE ?? "Asia/Tokyo";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    process.env.TZ = APP_TIMEZONE;
  }
}
