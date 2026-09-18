"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, CalendarClock, Download, Plus } from "lucide-react";
import type { TaskListItem } from "@/server/repositories/task-repository";
import type { CustomerOption, PagedResult, UserOption } from "@/lib/types";
import { PRIORITY, PRIORITY_LIST, TASK_STATUS_LIST } from "@/lib/constants";
import { canCreateTask, canDeleteTask, canEditTask, canExportCsv } from "@/lib/policy";
import { cn, formatDate } from "@/lib/utils";
import { useListFilters, useSearchInput } from "@/hooks/use-list-filters";
import { useCurrentUser } from "@/components/layout/current-user-context";
import { Button } from "@/components/ui/button";
import { OptionBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/form";
import { DateRange, FilterBar, FilterChips, FilterSelect, SearchInput } from "@/components/ui/filter-bar";
import { DueDate, EmptyState, PageHeader, UserChip } from "@/components/ui/misc";
import { Pagination } from "@/components/ui/pagination";
import { SortableTh } from "@/components/ui/sortable-th";
import { Table, TableWrapper, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { TaskFormModal, type TaskEditTarget } from "./task-form-modal";
import { TaskRowActions, TaskStatusSelect } from "./task-controls";

const DUE_PRESETS = [
  { value: "overdue", label: "期限超過", icon: <AlertTriangle className="size-3.5" />, cls: "border-red-300 bg-red-50 text-red-700" },
  { value: "today", label: "本日期限", icon: <CalendarClock className="size-3.5" />, cls: "border-amber-300 bg-amber-50 text-amber-800" },
  { value: "soon", label: "期限間近", icon: <CalendarClock className="size-3.5" />, cls: "border-amber-200 bg-amber-50/60 text-amber-800" },
  { value: "none", label: "期限未設定", icon: null, cls: "border-slate-300 bg-slate-50 text-slate-600" },
];

export function TaskListView({ result, users, customers, dueSoonDays }: { result: PagedResult<TaskListItem>; users: UserOption[]; customers: CustomerOption[]; dueSoonDays: number }) {
  const user = useCurrentUser();
  const f = useListFilters();
  const [q, setQ] = useSearchInput("q", f);
  const [modal, setModal] = useState<{ open: boolean; editing: TaskEditTarget | null }>({ open: false, editing: null });
  const due = f.get("due");
  const exportUrl = `/api/tasks/export?${f.searchParams.toString()}`;

  const title = due === "overdue" ? "期限超過タスク" : due === "today" ? "本日期限のタスク" : due === "soon" ? "期限間近のタスク" : "タスク";

  return (
    <div>
      <PageHeader
        title={title}
        description="案件に紐づくタスクを横断して確認できます。担当者・ステータス・優先度・期限で絞り込めます"
        breadcrumbs={due ? [{ label: "タスク", href: "/tasks" }, { label: title }] : undefined}
        actions={
          <>
            {canExportCsv(user) && (
              <Button variant="outline" icon={<Download className="size-4" />} onClick={() => window.open(exportUrl, "_blank")}>
                CSVエクスポート
              </Button>
            )}
            {canCreateTask(user) && (
              <Button icon={<Plus className="size-4" />} onClick={() => setModal({ open: true, editing: null })}>
                タスクを登録
              </Button>
            )}
          </>
        }
      />

      <div className="mb-3 flex flex-wrap gap-2">
        {DUE_PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => f.update({ due: due === p.value ? null : p.value })}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              due === p.value ? p.cls + " ring-2 ring-offset-1 ring-primary-300" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
            )}
            aria-pressed={due === p.value}
          >
            {p.icon} {p.label}
          </button>
        ))}
      </div>

      <FilterBar onReset={f.reset} hasFilters={f.hasFilters} isPending={f.isPending} className="mb-4">
        <SearchInput value={q} onChange={setQ} placeholder="タスク名・案件名・顧客名で検索" />
        <FilterSelect
          label="担当者"
          value={f.get("assigneeId")}
          onChange={(v) => f.update({ assigneeId: v })}
          options={[{ value: "none", label: "(未設定)" }, ...users.map((u) => ({ value: u.id, label: u.status === "INACTIVE" ? `${u.name} (無効)` : u.name }))]}
        />
        <FilterSelect label="顧客" value={f.get("customerId")} onChange={(v) => f.update({ customerId: v })} options={customers.map((c) => ({ value: c.id, label: c.name }))} />
        <FilterChips label="ステータス" values={f.getAll("status")} onChange={(v) => f.update({ status: v })} options={TASK_STATUS_LIST} />
        <FilterChips label="優先度" values={f.getAll("priority")} onChange={(v) => f.update({ priority: v })} options={PRIORITY_LIST} />
        <DateRange label="期限" from={f.get("dueFrom")} to={f.get("dueTo")} onChange={(from, to) => f.update({ dueFrom: from, dueTo: to })} />
        <div className="flex h-9 items-center self-end">
          <Checkbox label="自分の担当のみ" checked={f.get("mine") === "1"} onChange={(e) => f.update({ mine: e.target.checked ? "1" : null })} />
        </div>
      </FilterBar>

      <Card>
        {result.items.length === 0 ? (
          <EmptyState
            title={f.hasFilters ? "条件に一致するタスクがありません" : "タスクが登録されていません"}
            description={f.hasFilters ? "検索条件を変更するか、条件をクリアしてください" : "案件詳細または「タスクを登録」から追加できます"}
            action={f.hasFilters ? <Button variant="outline" onClick={f.reset}>条件をクリア</Button> : undefined}
          />
        ) : (
          <TableWrapper>
            <Table>
              <THead>
                <tr>
                  <SortableTh label="タスク名" sortKey="title" filters={f} />
                  <Th>関連案件</Th>
                  <Th>担当者</Th>
                  <SortableTh label="ステータス" sortKey="status" filters={f} />
                  <SortableTh label="優先度" sortKey="priority" filters={f} />
                  <SortableTh label="期限" sortKey="dueDate" filters={f} />
                  <SortableTh label="作成日" sortKey="createdAt" filters={f} defaultOrder="desc" />
                  <Th>完了日</Th>
                  <Th align="right"></Th>
                </tr>
              </THead>
              <TBody>
                {result.items.map((t) => {
                  const canEdit = canEditTask(user, t);
                  return (
                    <Tr key={t.id} className={t.status === "COMPLETED" ? "opacity-70" : ""}>
                      <Td>
                        <Link href={`/projects/${t.projectId}?tab=tasks`} className="font-medium text-slate-900 hover:text-primary-700 hover:underline">
                          {t.title}
                        </Link>
                        {t.description && <span className="block max-w-xs truncate text-xs text-slate-500">{t.description}</span>}
                      </Td>
                      <Td>
                        <Link href={`/projects/${t.projectId}`} className="text-slate-700 hover:text-primary-700 hover:underline">
                          {t.project.name}
                        </Link>
                        <span className="block text-xs text-slate-400">{t.project.customer.name}</span>
                      </Td>
                      <Td>
                        <UserChip name={t.assignee?.name} />
                      </Td>
                      <Td>
                        <TaskStatusSelect taskId={t.id} status={t.status} editable={canEdit} />
                      </Td>
                      <Td>
                        <OptionBadge option={PRIORITY[t.priority]} dot={false} />
                      </Td>
                      <Td>
                        <DueDate value={t.dueDate} completed={t.status === "COMPLETED"} soonDays={dueSoonDays} />
                      </Td>
                      <Td className="text-xs tabular-nums text-slate-500">{formatDate(t.createdAt)}</Td>
                      <Td className="text-xs tabular-nums text-slate-500">{formatDate(t.completedAt)}</Td>
                      <Td align="right">
                        <TaskRowActions taskId={t.id} title={t.title} editable={canEdit} deletable={canDeleteTask(user, t)} onEdit={() => setModal({ open: true, editing: t })} />
                      </Td>
                    </Tr>
                  );
                })}
              </TBody>
            </Table>
          </TableWrapper>
        )}
        <Pagination page={result.page} totalPages={result.totalPages} total={result.total} pageSize={result.pageSize} onChange={f.setPage} />
      </Card>

      <TaskFormModal open={modal.open} onClose={() => setModal({ open: false, editing: null })} users={users} editing={modal.editing} fixedProjectId={modal.editing?.projectId} />
    </div>
  );
}
