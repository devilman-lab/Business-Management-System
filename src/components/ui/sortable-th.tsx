"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { useListFilters } from "@/hooks/use-list-filters";
import { cn } from "@/lib/utils";
import { Th } from "./table";

/** ソート可能なテーブルヘッダー。URL の sort / order と連動 */
export function SortableTh({
  label,
  sortKey,
  filters,
  align,
  defaultOrder = "asc",
}: {
  label: string;
  sortKey: string;
  filters: ReturnType<typeof useListFilters>;
  align?: "left" | "right" | "center";
  defaultOrder?: "asc" | "desc";
}) {
  const current = filters.get("sort");
  const order = filters.get("order");
  const active = current === sortKey;
  const next = active ? (order === "asc" ? "desc" : "asc") : defaultOrder;
  return (
    <Th align={align}>
      <button
        type="button"
        onClick={() => filters.update({ sort: sortKey, order: next }, { resetPage: false })}
        className={cn("inline-flex items-center gap-1 hover:text-slate-800", active && "text-primary-700")}
      >
        {label}
        {active ? (order === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />) : <ArrowUpDown className="size-3 text-slate-300" />}
      </button>
    </Th>
  );
}
