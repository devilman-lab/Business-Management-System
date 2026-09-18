"use client";

import Link from "next/link";
import { Download, Plus } from "lucide-react";
import type { ProjectListItem } from "@/server/repositories/project-repository";
import type { CustomerOption, PagedResult, UserOption } from "@/lib/types";
import { PRIORITY, PRIORITY_LIST, PROJECT_STATUS, PROJECT_STATUS_LIST } from "@/lib/constants";
import { canCreateProject, canExportCsv } from "@/lib/policy";
import { formatDate } from "@/lib/utils";
import { useListFilters, useSearchInput } from "@/hooks/use-list-filters";
import { useCurrentUser } from "@/components/layout/current-user-context";
import { Button } from "@/components/ui/button";
import { OptionBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/form";
import { DateRange, FilterBar, FilterChips, FilterSelect, SearchInput } from "@/components/ui/filter-bar";
import { DueDate, EmptyState, PageHeader, ProgressBar, UserChip } from "@/components/ui/misc";
import { Pagination } from "@/components/ui/pagination";
import { SortableTh } from "@/components/ui/sortable-th";
import { Table, TableWrapper, TBody, Td, Th, THead, Tr } from "@/components/ui/table";

export function ProjectListView({
  result,
  users,
  customers,
  dueSoonDays,
}: {
  result: PagedResult<ProjectListItem>;
  users: UserOption[];
  customers: CustomerOption[];
  dueSoonDays: number;
}) {
  const user = useCurrentUser();
  const f = useListFilters();
  const [q, setQ] = useSearchInput("q", f);
  const exportUrl = `/api/projects/export?${f.searchParams.toString()}`;

  return (
    <div>
      <PageHeader
        title="案件・プロジェクト"
        description="複数条件で絞り込み、現在の状況・担当者・期限を一覧で確認できます"
        actions={
          <>
            {canExportCsv(user) && (
              <Button variant="outline" icon={<Download className="size-4" />} onClick={() => window.open(exportUrl, "_blank")} title="現在の検索条件でCSVを出力します">
                CSVエクスポート
              </Button>
            )}
            {canCreateProject(user) && (
              <Link href="/projects/new">
                <Button icon={<Plus className="size-4" />}>案件を登録</Button>
              </Link>
            )}
          </>
        }
      />

      <FilterBar onReset={f.reset} hasFilters={f.hasFilters} isPending={f.isPending} className="mb-4">
        <SearchInput value={q} onChange={setQ} placeholder="案件名・案件番号・顧客名で検索" />
        <FilterSelect label="顧客" value={f.get("customerId")} onChange={(v) => f.update({ customerId: v })} options={customers.map((c) => ({ value: c.id, label: c.name }))} />
        <FilterSelect
          label="担当者"
          value={f.get("assigneeId")}
          onChange={(v) => f.update({ assigneeId: v })}
          options={[{ value: "none", label: "(未設定)" }, ...users.map((u) => ({ value: u.id, label: u.status === "INACTIVE" ? `${u.name} (無効)` : u.name }))]}
        />
        <FilterChips label="ステータス" values={f.getAll("status")} onChange={(v) => f.update({ status: v })} options={PROJECT_STATUS_LIST} />
        <FilterChips label="優先度" values={f.getAll("priority")} onChange={(v) => f.update({ priority: v })} options={PRIORITY_LIST} />
        <DateRange label="期限" from={f.get("dueFrom")} to={f.get("dueTo")} onChange={(from, to) => f.update({ dueFrom: from, dueTo: to })} />
        <div className="flex h-9 items-center gap-4 self-end">
          <Checkbox label="期限超過のみ" checked={f.get("overdue") === "1"} onChange={(e) => f.update({ overdue: e.target.checked ? "1" : null })} />
          <Checkbox label="自分の担当のみ" checked={f.get("mine") === "1"} onChange={(e) => f.update({ mine: e.target.checked ? "1" : null })} />
        </div>
      </FilterBar>

      <Card>
        {result.items.length === 0 ? (
          <EmptyState
            title={f.hasFilters ? "条件に一致する案件がありません" : "案件が登録されていません"}
            description={f.hasFilters ? "検索条件を変更するか、条件をクリアしてください" : "「案件を登録」から最初の案件を追加できます"}
            action={f.hasFilters ? <Button variant="outline" onClick={f.reset}>条件をクリア</Button> : undefined}
          />
        ) : (
          <TableWrapper>
            <Table>
              <THead>
                <tr>
                  <SortableTh label="案件名" sortKey="name" filters={f} />
                  <Th>顧客</Th>
                  <Th>担当者</Th>
                  <SortableTh label="ステータス" sortKey="status" filters={f} />
                  <SortableTh label="優先度" sortKey="priority" filters={f} />
                  <Th>開始日</Th>
                  <SortableTh label="期限" sortKey="dueDate" filters={f} />
                  <SortableTh label="進捗率" sortKey="progress" filters={f} defaultOrder="desc" />
                  <Th align="right">タスク</Th>
                  <SortableTh label="最終更新" sortKey="updatedAt" filters={f} defaultOrder="desc" />
                </tr>
              </THead>
              <TBody>
                {result.items.map((p) => (
                  <Tr key={p.id}>
                    <Td>
                      <Link href={`/projects/${p.id}`} className="font-medium text-slate-900 hover:text-primary-700 hover:underline">
                        {p.name}
                      </Link>
                      <span className="block font-mono text-[11px] text-slate-400">{p.code}</span>
                    </Td>
                    <Td>
                      <Link href={`/customers/${p.customer.id}`} className="text-slate-700 hover:text-primary-700 hover:underline">
                        {p.customer.name}
                      </Link>
                    </Td>
                    <Td>
                      <UserChip name={p.assignee?.name} />
                    </Td>
                    <Td>
                      <OptionBadge option={PROJECT_STATUS[p.status]} />
                    </Td>
                    <Td>
                      <OptionBadge option={PRIORITY[p.priority]} dot={false} />
                    </Td>
                    <Td className="text-xs tabular-nums text-slate-500">{formatDate(p.startDate)}</Td>
                    <Td>
                      <DueDate value={p.dueDate} completed={p.status === "COMPLETED"} soonDays={dueSoonDays} />
                    </Td>
                    <Td className="w-28">
                      <ProgressBar value={p.progress} />
                    </Td>
                    <Td align="right" className="tabular-nums">
                      {p._count.tasks}
                    </Td>
                    <Td className="text-xs tabular-nums text-slate-500">{formatDate(p.updatedAt)}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </TableWrapper>
        )}
        <Pagination page={result.page} totalPages={result.totalPages} total={result.total} pageSize={result.pageSize} onChange={f.setPage} />
      </Card>
    </div>
  );
}
