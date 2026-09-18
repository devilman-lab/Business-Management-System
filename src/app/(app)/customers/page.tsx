import type { Metadata } from "next";
import { requireUser } from "@/server/auth/require-user";
import { parseSearchParams } from "@/server/api/search-params";
import { getCustomerList } from "@/server/services/customer-service";
import { listUserOptions } from "@/server/services/user-service";
import { customerQuerySchema } from "@/lib/validation/schemas";
import { CustomerListView } from "@/features/customers/customer-list-view";

export const metadata: Metadata = { title: "顧客・取引先" };

export default async function CustomersPage(props: PageProps<"/customers">) {
  await requireUser();
  const q = parseSearchParams(await props.searchParams, customerQuerySchema);
  const [result, users] = await Promise.all([getCustomerList(q), listUserOptions(true)]);
  return <CustomerListView result={result} users={users} />;
}
