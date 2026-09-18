import { apiHandler, ok, parseBody, parseQuery } from "@/server/api/handler";
import { createCustomer, getCustomerList } from "@/server/services/customer-service";
import { listCustomerOptions } from "@/server/repositories/customer-repository";
import { customerQuerySchema, customerSchema } from "@/lib/validation/schemas";

/**
 * GET /api/customers?options=1 : セレクト用の最小情報
 * GET /api/customers           : 一覧 (検索条件付き)
 */
export const GET = apiHandler(async ({ req }) => {
  if (req.nextUrl.searchParams.get("options")) {
    return ok({ items: await listCustomerOptions() });
  }
  const q = parseQuery(req, customerQuerySchema);
  return ok(await getCustomerList(q));
});

export const POST = apiHandler(async ({ req, audit }) => {
  const input = await parseBody(req, customerSchema);
  const customer = await createCustomer(audit, input);
  return ok(customer, 201);
});
