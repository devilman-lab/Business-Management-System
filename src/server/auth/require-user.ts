import { redirect } from "next/navigation";
import { getCurrentUser, type CurrentUser } from "./session";

/** ページ用: 未ログインならログイン画面へ */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
