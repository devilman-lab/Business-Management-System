import { apiHandler, parseQuery } from "@/server/api/handler";
import { exportCustomersCsv } from "@/server/csv/export-service";
import { customerQuerySchema } from "@/lib/validation/schemas";
import { csvResponse } from "@/server/api/csv-response";

export const GET = apiHandler(async ({ req, audit }) => {
  const q = parseQuery(req, customerQuerySchema);
  const csv = await exportCustomersCsv(audit, q);
  return csvResponse(csv, "customers");
});
