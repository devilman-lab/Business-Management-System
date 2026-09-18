import { apiHandler, ok } from "@/server/api/handler";
import { NotFoundError } from "@/server/errors";
import { deleteFile, readFileContent } from "@/server/services/file-service";

type P = { id: string };

/** ファイルダウンロード (認証必須。ストレージへの直リンクは公開しない) */
export const GET = apiHandler<P>(async ({ params }) => {
  const { file, data } = await readFileContent(params.id);
  if (!data) throw new NotFoundError("ファイルの実体が見つかりません (デモデータのファイルは実体を持ちません)");
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
});

export const DELETE = apiHandler<P>(async ({ audit, params }) => {
  await deleteFile(audit, params.id);
  return ok({ ok: true });
});
