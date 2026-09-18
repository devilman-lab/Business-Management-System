import { apiHandler, ok, parseBody, parseQuery } from "@/server/api/handler";
import { createProject, getProjectList } from "@/server/services/project-service";
import { listProjectOptions } from "@/server/repositories/project-repository";
import { projectQuerySchema, projectSchema } from "@/lib/validation/schemas";

/**
 * GET /api/projects?options=1[&customerId=] : セレクト用の最小情報
 * GET /api/projects                          : 一覧 (検索条件付き)
 */
export const GET = apiHandler(async ({ req, user }) => {
  if (req.nextUrl.searchParams.get("options")) {
    const customerId = req.nextUrl.searchParams.get("customerId") ?? undefined;
    return ok({ items: await listProjectOptions(customerId) });
  }
  const q = parseQuery(req, projectQuerySchema);
  return ok(await getProjectList(q, user));
});

export const POST = apiHandler(async ({ req, audit }) => {
  const input = await parseBody(req, projectSchema);
  return ok(await createProject(audit, input), 201);
});
