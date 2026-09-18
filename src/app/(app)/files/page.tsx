import type { Metadata } from "next";
import { requireUser } from "@/server/auth/require-user";
import { parseSearchParams } from "@/server/api/search-params";
import { getFileList } from "@/server/services/file-service";
import { listProjectOptions } from "@/server/repositories/project-repository";
import { fileQuerySchema } from "@/lib/validation/schemas";
import { FileListView } from "@/features/files/file-list-view";

export const metadata: Metadata = { title: "ファイル" };

export default async function FilesPage(props: PageProps<"/files">) {
  await requireUser();
  const q = parseSearchParams(await props.searchParams, fileQuerySchema);
  const [result, projects] = await Promise.all([getFileList(q), listProjectOptions()]);
  return <FileListView result={result} projects={projects} />;
}
