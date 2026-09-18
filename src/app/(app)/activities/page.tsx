import type { Metadata } from "next";
import { requireUser } from "@/server/auth/require-user";
import { parseSearchParams } from "@/server/api/search-params";
import { getActivityList } from "@/server/services/activity-service";
import { listUserOptions } from "@/server/services/user-service";
import { listCustomerOptions } from "@/server/repositories/customer-repository";
import { activityQuerySchema } from "@/lib/validation/schemas";
import { ActivityListView } from "@/features/activities/activity-list-view";

export const metadata: Metadata = { title: "対応履歴" };

export default async function ActivitiesPage(props: PageProps<"/activities">) {
  await requireUser();
  const q = parseSearchParams(await props.searchParams, activityQuerySchema);
  const [result, users, customers] = await Promise.all([getActivityList(q), listUserOptions(true), listCustomerOptions()]);
  return <ActivityListView result={result} users={users} customers={customers} />;
}
