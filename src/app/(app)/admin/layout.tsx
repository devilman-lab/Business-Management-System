import { requireUser } from "@/server/auth/require-user";
import { isAdmin } from "@/lib/policy";
import { AccessDenied } from "@/components/ui/misc";

/**
 * 管理者専用エリア。一般ユーザーが URL を直接開いても 403 画面を表示する。
 * (API 側でも同様に権限チェックを行うため、画面を突破しても操作はできない)
 */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireUser();
  if (!isAdmin(user)) {
    return <AccessDenied message="ユーザー管理・監査ログ・CSV取込・システム設定は管理者のみ利用できます。管理者としてログインし直すか、管理者にお問い合わせください。" />;
  }
  return <>{children}</>;
}
