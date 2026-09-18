import { apiHandler, ok, parseQuery } from "@/server/api/handler";
import { getAuditLogList } from "@/server/services/audit-query-service";
import { auditQuerySchema } from "@/lib/validation/schemas";

export const GET = apiHandler(
  async ({ req, user }) => {
    const q = parseQuery(req, auditQuerySchema);
    return ok(await getAuditLogList(user, q));
  },
  { adminOnly: true },
);
