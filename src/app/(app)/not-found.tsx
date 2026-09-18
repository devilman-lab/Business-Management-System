import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <SearchX className="size-7" />
      </div>
      <h1 className="text-lg font-semibold text-slate-900">ページが見つかりません</h1>
      <p className="mt-2 text-sm text-slate-500">指定されたデータは削除されたか、URLが正しくない可能性があります。</p>
      <Link href="/dashboard" className="mt-6 inline-block text-sm font-medium text-primary-700 hover:underline">
        ダッシュボードへ戻る
      </Link>
    </div>
  );
}
