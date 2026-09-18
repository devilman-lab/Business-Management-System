import { apiHandler, ok, parseQuery, parseWith } from "@/server/api/handler";
import { ValidationError } from "@/server/errors";
import { getFileList, uploadFile } from "@/server/services/file-service";
import { fileMetaSchema, fileQuerySchema } from "@/lib/validation/schemas";

export const GET = apiHandler(async ({ req }) => {
  const q = parseQuery(req, fileQuerySchema);
  return ok(await getFileList(q));
});

/** multipart/form-data: file, projectId, category, description */
export const POST = apiHandler(async ({ req, audit }) => {
  const form = await req.formData().catch(() => null);
  if (!form) throw new ValidationError("アップロード形式が正しくありません");
  const file = form.get("file");
  const projectId = String(form.get("projectId") ?? "");
  if (!(file instanceof File)) throw new ValidationError("ファイルを選択してください", { file: ["ファイルを選択してください"] });
  if (!projectId) throw new ValidationError("案件を選択してください", { projectId: ["案件を選択してください"] });
  const meta = parseWith(fileMetaSchema, {
    category: form.get("category") ?? "OTHER",
    description: form.get("description") ?? "",
  });
  const data = Buffer.from(await file.arrayBuffer());
  const created = await uploadFile(
    audit,
    projectId,
    { name: file.name, mimeType: file.type || "application/octet-stream", data },
    meta,
  );
  return ok(created, 201);
});
