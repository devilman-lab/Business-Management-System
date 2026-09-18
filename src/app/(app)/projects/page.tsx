import type { Metadata } from "next";
import { requireUser } from "@/server/auth/require-user";
import { parseSearchParams } from "@/server/api/search-params";
import { getProjectList } from "@/server/services/project-service";
import { listUserOptions } from "@/server/services/user-service";
import { listCustomerOptions } from "@/server/repositories/customer-repository";
import { getDueSoonDays } from "@/server/services/settings-service";
import { projectQuerySchema } from "@/lib/validation/schemas";
import { ProjectListView } from "@/features/projects/project-list-view";

export const metadata: Metadata = { title: "案件・プロジェクト" };

export default async function ProjectsPage(props: PageProps<"/projects">) {
  const user = await requireUser();
  const q = parseSearchParams(await props.searchParams, projectQuerySchema);
  const [result, users, customers, dueSoonDays] = await Promise.all([
    getProjectList(q, user),
    listUserOptions(true),
    listCustomerOptions(),
    getDueSoonDays(),
  ]);
  return <ProjectListView result={result} users={users} customers={customers} dueSoonDays={dueSoonDays} />;
}
