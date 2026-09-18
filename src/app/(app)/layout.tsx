import { requireUser } from "@/server/auth/require-user";
import { getSettings } from "@/server/services/settings-service";
import { CurrentUserProvider } from "@/components/layout/current-user-context";
import { AppShell } from "@/components/layout/app-shell";

/**
 * ログイン後の全画面で共通のレイアウト。
 * ここで認証を強制するため、配下のページは未ログインで表示されない。
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const [user, settings] = await Promise.all([requireUser(), getSettings()]);
  return (
    <CurrentUserProvider user={user}>
      <AppShell organizationName={settings.organizationName}>{children}</AppShell>
    </CurrentUserProvider>
  );
}
