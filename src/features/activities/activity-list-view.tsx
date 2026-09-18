"use client";

import { useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import type { ActivityItem } from "@/server/services/activity-service";
import type { CustomerOption, PagedResult, UserOption } from "@/lib/types";
import { ACTIVITY_TYPE_LIST } from "@/lib/constants";
import { useListFilters, useSearchInput } from "@/hooks/use-list-filters";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { DateRange, FilterBar, FilterChips, FilterSelect, SearchInput } from "@/components/ui/filter-bar";
import { PageHeader } from "@/components/ui/misc";
import { Pagination } from "@/components/ui/pagination";
import { ActivityFormModal } from "./activity-form-modal";
import { ActivityTimeline } from "./activity-timeline";

export function ActivityListView({ result, users, customers }: { result: PagedResult<ActivityItem>; users: UserOption[]; customers: CustomerOption[] }) {
  const f = useListFilters();
  const [q, setQ] = useSearchInput("q", f);
  const [open, setOpen] = useState(false);

  return (
    <div>
      <PageHeader
        title="対応履歴"
        description="電話・メール・訪問などの対応記録を顧客・案件を横断して時系列で確認できます"
        actions={
          <Button icon={<MessageSquarePlus className="size-4" />} onClick={() => setOpen(true)}>
            対応履歴を登録
          </Button>
        }
      />

      <FilterBar onReset={f.reset} hasFilters={f.hasFilters} isPending={f.isPending} className="mb-4">
        <SearchInput value={q} onChange={setQ} placeholder="件名・内容・顧客名・案件名で検索" />
        <FilterSelect label="顧客" value={f.get("customerId")} onChange={(v) => f.update({ customerId: v })} options={customers.map((c) => ({ value: c.id, label: c.name }))} />
        <FilterSelect label="対応者" value={f.get("userId")} onChange={(v) => f.update({ userId: v })} options={users.map((u) => ({ value: u.id, label: u.status === "INACTIVE" ? `${u.name} (無効)` : u.name }))} />
        <FilterChips label="対応種別" values={f.getAll("type")} onChange={(v) => f.update({ type: v })} options={ACTIVITY_TYPE_LIST} />
        <DateRange label="対応日" from={f.get("from")} to={f.get("to")} onChange={(from, to) => f.update({ from, to })} />
      </FilterBar>

      <Card>
        <CardBody>
          <ActivityTimeline activities={result.items} showCustomer showProject emptyMessage={f.hasFilters ? "条件に一致する対応履歴がありません" : "対応履歴がまだありません"} />
        </CardBody>
        <Pagination page={result.page} totalPages={result.totalPages} total={result.total} pageSize={result.pageSize} onChange={f.setPage} />
      </Card>

      <ActivityFormModal open={open} onClose={() => setOpen(false)} customers={customers} />
    </div>
  );
}
