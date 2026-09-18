/**
 * 認可ポリシー (権限設計の単一の定義場所)。
 *
 * - UI ではボタンの表示/非表示に、API では実際の操作可否の判定に、同じ関数を使う
 * - 「閲覧は全員、変更は担当者または管理者、削除・管理機能は管理者のみ」を基本とする
 *
 *   機能           | 管理者 | 一般ユーザー
 *   ---------------|--------|----------------------------
 *   顧客 閲覧/登録  |  ○     |  ○
 *   顧客 編集       |  ○     |  ○ (社内担当者のみ)
 *   顧客 削除       |  ○     |  ×
 *   案件 閲覧/登録  |  ○     |  ○
 *   案件 編集       |  ○     |  ○ (案件担当者のみ)
 *   案件 削除       |  ○     |  ×
 *   タスク 閲覧/登録|  ○     |  ○
 *   タスク 編集     |  ○     |  ○ (タスク担当者 / 案件担当者 / 作成者)
 *   タスク 削除     |  ○     |  ○ (作成者 / 案件担当者)
 *   対応履歴 登録   |  ○     |  ○
 *   対応履歴 編集/削除 | ○   |  ○ (本人の記録のみ)
 *   ファイル 追加   |  ○     |  ○
 *   ファイル 削除   |  ○     |  ○ (アップロード者 / 案件担当者)
 *   CSV エクスポート|  ○     |  ○
 *   CSV インポート  |  ○     |  ×
 *   ユーザー管理    |  ○     |  ×
 *   監査ログ        |  ○     |  × (案件詳細内の変更履歴は閲覧可)
 *   システム設定    |  ○     |  ×
 */
import type { CurrentUser } from "./types";

type Actor = Pick<CurrentUser, "id" | "role"> | null | undefined;

export const isAdmin = (u: Actor) => !!u && u.role === "ADMIN";

// ----- 管理機能 -----
export const canManageUsers = (u: Actor) => isAdmin(u);
export const canViewAuditLogs = (u: Actor) => isAdmin(u);
export const canManageSettings = (u: Actor) => isAdmin(u);
export const canImportCsv = (u: Actor) => isAdmin(u);
export const canExportCsv = (u: Actor) => !!u;

// ----- 顧客 -----
export const canCreateCustomer = (u: Actor) => !!u;
export const canEditCustomer = (u: Actor, customer: { assigneeId: string | null }) =>
  isAdmin(u) || (!!u && customer.assigneeId === u.id);
export const canDeleteCustomer = (u: Actor) => isAdmin(u);

// ----- 案件 -----
export const canCreateProject = (u: Actor) => !!u;
export const canEditProject = (u: Actor, project: { assigneeId: string | null }) =>
  isAdmin(u) || (!!u && project.assigneeId === u.id);
export const canDeleteProject = (u: Actor) => isAdmin(u);

// ----- タスク -----
export const canCreateTask = (u: Actor) => !!u;
export const canEditTask = (
  u: Actor,
  task: { assigneeId: string | null; createdById: string | null; project: { assigneeId: string | null } },
) =>
  isAdmin(u) ||
  (!!u &&
    (task.assigneeId === u.id ||
      task.createdById === u.id ||
      task.project.assigneeId === u.id));
export const canDeleteTask = (
  u: Actor,
  task: { createdById: string | null; project: { assigneeId: string | null } },
) => isAdmin(u) || (!!u && (task.createdById === u.id || task.project.assigneeId === u.id));

// ----- 対応履歴 -----
export const canCreateActivity = (u: Actor) => !!u;
export const canEditActivity = (u: Actor, activity: { userId: string }) =>
  isAdmin(u) || (!!u && activity.userId === u.id);
export const canDeleteActivity = canEditActivity;

// ----- ファイル -----
export const canUploadFile = (u: Actor) => !!u;
export const canDeleteFile = (
  u: Actor,
  file: { uploadedById: string | null; project: { assigneeId: string | null } },
) => isAdmin(u) || (!!u && (file.uploadedById === u.id || file.project.assigneeId === u.id));

/** サイドナビに表示するメニューの判定 */
export const NAV_ITEMS = [
  { href: "/dashboard", label: "ダッシュボード", icon: "LayoutDashboard", adminOnly: false },
  { href: "/customers", label: "顧客・取引先", icon: "Building2", adminOnly: false },
  { href: "/projects", label: "案件・プロジェクト", icon: "FolderKanban", adminOnly: false },
  { href: "/tasks", label: "タスク", icon: "CheckSquare", adminOnly: false },
  { href: "/activities", label: "対応履歴", icon: "MessageSquareText", adminOnly: false },
  { href: "/files", label: "ファイル", icon: "FileText", adminOnly: false },
  { href: "/admin/users", label: "ユーザー管理", icon: "Users", adminOnly: true },
  { href: "/admin/audit-logs", label: "監査ログ", icon: "History", adminOnly: true },
  { href: "/admin/import", label: "CSV取込", icon: "Upload", adminOnly: true },
  { href: "/admin/settings", label: "設定", icon: "Settings", adminOnly: true },
] as const;

/** 管理者専用パスかどうか (proxy / layout で使用) */
export const isAdminPath = (pathname: string) => pathname.startsWith("/admin");
