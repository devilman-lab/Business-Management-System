"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Upload } from "lucide-react";
import type { ImportPreview, ImportResult, ImportTarget } from "@/server/csv/import-service";
import { api, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Checkbox, FormError } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/misc";
import { Table, TableWrapper, TBody, Td, Th, THead, Tr } from "@/components/ui/table";

const TARGETS: { value: ImportTarget; label: string; description: string; required: string; columns: string; sample: string; listHref: string }[] = [
  {
    value: "customer",
    label: "顧客",
    description: "取引先の基本情報",
    required: "顧客名",
    columns: "顧客名, フリガナ, 先方担当者, 役職, 電話番号, メールアドレス, 住所, 業種, ステータス(見込み/取引中/休眠/取引終了), 社内担当(氏名), 備考",
    sample: "顧客名,先方担当者,電話番号,メールアドレス,ステータス,社内担当\n株式会社テスト工業,山本 一郎,03-0000-0000,yamamoto@test.example.jp,見込み,田中 花子\n",
    listHref: "/customers",
  },
  {
    value: "project",
    label: "案件",
    description: "顧客に紐づく案件 (顧客が先に登録されている必要があります)",
    required: "案件名, 顧客名",
    columns: "案件名, 顧客名(登録済みの顧客名), 担当者(氏名), ステータス(未着手/進行中/確認待ち/保留/完了), 優先度(高/中/低), 進捗率, 開始日, 期限, 予算, 概要",
    sample: "案件名,顧客名,担当者,ステータス,優先度,進捗率,開始日,期限\n倉庫管理システム導入,株式会社サンプル建設,鈴木 美咲,未着手,中,0,2026/10/01,2027/01/31\n",
    listHref: "/projects",
  },
  {
    value: "task",
    label: "タスク",
    description: "案件に紐づくタスク (案件番号または案件名で紐づけ)",
    required: "タスク名, 案件番号 または 案件名",
    columns: "タスク名, 案件番号(PJ-2026-001 形式) または 案件名, 担当者(氏名), ステータス(未着手/進行中/完了), 優先度(高/中/低), 期限, 内容",
    sample: "タスク名,案件番号,担当者,ステータス,優先度,期限\nキックオフ資料作成,PJ-2026-001,鈴木 美咲,未着手,高,2026/10/05\n",
    listHref: "/tasks",
  },
];

type Step = "select" | "preview" | "done";

export function ImportWizard() {
  const [target, setTarget] = useState<ImportTarget>("customer");
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState("");
  const [step, setStep] = useState<Step>("select");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [skipErrors, setSkipErrors] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [onlyErrors, setOnlyErrors] = useState(false);

  const def = TARGETS.find((t) => t.value === target)!;

  const readFile = async (file: File | null) => {
    setError(null);
    setPreview(null);
    if (!file) return;
    setFileName(file.name);
    // Excel から保存した CSV (UTF-8 BOM 付き) を想定。Shift_JIS は文字化けするため UTF-8 で保存してもらう運用
    const text = await file.text();
    setCsvText(text);
  };

  const runPreview = async () => {
    if (!csvText) return setError("CSVファイルを選択してください");
    setBusy(true);
    setError(null);
    try {
      const p = await api.post<ImportPreview>(`/api/import/${target}`, { csv: csvText, mode: "preview" });
      setPreview(p);
      setStep("preview");
      setOnlyErrors(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "検証に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  const runCommit = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await api.post<ImportResult>(`/api/import/${target}`, { csv: csvText, mode: "commit", skipErrors });
      setResult(r);
      setStep("done");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "登録に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  const restart = () => {
    setStep("select");
    setPreview(null);
    setResult(null);
    setCsvText("");
    setFileName("");
    setError(null);
    setSkipErrors(false);
  };

  const downloadSample = () => {
    const blob = new Blob(["﻿" + def.sample], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sample_${target}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns = preview ? Object.keys(preview.rows[0]?.values ?? {}) : [];
  const shownRows = preview ? (onlyErrors ? preview.rows.filter((r) => r.status === "error") : preview.rows) : [];

  return (
    <div>
      <PageHeader title="CSV取込" description="Excel・スプレッドシートで管理していたデータを移行します。登録前に内容を検証し、エラー行を確認できます" />

      {/* ステップ表示 */}
      <ol className="mb-5 flex items-center gap-2 text-sm">
        {(["select", "preview", "done"] as Step[]).map((s, i) => {
          const labels = { select: "1. ファイル選択", preview: "2. 内容の確認", done: "3. 登録完了" };
          const active = step === s;
          const done = (s === "select" && step !== "select") || (s === "preview" && step === "done");
          return (
            <li key={s} className="flex items-center gap-2">
              <span className={cn("rounded-full px-3 py-1 font-medium", active ? "bg-primary-600 text-white" : done ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500")}>{labels[s]}</span>
              {i < 2 && <span className="text-slate-300">→</span>}
            </li>
          );
        })}
      </ol>

      {step === "select" && (
        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="取込対象とファイル" />
            <CardBody className="space-y-5">
              <FormError message={error} />
              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">取込対象</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {TARGETS.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => {
                        setTarget(t.value);
                        setPreview(null);
                      }}
                      className={cn("rounded-lg border p-3 text-left transition-colors", target === t.value ? "border-primary-500 bg-primary-50" : "border-slate-200 hover:bg-slate-50")}
                      aria-pressed={target === t.value}
                    >
                      <p className="text-sm font-semibold text-slate-900">{t.label}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{t.description}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">CSVファイル (UTF-8)</p>
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 hover:border-primary-400 hover:bg-primary-50/40">
                  <FileSpreadsheet className="size-8 text-slate-400" />
                  {fileName ? <span className="font-medium text-slate-800">{fileName}</span> : <span>クリックしてCSVファイルを選択</span>}
                  <span className="text-xs text-slate-400">エクスポートしたCSVと同じ列名を使用してください</span>
                  <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => readFile(e.target.files?.[0] ?? null)} />
                </label>
              </div>
              <div className="flex justify-end">
                <Button onClick={runPreview} loading={busy} disabled={!csvText} icon={<Upload className="size-4" />}>
                  内容を検証する
                </Button>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={`${def.label}CSVの形式`} />
            <CardBody className="space-y-3 text-sm text-slate-700">
              <div>
                <p className="text-xs font-semibold text-slate-500">必須列</p>
                <p>{def.required}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">対応する列</p>
                <p className="text-xs leading-relaxed">{def.columns}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">検証内容</p>
                <ul className="list-inside list-disc text-xs leading-relaxed">
                  <li>必須項目の有無、文字数</li>
                  <li>日付・数値・メール・電話番号の形式</li>
                  <li>ステータス・優先度の値 (日本語表記)</li>
                  <li>担当者・顧客・案件の存在 (登録済みデータとの照合)</li>
                  <li>顧客名の重複</li>
                </ul>
              </div>
              <Button variant="outline" size="sm" icon={<Download className="size-4" />} onClick={downloadSample}>
                サンプルCSVをダウンロード
              </Button>
              <p className="text-xs text-slate-400">既存データの列名を確認するには、各一覧画面の「CSVエクスポート」で出力したファイルを参照してください。</p>
            </CardBody>
          </Card>
        </div>
      )}

      {step === "preview" && preview && (
        <Card>
          <CardHeader
            title="検証結果"
            description={`${fileName} — ${preview.totalRows} 行を検証しました`}
            actions={
              <div className="flex items-center gap-3 text-sm">
                <span className="inline-flex items-center gap-1 text-emerald-700">
                  <CheckCircle2 className="size-4" /> 登録可能 {preview.okCount} 件
                </span>
                <span className={cn("inline-flex items-center gap-1", preview.errorCount ? "text-red-700" : "text-slate-400")}>
                  <AlertCircle className="size-4" /> エラー {preview.errorCount} 件
                </span>
              </div>
            }
          />
          <CardBody className="space-y-4">
            <FormError message={error} />
            {preview.errorCount > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                エラー行があります。CSVを修正して再度検証するか、「エラー行を除いて登録」を選択して登録可能な行のみ登録してください。
              </div>
            )}
            <div className="flex flex-wrap items-center gap-4">
              {preview.errorCount > 0 && <Checkbox label="エラー行のみ表示" checked={onlyErrors} onChange={(e) => setOnlyErrors(e.target.checked)} />}
            </div>
            <TableWrapper className="max-h-[50vh] overflow-y-auto rounded-lg border border-slate-200">
              <Table>
                <THead>
                  <tr>
                    <Th className="w-14">行</Th>
                    <Th className="w-20">結果</Th>
                    {columns.map((c) => (
                      <Th key={c}>{c}</Th>
                    ))}
                    <Th>エラー内容</Th>
                  </tr>
                </THead>
                <TBody>
                  {shownRows.map((r) => (
                    <Tr key={r.rowNumber} className={r.status === "error" ? "bg-red-50/60 hover:bg-red-50" : ""}>
                      <Td className="tabular-nums text-slate-500">{r.rowNumber}</Td>
                      <Td>
                        {r.status === "ok" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                            <CheckCircle2 className="size-3.5" /> OK
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700">
                            <AlertCircle className="size-3.5" /> エラー
                          </span>
                        )}
                      </Td>
                      {columns.map((c) => (
                        <Td key={c} className="max-w-48 truncate text-xs" title={r.values[c]}>
                          {r.values[c] || <span className="text-slate-300">—</span>}
                        </Td>
                      ))}
                      <Td className="text-xs text-red-700">
                        {r.errors.map((e, i) => (
                          <span key={i} className="block">
                            {e}
                          </span>
                        ))}
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </TableWrapper>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <Button variant="outline" onClick={restart} disabled={busy}>
                ファイルを選び直す
              </Button>
              <div className="flex items-center gap-4">
                {preview.errorCount > 0 && <Checkbox label="エラー行を除いて登録" checked={skipErrors} onChange={(e) => setSkipErrors(e.target.checked)} />}
                <Button onClick={runCommit} loading={busy} disabled={preview.okCount === 0 || (preview.errorCount > 0 && !skipErrors)}>
                  {preview.okCount} 件を登録する
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {step === "done" && result && (
        <Card>
          <CardBody className="py-12 text-center">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="size-7" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">取込が完了しました</h2>
            <p className="mt-2 text-sm text-slate-600">
              <span className="font-semibold text-emerald-700">{result.inserted} 件</span> を登録しました
              {result.skipped > 0 && (
                <>
                  {" "}
                  (<span className="text-red-700">{result.skipped} 件</span> をスキップ)
                </>
              )}
              。取込の記録は監査ログに残っています。
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <Link href={def.listHref}>
                <Button>{def.label}一覧を確認する</Button>
              </Link>
              <Button variant="outline" onClick={restart}>
                続けて取り込む
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
