"use client";

import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input, Select } from "./form";
import { Button } from "./button";
import { Spinner } from "./misc";

/* ---------- 一覧画面の検索バー部品 ---------- */

export function FilterBar({ children, onReset, hasFilters, isPending, className, right }: {
  children: React.ReactNode;
  onReset: () => void;
  hasFilters: boolean;
  isPending?: boolean;
  className?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-xl border border-slate-200 bg-white p-3 shadow-card", className)}>
      <div className="flex flex-wrap items-end gap-2">
        {children}
        <div className="ml-auto flex items-center gap-2 self-end">
          {isPending && <Spinner className="size-4" />}
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={onReset} icon={<X className="size-3.5" />}>
              条件をクリア
            </Button>
          )}
          {right}
        </div>
      </div>
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = "キーワード検索", className }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative w-full sm:w-64", className)}>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="pl-8" aria-label={placeholder} />
    </div>
  );
}

export function FilterSelect({ label, value, onChange, options, className, allLabel = "すべて" }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
  allLabel?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-1 text-xs text-slate-500", className)}>
      {label}
      <Select value={value} onChange={(e) => onChange(e.target.value)} className="h-9 min-w-32 text-sm">
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </label>
  );
}

/** トグル型の複数選択 (ステータス・優先度など少数の選択肢向け) */
export function FilterChips({ label, values, onChange, options }: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
  options: { value: string; label: string }[];
}) {
  const toggle = (v: string) => onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);
  return (
    <div className="flex flex-col gap-1 text-xs text-slate-500">
      {label}
      <div className="flex h-9 flex-wrap items-center gap-1" role="group" aria-label={label}>
        {options.map((o) => {
          const on = values.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(o.value)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                on ? "border-primary-600 bg-primary-600 text-white" : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DateRange({ label, from, to, onChange }: { label: string; from: string; to: string; onChange: (from: string, to: string) => void }) {
  return (
    <div className="flex flex-col gap-1 text-xs text-slate-500">
      {label}
      <div className="flex items-center gap-1">
        <Input type="date" value={from} onChange={(e) => onChange(e.target.value, to)} className="h-9 w-36 text-sm" aria-label={`${label} (開始)`} />
        <span className="text-slate-400">〜</span>
        <Input type="date" value={to} onChange={(e) => onChange(from, e.target.value)} className="h-9 w-36 text-sm" aria-label={`${label} (終了)`} />
      </div>
    </div>
  );
}
