import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth/require-user";
import { prisma } from "@/server/db";
import { listUserOptions } from "@/server/services/user-service";
import { canEditCustomer } from "@/lib/policy";
import { AccessDenied, PageHeader } from "@/components/ui/misc";
import { CustomerForm } from "@/features/customers/customer-form";

export const metadata: Metadata = { title: "顧客編集" };

export default async function EditCustomerPage(props: PageProps<"/customers/[id]/edit">) {
  const user = await requireUser();
  const { id } = await props.params;
  const [customer, users] = await Promise.all([prisma.customer.findUnique({ where: { id } }), listUserOptions()]);
  if (!customer) notFound();
  if (!canEditCustomer(user, customer)) {
    return <AccessDenied message="この顧客を編集できるのは社内担当者または管理者のみです。" />;
  }
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={`${customer.name} を編集`}
        breadcrumbs={[{ label: "顧客・取引先", href: "/customers" }, { label: customer.name, href: `/customers/${customer.id}` }, { label: "編集" }]}
      />
      <CustomerForm customer={customer} users={users} currentUserId={user.id} />
    </div>
  );
}
