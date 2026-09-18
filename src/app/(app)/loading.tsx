import { Skeleton } from "@/components/ui/misc";

/** ページ遷移中のスケルトン表示 */
export default function Loading() {
  return (
    <div className="animate-fade-in" aria-busy="true" aria-label="読み込み中">
      <Skeleton className="mb-2 h-4 w-40" />
      <Skeleton className="mb-6 h-7 w-72" />
      <Skeleton className="mb-4 h-14 w-full" />
      <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    </div>
  );
}
