import { describe, expect, it } from "vitest";
import {
  canDeleteCustomer,
  canDeleteProject,
  canDeleteTask,
  canEditActivity,
  canEditCustomer,
  canEditProject,
  canEditTask,
  canImportCsv,
  canManageUsers,
  canViewAuditLogs,
  isAdmin,
} from "@/lib/policy";

const admin = { id: "u-admin", role: "ADMIN" as const };
const member = { id: "u-member", role: "MEMBER" as const };
const other = { id: "u-other", role: "MEMBER" as const };

describe("認可ポリシー", () => {
  it("管理者判定", () => {
    expect(isAdmin(admin)).toBe(true);
    expect(isAdmin(member)).toBe(false);
    expect(isAdmin(null)).toBe(false);
  });

  it("管理機能は管理者のみ", () => {
    for (const fn of [canManageUsers, canViewAuditLogs, canImportCsv, canDeleteCustomer, canDeleteProject]) {
      expect(fn(admin)).toBe(true);
      expect(fn(member)).toBe(false);
      expect(fn(null)).toBe(false);
    }
  });

  it("顧客・案件の編集は担当者または管理者", () => {
    expect(canEditCustomer(admin, { assigneeId: "u-other" })).toBe(true);
    expect(canEditCustomer(member, { assigneeId: "u-member" })).toBe(true);
    expect(canEditCustomer(member, { assigneeId: "u-other" })).toBe(false);
    expect(canEditCustomer(member, { assigneeId: null })).toBe(false);

    expect(canEditProject(member, { assigneeId: "u-member" })).toBe(true);
    expect(canEditProject(other, { assigneeId: "u-member" })).toBe(false);
  });

  it("タスクの編集はタスク担当者・作成者・案件担当者", () => {
    const base = { assigneeId: null, createdById: null, project: { assigneeId: null } };
    expect(canEditTask(member, base)).toBe(false);
    expect(canEditTask(member, { ...base, assigneeId: "u-member" })).toBe(true);
    expect(canEditTask(member, { ...base, createdById: "u-member" })).toBe(true);
    expect(canEditTask(member, { ...base, project: { assigneeId: "u-member" } })).toBe(true);
    expect(canEditTask(admin, base)).toBe(true);
  });

  it("タスクの削除は作成者・案件担当者・管理者", () => {
    expect(canDeleteTask(member, { createdById: "u-other", project: { assigneeId: "u-other" } })).toBe(false);
    expect(canDeleteTask(member, { createdById: "u-member", project: { assigneeId: null } })).toBe(true);
    expect(canDeleteTask(admin, { createdById: null, project: { assigneeId: null } })).toBe(true);
  });

  it("対応履歴は本人のみ編集可 (管理者は全件)", () => {
    expect(canEditActivity(member, { userId: "u-member" })).toBe(true);
    expect(canEditActivity(member, { userId: "u-other" })).toBe(false);
    expect(canEditActivity(admin, { userId: "u-other" })).toBe(true);
  });
});
