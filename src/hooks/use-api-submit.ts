"use client";

import { useCallback, useState } from "react";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { ApiError } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";

/**
 * フォーム送信の共通処理:
 * - 送信中フラグ
 * - API のバリデーションエラー (422) を各項目へ反映
 * - それ以外のエラーはフォーム上部 + トーストで通知
 */
export function useApiSubmit<TValues extends FieldValues>(setError?: UseFormSetError<TValues>) {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const run = useCallback(
    async <R,>(fn: () => Promise<R>, opts: { successMessage?: string; onSuccess?: (r: R) => void } = {}): Promise<R | undefined> => {
      setSubmitting(true);
      setFormError(null);
      try {
        const r = await fn();
        if (opts.successMessage) toast.success(opts.successMessage);
        opts.onSuccess?.(r);
        return r;
      } catch (e) {
        if (e instanceof ApiError) {
          const entries = Object.entries(e.fieldErrors);
          if (entries.length && setError) {
            for (const [field, msgs] of entries) setError(field as Path<TValues>, { type: "server", message: msgs[0] });
            setFormError("入力内容を確認してください");
          } else {
            setFormError(e.message);
            toast.error(e.message);
          }
        } else {
          setFormError("予期しないエラーが発生しました");
          toast.error("予期しないエラーが発生しました");
        }
        return undefined;
      } finally {
        setSubmitting(false);
      }
    },
    [setError, toast],
  );

  return { run, submitting, formError, setFormError };
}
