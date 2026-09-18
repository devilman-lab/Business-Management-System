import type { CustomerStatus, Priority, ProjectStatus, TaskStatus } from "@prisma/client";
import { prisma } from "@/server/db";
import { ForbiddenError, ValidationError } from "@/server/errors";
import { recordAudit, type AuditContext } from "@/server/audit/audit-service";
import { nextCustomerCode } from "@/server/repositories/customer-repository";
import { nextProjectCode } from "@/server/repositories/project-repository";
import { canImportCsv } from "@/lib/policy";
import {
  CUSTOMER_STATUS_LIST,
  PRIORITY_LIST,
  PROJECT_STATUS_LIST,
  TASK_STATUS_LIST,
  type OptionDef,
} from "@/lib/constants";
import { csvToRecords } from "./csv";

export type ImportTarget = "customer" | "project" | "task";

export interface ImportRowResult {
  rowNumber: number; // CSV 上の行番号 (ヘッダーを1行目とする)
  status: "ok" | "error";
  errors: string[];
  values: Record<string, string>;
}

export interface ImportPreview {
  target: ImportTarget;
  headers: string[];
  requiredHeaders: string[];
  missingHeaders: string[];
  totalRows: number;
  okCount: number;
  errorCount: number;
  rows: ImportRowResult[];
}

export interface ImportResult {
  inserted: number;
  skipped: number;
}

const MAX_ROWS = 2000;

const REQUIRED_HEADERS: Record<ImportTarget, string[]> = {
  customer: ["顧客名"],
  project: ["案件名", "顧客名"],
  task: ["タスク名"],
};

const PREVIEW_COLUMNS: Record<ImportTarget, string[]> = {
  customer: ["顧客名", "先方担当者", "電話番号", "メールアドレス", "ステータス", "社内担当"],
  project: ["案件名", "顧客名", "担当者", "ステータス", "優先度", "進捗率", "開始日", "期限"],
  task: ["タスク名", "案件番号", "案件名", "担当者", "ステータス", "優先度", "期限"],
};

export function previewColumns(target: ImportTarget) {
  return PREVIEW_COLUMNS[target];
}

// ---------- 値の変換ヘルパー ----------

function resolveEnum<T extends string>(
  raw: string,
  list: OptionDef<T>[],
  fallback: T,
  label: string,
  errors: string[],
): T {
  if (!raw) return fallback;
  const hit = list.find((o) => o.label === raw || o.value === raw.toUpperCase());
  if (!hit) errors.push(`${label}「${raw}」は無効です (${list.map((o) => o.label).join("/")})`);
  return hit?.value ?? fallback;
}

function parseDate(raw: string, label: string, errors: string[]): Date | null {
  if (!raw) return null;
  const m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(raw.trim());
  if (!m) {
    errors.push(`${label}「${raw}」は日付 (yyyy/mm/dd) で入力してください`);
    return null;
  }
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) {
    errors.push(`${label}「${raw}」は無効な日付です`);
    return null;
  }
  return d;
}

function parseInteger(raw: string, label: string, errors: string[], min?: number, max?: number): number | null {
  if (!raw) return null;
  const n = Number(raw.replace(/[,¥%]/g, ""));
  if (!Number.isInteger(n)) {
    errors.push(`${label}「${raw}」は整数で入力してください`);
    return null;
  }
  if ((min !== undefined && n < min) || (max !== undefined && n > max)) {
    errors.push(`${label}は${min}〜${max}の範囲で入力してください`);
    return null;
  }
  return n;
}

function checkLength(raw: string, label: string, max: number, errors: string[]) {
  if (raw.length > max) errors.push(`${label}は${max}文字以内で入力してください`);
}

// ---------- 参照解決用の辞書 ----------

interface Lookups {
  usersByName: Map<string, { id: string; status: string }>;
  customersByName: Map<string, string>;
  customersByCode: Map<string, string>;
  projectsByCode: Map<string, { id: string; customerId: string }>;
  projectsByName: Map<string, { id: string; customerId: string }[]>;
}

async function loadLookups(): Promise<Lookups> {
  const [users, customers, projects] = await Promise.all([
    prisma.user.findMany({ select: { id: true, name: true, email: true, status: true } }),
    prisma.customer.findMany({ select: { id: true, name: true, code: true } }),
    prisma.project.findMany({ select: { id: true, name: true, code: true, customerId: true } }),
  ]);
  const usersByName = new Map<string, { id: string; status: string }>();
  for (const u of users) {
    usersByName.set(u.name, u);
    usersByName.set(u.name.replace(/[\s　]/g, ""), u);
    usersByName.set(u.email, u);
  }
  const projectsByName = new Map<string, { id: string; customerId: string }[]>();
  for (const p of projects) {
    const arr = projectsByName.get(p.name) ?? [];
    arr.push(p);
    projectsByName.set(p.name, arr);
  }
  return {
    usersByName,
    customersByName: new Map(customers.map((c) => [c.name, c.id])),
    customersByCode: new Map(customers.map((c) => [c.code, c.id])),
    projectsByCode: new Map(projects.map((p) => [p.code, p])),
    projectsByName,
  };
}

function resolveUser(raw: string, lookups: Lookups, label: string, errors: string[]): string | null {
  if (!raw) return null;
  const u = lookups.usersByName.get(raw) ?? lookups.usersByName.get(raw.replace(/[\s　]/g, ""));
  if (!u) {
    errors.push(`${label}「${raw}」に一致するユーザーが存在しません`);
    return null;
  }
  if (u.status !== "ACTIVE") errors.push(`${label}「${raw}」は無効なユーザーです`);
  return u.id;
}

// ---------- 行ごとの検証・変換 ----------

interface CustomerRow {
  name: string; nameKana: string | null; contactName: string | null; contactTitle: string | null;
  phone: string | null; email: string | null; address: string | null; industry: string | null;
  status: CustomerStatus; assigneeId: string | null; notes: string | null;
}
interface ProjectRow {
  name: string; customerId: string; assigneeId: string | null; status: ProjectStatus; priority: Priority;
  progress: number; startDate: Date | null; dueDate: Date | null; budget: number | null; description: string | null;
}
interface TaskRow {
  title: string; projectId: string; assigneeId: string | null; status: TaskStatus; priority: Priority;
  dueDate: Date | null; description: string | null;
}

function validateCustomer(rec: Record<string, string>, lookups: Lookups, seen: Set<string>) {
  const errors: string[] = [];
  const name = rec["顧客名"] ?? "";
  if (!name) errors.push("顧客名は必須です");
  checkLength(name, "顧客名", 120, errors);
  if (name && (lookups.customersByName.has(name) || seen.has(name))) errors.push(`顧客名「${name}」は既に登録されています`);
  const email = rec["メールアドレス"] || null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("メールアドレスの形式が正しくありません");
  const phone = rec["電話番号"] || null;
  if (phone && !/^[0-9+\-() ]{6,20}$/.test(phone)) errors.push("電話番号の形式が正しくありません");
  const data: CustomerRow = {
    name,
    nameKana: rec["フリガナ"] || null,
    contactName: rec["先方担当者"] || null,
    contactTitle: rec["役職"] || null,
    phone,
    email,
    address: rec["住所"] || null,
    industry: rec["業種"] || null,
    status: resolveEnum(rec["ステータス"] ?? "", CUSTOMER_STATUS_LIST, "PROSPECT", "ステータス", errors),
    assigneeId: resolveUser(rec["社内担当"] ?? "", lookups, "社内担当", errors),
    notes: rec["備考"] || null,
  };
  if (errors.length === 0 && name) seen.add(name);
  return { errors, data };
}

function validateProject(rec: Record<string, string>, lookups: Lookups) {
  const errors: string[] = [];
  const name = rec["案件名"] ?? "";
  if (!name) errors.push("案件名は必須です");
  checkLength(name, "案件名", 120, errors);
  const customerName = rec["顧客名"] ?? "";
  let customerId = "";
  if (!customerName) errors.push("顧客名は必須です");
  else {
    customerId = lookups.customersByName.get(customerName) ?? lookups.customersByCode.get(customerName) ?? "";
    if (!customerId) errors.push(`顧客「${customerName}」が登録されていません (先に顧客を登録してください)`);
  }
  const startDate = parseDate(rec["開始日"] ?? "", "開始日", errors);
  const dueDate = parseDate(rec["期限"] ?? "", "期限", errors);
  if (startDate && dueDate && startDate > dueDate) errors.push("期限は開始日以降の日付を指定してください");
  const status = resolveEnum(rec["ステータス"] ?? "", PROJECT_STATUS_LIST, "NOT_STARTED", "ステータス", errors);
  const progress = parseInteger(rec["進捗率"] ?? "", "進捗率", errors, 0, 100) ?? (status === "COMPLETED" ? 100 : 0);
  const data: ProjectRow = {
    name,
    customerId,
    assigneeId: resolveUser(rec["担当者"] ?? "", lookups, "担当者", errors),
    status,
    priority: resolveEnum(rec["優先度"] ?? "", PRIORITY_LIST, "MEDIUM", "優先度", errors),
    progress: status === "COMPLETED" ? 100 : progress,
    startDate,
    dueDate,
    budget: parseInteger(rec["予算"] ?? "", "予算", errors, 0),
    description: rec["概要"] || null,
  };
  return { errors, data };
}

function validateTask(rec: Record<string, string>, lookups: Lookups) {
  const errors: string[] = [];
  const title = rec["タスク名"] ?? "";
  if (!title) errors.push("タスク名は必須です");
  checkLength(title, "タスク名", 120, errors);
  const code = rec["案件番号"] ?? "";
  const pname = rec["案件名"] ?? "";
  let projectId = "";
  if (code) {
    const p = lookups.projectsByCode.get(code);
    if (!p) errors.push(`案件番号「${code}」の案件が存在しません`);
    else projectId = p.id;
  } else if (pname) {
    const list = lookups.projectsByName.get(pname) ?? [];
    if (list.length === 0) errors.push(`案件「${pname}」が存在しません`);
    else if (list.length > 1) errors.push(`案件名「${pname}」が複数存在します。案件番号で指定してください`);
    else projectId = list[0].id;
  } else {
    errors.push("案件番号または案件名は必須です");
  }
  const data: TaskRow = {
    title,
    projectId,
    assigneeId: resolveUser(rec["担当者"] ?? "", lookups, "担当者", errors),
    status: resolveEnum(rec["ステータス"] ?? "", TASK_STATUS_LIST, "NOT_STARTED", "ステータス", errors),
    priority: resolveEnum(rec["優先度"] ?? "", PRIORITY_LIST, "MEDIUM", "優先度", errors),
    dueDate: parseDate(rec["期限"] ?? "", "期限", errors),
    description: rec["内容"] || null,
  };
  return { errors, data };
}

// ---------- 公開API ----------

interface Analyzed {
  preview: ImportPreview;
  validRows: { rowNumber: number; data: CustomerRow | ProjectRow | TaskRow }[];
}

async function analyze(target: ImportTarget, csvText: string): Promise<Analyzed> {
  const { headers, records } = csvToRecords(csvText);
  const requiredHeaders = REQUIRED_HEADERS[target];
  const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));
  if (headers.length === 0) throw new ValidationError("CSVにデータがありません");
  if (missingHeaders.length > 0) {
    throw new ValidationError(`必須の列が見つかりません: ${missingHeaders.join(", ")}。エクスポートしたCSVと同じ列名を使用してください`);
  }
  if (records.length > MAX_ROWS) throw new ValidationError(`一度に取り込めるのは${MAX_ROWS}行までです`);

  const lookups = await loadLookups();
  const seen = new Set<string>();
  const rows: ImportRowResult[] = [];
  const validRows: Analyzed["validRows"] = [];

  records.forEach((rec, i) => {
    const rowNumber = i + 2;
    const result =
      target === "customer" ? validateCustomer(rec, lookups, seen)
      : target === "project" ? validateProject(rec, lookups)
      : validateTask(rec, lookups);
    const values: Record<string, string> = {};
    for (const col of PREVIEW_COLUMNS[target]) values[col] = rec[col] ?? "";
    rows.push({ rowNumber, status: result.errors.length ? "error" : "ok", errors: result.errors, values });
    if (result.errors.length === 0) validRows.push({ rowNumber, data: result.data });
  });

  return {
    preview: {
      target,
      headers,
      requiredHeaders,
      missingHeaders,
      totalRows: records.length,
      okCount: validRows.length,
      errorCount: rows.length - validRows.length,
      rows,
    },
    validRows,
  };
}

export async function previewImport(ctx: AuditContext, target: ImportTarget, csvText: string) {
  if (!canImportCsv(ctx.user)) throw new ForbiddenError("CSVインポートは管理者のみ実行できます");
  const { preview } = await analyze(target, csvText);
  return preview;
}

export async function commitImport(
  ctx: AuditContext,
  target: ImportTarget,
  csvText: string,
  skipErrors: boolean,
): Promise<ImportResult> {
  if (!canImportCsv(ctx.user)) throw new ForbiddenError("CSVインポートは管理者のみ実行できます");
  const { preview, validRows } = await analyze(target, csvText);
  if (preview.errorCount > 0 && !skipErrors) {
    throw new ValidationError(`エラー行が${preview.errorCount}件あります。修正するか「エラー行を除いて登録」を選択してください`);
  }
  if (validRows.length === 0) throw new ValidationError("登録できる行がありません");

  const userId = ctx.user?.id ?? null;
  await prisma.$transaction(async (tx) => {
    for (const row of validRows) {
      if (target === "customer") {
        const d = row.data as CustomerRow;
        await tx.customer.create({ data: { ...d, code: await nextCustomerCode(tx), createdById: userId } });
      } else if (target === "project") {
        const d = row.data as ProjectRow;
        await tx.project.create({
          data: {
            ...d,
            code: await nextProjectCode(tx),
            completedAt: d.status === "COMPLETED" ? new Date() : null,
            createdById: userId,
          },
        });
      } else {
        const d = row.data as TaskRow;
        await tx.task.create({
          data: { ...d, completedAt: d.status === "COMPLETED" ? new Date() : null, createdById: userId },
        });
      }
    }
    await recordAudit(
      ctx,
      {
        action: "IMPORT",
        entityType: target,
        summary: `CSVインポート: ${validRows.length}件登録${preview.errorCount ? `、${preview.errorCount}件スキップ` : ""}`,
      },
      tx,
    );
  });

  return { inserted: validRows.length, skipped: preview.errorCount };
}
