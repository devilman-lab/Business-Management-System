import type { Role } from "@prisma/client";

/** 画面・APIに渡す最小限のログインユーザー情報 (パスワードハッシュ等は含めない) */
export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string | null;
}

/** 一覧APIの共通レスポンス */
export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** 監査ログの変更内容 1件 */
export interface FieldChange {
  field: string;
  label: string;
  before: string | null;
  after: string | null;
}

/** API エラーレスポンス */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string[]>;
  };
}

/** セレクト用の最小ユーザー情報 */
export interface UserOption {
  id: string;
  name: string;
  department: string | null;
  status?: "ACTIVE" | "INACTIVE";
}

export interface CustomerOption {
  id: string;
  name: string;
  code: string;
}

export interface ProjectOption {
  id: string;
  name: string;
  code: string;
  customerId: string;
}
