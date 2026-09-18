"use client";

import { useEffect } from "react";
import { AlertOctagon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-red-50 text-red-600">
        <AlertOctagon className="size-7" />
      </div>
      <h1 className="text-lg font-semibold text-slate-900">画面の表示中にエラーが発生しました</h1>
      <p className="mt-2 text-sm text-slate-500">時間をおいて再度お試しください。問題が続く場合は管理者にお問い合わせください。</p>
      {error.digest && <p className="mt-1 font-mono text-xs text-slate-400">エラーID: {error.digest}</p>}
      <div className="mt-6">
        <Button onClick={reset}>再読み込み</Button>
      </div>
    </div>
  );
}
