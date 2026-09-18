import type { Metadata } from "next";
import { requireUser } from "@/server/auth/require-user";
import { parseSearchParams } from "@/server/api/search-params";
import { getUserList } from "@/server/services/user-service";
import { userQuerySchema } from "@/lib/validation/schemas";
import { UserListView } from "@/features/admin/user-list-view";

export const metadata: Metadata = { title: "ユーザー管理" };

export default async function UsersPage(props: PageProps<"/admin/users">) {
  const user = await requireUser();
  const q = parseSearchParams(await props.searchParams, userQuerySchema);
  const result = await getUserList({ user }, q);
  return <UserListView result={result} />;
}
