import { apiHandler, ok, parseBody } from "@/server/api/handler";
import { getUser, updateUser } from "@/server/services/user-service";
import { userUpdateSchema } from "@/lib/validation/schemas";

type P = { id: string };

export const GET = apiHandler<P>(async ({ audit, params }) => ok(await getUser(audit, params.id)), {
  adminOnly: true,
});

export const PUT = apiHandler<P>(
  async ({ req, audit, params }) => {
    const input = await parseBody(req, userUpdateSchema);
    return ok(await updateUser(audit, params.id, input));
  },
  { adminOnly: true },
);
