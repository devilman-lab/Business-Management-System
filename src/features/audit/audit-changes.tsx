import { ArrowRight } from "lucide-react";
import type { FieldChange } from "@/lib/types";

/** 監査ログの変更内容 (項目ごとの 変更前 → 変更後) */
export function AuditChanges({ changes, compact }: { changes: FieldChange[]; compact?: boolean }) {
  if (changes.length === 0) return null;
  return (
    <ul className={compact ? "space-y-0.5" : "space-y-1"}>
      {changes.map((c) => (
        <li key={c.field} className="flex flex-wrap items-center gap-x-2 text-xs">
          <span className="w-20 shrink-0 font-medium text-slate-600">{c.label}</span>
          <span className="max-w-[16rem] truncate rounded bg-red-50 px-1.5 py-0.5 text-red-700 line-through decoration-red-300" title={c.before ?? ""}>
            {c.before ?? "(未設定)"}
          </span>
          <ArrowRight className="size-3 text-slate-400" />
          <span className="max-w-[16rem] truncate rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700" title={c.after ?? ""}>
            {c.after ?? "(未設定)"}
          </span>
        </li>
      ))}
    </ul>
  );
}
