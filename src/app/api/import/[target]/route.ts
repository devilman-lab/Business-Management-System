import { z } from "zod";
import { apiHandler, ok, parseBody } from "@/server/api/handler";
import { ValidationError } from "@/server/errors";
import { commitImport, previewImport, type ImportTarget } from "@/server/csv/import-service";

type P = { target: string };

const bodySchema = z.object({
  csv: z.string().min(1, "CSVの内容が空です").max(5 * 1024 * 1024, "CSVは5MB以下にしてください"),
  mode: z.enum(["preview", "commit"]),
  skipErrors: z.boolean().optional().default(false),
});

const TARGETS: ImportTarget[] = ["customer", "project", "task"];

/**
 * CSV インポート (管理者のみ)。
 * mode=preview : 検証のみ行い、行ごとの結果を返す (DBは変更しない)
 * mode=commit  : 検証に通った行を登録する
 */
export const POST = apiHandler<P>(
  async ({ req, audit, params }) => {
    if (!TARGETS.includes(params.target as ImportTarget)) throw new ValidationError("不正なインポート対象です");
    const target = params.target as ImportTarget;
    const body = await parseBody(req, bodySchema);
    if (body.mode === "preview") return ok(await previewImport(audit, target, body.csv));
    return ok(await commitImport(audit, target, body.csv, body.skipErrors));
  },
  { adminOnly: true },
);
