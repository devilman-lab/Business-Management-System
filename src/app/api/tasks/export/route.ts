import { apiHandler, parseQuery } from "@/server/api/handler";
import { exportTasksCsv } from "@/server/csv/export-service";
import { taskQuerySchema } from "@/lib/validation/schemas";
import { csvResponse } from "@/server/api/csv-response";

export const GET = apiHandler(async ({ req, audit }) => {
  const q = parseQuery(req, taskQuerySchema);
  const csv = await exportTasksCsv(audit, q);
  return csvResponse(csv, "tasks");
});
