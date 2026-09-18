"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  CheckSquare,
  FileText,
  FolderKanban,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  Settings,
  Upload,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, isAdmin } from "@/lib/policy";
import { ROLE } from "@/lib/constants";
import { api } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/misc";
import { useCurrentUser } from "./current-user-context";

const icons = {
  LayoutDashboard,
  Building2,
  FolderKanban,
  CheckSquare,
  MessageSquareText,
  FileText,
  Users,
  History,
  Upload,
  Settings,
} as const;

export function AppShell({ organizationName, children }: { organizationName: string; children: React.ReactNode }) {
  const user = useCurrentUser();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const items = NAV_ITEMS.filter((n) => !n.adminOnly || isAdmin(user));

  const logout = async () => {
    setLoggingOut(true);
    try {
      await api.post("/api/auth/logout");
    } finally {
      router.push("/login");
      router.refresh();
    }
  };

  const nav = (
    <nav className="flex-1 space-y-0.5 px-3 py-3" aria-label="メインメニュー">
      {items.map((item, i) => {
        const Icon = icons[item.icon];
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        const firstAdmin = item.adminOnly && !items[i - 1]?.adminOnly;
        return (
          <div key={item.href}>
            {firstAdmin && (
              <p className="mt-4 mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">管理者メニュー</p>
            )}
            <Link
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-primary-50 text-primary-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className={cn("size-4.5 shrink-0", active ? "text-primary-600" : "text-slate-400")} />
              {item.label}
            </Link>
          </div>
        );
      })}
    </nav>
  );

  const userPanel = (
    <div className="border-t border-slate-200 p-3">
      <div className="flex items-center gap-3 rounded-lg px-2 py-1.5">
        <Avatar name={user.name} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-900">{user.name}</p>
          <p className="truncate text-xs text-slate-500">{user.department ?? "—"}</p>
        </div>
        <Badge tone={ROLE[user.role].tone} size="sm">
          {ROLE[user.role].label}
        </Badge>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1">
        <Link
          href="/login?switch=1"
          className="flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-100"
          title="別のユーザーでログインし直す (デモ用)"
        >
          <UserCog className="size-3.5" /> ユーザー切替
        </Link>
        <button
          type="button"
          onClick={logout}
          disabled={loggingOut}
          className="flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-50"
        >
          <LogOut className="size-3.5" /> ログアウト
        </button>
      </div>
    </div>
  );

  const brand = (
    <div className="flex h-14 items-center gap-2.5 border-b border-slate-200 px-4">
      <div className="flex size-8 items-center justify-center rounded-lg bg-primary-600 text-sm font-bold text-white">業</div>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold leading-tight text-slate-900">業務管理システム</p>
        <p className="truncate text-[11px] leading-tight text-slate-500">{organizationName}</p>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* デスクトップ用サイドバー */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-slate-200 bg-white lg:flex">
        {brand}
        {nav}
        {userPanel}
      </aside>

      {/* モバイル用ドロワー */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} aria-hidden />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between pr-2">
              <div className="flex-1">{brand}</div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label="メニューを閉じる">
                <X className="size-5" />
              </button>
            </div>
            {nav}
            {userPanel}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        {/* モバイル用ヘッダー */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:hidden">
          <button type="button" onClick={() => setOpen(true)} className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100" aria-label="メニューを開く">
            <Menu className="size-5" />
          </button>
          <p className="text-sm font-bold text-slate-900">業務管理システム</p>
          <div className="ml-auto flex items-center gap-2">
            <Avatar name={user.name} size="sm" />
            <span className="text-xs text-slate-600">{user.name}</span>
          </div>
        </header>

        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
          <div className="mx-auto max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
