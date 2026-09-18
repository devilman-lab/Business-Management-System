import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth/require-user";
import { findProjectById } from "@/server/repositories/project-repository";
import { listUserOptions } from "@/server/services/user-service";
import { getDueSoonDays } from "@/server/services/settings-service";
import { parseChanges } from "@/server/audit/audit-service";
import { ProjectDetailView, type ProjectTab } from "@/features/projects/project-detail-view";

export async function generateMetadata(props: PageProps<"/projects/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const p = await findProjectById(id);
  return { title: p ? `${p.name}` : "案件詳細" };
}

const TABS: ProjectTab[] = ["overview", "tasks", "activities", "files", "history"];

export default async function ProjectDetailPage(props: PageProps<"/projects/[id]">) {
  await requireUser();
  const [{ id }, sp] = await Promise.all([props.params, props.searchParams]);
  const [project, users, dueSoonDays] = await Promise.all([findProjectById(id), listUserOptions(), getDueSoonDays()]);
  if (!project) notFound();

  const tab = TABS.includes(sp.tab as ProjectTab) ? (sp.tab as ProjectTab) : "overview";
  const history = project.auditLogs.map((l) => ({ ...l, changes: parseChanges(l.changes) }));

  return <ProjectDetailView project={project} history={history} users={users} dueSoonDays={dueSoonDays} initialTab={tab} />;
}
