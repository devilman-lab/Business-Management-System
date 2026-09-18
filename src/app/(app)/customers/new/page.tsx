import type { Metadata } from "next";
import { requireUser } from "@/server/auth/require-user";
import { listUserOptions } from "@/server/services/user-service";
import { PageHeader } from "@/components/ui/misc";
import { CustomerForm } from "@/features/customers/customer-form";

export const metadata: Metadata = { title: "顧客登録" };

export default async function NewCustomerPage() {
  const user = await requireUser();
  const users = await listUserOptions();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="顧客を登録" breadcrumbs={[{ label: "顧客・取引先", href: "/customers" }, { label: "新規登録" }]} />
      <CustomerForm users={users} currentUserId={user.id} />
    </div>
  );
}
