"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";
import type { FileCategory } from "@prisma/client";
import { FILE_CATEGORY_LIST } from "@/lib/constants";
import { api, ApiError } from "@/lib/api-client";
import type { ProjectOption } from "@/lib/types";
import { formatFileSize } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { FormError, FormField, Input, Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";

const MAX = 10 * 1024 * 1024;

interface Props {
  open: boolean;
  onClose: () => void;
  fixedProjectId?: string;
  onSaved?: () => void;
}

/** モーダルを開くたびにフォーム状態を初期化するため、内側のフォームは open のときだけマウントする */
export function FileUploadModal(props: Props) {
  return props.open ? <UploadForm {...props} /> : null;
}

function UploadForm({ onClose, fixedProjectId, onSaved }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [projectId, setProjectId] = useState(fixedProjectId ?? "");
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [category, setCategory] = useState<FileCategory>("OTHER");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (fixedProjectId) return;
    let active = true;
    api
      .get<{ items: ProjectOption[] }>("/api/projects?options=1")
      .then((r) => {
        if (active) setProjects(r.items);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [fixedProjectId]);

  const submit = async () => {
    setError(null);
    if (!projectId) return setError("案件を選択してください");
    if (!file) return setError("ファイルを選択してください");
    if (file.size > MAX) return setError("ファイルサイズは10MB以下にしてください");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("projectId", projectId);
    fd.append("category", category);
    fd.append("description", description);
    setBusy(true);
    try {
      await api.post("/api/files", fd);
      toast.success("ファイルを追加しました");
      onClose();
      onSaved?.();
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "アップロードに失敗しました");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="ファイルを追加"
      description="見積書・契約書・提案資料などを案件に紐づけて管理します (10MBまで)"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            キャンセル
          </Button>
          <Button onClick={submit} loading={busy} icon={<UploadCloud className="size-4" />}>
            アップロード
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormError message={error} />
        {!fixedProjectId && (
          <FormField label="案件" required>
            <Select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">選択してください</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} {p.name}
                </option>
              ))}
            </Select>
          </FormField>
        )}
        <FormField label="ファイル" required hint="PDF / Office文書 / 画像 / CSV など">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500 hover:border-primary-400 hover:bg-primary-50/40">
            <UploadCloud className="size-6 text-slate-400" />
            {file ? (
              <span className="font-medium text-slate-800">
                {file.name} <span className="text-xs text-slate-500">({formatFileSize(file.size)})</span>
              </span>
            ) : (
              <span>クリックしてファイルを選択</span>
            )}
            <input type="file" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
        </FormField>
        <FormField label="分類" required>
          <Select value={category} onChange={(e) => setCategory(e.target.value as FileCategory)}>
            {FILE_CATEGORY_LIST.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="説明">
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="例: 初回見積の改訂版" maxLength={500} />
        </FormField>
      </div>
    </Modal>
  );
}
