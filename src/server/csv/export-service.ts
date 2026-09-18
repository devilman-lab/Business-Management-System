import { recordAudit, type AuditContext } from "@/server/audit/audit-service";
import { ForbiddenError } from "@/server/errors";
import { findAllCustomersForExport } from "@/server/repositories/customer-repository";
import { findAllProjectsForExport } from "@/server/repositories/project-repository";
import { findAllTasksForExport } from "@/server/repositories/task-repository";
import { canExportCsv } from "@/lib/policy";
import { CUSTOMER_STATUS, PRIORITY, PROJECT_STATUS, TASK_STATUS } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { CustomerQuery, ProjectQuery, TaskQuery } from "@/lib/validation/schemas";
import { toCsv } from "./csv";

/** エクスポート列の定義。インポート時も同じヘッダー名を受け付ける */
export const CUSTOMER_CSV_HEADERS = [
  "顧客コード", "顧客名", "フリガナ", "先方担当者", "役職", "電話番号", "メールアドレス",
  "住所", "業種", "ステータス", "社内担当", "備考", "登録日", "最終更新日",
] as const;

export const PROJECT_CSV_HEADERS = [
  "案件番号", "案件名", "顧客名", "担当者", "ステータス", "優先度", "進捗率",
  "開始日", "期限", "予算", "概要", "登録日", "最終更新日",
] as const;

export const TASK_CSV_HEADERS = [
  "タスク名", "案件番号", "案件名", "担当者", "ステータス", "優先度", "期限", "内容", "作成日", "完了日",
] as const;

async function logExport(ctx: AuditContext, label: string, count: number) {
  await recordAudit(ctx, {
    action: "EXPORT",
    entityType: label,
    summary: `CSVエクスポート (${count}件)`,
  });
}

export async function exportCustomersCsv(ctx: AuditContext, q: CustomerQuery) {
  if (!canExportCsv(ctx.user)) throw new ForbiddenError();
  const rows = await findAllCustomersForExport(q);
  const csv = toCsv(
    [...CUSTOMER_CSV_HEADERS],
    rows.map((c) => [
      c.code, c.name, c.nameKana, c.contactName, c.contactTitle, c.phone, c.email, c.address,
      c.industry, CUSTOMER_STATUS[c.status].label, c.assignee?.name ?? "", c.notes,
      formatDate(c.createdAt), formatDateTime(c.updatedAt),
    ]),
  );
  await logExport(ctx, "customer", rows.length);
  return csv;
}

export async function exportProjectsCsv(ctx: AuditContext, q: ProjectQuery) {
  if (!ctx.user || !canExportCsv(ctx.user)) throw new ForbiddenError();
  const rows = await findAllProjectsForExport(q, ctx.user.id);
  const csv = toCsv(
    [...PROJECT_CSV_HEADERS],
    rows.map((p) => [
      p.code, p.name, p.customer.name, p.assignee?.name ?? "", PROJECT_STATUS[p.status].label,
      PRIORITY[p.priority].label, p.progress, formatDate(p.startDate), formatDate(p.dueDate),
      p.budget ?? "", p.description, formatDate(p.createdAt), formatDateTime(p.updatedAt),
    ].map((v) => (v === "—" ? "" : v))),
  );
  await logExport(ctx, "project", rows.length);
  return csv;
}

export async function exportTasksCsv(ctx: AuditContext, q: TaskQuery) {
  if (!ctx.user || !canExportCsv(ctx.user)) throw new ForbiddenError();
  const rows = await findAllTasksForExport(q, ctx.user.id);
  const csv = toCsv(
    [...TASK_CSV_HEADERS],
    rows.map((t) => [
      t.title, t.project.code, t.project.name, t.assignee?.name ?? "", TASK_STATUS[t.status].label,
      PRIORITY[t.priority].label, formatDate(t.dueDate), t.description, formatDate(t.createdAt),
      formatDate(t.completedAt),
    ].map((v) => (v === "—" ? "" : v))),
  );
  await logExport(ctx, "task", rows.length);
  return csv;
}
