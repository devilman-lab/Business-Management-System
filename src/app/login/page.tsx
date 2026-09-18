import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { getSettings } from "@/server/services/settings-service";
import { prisma } from "@/server/db";
import { LoginForm } from "@/features/auth/login-form";

export const metadata: Metadata = { title: "ログイン" };

export default async function LoginPage(props: PageProps<"/login">) {
  const sp = await props.searchParams;
  const switching = sp.switch === "1";
  const user = await getCurrentUser();
  if (user && !switching) redirect(typeof sp.next === "string" && sp.next.startsWith("/") ? sp.next : "/dashboard");

  const [settings, demoUsers] = await Promise.all([
    getSettings(),
    // デモ用: ログイン画面でアカウントを選べるようにする (本番では表示しない)
    prisma.user.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, email: true, role: true, department: true },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-4xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-primary-600 text-lg font-bold text-white">業</div>
          <h1 className="text-2xl font-bold text-slate-900">業務管理システム</h1>
          <p className="mt-1 text-sm text-slate-500">{settings.organizationName} — 顧客・案件・タスク・対応履歴を一元管理</p>
        </div>
        <LoginForm
          demoUsers={demoUsers}
          next={typeof sp.next === "string" && sp.next.startsWith("/") ? sp.next : "/dashboard"}
          currentUserName={switching ? (user?.name ?? null) : null}
        />
      </div>
    </div>
  );
}
