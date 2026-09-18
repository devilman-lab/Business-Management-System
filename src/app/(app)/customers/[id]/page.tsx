import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth/require-user";
import { findCustomerById } from "@/server/repositories/customer-repository";
import { listTasks } from "@/server/repositories/task-repository";
import { getDueSoonDays } from "@/server/services/settings-service";
import { taskQuerySchema } from "@/lib/validation/schemas";
import { CustomerDetailView } from "@/features/customers/customer-detail-view";

export async function generateMetadata(props: PageProps<"/customers/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const c = await findCustomerById(id);
  return { title: c ? c.name : "顧客詳細" };
}

export default async function CustomerDetailPage(props: PageProps<"/customers/[id]">) {
  await requireUser();
  const { id } = await props.params;
  const customer = await findCustomerById(id);
  if (!customer) notFound();

  const [openTasks, dueSoonDays] = await Promise.all([
    listTasks(taskQuerySchema.parse({ customerId: id, status: ["NOT_STARTED", "IN_PROGRESS"], pageSize: 50, sort: "dueDate", order: "asc" })),
    getDueSoonDays(),
  ]);

  return <CustomerDetailView customer={customer} openTasks={openTasks.items} dueSoonDays={dueSoonDays} />;
}
