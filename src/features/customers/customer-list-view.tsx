"use client";

import Link from "next/link";
import { Download, Plus } from "lucide-react";
import type { CustomerListItem } from "@/server/repositories/customer-repository";
import type { PagedResult, UserOption } from "@/lib/types";
import { CUSTOMER_STATUS, CUSTOMER_STATUS_LIST } from "@/lib/constants";
import { canCreateCustomer, canExportCsv } from "@/lib/policy";
import { formatDate } from "@/lib/utils";
import { useListFilters, useSearchInput } from "@/hooks/use-list-filters";
import { useCurrentUser } from "@/components/layout/current-user-context";
import { Button } from "@/components/ui/button";
import { OptionBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FilterBar, FilterChips, FilterSelect, SearchInput } from "@/components/ui/filter-bar";
import { EmptyState, PageHeader, UserChip } from "@/components/ui/misc";
import { Pagination } from "@/components/ui/pagination";
import { Table, TableWrapper, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { SortableTh } from "@/components/ui/sortable-th";

export function CustomerListView({ result, users }: { result: PagedResult<CustomerListItem>; users: UserOption[] }) {
  const user = useCurrentUser();
  const f = useListFilters();
  const [q, setQ] = useSearchInput("q", f);
  const exportUrl = `/api/customers/export?${f.searchParams.toString()}`;

  return (
    <div>
      <PageHeader
        title="顧客・取引先"
        description="顧客を起点に、関連する案件・タスク・対応履歴を追跡できます"
        actions={
          <>
            {canExportCsv(user) && (
              <Button variant="outline" icon={<Download className="size-4" />} onClick={() => window.open(exportUrl, "_blank")}>
                CSVエクスポート
              </Button>
            )}
            {canCreateCustomer(user) && (
              <Link href="/customers/new">
                <Button icon={<Plus className="size-4" />}>顧客を登録</Button>
              </Link>
            )}
          </>
        }
      />

      <FilterBar onReset={f.reset} hasFilters={f.hasFilters} isPending={f.isPending} className="mb-4">
        <SearchInput value={q} onChange={setQ} placeholder="顧客名・担当者・電話・メールで検索" />
        <FilterChips label="ステータス" values={f.getAll("status")} onChange={(v) => f.update({ status: v })} options={CUSTOMER_STATUS_LIST} />
        <FilterSelect
          label="社内担当"
          value={f.get("assigneeId")}
          onChange={(v) => f.update({ assigneeId: v })}
          options={[{ value: "none", label: "(未設定)" }, ...users.map((u) => ({ value: u.id, label: u.status === "INACTIVE" ? `${u.name} (無効)` : u.name }))]}
        />
      </FilterBar>

      <Card>
        {result.items.length === 0 ? (
          <EmptyState
            title={f.hasFilters ? "条件に一致する顧客がありません" : "顧客が登録されていません"}
            description={f.hasFilters ? "検索条件を変更するか、条件をクリアしてください" : "「顧客を登録」から最初の顧客を追加するか、CSV取込で一括登録できます"}
            action={f.hasFilters ? <Button variant="outline" onClick={f.reset}>条件をクリア</Button> : undefined}
          />
        ) : (
          <TableWrapper>
            <Table>
              <THead>
                <tr>
                  <Th>コード</Th>
                  <SortableTh label="顧客名" sortKey="name" filters={f} />
                  <Th>先方担当者</Th>
                  <Th>連絡先</Th>
                  <SortableTh label="ステータス" sortKey="status" filters={f} />
                  <Th>社内担当</Th>
                  <Th align="right">案件</Th>
                  <Th align="right">対応</Th>
                  <SortableTh label="登録日" sortKey="createdAt" filters={f} />
                  <SortableTh label="最終更新" sortKey="updatedAt" filters={f} />
                </tr>
              </THead>
              <TBody>
                {result.items.map((c) => (
                  <Tr key={c.id}>
                    <Td className="font-mono text-xs text-slate-500">{c.code}</Td>
                    <Td>
                      <Link href={`/customers/${c.id}`} className="font-medium text-slate-900 hover:text-primary-700 hover:underline">
                        {c.name}
                      </Link>
                      {c.industry && <span className="block text-xs text-slate-400">{c.industry}</span>}
                    </Td>
                    <Td>
                      {c.contactName ?? <span className="text-slate-400">—</span>}
                      {c.contactTitle && <span className="block text-xs text-slate-400">{c.contactTitle}</span>}
                    </Td>
                    <Td className="text-xs">
                      <span className="block">{c.phone ?? "—"}</span>
                      <span className="block text-slate-400">{c.email ?? ""}</span>
                    </Td>
                    <Td>
                      <OptionBadge option={CUSTOMER_STATUS[c.status]} />
                    </Td>
                    <Td>
                      <UserChip name={c.assignee?.name} />
                    </Td>
                    <Td align="right" className="tabular-nums">
                      {c._count.projects}
                    </Td>
                    <Td align="right" className="tabular-nums">
                      {c._count.activities}
                    </Td>
                    <Td className="text-xs tabular-nums text-slate-500">{formatDate(c.createdAt)}</Td>
                    <Td className="text-xs tabular-nums text-slate-500">{formatDate(c.updatedAt)}</Td>
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
