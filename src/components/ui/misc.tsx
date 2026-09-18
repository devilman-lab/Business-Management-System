import Link from "next/link";
import { ChevronRight, Inbox, Loader2 } from "lucide-react";
import { cn, formatDate, getDueState, type DueState } from "@/lib/utils";

/* ---------- ページヘッダー ---------- */

export interface Crumb {
  label: string;
  href?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  meta,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbs?: Crumb[];
  meta?: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-2 flex items-center gap-1 text-xs text-slate-500" aria-label="パンくず">
          {breadcrumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="size-3" />}
              {c.href ? (
                <Link href={c.href} className="hover:text-primary-700 hover:underline">
                  {c.label}
                </Link>
              ) : (
                <span className="text-slate-700">{c.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
          {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
          {meta && <div className="mt-2 flex flex-wrap items-center gap-2">{meta}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

/* ---------- 空状態 ---------- */

export function EmptyState({
  title = "データがありません",
  description,
  action,
  icon,
  compact,
}: {
  title?: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center", compact ? "py-8" : "py-16")}>
      <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        {icon ?? <Inbox className="size-6" />}
      </div>
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {description && <p className="mt-1 max-w-sm text-xs text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ---------- ローディング ---------- */

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-5 animate-spin text-slate-400", className)} aria-label="読み込み中" />;
}

export function LoadingBlock({ label = "読み込み中..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
      <Spinner /> {label}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-slate-200/70", className)} />;
}

/* ---------- 期限表示 ---------- */

const dueStyles: Record<DueState, string> = {
  overdue: "text-red-700 font-semibold",
  today: "text-amber-700 font-semibold",
  soon: "text-amber-700",
  normal: "text-slate-700",
  none: "text-slate-400",
};

const dueLabels: Record<DueState, string> = {
  overdue: "期限超過",
  today: "本日",
  soon: "間近",
  normal: "",
  none: "",
};

export function DueDate({
  value,
  completed,
  soonDays = 3,
  showLabel = true,
  className,
}: {
  value: Date | string | null | undefined;
  completed: boolean;
  soonDays?: number;
  showLabel?: boolean;
  className?: string;
}) {
  const state = getDueState(value, completed, new Date(), soonDays);
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap tabular-nums", dueStyles[state], className)}>
      {state === "overdue" && <span className="size-1.5 rounded-full bg-red-500" aria-hidden />}
      {state === "today" && <span className="size-1.5 rounded-full bg-amber-500" aria-hidden />}
      {formatDate(value)}
      {showLabel && dueLabels[state] && (
        <span
          className={cn(
            "rounded px-1 py-px text-[10px] font-semibold",
            state === "overdue" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800",
          )}
        >
          {dueLabels[state]}
        </span>
      )}
    </span>
  );
}

/* ---------- 進捗バー ---------- */

export function ProgressBar({ value, className, showValue = true }: { value: number; className?: string; showValue?: boolean }) {
  const v = Math.max(0, Math.min(100, value));
  const color = v >= 100 ? "bg-emerald-500" : v >= 60 ? "bg-primary-500" : v >= 30 ? "bg-primary-400" : "bg-slate-400";
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-2 w-full min-w-16 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}>
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${v}%` }} />
      </div>
      {showValue && <span className="w-9 shrink-0 text-right text-xs tabular-nums text-slate-600">{v}%</span>}
    </div>
  );
}

/* ---------- アバター (イニシャル) ---------- */

export function Avatar({ name, size = "sm", className }: { name: string | null | undefined; size?: "xs" | "sm" | "md"; className?: string }) {
  const initial = name ? name.replace(/\s/g, "").slice(0, 1) : "?";
  const sz = size === "xs" ? "size-5 text-[10px]" : size === "sm" ? "size-6 text-[11px]" : "size-8 text-sm";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold",
        name ? "bg-primary-100 text-primary-800" : "bg-slate-200 text-slate-500",
        sz,
        className,
      )}
      aria-hidden
    >
      {initial}
    </span>
  );
}

export function UserChip({ name, department, size = "sm" }: { name: string | null | undefined; department?: string | null; size?: "xs" | "sm" }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <Avatar name={name} size={size} />
      <span className={cn(name ? "text-slate-700" : "text-slate-400")}>{name ?? "未設定"}</span>
      {department && <span className="text-xs text-slate-400">{department}</span>}
    </span>
  );
}

/* ---------- 定義リスト (詳細画面の基本情報) ---------- */

export function DescriptionList({ items, columns = 2 }: { items: { label: string; value: React.ReactNode }[]; columns?: 1 | 2 | 3 }) {
  return (
    <dl className={cn("grid gap-x-6 gap-y-3", columns === 1 && "grid-cols-1", columns === 2 && "grid-cols-1 sm:grid-cols-2", columns === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3")}>
      {items.map((it) => (
        <div key={it.label} className="min-w-0">
          <dt className="text-xs font-medium text-slate-500">{it.label}</dt>
          <dd className="mt-0.5 break-words text-sm text-slate-800">{it.value ?? <span className="text-slate-400">—</span>}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ---------- 権限なし ---------- */

export function AccessDenied({ message = "この画面は管理者のみ利用できます。" }: { message?: string }) {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-red-50 text-red-600">
        <span className="text-2xl font-bold">403</span>
      </div>
      <h1 className="text-lg font-semibold text-slate-900">アクセス権限がありません</h1>
      <p className="mt-2 text-sm text-slate-500">{message}</p>
      <Link href="/dashboard" className="mt-6 inline-block text-sm font-medium text-primary-700 hover:underline">
        ダッシュボードへ戻る
      </Link>
    </div>
  );
}
