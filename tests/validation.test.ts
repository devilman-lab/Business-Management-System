import { describe, expect, it } from "vitest";
import { customerSchema, projectQuerySchema, projectSchema, taskSchema, userCreateSchema } from "@/lib/validation/schemas";

describe("入力値検証", () => {
  it("顧客: 空文字は null に正規化、メール・電話の形式チェック", () => {
    const ok = customerSchema.safeParse({ name: " 株式会社テスト ", status: "ACTIVE", email: "", phone: "", assigneeId: "" });
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect(ok.data.name).toBe("株式会社テスト");
      expect(ok.data.email).toBeNull();
      expect(ok.data.phone).toBeNull();
      expect(ok.data.assigneeId).toBeNull();
    }
    const ng = customerSchema.safeParse({ name: "", status: "ACTIVE", email: "bad", phone: "abc" });
    expect(ng.success).toBe(false);
    if (!ng.success) {
      const paths = ng.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("name");
      expect(paths).toContain("email");
      expect(paths).toContain("phone");
    }
  });

  it("案件: 日付はローカル日付として解釈し、期限 < 開始日 はエラー", () => {
    const ok = projectSchema.safeParse({ name: "A", customerId: "c1", status: "NOT_STARTED", priority: "MEDIUM", progress: "20", startDate: "2026-09-01", dueDate: "2026-09-30", budget: "" });
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect(ok.data.progress).toBe(20);
      expect(ok.data.startDate?.getDate()).toBe(1);
      expect(ok.data.startDate?.getMonth()).toBe(8);
      expect(ok.data.budget).toBeNull();
    }
    const ng = projectSchema.safeParse({ name: "A", customerId: "c1", status: "NOT_STARTED", priority: "MEDIUM", progress: 0, startDate: "2026-10-01", dueDate: "2026-09-01" });
    expect(ng.success).toBe(false);
    if (!ng.success) expect(ng.error.issues[0].path).toEqual(["dueDate"]);
  });

  it("案件: 進捗率の範囲外・不正なステータスはエラー", () => {
    expect(projectSchema.safeParse({ name: "A", customerId: "c1", status: "DONE", priority: "MEDIUM", progress: 0 }).success).toBe(false);
    expect(projectSchema.safeParse({ name: "A", customerId: "c1", status: "COMPLETED", priority: "MEDIUM", progress: 120 }).success).toBe(false);
  });

  it("タスク: 必須項目", () => {
    const ng = taskSchema.safeParse({ projectId: "", title: "", status: "NOT_STARTED", priority: "LOW" });
    expect(ng.success).toBe(false);
  });

  it("ユーザー: パスワードは8文字以上", () => {
    expect(userCreateSchema.safeParse({ name: "a", email: "a@example.com", password: "short", role: "MEMBER", status: "ACTIVE" }).success).toBe(false);
    expect(userCreateSchema.safeParse({ name: "a", email: "a@example.com", password: "password123", role: "MEMBER", status: "ACTIVE" }).success).toBe(true);
  });

  it("一覧クエリ: カンマ区切りの複数値・真偽値・既定値", () => {
    const q = projectQuerySchema.parse({ status: "IN_PROGRESS,COMPLETED", overdue: "1", page: "2" });
    expect(q.status).toEqual(["IN_PROGRESS", "COMPLETED"]);
    expect(q.overdue).toBe(true);
    expect(q.page).toBe(2);
    expect(q.pageSize).toBe(20);
    expect(q.sort).toBe("updatedAt");
    expect(projectQuerySchema.safeParse({ status: "INVALID" }).success).toBe(false);
  });
});
