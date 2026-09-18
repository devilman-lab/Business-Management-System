import { publicApiHandler, ok, parseBody } from "@/server/api/handler";
import { login } from "@/server/services/auth-service";
import { setSessionCookie } from "@/server/auth/session";
import { loginSchema } from "@/lib/validation/schemas";

export const POST = publicApiHandler(async (req) => {
  const input = await parseBody(req, loginSchema);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const { token, user } = await login(input, ip);
  await setSessionCookie(token);
  return ok({ user });
});
