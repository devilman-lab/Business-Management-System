import { cookies } from "next/headers";
import { publicApiHandler, ok } from "@/server/api/handler";
import { logout } from "@/server/services/auth-service";
import { clearSessionCookie, getCurrentUser, SESSION_COOKIE } from "@/server/auth/session";

export const POST = publicApiHandler(async () => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const user = await getCurrentUser();
  if (token) await logout(token, user);
  await clearSessionCookie();
  return ok({ ok: true });
});
