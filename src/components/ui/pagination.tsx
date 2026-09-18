"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./button";

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
      <span>
        全 <span className="font-medium text-slate-900 tabular-nums">{total.toLocaleString()}</span> 件中{" "}
        <span className="tabular-nums">{from.toLocaleString()}</span>〜<span className="tabular-nums">{to.toLocaleString()}</span> 件を表示
      </span>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" onClick={() => onChange(page - 1)} disabled={page <= 1} icon={<ChevronLeft className="size-4" />}>
          前へ
        </Button>
        <span className="px-2 tabular-nums">
          {page} / {totalPages}
        </span>
        <Button variant="outline" size="sm" onClick={() => onChange(page + 1)} disabled={page >= totalPages}>
          次へ
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
