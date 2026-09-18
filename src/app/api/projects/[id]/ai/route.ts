import { z } from "zod";
import { apiHandler, ok, parseBody } from "@/server/api/handler";
import { suggestTasksForProject, summarizeProject } from "@/server/services/ai-service";

type P = { id: string };

const schema = z.object({ action: z.enum(["suggest-tasks", "summary"]) });

/**
 * AI 支援 (候補生成のみ。データは書き換えない)。
 * 生成された候補は、担当者が確認・承認後に通常のタスク登録 API (POST /api/tasks) で登録する。
 */
export const POST = apiHandler<P>(async ({ req, params }) => {
  const { action } = await parseBody(req, schema);
  if (action === "suggest-tasks") return ok(await suggestTasksForProject(params.id));
  return ok(await summarizeProject(params.id));
});
