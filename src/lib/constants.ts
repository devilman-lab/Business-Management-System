/**
 * 画面表示用のラベル・色定義。
 * DBには英字の列挙値を保存し、表示時にここで日本語へ変換する。
 * (将来の多言語対応・ラベル変更を1箇所で行えるようにする)
 */
import type {
  ActivityType,
  AuditAction,
  CustomerStatus,
  FileCategory,
  Priority,
  ProjectStatus,
  Role,
  TaskStatus,
  UserStatus,
} from "@prisma/client";

export type BadgeTone =
  | "gray"
  | "blue"
  | "green"
  | "amber"
  | "red"
  | "purple"
  | "slate";

export interface OptionDef<T extends string> {
  value: T;
  label: string;
  tone: BadgeTone;
  description?: string;
}

export const PROJECT_STATUS: Record<ProjectStatus, OptionDef<ProjectStatus>> = {
  NOT_STARTED: { value: "NOT_STARTED", label: "未着手", tone: "gray" },
  IN_PROGRESS: { value: "IN_PROGRESS", label: "進行中", tone: "blue" },
  WAITING_REVIEW: { value: "WAITING_REVIEW", label: "確認待ち", tone: "amber" },
  ON_HOLD: { value: "ON_HOLD", label: "保留", tone: "slate" },
  COMPLETED: { value: "COMPLETED", label: "完了", tone: "green" },
};
export const PROJECT_STATUS_LIST = Object.values(PROJECT_STATUS);

export const TASK_STATUS: Record<TaskStatus, OptionDef<TaskStatus>> = {
  NOT_STARTED: { value: "NOT_STARTED", label: "未着手", tone: "gray" },
  IN_PROGRESS: { value: "IN_PROGRESS", label: "進行中", tone: "blue" },
  COMPLETED: { value: "COMPLETED", label: "完了", tone: "green" },
};
export const TASK_STATUS_LIST = Object.values(TASK_STATUS);

export const PRIORITY: Record<Priority, OptionDef<Priority>> = {
  HIGH: { value: "HIGH", label: "高", tone: "red" },
  MEDIUM: { value: "MEDIUM", label: "中", tone: "amber" },
  LOW: { value: "LOW", label: "低", tone: "gray" },
};
export const PRIORITY_LIST = Object.values(PRIORITY);

export const CUSTOMER_STATUS: Record<CustomerStatus, OptionDef<CustomerStatus>> = {
  PROSPECT: { value: "PROSPECT", label: "見込み", tone: "purple" },
  ACTIVE: { value: "ACTIVE", label: "取引中", tone: "green" },
  DORMANT: { value: "DORMANT", label: "休眠", tone: "slate" },
  CLOSED: { value: "CLOSED", label: "取引終了", tone: "gray" },
};
export const CUSTOMER_STATUS_LIST = Object.values(CUSTOMER_STATUS);

export const ACTIVITY_TYPE: Record<ActivityType, OptionDef<ActivityType>> = {
  PHONE: { value: "PHONE", label: "電話", tone: "blue" },
  EMAIL: { value: "EMAIL", label: "メール", tone: "purple" },
  VISIT: { value: "VISIT", label: "訪問", tone: "green" },
  ONLINE_MEETING: { value: "ONLINE_MEETING", label: "オンライン会議", tone: "amber" },
  INTERNAL: { value: "INTERNAL", label: "社内対応", tone: "slate" },
  OTHER: { value: "OTHER", label: "その他", tone: "gray" },
};
export const ACTIVITY_TYPE_LIST = Object.values(ACTIVITY_TYPE);

export const FILE_CATEGORY: Record<FileCategory, OptionDef<FileCategory>> = {
  ESTIMATE: { value: "ESTIMATE", label: "見積書", tone: "blue" },
  CONTRACT: { value: "CONTRACT", label: "契約書", tone: "red" },
  PROPOSAL: { value: "PROPOSAL", label: "提案資料", tone: "purple" },
  OTHER: { value: "OTHER", label: "その他資料", tone: "gray" },
};
export const FILE_CATEGORY_LIST = Object.values(FILE_CATEGORY);

export const ROLE: Record<Role, OptionDef<Role>> = {
  ADMIN: { value: "ADMIN", label: "管理者", tone: "purple" },
  MEMBER: { value: "MEMBER", label: "一般ユーザー", tone: "gray" },
};
export const ROLE_LIST = Object.values(ROLE);

export const USER_STATUS: Record<UserStatus, OptionDef<UserStatus>> = {
  ACTIVE: { value: "ACTIVE", label: "有効", tone: "green" },
  INACTIVE: { value: "INACTIVE", label: "無効", tone: "gray" },
};
export const USER_STATUS_LIST = Object.values(USER_STATUS);

export const AUDIT_ACTION: Record<AuditAction, OptionDef<AuditAction>> = {
  CREATE: { value: "CREATE", label: "作成", tone: "green" },
  UPDATE: { value: "UPDATE", label: "更新", tone: "blue" },
  DELETE: { value: "DELETE", label: "削除", tone: "red" },
  LOGIN: { value: "LOGIN", label: "ログイン", tone: "gray" },
  LOGOUT: { value: "LOGOUT", label: "ログアウト", tone: "gray" },
  IMPORT: { value: "IMPORT", label: "CSV取込", tone: "purple" },
  EXPORT: { value: "EXPORT", label: "CSV出力", tone: "slate" },
};
export const AUDIT_ACTION_LIST = Object.values(AUDIT_ACTION);

export const ENTITY_TYPE_LABEL: Record<string, string> = {
  customer: "顧客",
  project: "案件",
  task: "タスク",
  activity: "対応履歴",
  file: "ファイル",
  user: "ユーザー",
  setting: "システム設定",
  session: "認証",
};

/** 一覧のデフォルトページサイズ */
export const DEFAULT_PAGE_SIZE = 20;

/** 期限切れ間近とみなす日数の既定値 (システム設定で上書き可能) */
export const DEFAULT_DUE_SOON_DAYS = 3;

export const SETTING_KEYS = {
  organizationName: "organizationName",
  dueSoonDays: "dueSoonDays",
} as const;
