import type { AuditAction, Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import type { CurrentUser, FieldChange } from "@/lib/types";

/**
 * 監査ログ。
 * 「誰が・いつ・何を・どう変えたか」を記録する。
 * サービス層の変更操作は必ずここを経由してログを残す。
 */

export interface AuditContext {
  user: CurrentUser | null;
  ipAddress?: string | null;
}

export interface AuditEntry {
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  entityLabel?: string | null;
  changes?: FieldChange[];
  summary?: string | null;
  projectId?: string | null;
  customerId?: string | null;
}

/** 変更検出の定義: エンティティから「表示用の値」を取り出す */
export interface FieldDef<T> {
  field: string;
  label: string;
  get: (entity: T) => string | number | boolean | Date | null | undefined;
}

const normalize = (v: unknown): string | null => {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date) return v.toISOString();
  return String(v);
};

/** 変更前後を比較して差分を返す */
export function diffEntities<T>(before: T, after: T, defs: FieldDef<T>[]): FieldChange[] {
  const changes: FieldChange[] = [];
  for (const def of defs) {
    const b = normalize(def.get(before));
    const a = normalize(def.get(after));
    if (b !== a) changes.push({ field: def.field, label: def.label, before: b, after: a });
  }
  return changes;
}

/** 変更差分から人が読める要約を作る (例: ステータス「進行中」→「確認待ち」) */
export function summarizeChanges(changes: FieldChange[]): string {
  if (changes.length === 0) return "変更なし";
  const parts = changes.slice(0, 3).map((c) => {
    const b = c.before ?? "(未設定)";
    const a = c.after ?? "(未設定)";
    return `${c.label}「${b}」→「${a}」`;
  });
  const rest = changes.length > 3 ? ` 他${changes.length - 3}件` : "";
  return parts.join("、") + rest;
}

export async function recordAudit(
  ctx: AuditContext,
  entry: AuditEntry,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
) {
  await tx.auditLog.create({
    data: {
      userId: ctx.user?.id ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      entityLabel: entry.entityLabel ?? null,
      changes: entry.changes && entry.changes.length > 0 ? JSON.stringify(entry.changes) : null,
      summary: entry.summary ?? null,
      projectId: entry.projectId ?? null,
      customerId: entry.customerId ?? null,
      ipAddress: ctx.ipAddress ?? null,
    },
  });
}

export function parseChanges(json: string | null): FieldChange[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
