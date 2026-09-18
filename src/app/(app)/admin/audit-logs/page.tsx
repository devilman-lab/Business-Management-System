import type { Metadata } from "next";
import { requireUser } from "@/server/auth/require-user";
import { parseSearchParams } from "@/server/api/search-params";
import { getAuditLogList } from "@/server/services/audit-query-service";
import { listUserOptions } from "@/server/services/user-service";
import { auditQuerySchema } from "@/lib/validation/schemas";
import { AuditLogView } from "@/features/admin/audit-log-view";

export const metadata: Metadata = { title: "監査ログ" };

export default async function AuditLogsPage(props: PageProps<"/admin/audit-logs">) {
  const user = await requireUser();
  const q = parseSearchParams(await props.searchParams, auditQuerySchema);
  const [result, users] = await Promise.all([getAuditLogList(user, q), listUserOptions(true)]);
  return <AuditLogView result={result} users={users} />;
}
