import type { ApiErrorBody } from "./types";

/**
 * フロントエンドから REST API を呼ぶための共通クライアント。
 * 画面コンポーネントは fetch を直接書かず、必ずここを経由する
 * (エラー整形・認証切れ時の扱いを1箇所に集約する)。
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly fieldErrors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

export async function apiFetch<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options;
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  const res = await fetch(url, {
    ...rest,
    headers: {
      ...(isForm ? {} : { "Content-Type": "application/json" }),
      Accept: "application/json",
      ...(headers ?? {}),
    },
    body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    credentials: "same-origin",
  });

  if (res.status === 401 && typeof window !== "undefined" && !url.startsWith("/api/auth/")) {
    // セッション切れ: クライアント状態を破棄するため意図的にフルリロードでログイン画面へ遷移する
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
  }

  if (!res.ok) {
    let parsed: ApiErrorBody | null = null;
    try {
      parsed = (await res.json()) as ApiErrorBody;
    } catch {
      /* noop */
    }
    throw new ApiError(
      parsed?.error?.message ?? `通信エラーが発生しました (${res.status})`,
      res.status,
      parsed?.error?.code ?? "HTTP_ERROR",
      parsed?.error?.fieldErrors ?? {},
    );
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  get: <T>(url: string) => apiFetch<T>(url),
  post: <T>(url: string, body?: unknown) => apiFetch<T>(url, { method: "POST", body }),
  put: <T>(url: string, body?: unknown) => apiFetch<T>(url, { method: "PUT", body }),
  patch: <T>(url: string, body?: unknown) => apiFetch<T>(url, { method: "PATCH", body }),
  delete: <T>(url: string) => apiFetch<T>(url, { method: "DELETE" }),
};

/** クエリオブジェクトから URLSearchParams を生成 (空値・undefined は除外) */
export function toQueryString(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "" || v === false) continue;
    if (Array.isArray(v)) {
      if (v.length) sp.set(k, v.join(","));
    } else {
      sp.set(k, String(v));
    }
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}
