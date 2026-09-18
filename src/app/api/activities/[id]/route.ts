import { apiHandler, ok, parseBody } from "@/server/api/handler";
import { deleteActivity, getActivity, updateActivity } from "@/server/services/activity-service";
import { activitySchema } from "@/lib/validation/schemas";

type P = { id: string };

export const GET = apiHandler<P>(async ({ params }) => ok(await getActivity(params.id)));

export const PUT = apiHandler<P>(async ({ req, audit, params }) => {
  const input = await parseBody(req, activitySchema);
  return ok(await updateActivity(audit, params.id, input));
});

export const DELETE = apiHandler<P>(async ({ audit, params }) => {
  await deleteActivity(audit, params.id);
  return ok({ ok: true });
});
