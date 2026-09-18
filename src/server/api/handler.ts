import { NextResponse, type NextRequest } from "next/server";
import { z, type ZodType } from "zod";
import { AppError, ForbiddenError, UnauthorizedError, ValidationError } from "@/server/errors";
import { getCurrentUser } from "@/server/auth/session";
import type { AuditContext } from "@/server/audit/audit-service";
import type { ApiErrorBody, CurrentUser } from "@/lib/types";
import { isAdmin } from "@/lib/policy";

/**
 * API Route 共通の処理:
 *  - 認証チェック (未ログインは 401)
 *  - 管理者限定の場合の認可チェック (403)
 *  - 例外を HTTP ステータス付きの JSON エラーへ変換
 *  - 監査ログ用コンテキスト (ユーザー・IP) の作成
 *
 * すべての Route Handler はこのラッパー経由で実装し、認可漏れを防ぐ。
 */

export interface ApiContext<P = Record<string, string>> {
  req: NextRequest;
  user: CurrentUser;
  audit: AuditContext;
  params: P;
}

interface ApiOptions {
  adminOnly?: boolean;
}

type Handler<P> = (ctx: ApiContext<P>) => Promise<Response>;

export function apiHandler<P = Record<string, string>>(handler: Handler<P>, options: ApiOptions = {}) {
  return async (req: NextRequest, routeCtx?: { params: Promise<P> }): Promise<Response> => {
    try {
      const user = await getCurrentUser();
      if (!user) throw new UnauthorizedError();
      if (options.adminOnly && !isAdmin(user)) throw new ForbiddenError("管理者のみ利用できる機能です");
      const params = routeCtx ? await routeCtx.params : ({} as P);
      const ipAddress =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? null;
      return await handler({ req, user, audit: { user, ipAddress }, params });
    } catch (e) {
      return errorResponse(e);
    }
  };
}

/** 未認証でも呼べるハンドラ (ログイン等) */
export function publicApiHandler(handler: (req: NextRequest) => Promise<Response>) {
  return async (req: NextRequest): Promise<Response> => {
    try {
      return await handler(req);
    } catch (e) {
      return errorResponse(e);
    }
  };
}

export function errorResponse(e: unknown): NextResponse<ApiErrorBody> {
  if (e instanceof ValidationError) {
    return NextResponse.json(
      { error: { code: e.code, message: e.message, fieldErrors: e.fieldErrors } },
      { status: e.status },
    );
  }
  if (e instanceof AppError) {
    return NextResponse.json({ error: { code: e.code, message: e.message } }, { status: e.status });
  }
  console.error("[api] unexpected error", e);
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "サーバーでエラーが発生しました。時間をおいて再度お試しください" } },
    { status: 500 },
  );
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

/** リクエストボディを zod で検証する。失敗時は 422 + 項目別エラー */
export async function parseBody<T extends ZodType>(req: NextRequest, schema: T): Promise<z.infer<T>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ValidationError("リクエスト形式が正しくありません");
  }
  return parseWith(schema, body);
}

/** クエリ文字列を zod で検証する (同一キー複数指定は配列として扱う) */
export function parseQuery<T extends ZodType>(req: NextRequest, schema: T): z.infer<T> {
  const raw: Record<string, string | string[]> = {};
  for (const [k, v] of req.nextUrl.searchParams.entries()) {
    if (v === "") continue;
    const prev = raw[k];
    if (prev === undefined) raw[k] = v;
    else raw[k] = Array.isArray(prev) ? [...prev, v] : [prev, v];
  }
  return parseWith(schema, raw);
}

export function parseWith<T extends ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const flat = z.flattenError(result.error);
    const fieldErrors: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(flat.fieldErrors)) if (v) fieldErrors[k] = v as string[];
    const first = Object.values(fieldErrors)[0]?.[0] ?? flat.formErrors[0];
    throw new ValidationError(first ?? "入力内容に誤りがあります", fieldErrors);
  }
  return result.data;
}
