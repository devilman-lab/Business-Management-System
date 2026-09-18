"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Database, RefreshCw, Save } from "lucide-react";
import type { SystemSettings } from "@/server/services/settings-service";
import { settingsSchema, type SettingsInput } from "@/lib/validation/schemas";
import { api } from "@/lib/api-client";
import { formResolver } from "@/lib/validation/resolver";
import { useApiSubmit } from "@/hooks/use-api-submit";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { FormError, FormField, Input } from "@/components/ui/form";
import { ConfirmDialog } from "@/components/ui/modal";
import { DescriptionList, PageHeader } from "@/components/ui/misc";

interface SystemInfo {
  database: string;
  storage: string;
  ai: string;
  counts: { users: number; customers: number; projects: number; tasks: number; activities: number; files: number; auditLogs: number };
}

interface FormValues {
  organizationName: string;
  dueSoonDays: string;
}

export function SettingsView({ settings, system }: { settings: SystemSettings; system: SystemInfo }) {
  const router = useRouter();
  const toast = useToast();
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<FormValues, unknown, SettingsInput>({
    resolver: formResolver<FormValues, SettingsInput>(settingsSchema),
    defaultValues: { organizationName: settings.organizationName, dueSoonDays: String(settings.dueSoonDays) },
  });
  const { run, submitting, formError } = useApiSubmit<FormValues>(setError);

  const onSubmit = (input: SettingsInput) =>
    run(() => api.put("/api/settings", input), {
      successMessage: "設定を保存しました",
      onSuccess: () => router.refresh(),
    });

  const resetDemo = async () => {
    setResetting(true);
    try {
      await api.post("/api/admin/reset-demo");
      toast.success("デモデータを初期化しました", "再度ログインしてください");
      router.push("/login");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "初期化に失敗しました");
      setResetting(false);
    }
  };

  return (
    <div>
      <PageHeader title="システム設定" description="組織全体に適用される設定です。変更は監査ログに記録されます" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="基本設定" />
          <CardBody>
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              <FormError message={formError} />
              <FormField label="組織名" htmlFor="org" required error={errors.organizationName?.message} hint="画面左上・ログイン画面に表示されます">
                <Input id="org" invalid={!!errors.organizationName} {...register("organizationName")} />
              </FormField>
              <FormField label="期限間近とみなす日数" htmlFor="soon" required error={errors.dueSoonDays?.message} hint="ダッシュボード・一覧で「期限間近」として強調する日数 (0〜30)">
                <Input id="soon" type="number" min={0} max={30} className="w-32" invalid={!!errors.dueSoonDays} {...register("dueSoonDays")} />
              </FormField>
              <div className="flex justify-end">
                <Button type="submit" loading={submitting} disabled={!isDirty} icon={<Save className="size-4" />}>
                  保存
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader title="システム情報" />
            <CardBody>
              <DescriptionList
                columns={1}
                items={[
                  { label: "データベース", value: system.database },
                  { label: "ファイルストレージ", value: system.storage === "local" ? "ローカルディスク (S3等へ切替可能)" : system.storage },
                  { label: "AI支援", value: system.ai },
                  {
                    label: "登録件数",
                    value: (
                      <span className="text-xs text-slate-600">
                        ユーザー {system.counts.users} / 顧客 {system.counts.customers} / 案件 {system.counts.projects} / タスク {system.counts.tasks} / 対応履歴 {system.counts.activities} / ファイル {system.counts.files} / 監査ログ {system.counts.auditLogs}
                      </span>
                    ),
                  },
                ]}
              />
            </CardBody>
          </Card>

          <Card className="border-amber-200">
            <CardHeader title="デモデータの初期化" description="すべてのデータを削除し、サンプルデータを再投入します (デモ用)" />
            <CardBody>
              <Button variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-50" icon={<RefreshCw className="size-4" />} onClick={() => setResetOpen(true)}>
                デモデータを初期化する
              </Button>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="今後の拡張ポイント" />
            <CardBody>
              <ul className="space-y-1.5 text-sm text-slate-600">
                {[
                  "メール / Slack 通知 (期限超過・担当者変更時)",
                  "Google Workspace 連携 (カレンダー・ドライブ)",
                  "クラウドストレージ (AWS S3) へのファイル保存切替",
                  "帳票出力 (見積書・報告書の PDF 生成)",
                  "部署・組織階層と部署単位の閲覧権限",
                  "複数企業 (マルチテナント) 対応",
                  "高度なレポート (担当者別稼働・売上予測)",
                  "定期バックアップと復元",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <Database className="mt-0.5 size-3.5 shrink-0 text-slate-400" /> {t}
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={resetDemo}
        loading={resetting}
        danger
        title="デモデータを初期化しますか？"
        confirmLabel="初期化する"
        message="現在のデータはすべて削除され、サンプルデータに置き換わります。全ユーザーのセッションが失効し、再ログインが必要になります。"
      />
    </div>
  );
}
