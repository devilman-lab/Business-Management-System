import { apiHandler, ok, parseBody } from "@/server/api/handler";
import {
  deleteProject,
  getProjectDetail,
  quickUpdateProject,
  updateProject,
} from "@/server/services/project-service";
import { projectQuickUpdateSchema, projectSchema } from "@/lib/validation/schemas";

type P = { id: string };

export const GET = apiHandler<P>(async ({ params }) => ok(await getProjectDetail(params.id)));

export const PUT = apiHandler<P>(async ({ req, audit, params }) => {
  const input = await parseBody(req, projectSchema);
  return ok(await updateProject(audit, params.id, input));
});

/** 詳細画面のインライン操作 (ステータス・担当者・進捗・優先度の部分更新) */
export const PATCH = apiHandler<P>(async ({ req, audit, params }) => {
  const input = await parseBody(req, projectQuickUpdateSchema);
  return ok(await quickUpdateProject(audit, params.id, input));
});

export const DELETE = apiHandler<P>(async ({ audit, params }) => {
  await deleteProject(audit, params.id);
  return ok({ ok: true });
});
