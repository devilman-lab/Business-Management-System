"use client";

import { useState } from "react";
import { FilePlus2 } from "lucide-react";
import type { FileItem } from "@/server/services/file-service";
import type { PagedResult, ProjectOption } from "@/lib/types";
import { FILE_CATEGORY_LIST } from "@/lib/constants";
import { useListFilters, useSearchInput } from "@/hooks/use-list-filters";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FilterBar, FilterChips, FilterSelect, SearchInput } from "@/components/ui/filter-bar";
import { PageHeader } from "@/components/ui/misc";
import { Pagination } from "@/components/ui/pagination";
import { FileTable } from "./file-table";
import { FileUploadModal } from "./file-upload-modal";

export function FileListView({ result, projects }: { result: PagedResult<FileItem>; projects: ProjectOption[] }) {
  const f = useListFilters();
  const [q, setQ] = useSearchInput("q", f);
  const [open, setOpen] = useState(false);

  return (
    <div>
      <PageHeader
        title="ファイル"
        description="案件に紐づく見積書・契約書・提案資料などを一覧で確認できます。ファイル実体は業務データと分離して保存されます"
        actions={
          <Button icon={<FilePlus2 className="size-4" />} onClick={() => setOpen(true)}>
            ファイルを追加
          </Button>
        }
      />

      <FilterBar onReset={f.reset} hasFilters={f.hasFilters} isPending={f.isPending} className="mb-4">
        <SearchInput value={q} onChange={setQ} placeholder="ファイル名・案件名・顧客名で検索" />
        <FilterSelect label="案件" value={f.get("projectId")} onChange={(v) => f.update({ projectId: v })} options={projects.map((p) => ({ value: p.id, label: `${p.code} ${p.name}` }))} />
        <FilterChips label="分類" values={f.getAll("category")} onChange={(v) => f.update({ category: v })} options={FILE_CATEGORY_LIST} />
      </FilterBar>

      <Card>
        <FileTable files={result.items} showProject />
        <Pagination page={result.page} totalPages={result.totalPages} total={result.total} pageSize={result.pageSize} onChange={f.setPage} />
      </Card>

      <FileUploadModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
