import { describe, expect, it } from "vitest";
import { diffEntities, parseChanges, summarizeChanges, type FieldDef } from "@/server/audit/audit-service";
import { RuleBasedAiProvider } from "@/server/ai/rule-based-provider";
import type { ProjectContextForAi } from "@/server/ai/ai-provider";
import { getDueState } from "@/lib/utils";

type P = { status: string; assignee: { name: string } | null; progress: number; note: string | null };
const defs: FieldDef<P>[] = [
  { field: "status", label: "ステータス", get: (p) => p.status },
  { field: "assigneeId", label: "担当者", get: (p) => p.assignee?.name ?? null },
  { field: "progress", label: "進捗率", get: (p) => `${p.progress}%` },
  { field: "note", label: "備考", get: (p) => p.note },
];

describe("監査ログの差分", () => {
  it("変更された項目だけを検出し、要約文を生成する", () => {
    const before: P = { status: "進行中", assignee: { name: "鈴木 美咲" }, progress: 50, note: null };
    const after: P = { status: "確認待ち", assignee: { name: "佐藤 健一" }, progress: 50, note: "" };
    const changes = diffEntities(before, after, defs);
    expect(changes).toEqual([
      { field: "status", label: "ステータス", before: "進行中", after: "確認待ち" },
      { field: "assigneeId", label: "担当者", before: "鈴木 美咲", after: "佐藤 健一" },
    ]);
    expect(summarizeChanges(changes)).toBe("ステータス「進行中」→「確認待ち」、担当者「鈴木 美咲」→「佐藤 健一」");
    expect(summarizeChanges([])).toBe("変更なし");
  });

  it("JSON 化した変更内容を復元できる (壊れたJSONは空配列)", () => {
    const changes = [{ field: "a", label: "A", before: "1", after: "2" }];
    expect(parseChanges(JSON.stringify(changes))).toEqual(changes);
    expect(parseChanges("{broken")).toEqual([]);
    expect(parseChanges(null)).toEqual([]);
  });
});

describe("期限の状態判定", () => {
  const now = new Date(2026, 8, 17);
  it("期限超過 / 本日 / 間近 / 通常 / 未設定 / 完了", () => {
    expect(getDueState(new Date(2026, 8, 16), false, now)).toBe("overdue");
    expect(getDueState(new Date(2026, 8, 17), false, now)).toBe("today");
    expect(getDueState(new Date(2026, 8, 19), false, now, 3)).toBe("soon");
    expect(getDueState(new Date(2026, 8, 25), false, now, 3)).toBe("normal");
    expect(getDueState(null, false, now)).toBe("none");
    expect(getDueState(new Date(2026, 8, 1), true, now)).toBe("normal");
  });
});

describe("ルールベースAI (候補生成)", () => {
  const base: ProjectContextForAi = {
    name: "テスト案件",
    code: "PJ-2026-999",
    description: null,
    customerName: "株式会社テスト",
    status: "進行中",
    priority: "中",
    progress: 40,
    dueDate: null,
    assigneeName: "田中 花子",
    tasks: [],
    activities: [],
  };
  const ai = new RuleBasedAiProvider();

  it("対応履歴に「見積」があるのに見積タスクが無ければ提案する", async () => {
    const s = await ai.suggestTasks({
      ...base,
      activities: [{ occurredAt: "2026/09/10 10:00", type: "電話", userName: "田中", title: "見積のご依頼", content: null }],
    });
    expect(s.some((x) => x.title.includes("見積"))).toBe(true);
    expect(s.every((x) => x.reason.length > 0)).toBe(true);
    expect(s.length).toBeLessThanOrEqual(5);
  });

  it("期限超過タスクがあればリスケジュールを提案し、要約に懸念点として含める", async () => {
    const ctx = { ...base, tasks: [{ title: "遅れタスク", status: "進行中", dueDate: "2000/01/01", assigneeName: null }] };
    const s = await ai.suggestTasks(ctx);
    expect(s.some((x) => x.title.includes("リスケジュール"))).toBe(true);
    const sum = await ai.summarizeProject(ctx);
    expect(sum.risks.some((r) => r.includes("期限超過"))).toBe(true);
    expect(sum.source).toBe("rule-based");
  });

  it("候補が無い場合でも最低1件は返す", async () => {
    const s = await ai.suggestTasks({ ...base, activities: [{ occurredAt: new Date().toISOString(), type: "電話", userName: "x", title: "定期連絡", content: null }] });
    expect(s.length).toBeGreaterThan(0);
  });
});
