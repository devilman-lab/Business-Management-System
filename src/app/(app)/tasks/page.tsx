import type { Metadata } from "next";
import { requireUser } from "@/server/auth/require-user";
import { parseSearchParams } from "@/server/api/search-params";
import { getTaskList } from "@/server/services/task-service";
import { listUserOptions } from "@/server/services/user-service";
import { listCustomerOptions } from "@/server/repositories/customer-repository";
import { getDueSoonDays } from "@/server/services/settings-service";
import { taskQuerySchema } from "@/lib/validation/schemas";
import { TaskListView } from "@/features/tasks/task-list-view";

export const metadata: Metadata = { title: "タスク" };

export default async function TasksPage(props: PageProps<"/tasks">) {
  const user = await requireUser();
  const q = parseSearchParams(await props.searchParams, taskQuerySchema);
  const [result, users, customers, dueSoonDays] = await Promise.all([getTaskList(q, user), listUserOptions(true), listCustomerOptions(), getDueSoonDays()]);
  return <TaskListView result={result} users={users} customers={customers} dueSoonDays={dueSoonDays} />;
}
