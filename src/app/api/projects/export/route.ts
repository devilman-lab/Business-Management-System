import { apiHandler, parseQuery } from "@/server/api/handler";
import { exportProjectsCsv } from "@/server/csv/export-service";
import { projectQuerySchema } from "@/lib/validation/schemas";
import { csvResponse } from "@/server/api/csv-response";

export const GET = apiHandler(async ({ req, audit }) => {
  const q = parseQuery(req, projectQuerySchema);
  const csv = await exportProjectsCsv(audit, q);
  return csvResponse(csv, "projects");
});
