import { clsx, type ClassValue } from "clsx";
import { format, differenceInCalendarDays, isSameDay } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/** 2026/09/18 形式 */
export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, "yyyy/MM/dd");
}

/** 2026/09/18 10:32 形式 */
export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, "yyyy/MM/dd HH:mm");
}

/** input[type=date] 用 (yyyy-MM-dd) */
export function toDateInputValue(value: Date | string | null | undefined): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return format(d, "yyyy-MM-dd");
}

export type DueState = "overdue" | "today" | "soon" | "normal" | "none";

/** 期限の状態を判定する。完了済みは常に normal */
export function getDueState(
  dueDate: Date | string | null | undefined,
  completed: boolean,
  now: Date = new Date(),
  soonDays = 3,
): DueState {
  if (!dueDate) return "none";
  if (completed) return "normal";
  const d = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  if (isSameDay(d, now)) return "today";
  const diff = differenceInCalendarDays(d, now);
  if (diff < 0) return "overdue";
  if (diff <= soonDays) return "soon";
  return "normal";
}

export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("ja-JP");
}

export function formatCurrency(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return `¥${n.toLocaleString("ja-JP")}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** 今日の 00:00 (ローカル) */
export function startOfToday(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** 翌日の 00:00 (ローカル) */
export function startOfTomorrow(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
