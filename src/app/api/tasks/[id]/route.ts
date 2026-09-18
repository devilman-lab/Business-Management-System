import { apiHandler, ok, parseBody } from "@/server/api/handler";
import { deleteTask, getTask, quickUpdateTask, updateTask } from "@/server/services/task-service";
import { taskQuickUpdateSchema, taskSchema } from "@/lib/validation/schemas";

type P = { id: string };

export const GET = apiHandler<P>(async ({ params }) => ok(await getTask(params.id)));

export const PUT = apiHandler<P>(async ({ req, audit, params }) => {
  const input = await parseBody(req, taskSchema);
  return ok(await updateTask(audit, params.id, input));
});

export const PATCH = apiHandler<P>(async ({ req, audit, params }) => {
  const input = await parseBody(req, taskQuickUpdateSchema);
  return ok(await quickUpdateTask(audit, params.id, input));
});

export const DELETE = apiHandler<P>(async ({ audit, params }) => {
  await deleteTask(audit, params.id);
  return ok({ ok: true });
});
