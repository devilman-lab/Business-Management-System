"use client";

import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { AuditLogItem } from "@/server/services/audit-query-service";
import type { PagedResult, UserOption } from "@/lib/types";
import { AUDIT_ACTION, AUDIT_ACTION_LIST, ENTITY_TYPE_LABEL } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import { useListFilters, useSearchInput } from "@/hooks/use-list-filters";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DateRange, FilterBar, FilterChips, FilterSelect, SearchInput } from "@/components/ui/filter-bar";
import { EmptyState, PageHeader, UserChip } from "@/components/ui/misc";
import { Pagination } from "@/components/ui/pagination";
import { Table, TableWrapper, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { AuditChanges } from "@/features/audit/audit-changes";

const ENTITY_OPTIONS = Object.entries(ENTITY_TYPE_LABEL).map(([value, label]) => ({ value, label }));

function targetHref(log: AuditLogItem): string | null {
  if (log.entityType === "project" && log.entityId && log.action !== "DELETE") return `/projects/${log.entityId}`;
  if (log.entityType === "customer" && log.entityId && log.action !== "DELETE") return `/customers/${log.entityId}`;
  if (log.projectId) return `/projects/${log.projectId}?tab=history`;
  if (log.customerId) return `/customers/${log.customerId}`;
  return null;
}

export function AuditLogView({ result, users }: { result: PagedResult<AuditLogItem>; users: UserOption[] }) {
  const f = useListFilters();
  const [q, setQ] = useSearchInput("q", f);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div>
      <PageHeader title="監査ログ" description="「誰が・いつ・何を・どう変更したか」の記録です。変更内容をクリックすると変更前後の値を確認できます" />

      <FilterBar onReset={f.reset} hasFilters={f.hasFilters} isPending={f.isPending} className="mb-4">
        <SearchInput value={q} onChange={setQ} placeholder="対象名・内容・ユーザー名で検索" />
        <FilterSelect label="ユーザー" value={f.get("userId")} onChange={(v) => f.update({ userId: v })} options={users.map((u) => ({ value: u.id, label: u.name }))} />
        <FilterSelect label="対象" value={f.get("entityType")} onChange={(v) => f.update({ entityType: v })} options={ENTITY_OPTIONS} />
        <FilterChips label="操作" values={f.getAll("action")} onChange={(v) => f.update({ action: v })} options={AUDIT_ACTION_LIST} />
        <DateRange label="日時" from={f.get("from")} to={f.get("to")} onChange={(from, to) => f.update({ from, to })} />
      </FilterBar>

      <Card>
        {result.items.length === 0 ? (
          <EmptyState title="条件に一致するログがありません" />
        ) : (
          <TableWrapper>
            <Table>
              <THead>
                <tr>
                  <Th className="w-8"></Th>
                  <Th>日時</Th>
                  <Th>ユーザー</Th>
                  <Th>操作</Th>
                  <Th>対象</Th>
                  <Th>変更内容</Th>
                </tr>
              </THead>
              <TBody>
                {result.items.map((log) => {
                  const href = targetHref(log);
                  const open = expanded.has(log.id);
                  const hasChanges = log.changes.length > 0;
                  return (
                    <Tr key={log.id} className="align-top">
                      <Td className="pr-0">
                        {hasChanges && (
                          <button type="button" onClick={() => toggle(log.id)} className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label={open ? "閉じる" : "詳細を表示"} aria-expanded={open}>
                            {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                          </button>
                        )}
                      </Td>
                      <Td className="whitespace-nowrap text-xs tabular-nums text-slate-600">{formatDateTime(log.createdAt)}</Td>
                      <Td>
                        <UserChip name={log.user?.name ?? "システム"} department={log.user?.department} />
                      </Td>
                      <Td>
                        <Badge tone={AUDIT_ACTION[log.action].tone} size="sm">
                          {AUDIT_ACTION[log.action].label}
                        </Badge>
                      </Td>
                      <Td>
                        <span className="text-xs text-slate-500">{ENTITY_TYPE_LABEL[log.entityType] ?? log.entityType}</span>
                        {log.entityLabel && (
                          <span className="block max-w-xs truncate text-sm font-medium text-slate-900">
                            {href ? (
                              <Link href={href} className="hover:text-primary-700 hover:underline">
                                {log.entityLabel}
                              </Link>
                            ) : (
                              log.entityLabel
                            )}
                          </span>
                        )}
                        {log.project && log.entityType !== "project" && (
                          <span className="block truncate text-xs text-slate-400">案件: {log.project.name}</span>
                        )}
                      </Td>
                      <Td className="max-w-lg">
                        {hasChanges ? (
                          open ? (
                            <AuditChanges changes={log.changes} />
                          ) : (
                            <button type="button" onClick={() => toggle(log.id)} className="text-left text-sm text-slate-700 hover:text-primary-700">
                              {log.summary}
                            </button>
                          )
                        ) : (
                          <span className="text-sm text-slate-700">{log.summary}</span>
                        )}
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
    </div>
  );
}
