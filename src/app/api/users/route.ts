import { apiHandler, ok, parseBody, parseQuery } from "@/server/api/handler";
import { createUser, getUserList, listUserOptions } from "@/server/services/user-service";
import { userCreateSchema, userQuerySchema } from "@/lib/validation/schemas";

/**
 * GET /api/users?options=1 : 担当者セレクト用の最小情報 (全ユーザー可)
 * GET /api/users           : ユーザー管理一覧 (管理者のみ)
 */
export const GET = apiHandler(async ({ req, audit }) => {
  if (req.nextUrl.searchParams.get("options")) {
    return ok({ items: await listUserOptions() });
  }
  const q = parseQuery(req, userQuerySchema);
  return ok(await getUserList(audit, q));
});

export const POST = apiHandler(
  async ({ req, audit }) => {
    const input = await parseBody(req, userCreateSchema);
    return ok(await createUser(audit, input), 201);
  },
  { adminOnly: true },
);
