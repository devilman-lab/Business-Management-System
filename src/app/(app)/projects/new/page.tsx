import type { Metadata } from "next";
import { requireUser } from "@/server/auth/require-user";
import { listUserOptions } from "@/server/services/user-service";
import { listCustomerOptions } from "@/server/repositories/customer-repository";
import { PageHeader } from "@/components/ui/misc";
import { ProjectForm } from "@/features/projects/project-form";

export const metadata: Metadata = { title: "案件登録" };

export default async function NewProjectPage(props: PageProps<"/projects/new">) {
  const user = await requireUser();
  const sp = await props.searchParams;
  const [customers, users] = await Promise.all([listCustomerOptions(), listUserOptions()]);
  const defaultCustomerId = typeof sp.customerId === "string" ? sp.customerId : undefined;
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="案件を登録" breadcrumbs={[{ label: "案件・プロジェクト", href: "/projects" }, { label: "新規登録" }]} />
      <ProjectForm customers={customers} users={users} defaultCustomerId={defaultCustomerId} currentUserId={user.id} />
    </div>
  );
}
