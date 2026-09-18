"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, FileText, Trash2 } from "lucide-react";
import type { FileCategory } from "@prisma/client";
import { FILE_CATEGORY } from "@/lib/constants";
import { canDeleteFile } from "@/lib/policy";
import { api } from "@/lib/api-client";
import { formatDateTime, formatFileSize } from "@/lib/utils";
import { useCurrentUser } from "@/components/layout/current-user-context";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { OptionBadge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/modal";
import { EmptyState, UserChip } from "@/components/ui/misc";
import { Table, TableWrapper, TBody, Td, Th, THead, Tr } from "@/components/ui/table";

export interface FileRow {
  id: string;
  name: string;
  category: FileCategory;
  mimeType: string;
  size: number;
  description: string | null;
  uploadedById: string | null;
  createdAt: Date | string;
  uploadedBy: { id: string; name: string } | null;
  project: { id: string; name: string; code: string; assigneeId: string | null; customer?: { id: string; name: string } };
}

export function FileTable({ files, showProject }: { files: FileRow[]; showProject?: boolean }) {
  const user = useCurrentUser();
  const router = useRouter();
  const toast = useToast();
  const [deleting, setDeleting] = useState<FileRow | null>(null);
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await api.delete(`/api/files/${deleting.id}`);
      toast.success("ファイルを削除しました");
      setDeleting(null);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "削除に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  if (files.length === 0) {
    return <EmptyState compact icon={<FileText className="size-6" />} title="ファイルがありません" description="見積書・契約書・提案資料などを案件に紐づけて管理できます" />;
  }

  return (
    <>
      <TableWrapper>
        <Table>
          <THead>
            <tr>
              <Th>ファイル名</Th>
              <Th>分類</Th>
              {showProject && <Th>案件</Th>}
              <Th align="right">サイズ</Th>
              <Th>登録者</Th>
              <Th>登録日時</Th>
              <Th align="right">操作</Th>
            </tr>
          </THead>
          <TBody>
            {files.map((f) => (
              <Tr key={f.id}>
                <Td>
                  <span className="flex items-center gap-2">
                    <FileText className="size-4 shrink-0 text-slate-400" />
                    <span className="min-w-0">
                      <a href={`/api/files/${f.id}`} className="block truncate font-medium text-slate-900 hover:text-primary-700 hover:underline" download>
                        {f.name}
                      </a>
                      {f.description && <span className="block truncate text-xs text-slate-500">{f.description}</span>}
                    </span>
                  </span>
                </Td>
                <Td>
                  <OptionBadge option={FILE_CATEGORY[f.category]} dot={false} />
                </Td>
                {showProject && (
                  <Td>
                    <Link href={`/projects/${f.project.id}?tab=files`} className="hover:text-primary-700 hover:underline">
                      {f.project.name}
                    </Link>
                    {f.project.customer && <span className="block text-xs text-slate-400">{f.project.customer.name}</span>}
                  </Td>
                )}
                <Td align="right" className="text-xs tabular-nums text-slate-500">
                  {formatFileSize(f.size)}
                </Td>
                <Td>
                  <UserChip name={f.uploadedBy?.name} />
                </Td>
                <Td className="text-xs tabular-nums text-slate-500">{formatDateTime(f.createdAt)}</Td>
                <Td align="right">
                  <span className="inline-flex items-center gap-1">
                    <a href={`/api/files/${f.id}`} download>
                      <Button variant="ghost" size="xs" icon={<Download className="size-3.5" />} aria-label="ダウンロード" />
                    </a>
                    {canDeleteFile(user, f) && (
                      <Button variant="ghost" size="xs" className="text-red-600 hover:bg-red-50" icon={<Trash2 className="size-3.5" />} aria-label="削除" onClick={() => setDeleting(f)} />
                    )}
                  </span>
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </TableWrapper>
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={remove} loading={busy} danger title="ファイルを削除しますか？" confirmLabel="削除する" message={<>「{deleting?.name}」を削除します。この操作は取り消せません。</>} />
    </>
  );
}
