import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth/require-user";
import { prisma } from "@/server/db";
import { listUserOptions } from "@/server/services/user-service";
import { listCustomerOptions } from "@/server/repositories/customer-repository";
import { canEditProject } from "@/lib/policy";
import { AccessDenied, PageHeader } from "@/components/ui/misc";
import { ProjectForm } from "@/features/projects/project-form";

export const metadata: Metadata = { title: "案件編集" };

export default async function EditProjectPage(props: PageProps<"/projects/[id]/edit">) {
  const user = await requireUser();
  const { id } = await props.params;
  const [project, customers, users] = await Promise.all([prisma.project.findUnique({ where: { id } }), listCustomerOptions(), listUserOptions()]);
  if (!project) notFound();
  if (!canEditProject(user, project)) {
    return <AccessDenied message="この案件を編集できるのは案件の担当者または管理者のみです。" />;
  }
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={`${project.name} を編集`}
        breadcrumbs={[{ label: "案件・プロジェクト", href: "/projects" }, { label: project.name, href: `/projects/${project.id}` }, { label: "編集" }]}
      />
      <ProjectForm project={project} customers={customers} users={users} currentUserId={user.id} />
    </div>
  );
}
