"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

/**
 * 一覧画面の検索条件を URL クエリと同期するフック。
 * - 条件を変更すると URL を書き換え、サーバーコンポーネントが再描画される
 *   (ブラウザの戻る/進む・URL 共有・ブックマークが自然に機能する)
 * - ページ番号は条件変更時にリセットする
 * - isPending で読み込み中の表示を出す
 */
export function useListFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const get = useCallback((key: string) => searchParams.get(key) ?? "", [searchParams]);
  const getAll = useCallback(
    (key: string) => {
      const v = searchParams.get(key);
      return v ? v.split(",").filter(Boolean) : [];
    },
    [searchParams],
  );

  const update = useCallback(
    (patch: Record<string, string | string[] | null | undefined>, { resetPage = true } = {}) => {
      const sp = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0)) sp.delete(k);
        else sp.set(k, Array.isArray(v) ? v.join(",") : v);
      }
      if (resetPage) sp.delete("page");
      const qs = sp.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [router, pathname, searchParams],
  );

  const setPage = useCallback((page: number) => update({ page: page > 1 ? String(page) : null }, { resetPage: false }), [update]);

  const reset = useCallback(() => {
    startTransition(() => router.replace(pathname, { scroll: false }));
  }, [router, pathname]);

  const hasFilters = [...searchParams.keys()].some((k) => k !== "page" && k !== "sort" && k !== "order");

  return { get, getAll, update, setPage, reset, isPending, hasFilters, searchParams };
}

/** テキスト入力のデバウンス (検索キーワード用) */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/** 検索キーワード入力: ローカル state を持ち、デバウンス後に URL へ反映 */
export function useSearchInput(key: string, filters: ReturnType<typeof useListFilters>) {
  const urlValue = filters.get(key);
  const [value, setValue] = useState(urlValue);
  const debounced = useDebouncedValue(value, 300);
  const lastPushed = useRef(urlValue);

  useEffect(() => {
    if (debounced !== lastPushed.current) {
      lastPushed.current = debounced;
      filters.update({ [key]: debounced });
    }
  }, [debounced, filters, key]);

  // URL 側が外部要因 (リセット等) で変わったらローカルも追従
  useEffect(() => {
    if (urlValue !== lastPushed.current) {
      lastPushed.current = urlValue;
      setValue(urlValue);
    }
  }, [urlValue]);

  return [value, setValue] as const;
}
