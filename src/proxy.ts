import { NextResponse, type NextRequest } from "next/server";

/**
 * 認証の一次チェック (楽観的チェック)。
 * セッション Cookie が無いリクエストはログイン画面へリダイレクトする。
 * Cookie の有効性・権限の最終判定は各ページ/API 側 (getCurrentUser, apiHandler) で行う。
 */
const SESSION_COOKIE = "bms_session";
const PUBLIC_PATHS = ["/login", "/api/auth/login"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p)) return NextResponse.next();

  const hasSession = !!request.cookies.get(SESSION_COOKIE)?.value;
  if (hasSession) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "ログインが必要です" } }, { status: 401 });
  }
  const loginUrl = new URL("/login", request.url);
  if (pathname !== "/") loginUrl.searchParams.set("next", pathname + request.nextUrl.search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|jpg|ico)$).*)"],
};
