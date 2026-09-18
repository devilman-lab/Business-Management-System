import type { Metadata } from "next";
import { requireUser } from "@/server/auth/require-user";
import { getDashboardData } from "@/server/services/dashboard-service";
import { isAdmin } from "@/lib/policy";
import { DashboardView } from "@/features/dashboard/dashboard-view";

export const metadata: Metadata = { title: "ダッシュボード" };

export default async function DashboardPage(props: PageProps<"/dashboard">) {
  const user = await requireUser();
  const sp = await props.searchParams;
  // 管理者は全体表示が既定、一般ユーザーは自分の担当が既定。scope=all / mine で切替可能
  const scope = sp.scope === "all" ? "all" : sp.scope === "mine" ? "mine" : isAdmin(user) ? "all" : "mine";
  const data = await getDashboardData(scope === "mine" ? { assigneeId: user.id } : {});
  return <DashboardView data={data} scope={scope} user={user} />;
}
