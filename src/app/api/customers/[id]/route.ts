import { apiHandler, ok, parseBody } from "@/server/api/handler";
import { deleteCustomer, getCustomerDetail, updateCustomer } from "@/server/services/customer-service";
import { customerSchema } from "@/lib/validation/schemas";

type P = { id: string };

export const GET = apiHandler<P>(async ({ params }) => ok(await getCustomerDetail(params.id)));

export const PUT = apiHandler<P>(async ({ req, audit, params }) => {
  const input = await parseBody(req, customerSchema);
  return ok(await updateCustomer(audit, params.id, input));
});

export const DELETE = apiHandler<P>(async ({ audit, params }) => {
  await deleteCustomer(audit, params.id);
  return ok({ ok: true });
});
