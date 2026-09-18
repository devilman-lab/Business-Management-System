import { apiHandler, ok, parseBody, parseQuery } from "@/server/api/handler";
import { createTask, getTaskList } from "@/server/services/task-service";
import { taskQuerySchema, taskSchema } from "@/lib/validation/schemas";

export const GET = apiHandler(async ({ req, user }) => {
  const q = parseQuery(req, taskQuerySchema);
  return ok(await getTaskList(q, user));
});

export const POST = apiHandler(async ({ req, audit }) => {
  const input = await parseBody(req, taskSchema);
  return ok(await createTask(audit, input), 201);
});
