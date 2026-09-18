import { apiHandler, ok, parseBody, parseQuery } from "@/server/api/handler";
import { createActivity, getActivityList } from "@/server/services/activity-service";
import { activityQuerySchema, activitySchema } from "@/lib/validation/schemas";

export const GET = apiHandler(async ({ req }) => {
  const q = parseQuery(req, activityQuerySchema);
  return ok(await getActivityList(q));
});

export const POST = apiHandler(async ({ req, audit }) => {
  const input = await parseBody(req, activitySchema);
  return ok(await createActivity(audit, input), 201);
});
