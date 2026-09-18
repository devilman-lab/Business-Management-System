/**
 * 入力値検証スキーマ。
 * フォーム (クライアント) と API (サーバー) の両方で同じスキーマを使用し、
 * 検証ルールの二重管理を避ける。
 */
import { z } from "zod";
import {
  booleanFlag,
  multiValue,
  optionalDate,
  optionalDateTime,
  optionalEmail,
  optionalId,
  optionalPhone,
  optionalText,
  paginationSchema,
  requiredId,
  requiredText,
} from "./common";

// ---------- 認証 ----------

export const loginSchema = z.object({
  email: z.email({ error: "メールアドレスの形式が正しくありません" }),
  password: z.string().min(1, "パスワードは必須です"),
});
export type LoginInput = z.infer<typeof loginSchema>;

// ---------- 顧客 ----------

export const customerStatusValues = ["PROSPECT", "ACTIVE", "DORMANT", "CLOSED"] as const;

export const customerSchema = z.object({
  name: requiredText("顧客名", 120),
  nameKana: optionalText(120),
  contactName: optionalText(60),
  contactTitle: optionalText(60),
  phone: optionalPhone,
  email: optionalEmail,
  address: optionalText(255),
  industry: optionalText(60),
  status: z.enum(customerStatusValues, { error: "ステータスを選択してください" }),
  notes: optionalText(2000),
  assigneeId: optionalId,
});
export type CustomerInput = z.infer<typeof customerSchema>;

export const customerQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  status: multiValue(customerStatusValues),
  assigneeId: z.string().optional(),
  sort: z.enum(["name", "updatedAt", "createdAt", "status"]).default("updatedAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});
export type CustomerQuery = z.infer<typeof customerQuerySchema>;

// ---------- 案件 ----------

export const projectStatusValues = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "WAITING_REVIEW",
  "ON_HOLD",
  "COMPLETED",
] as const;
export const priorityValues = ["HIGH", "MEDIUM", "LOW"] as const;

export const projectSchema = z
  .object({
    name: requiredText("案件名", 120),
    description: optionalText(4000),
    customerId: requiredId("顧客"),
    assigneeId: optionalId,
    status: z.enum(projectStatusValues, { error: "ステータスを選択してください" }),
    priority: z.enum(priorityValues, { error: "優先度を選択してください" }),
    progress: z.coerce
      .number({ error: "進捗率は数値で入力してください" })
      .int("進捗率は整数で入力してください")
      .min(0, "進捗率は0〜100の範囲で入力してください")
      .max(100, "進捗率は0〜100の範囲で入力してください"),
    startDate: optionalDate,
    dueDate: optionalDate,
    budget: z.preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? null : v),
      z.coerce.number().int().min(0, "予算は0以上で入力してください").nullable().optional(),
    ),
  })
  .refine(
    (v) => !v.startDate || !v.dueDate || v.startDate <= v.dueDate,
    { message: "期限は開始日以降の日付を指定してください", path: ["dueDate"] },
  );
export type ProjectInput = z.infer<typeof projectSchema>;

export const projectQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  customerId: z.string().optional(),
  assigneeId: z.string().optional(),
  status: multiValue(projectStatusValues),
  priority: multiValue(priorityValues),
  dueFrom: optionalDate,
  dueTo: optionalDate,
  overdue: booleanFlag.optional(),
  mine: booleanFlag.optional(),
  sort: z
    .enum(["name", "updatedAt", "createdAt", "dueDate", "status", "priority", "progress"])
    .default("updatedAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});
export type ProjectQuery = z.infer<typeof projectQuerySchema>;

// ---------- タスク ----------

export const taskStatusValues = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"] as const;

export const taskSchema = z.object({
  projectId: requiredId("案件"),
  title: requiredText("タスク名", 120),
  description: optionalText(2000),
  assigneeId: optionalId,
  status: z.enum(taskStatusValues, { error: "ステータスを選択してください" }),
  priority: z.enum(priorityValues, { error: "優先度を選択してください" }),
  dueDate: optionalDate,
});
export type TaskInput = z.infer<typeof taskSchema>;

export const taskQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  projectId: z.string().optional(),
  customerId: z.string().optional(),
  assigneeId: z.string().optional(),
  status: multiValue(taskStatusValues),
  priority: multiValue(priorityValues),
  dueFrom: optionalDate,
  dueTo: optionalDate,
  /** overdue: 期限超過 / today: 本日期限 / soon: 期限間近 */
  due: z.enum(["overdue", "today", "soon", "none"]).optional(),
  mine: booleanFlag.optional(),
  sort: z.enum(["title", "updatedAt", "createdAt", "dueDate", "status", "priority"]).default("dueDate"),
  order: z.enum(["asc", "desc"]).default("asc"),
});
export type TaskQuery = z.infer<typeof taskQuerySchema>;

// ---------- 対応履歴 ----------

export const activityTypeValues = [
  "PHONE",
  "EMAIL",
  "VISIT",
  "ONLINE_MEETING",
  "INTERNAL",
  "OTHER",
] as const;

export const activitySchema = z.object({
  customerId: requiredId("顧客"),
  projectId: optionalId,
  type: z.enum(activityTypeValues, { error: "対応種別を選択してください" }),
  occurredAt: optionalDateTime,
  title: requiredText("件名", 120),
  content: optionalText(4000),
});
export type ActivityInput = z.infer<typeof activitySchema>;

export const activityQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  customerId: z.string().optional(),
  projectId: z.string().optional(),
  userId: z.string().optional(),
  type: multiValue(activityTypeValues),
  from: optionalDate,
  to: optionalDate,
});
export type ActivityQuery = z.infer<typeof activityQuerySchema>;

// ---------- ファイル ----------

export const fileCategoryValues = ["ESTIMATE", "CONTRACT", "PROPOSAL", "OTHER"] as const;

export const fileMetaSchema = z.object({
  category: z.enum(fileCategoryValues, { error: "分類を選択してください" }),
  description: optionalText(500),
});
export type FileMetaInput = z.infer<typeof fileMetaSchema>;

export const fileQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  projectId: z.string().optional(),
  category: multiValue(fileCategoryValues),
});
export type FileQuery = z.infer<typeof fileQuerySchema>;

// ---------- ユーザー ----------

export const roleValues = ["ADMIN", "MEMBER"] as const;
export const userStatusValues = ["ACTIVE", "INACTIVE"] as const;

const passwordRule = z
  .string()
  .min(8, "パスワードは8文字以上で入力してください")
  .max(100, "パスワードは100文字以内で入力してください");

export const userCreateSchema = z.object({
  name: requiredText("氏名", 60),
  email: z.email({ error: "メールアドレスの形式が正しくありません" }).max(255),
  password: passwordRule,
  department: optionalText(60),
  role: z.enum(roleValues, { error: "権限を選択してください" }),
  status: z.enum(userStatusValues, { error: "ステータスを選択してください" }),
});
export type UserCreateInput = z.infer<typeof userCreateSchema>;

export const userUpdateSchema = userCreateSchema.extend({
  password: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    passwordRule.optional(),
  ),
});
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;

export const userQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  role: multiValue(roleValues),
  status: multiValue(userStatusValues),
});
export type UserQuery = z.infer<typeof userQuerySchema>;

// ---------- 監査ログ ----------

export const auditActionValues = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "LOGIN",
  "LOGOUT",
  "IMPORT",
  "EXPORT",
] as const;

export const auditQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  userId: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  action: multiValue(auditActionValues),
  from: optionalDate,
  to: optionalDate,
});
export type AuditQuery = z.infer<typeof auditQuerySchema>;

// ---------- システム設定 ----------

export const settingsSchema = z.object({
  organizationName: requiredText("組織名", 100),
  dueSoonDays: z.coerce
    .number({ error: "数値で入力してください" })
    .int()
    .min(0, "0以上で入力してください")
    .max(30, "30以下で入力してください"),
});
export type SettingsInput = z.infer<typeof settingsSchema>;

// ---------- 案件のクイック更新 (詳細画面のインライン操作) ----------

export const projectQuickUpdateSchema = z
  .object({
    status: z.enum(projectStatusValues).optional(),
    assigneeId: optionalId,
    progress: z.coerce.number().int().min(0).max(100).optional(),
    priority: z.enum(priorityValues).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "更新項目がありません" });
export type ProjectQuickUpdateInput = z.infer<typeof projectQuickUpdateSchema>;

export const taskQuickUpdateSchema = z.object({
  status: z.enum(taskStatusValues).optional(),
  assigneeId: optionalId,
});
export type TaskQuickUpdateInput = z.infer<typeof taskQuickUpdateSchema>;
