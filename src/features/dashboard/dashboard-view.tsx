import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  FolderKanban,
  Hourglass,
  PlayCircle,
  UserX,
} from "lucide-react";
import type { ProjectStatus } from "@prisma/client";
import type { DashboardData } from "@/server/services/dashboard-service";
import type { CurrentUser } from "@/lib/types";
import { ACTIVITY_TYPE, PRIORITY, PROJECT_STATUS, PROJECT_STATUS_LIST } from "@/lib/constants";
import { PROJECT_STATUS_CHART_COLOR } from "@/lib/chart-colors";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { OptionBadge } from "@/components/ui/badge";
import { DueDate, EmptyState, PageHeader, ProgressBar, UserChip } from "@/components/ui/misc";

/* ---------- KPI タイル ---------- */

function StatTile({
  label,
  value,
  href,
  icon,
  tone = "neutral",
  hint,
}: {
  label: string;
  value: number;
  href: string;
  icon: React.ReactNode;
  tone?: "neutral" | "primary" | "danger" | "warning" | "success";
  hint?: string;
}) {
  const toneCls = {
    neutral: "bg-slate-100 text-slate-600",
    primary: "bg-primary-50 text-primary-700",
    danger: "bg-red-50 text-red-600",
    warning: "bg-amber-50 text-amber-700",
    success: "bg-emerald-50 text-emerald-700",
  }[tone];
  const alert = (tone === "danger" || tone === "warning") && value > 0;
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-4 rounded-xl border bg-white p-4 shadow-card transition-colors hover:border-primary-300",
        alert ? (tone === "danger" ? "border-red-200" : "border-amber-200") : "border-slate-200",
      )}
    >
      <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-lg", toneCls)}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block whitespace-nowrap text-xs font-medium text-slate-500">{label}</span>
        <span className={cn("block text-2xl font-semibold leading-tight", alert ? (tone === "danger" ? "text-red-700" : "text-amber-700") : "text-slate-900")}>
          {value.toLocaleString()}
          <span className="ml-0.5 text-sm font-normal text-slate-500">件</span>
        </span>
        {hint && <span className="block text-[11px] text-slate-400">{hint}</span>}
      </span>
      <ArrowRight className="size-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-primary-500" />
    </Link>
  );
}

/* ---------- ステータス別 横棒 ---------- */

function StatusBars({ counts, total, scopeQuery }: { counts: Record<ProjectStatus, number>; total: number; scopeQuery: string }) {
  const max = Math.max(1, ...Object.values(counts));
  return (
    <div className="space-y-2.5">
      {PROJECT_STATUS_LIST.map((s) => {
        const n = counts[s.value];
        return (
          <Link key={s.value} href={`/projects?status=${s.value}${scopeQuery}`} className="group grid grid-cols-[6rem_1fr_3rem] items-center gap-3 text-sm">
            <span className="flex items-center gap-2 text-slate-700">
              <span className="size-2.5 rounded-sm" style={{ background: PROJECT_STATUS_CHART_COLOR[s.value] }} aria-hidden />
              {s.label}
            </span>
            <span className="h-4 w-full rounded-r bg-slate-100">
              <span
                className="block h-full rounded-r transition-all group-hover:opacity-80"
                style={{ width: `${(n / max) * 100}%`, background: PROJECT_STATUS_CHART_COLOR[s.value], minWidth: n > 0 ? 4 : 0 }}
              />
            </span>
            <span className="text-right tabular-nums text-slate-700">
              {n}
              <span className="ml-1 text-[11px] text-slate-400">{total ? Math.round((n / total) * 100) : 0}%</span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}

/* ---------- 担当者別 積み上げ ---------- */

function AssigneeStack({ rows, scopeQuery }: { rows: DashboardData["assigneeSummary"]; scopeQuery: string }) {
  if (rows.length === 0) return <EmptyState compact title="案件がありません" />;
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        {PROJECT_STATUS_LIST.map((s) => (
          <span key={s.value} className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ background: PROJECT_STATUS_CHART_COLOR[s.value] }} aria-hidden />
            {s.label}
          </span>
        ))}
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[40rem]">
          <div className="grid grid-cols-[minmax(9rem,1.2fr)_minmax(10rem,3fr)_repeat(6,3rem)] items-center gap-x-2 border-b border-slate-200 bg-slate-50 px-2 py-2 text-[11px] font-semibold text-slate-500">
            <span>担当者</span>
            <span>案件状況</span>
            {PROJECT_STATUS_LIST.map((s) => (
              <span key={s.value} className="text-right">
                {s.label}
              </span>
            ))}
            <span className="text-right">合計</span>
          </div>
          {rows.map((r) => {
            const key = r.assignee?.id ?? "none";
            const href = r.assignee ? `/projects?assigneeId=${r.assignee.id}` : `/projects?assigneeId=none`;
            const open = r.total - r.counts.COMPLETED;
            return (
              <div key={key} className="grid grid-cols-[minmax(9rem,1.2fr)_minmax(10rem,3fr)_repeat(6,3rem)] items-center gap-x-2 border-b border-slate-100 px-2 py-2.5 text-sm hover:bg-slate-50/80">
                <div className="min-w-0">
                  <Link href={href} className="hover:underline">
                    {r.assignee ? (
                      <UserChip name={r.assignee.name} />
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-amber-700">
                        <UserX className="size-4" /> 担当者未設定
                      </span>
                    )}
                  </Link>
                  <span className="block truncate pl-8 text-[11px] text-slate-400">
                    {r.assignee?.department ?? ""}
                    {r.assignee?.department && open > 0 ? " · " : ""}
                    {open > 0 ? `未完了 ${open}` : ""}
                  </span>
                </div>
                <div className="flex h-4 gap-0.5" style={{ width: `${(r.total / max) * 100}%`, minWidth: 8 }} role="img" aria-label={`合計 ${r.total} 件`}>
                  {PROJECT_STATUS_LIST.map((s) => {
                    const n = r.counts[s.value];
                    if (!n) return null;
                    return (
                      <Link
                        key={s.value}
                        href={`${href}&status=${s.value}${scopeQuery}`}
                        title={`${s.label}: ${n}件`}
                        className="flex items-center justify-center overflow-hidden rounded-[3px] text-[10px] font-semibold text-white hover:opacity-80"
                        style={{ flex: n, background: PROJECT_STATUS_CHART_COLOR[s.value], minWidth: 6 }}
                      >
                        {n >= 2 ? n : ""}
                      </Link>
                    );
                  })}
                </div>
                {PROJECT_STATUS_LIST.map((s) => (
                  <span key={s.value} className={cn("text-right tabular-nums", r.counts[s.value] === 0 ? "text-slate-300" : "text-slate-700")}>
                    {r.counts[s.value]}
                  </span>
                ))}
                <span className="text-right font-medium tabular-nums text-slate-900">{r.total}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------- 本体 ---------- */

export function DashboardView({ data, scope, user }: { data: DashboardData; scope: "all" | "mine"; user: CurrentUser }) {
  const k = data.kpis;
  const scopeQuery = scope === "mine" ? "&mine=1" : "";
  const taskScope = scope === "mine" ? "&mine=1" : "";
  const problems = k.overdueTasks + k.overdueProjects + k.todayTasks;

  return (
    <div>
      <PageHeader
        title="ダッシュボード"
        description={
          scope === "mine"
            ? `${user.name} さんが担当する案件・タスクの状況です`
            : "全社の案件・タスクの状況です。数字をクリックすると該当する一覧へ移動します"
        }
        actions={
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-sm">
            <Link
              href="/dashboard?scope=mine"
              className={cn("rounded-md px-3 py-1.5 font-medium", scope === "mine" ? "bg-primary-600 text-white" : "text-slate-600 hover:bg-slate-100")}
            >
              自分の担当
            </Link>
            <Link
              href="/dashboard?scope=all"
              className={cn("rounded-md px-3 py-1.5 font-medium", scope === "all" ? "bg-primary-600 text-white" : "text-slate-600 hover:bg-slate-100")}
            >
              全体
            </Link>
          </div>
        }
      />

      {/* 注意が必要な項目 */}
      {problems > 0 ? (
        <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="size-4.5 shrink-0 text-amber-600" />
          <span className="font-medium">対応が必要な項目があります:</span>
          {k.overdueTasks > 0 && (
            <Link href={`/tasks?due=overdue${taskScope}`} className="underline decoration-amber-400 underline-offset-2 hover:text-amber-950">
              期限超過タスク {k.overdueTasks}件
            </Link>
          )}
          {k.todayTasks > 0 && (
            <Link href={`/tasks?due=today${taskScope}`} className="underline decoration-amber-400 underline-offset-2 hover:text-amber-950">
              本日期限のタスク {k.todayTasks}件
            </Link>
          )}
          {k.overdueProjects > 0 && (
            <Link href={`/projects?overdue=1${scopeQuery}`} className="underline decoration-amber-400 underline-offset-2 hover:text-amber-950">
              期限超過の案件 {k.overdueProjects}件
            </Link>
          )}
        </div>
      ) : (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="size-4.5 text-emerald-600" /> 期限超過・本日期限のタスクはありません。
        </div>
      )}

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
        <StatTile label="案件総数" value={k.projectTotal} href={`/projects?${scopeQuery.slice(1)}`} icon={<FolderKanban className="size-5" />} />
        <StatTile label="進行中案件" value={k.inProgress} href={`/projects?status=IN_PROGRESS${scopeQuery}`} icon={<PlayCircle className="size-5" />} tone="primary" />
        <StatTile label="完了案件" value={k.completed} href={`/projects?status=COMPLETED${scopeQuery}`} icon={<CheckCircle2 className="size-5" />} tone="success" />
        <StatTile label="期限超過タスク" value={k.overdueTasks} href={`/tasks?due=overdue${taskScope}`} icon={<AlertTriangle className="size-5" />} tone="danger" />
        <StatTile label="本日期限のタスク" value={k.todayTasks} href={`/tasks?due=today${taskScope}`} icon={<CalendarClock className="size-5" />} tone="warning" hint={`${data.dueSoonDays}日以内: ${k.dueSoonTasks}件`} />
        <StatTile
          label="未対応・確認待ち"
          value={k.waiting}
          href={`/projects?status=NOT_STARTED,WAITING_REVIEW${scopeQuery}`}
          icon={<Hourglass className="size-5" />}
          tone="neutral"
          hint={`未着手 ${k.notStarted} / 確認待ち ${k.waitingReview}`}
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        {/* ステータス別 */}
        <Card className="min-w-0">
          <CardHeader title="ステータス別案件数" description={`全 ${k.projectTotal} 件`} />
          <CardBody>
            <StatusBars counts={data.statusCounts} total={k.projectTotal} scopeQuery={scopeQuery} />
          </CardBody>
        </Card>

        {/* 担当者別 */}
        <Card className="min-w-0 xl:col-span-2">
          <CardHeader title="担当者別の案件状況" description="担当者ごとの案件数をステータス別に表示。バーをクリックすると絞り込めます" />
          <CardBody className="px-0 pb-0">
            <div className="px-5">
              <AssigneeStack rows={data.assigneeSummary} scopeQuery={scopeQuery} />
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        {/* 期限超過・本日期限タスク */}
        <Card className="min-w-0">
          <CardHeader
            title="至急対応が必要なタスク"
            description="期限超過および本日期限の未完了タスク"
            actions={
              <Link href={`/tasks?due=overdue${taskScope}`} className="text-xs font-medium text-primary-700 hover:underline">
                すべて見る
              </Link>
            }
          />
          {data.overdueTaskList.length + data.todayTaskList.length === 0 ? (
            <EmptyState compact title="至急対応が必要なタスクはありません" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {[...data.overdueTaskList, ...data.todayTaskList].map((t) => (
                <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2.5">
                  <div className="min-w-0 flex-1">
                    <Link href={`/projects/${t.projectId}?tab=tasks`} className="block truncate text-sm font-medium text-slate-900 hover:text-primary-700 hover:underline">
                      {t.title}
                    </Link>
                    <p className="truncate text-xs text-slate-500">
                      {t.project.customer.name} / {t.project.name}
                    </p>
                  </div>
                  <OptionBadge option={PRIORITY[t.priority]} dot={false} size="sm" />
                  <span className="hidden sm:inline">
                    <UserChip name={t.assignee?.name} size="xs" />
                  </span>
                  <DueDate value={t.dueDate} completed={false} soonDays={data.dueSoonDays} className="text-xs" />
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* 最近更新された案件 */}
        <Card className="min-w-0">
          <CardHeader
            title="最近更新された案件"
            actions={
              <Link href={`/projects?${scopeQuery.slice(1)}`} className="text-xs font-medium text-primary-700 hover:underline">
                案件一覧へ
              </Link>
            }
          />
          {data.recentProjects.length === 0 ? (
            <EmptyState compact title="案件がありません" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.recentProjects.map((p) => (
                <li key={p.id} className="px-5 py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <Link href={`/projects/${p.id}`} className="block truncate text-sm font-medium text-slate-900 hover:text-primary-700 hover:underline">
                        {p.name}
                      </Link>
                      <p className="truncate text-xs text-slate-500">
                        {p.customer.name} · 担当: {p.assignee?.name ?? "未設定"}
                      </p>
                    </div>
                    <OptionBadge option={PROJECT_STATUS[p.status]} size="sm" />
                    <span className="hidden w-28 sm:block">
                      <ProgressBar value={p.progress} />
                    </span>
                    <span className="hidden text-xs text-slate-400 md:inline">
                      <Clock className="mr-1 inline size-3" />
                      {formatDate(p.updatedAt)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* 最近の対応履歴 */}
      <Card className="mt-5">
        <CardHeader
          title="最近の対応履歴"
          description="顧客・案件への対応記録 (新しい順)"
          actions={
            <Link href="/activities" className="text-xs font-medium text-primary-700 hover:underline">
              対応履歴一覧へ
            </Link>
          }
        />
        {data.recentActivities.length === 0 ? (
          <EmptyState compact title="対応履歴がありません" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.recentActivities.map((a) => (
              <li key={a.id} className="flex flex-wrap gap-x-3 gap-y-1 px-5 py-3">
                <span className="w-32 shrink-0 text-xs tabular-nums text-slate-500">{formatDateTime(a.occurredAt)}</span>
                <OptionBadge option={ACTIVITY_TYPE[a.type]} dot={false} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-slate-900">{a.title}</p>
                  <p className="truncate text-xs text-slate-500">
                    <Link href={`/customers/${a.customer.id}`} className="hover:underline">
                      {a.customer.name}
                    </Link>
                    {a.project && (
                      <>
                        {" / "}
                        <Link href={`/projects/${a.project.id}?tab=activities`} className="hover:underline">
                          {a.project.name}
                        </Link>
                      </>
                    )}
                    {" · "}
                    {a.user.name}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
