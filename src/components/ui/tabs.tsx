"use client";

import { cn } from "@/lib/utils";

export interface TabItem<K extends string> {
  key: K;
  label: string;
  count?: number;
  badge?: React.ReactNode;
}

export function Tabs<K extends string>({
  items,
  value,
  onChange,
  className,
}: {
  items: TabItem<K>[];
  value: K;
  onChange: (key: K) => void;
  className?: string;
}) {
  return (
    <div className={cn("-mb-px flex gap-1 overflow-x-auto border-b border-slate-200", className)} role="tablist">
      {items.map((it) => {
        const active = it.key === value;
        return (
          <button
            key={it.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(it.key)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
              active ? "border-primary-600 text-primary-700" : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700",
            )}
          >
            {it.label}
            {it.count !== undefined && (
              <span className={cn("rounded-full px-1.5 py-px text-[11px] tabular-nums", active ? "bg-primary-100 text-primary-800" : "bg-slate-100 text-slate-600")}>
                {it.count}
              </span>
            )}
            {it.badge}
          </button>
        );
      })}
    </div>
  );
}
