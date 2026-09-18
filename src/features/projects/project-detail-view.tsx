"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  CheckCircle2,
  FilePlus2,
  History,
  ListPlus,
  MessageSquarePlus,
  Pencil,
  Sparkles,
  Trash2,
  UserX,
} from "lucide-react";
import type { ProjectDetail } from "@/server/repositories/project-repository";
import type { FieldChange, UserOption } from "@/lib/types";
import { AUDIT_ACTION, ENTITY_TYPE_LABEL, PRIORITY, PROJECT_STATUS, TASK_STATUS } from "@/lib/constants";
import { canDeleteProject, canDeleteTask, canEditProject, canEditTask } from "@/lib/policy";
import { api } from "@/lib/api-client";
import { cn, formatCurrency, formatDate, formatDateTime, getDueState } from "@/lib/utils";
import { useCurrentUser } from "@/components/layout/current-user-context";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Badge, OptionBadge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/form";
import { ConfirmDialog } from "@/components/ui/modal";
import { DescriptionList, DueDate, EmptyState, PageHeader, ProgressBar, UserChip } from "@/components/ui/misc";
import { Table, TableWrapper, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { ActivityFormModal } from "@/features/activities/activity-form-modal";
import { ActivityTimeline } from "@/features/activities/activity-timeline";
import { TaskFormModal, type TaskEditTarget } from "@/features/tasks/task-form-modal";
import { TaskRowActions, TaskStatusSelect } from "@/features/tasks/task-controls";
import { FileTable } from "@/features/files/file-table";
import { FileUploadModal } from "@/features/files/file-upload-modal";
import { AuditChanges } from "@/features/audit/audit-changes";
import { AiAssistModal } from "./ai-assist-modal";
import { ProjectQuickControls } from "./project-quick-controls";

export type ProjectTab = "overview" | "tasks" | "activities" | "files" | "history";

type HistoryItem = Omit<ProjectDetail["auditLogs"][number], "changes"> & { changes: FieldChange[] };

export function ProjectDetailView({
  project,
  history,
  users,
  dueSoonDays,
  initialTab,
}: {
  project: ProjectDetail;
  history: HistoryItem[];
  users: UserOption[];
  dueSoonDays: number;
  initialTab: ProjectTab;
}) {
  const user = useCurrentUser();
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<ProjectTab>(initialTab);
  const [taskModal, setTaskModal] = useState<{ open: boolean; editing: TaskEditTarget | null }>({ open: false, editing: null });
  const [activityOpen, setActivityOpen] = useState(false);
  const [fileOpen, setFileOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const editable = canEditProject(user, project);
  const completed = project.status === "COMPLETED";
  const openTasks = project.tasks.filter((t) => t.status !== "COMPLETED");
  const doneTasks = project.tasks.length - openTasks.length;
  const overdueTasks = openTasks.filter((t) => getDueState(t.dueDate, false, new Date(), dueSoonDays) === "overdue");
  const nextTasks = [...openTasks].sort((a, b) => (a.dueDate ? new Date(a.dueDate).getTime() : Infinity) - (b.dueDate ? new Date(b.dueDate).getTime() : Infinity)).slice(0, 3);
  const projectDue = getDueState(project.dueDate, completed, new Date(), dueSoonDays);
  const visibleTasks = showCompleted ? project.tasks : openTasks;

  const changeTab = (t: ProjectTab) => {
    setTab(t);
    const url = new URL(window.location.href);
    if (t === "overview") url.searchParams.delete("tab");
    else url.searchParams.set("tab", t);
    window.history.replaceState(null, "", url.toString());
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await api.delete(`/api/projects/${project.id}`);
      toast.success("案件を削除しました");
      router.push("/projects");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "削除に失敗しました");
      setDeleting(false);
    }
  };

  // 注意すべき状態
  const alerts: { tone: "red" | "amber"; text: string }[] = [];
  if (projectDue === "overdue") alerts.push({ tone: "red", text: `案件の期限 (${formatDate(project.dueDate)}) を過ぎています` });
  if (overdueTasks.length > 0) alerts.push({ tone: "red", text: `期限超過のタスクが ${overdueTasks.length} 件あります` });
  if (!project.assigneeId && !completed) alerts.push({ tone: "amber", text: "担当者が設定されていません" });
  if (project.status === "WAITING_REVIEW") alerts.push({ tone: "amber", text: "顧客の確認待ちです。回答期限をフォローしてください" });
  if (project.status === "ON_HOLD") alerts.push({ tone: "amber", text: "保留中です。再開条件を対応履歴に残しておくと引き継ぎが容易になります" });

  return (
    <div>
      <PageHeader
        title={project.name}
        breadcrumbs={[{ label: "案件・プロジェクト", href: "/projects" }, { label: project.name }]}
        meta={
          <>
            <span className="font-mono text-xs text-slate-500">{project.code}</span>
            <OptionBadge option={PROJECT_STATUS[project.status]} />
            <OptionBadge option={PRIORITY[project.priority]} dot={false} />
            <Link href={`/customers/${project.customer.id}`} className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-primary-700 hover:underline">
              <Building2 className="size-3.5" /> {project.customer.name}
            </Link>
          </>
        }
        actions={
          <>
            <Button variant="outline" icon={<Sparkles className="size-4 text-violet-600" />} onClick={() => setAiOpen(true)}>
              AI支援
            </Button>
            <Button variant="outline" icon={<MessageSquarePlus className="size-4" />} onClick={() => setActivityOpen(true)}>
              対応履歴を登録
            </Button>
            <Button variant="outline" icon={<ListPlus className="size-4" />} onClick={() => setTaskModal({ open: true, editing: null })}>
              タスクを追加
            </Button>
            {editable && (
              <Link href={`/projects/${project.id}/edit`}>
                <Button icon={<Pencil className="size-4" />}>編集</Button>
              </Link>
            )}
            {canDeleteProject(user) && (
              <Button variant="ghost" className="text-red-600 hover:bg-red-50" icon={<Trash2 className="size-4" />} onClick={() => setDeleteOpen(true)}>
                削除
              </Button>
            )}
          </>
        }
      />

      {alerts.length > 0 && (
        <div className="mb-4 space-y-1.5">
          {alerts.map((a, i) => (
            <div key={i} className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-sm", a.tone === "red" ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-900")}>
              <AlertTriangle className="size-4 shrink-0" /> {a.text}
            </div>
          ))}
        </div>
      )}

      {/* 現在の状態 (インライン更新) */}
      <Card className="mb-5">
        <CardHeader
          title="現在の状態"
          description={editable ? "この場で変更できます。変更は即時に保存され、監査ログに記録されます" : "閲覧のみ (変更できるのは案件の担当者または管理者です)"}
        />
        <CardBody>
          <ProjectQuickControls
            projectId={project.id}
            status={project.status}
            assigneeId={project.assigneeId}
            assigneeName={project.assignee?.name ?? null}
            priority={project.priority}
            progress={project.progress}
            users={users}
            editable={editable}
          />
          <div className="mt-4 border-t border-slate-100 pt-4">
            <ProgressBar value={project.progress} />
          </div>
        </CardBody>
      </Card>

      {/* サマリー */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-card">
          <p className="text-xs font-medium text-slate-500">期限</p>
          <p className="mt-0.5 text-base font-semibold">
            <DueDate value={project.dueDate} completed={completed} soonDays={dueSoonDays} />
          </p>
          <p className="text-[11px] text-slate-400">開始日 {formatDate(project.startDate)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-card">
          <p className="text-xs font-medium text-slate-500">タスク</p>
          <p className="mt-0.5 text-base font-semibold text-slate-900">
            {doneTasks} <span className="text-xs font-normal text-slate-400">/ {project.tasks.length} 件完了</span>
          </p>
          <p className={cn("text-[11px]", overdueTasks.length ? "text-red-600" : "text-slate-400")}>期限超過 {overdueTasks.length} 件</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-card">
          <p className="text-xs font-medium text-slate-500">対応履歴</p>
          <p className="mt-0.5 text-base font-semibold text-slate-900">{project.activities.length} 件</p>
          <p className="text-[11px] text-slate-400">最終対応 {project.activities[0] ? formatDate(project.activities[0].occurredAt) : "—"}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-card">
          <p className="text-xs font-medium text-slate-500">予算</p>
          <p className="mt-0.5 text-base font-semibold text-slate-900">{formatCurrency(project.budget)}</p>
          <p className="text-[11px] text-slate-400">ファイル {project.files.length} 件</p>
        </div>
      </div>

      {/* タブ */}
      <Card>
        <div className="px-5 pt-2">
          <Tabs<ProjectTab>
            value={tab}
            onChange={changeTab}
            items={[
              { key: "overview", label: "概要" },
              { key: "tasks", label: "タスク", count: openTasks.length, badge: overdueTasks.length > 0 ? <span className="size-1.5 rounded-full bg-red-500" aria-label="期限超過あり" /> : undefined },
              { key: "activities", label: "対応履歴", count: project.activities.length },
              { key: "files", label: "ファイル", count: project.files.length },
              { key: "history", label: "変更履歴", count: history.length },
            ]}
          />
        </div>

        {tab === "overview" && (
          <CardBody className="grid gap-6 lg:grid-cols-3">
            <div className="min-w-0 space-y-5 lg:col-span-2">
              <section>
                <h3 className="mb-2 text-sm font-semibold text-slate-900">案件概要</h3>
                {project.description ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{project.description}</p>
                ) : (
                  <p className="text-sm text-slate-400">概要は登録されていません</p>
                )}
              </section>
              <section>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <CheckCircle2 className="size-4 text-primary-600" /> 次にすべきこと
                </h3>
                {nextTasks.length === 0 ? (
                  <p className="text-sm text-slate-400">{completed ? "この案件は完了しています" : "未完了のタスクはありません。「タスクを追加」で次の作業を登録しましょう"}</p>
                ) : (
                  <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                    {nextTasks.map((t) => (
                      <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
                        <OptionBadge option={TASK_STATUS[t.status]} size="sm" />
                        <span className="min-w-0 flex-1 truncate font-medium text-slate-800">{t.title}</span>
                        <UserChip name={t.assignee?.name} size="xs" />
                        <DueDate value={t.dueDate} completed={false} soonDays={dueSoonDays} className="text-xs" />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <section>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <History className="size-4 text-slate-500" /> 直近の対応
                </h3>
                {project.activities.length === 0 ? (
                  <p className="text-sm text-slate-400">対応履歴はまだありません</p>
                ) : (
                  <ul className="space-y-1.5">
                    {project.activities.slice(0, 3).map((a) => (
                      <li key={a.id} className="flex flex-wrap items-start gap-x-3 gap-y-0.5 text-sm">
                        <span className="w-28 shrink-0 text-xs tabular-nums text-slate-500">{formatDateTime(a.occurredAt)}</span>
                        <span className="min-w-0 flex-1 truncate text-slate-800">{a.title}</span>
                        <span className="shrink-0 text-xs text-slate-500">{a.user.name}</span>
                      </li>
                    ))}
                    <li>
                      <button type="button" onClick={() => changeTab("activities")} className="text-xs font-medium text-primary-700 hover:underline">
                        すべての対応履歴を見る
                      </button>
                    </li>
                  </ul>
                )}
              </section>
            </div>
            <div className="min-w-0 space-y-5">
              <section className="rounded-lg border border-slate-200 p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-900">顧客情報</h3>
                <DescriptionList
                  columns={1}
                  items={[
                    {
                      label: "顧客名",
                      value: (
                        <Link href={`/customers/${project.customer.id}`} className="font-medium text-primary-700 hover:underline">
                          {project.customer.name}
                        </Link>
                      ),
                    },
                    { label: "先方担当者", value: project.customer.contactName ? `${project.customer.contactName}${project.customer.contactTitle ? ` (${project.customer.contactTitle})` : ""}` : null },
                    { label: "電話番号", value: project.customer.phone },
                    { label: "メール", value: project.customer.email },
                    { label: "顧客の社内担当", value: <UserChip name={project.customer.assignee?.name} /> },
                  ]}
                />
              </section>
              <section className="rounded-lg border border-slate-200 p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-900">案件情報</h3>
                <DescriptionList
                  columns={1}
                  items={[
                    { label: "案件番号", value: <span className="font-mono">{project.code}</span> },
                    { label: "担当者", value: project.assignee ? <UserChip name={project.assignee.name} department={project.assignee.department} /> : <span className="inline-flex items-center gap-1 text-amber-700"><UserX className="size-3.5" /> 未設定</span> },
                    { label: "期間", value: <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5 text-slate-400" />{formatDate(project.startDate)} 〜 {formatDate(project.dueDate)}</span> },
                    { label: "完了日", value: project.completedAt ? formatDate(project.completedAt) : null },
                    { label: "登録者", value: project.createdBy?.name },
                    { label: "登録日", value: formatDate(project.createdAt) },
                    { label: "最終更新", value: formatDateTime(project.updatedAt) },
                  ]}
                />
              </section>
            </div>
          </CardBody>
        )}

        {tab === "tasks" && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
              <Checkbox label={`完了済みも表示 (${doneTasks}件)`} checked={showCompleted} onChange={(e) => setShowCompleted(e.target.checked)} />
              <Button size="sm" icon={<ListPlus className="size-4" />} onClick={() => setTaskModal({ open: true, editing: null })}>
                タスクを追加
              </Button>
            </div>
            {visibleTasks.length === 0 ? (
              <EmptyState compact title={showCompleted ? "タスクがありません" : "未完了のタスクはありません"} description="「タスクを追加」で次の作業を登録できます" />
            ) : (
              <TableWrapper>
                <Table layout="auto">
                  <THead>
                    <tr>
                      <Th>タスク名</Th>
                      <Th>担当者</Th>
                      <Th>ステータス</Th>
                      <Th>優先度</Th>
                      <Th>期限</Th>
                      <Th>作成日</Th>
                      <Th>完了日</Th>
                      <Th align="right"></Th>
                    </tr>
                  </THead>
                  <TBody>
                    {visibleTasks.map((t) => {
                      const tk = { ...t, project: { assigneeId: project.assigneeId } };
                      const canEdit = canEditTask(user, tk);
                      return (
                        <Tr key={t.id} className={t.status === "COMPLETED" ? "opacity-60" : ""}>
                          <Td>
                            <span className="font-medium text-slate-900">{t.title}</span>
                            {t.description && <span className="block max-w-md truncate text-xs text-slate-500">{t.description}</span>}
                          </Td>
                          <Td>
                            <UserChip name={t.assignee?.name} />
                          </Td>
                          <Td>
                            <TaskStatusSelect taskId={t.id} status={t.status} editable={canEdit} />
                          </Td>
                          <Td>
                            <OptionBadge option={PRIORITY[t.priority]} dot={false} />
                          </Td>
                          <Td>
                            <DueDate value={t.dueDate} completed={t.status === "COMPLETED"} soonDays={dueSoonDays} />
                          </Td>
                          <Td className="text-xs tabular-nums text-slate-500">{formatDate(t.createdAt)}</Td>
                          <Td className="text-xs tabular-nums text-slate-500">{formatDate(t.completedAt)}</Td>
                          <Td align="right">
                            <TaskRowActions taskId={t.id} title={t.title} editable={canEdit} deletable={canDeleteTask(user, tk)} onEdit={() => setTaskModal({ open: true, editing: t })} />
                          </Td>
                        </Tr>
                      );
                    })}
                  </TBody>
                </Table>
              </TableWrapper>
            )}
          </div>
        )}

        {tab === "activities" && (
          <CardBody>
            <div className="mb-4 flex items-center justify-between gap-2">
              <p className="text-sm text-slate-500">この案件に関する対応の経緯 (新しい順)。担当者が変わっても過去の対応を確認できます。</p>
              <Button size="sm" icon={<MessageSquarePlus className="size-4" />} onClick={() => setActivityOpen(true)}>
                対応履歴を登録
              </Button>
            </div>
            <ActivityTimeline activities={project.activities.map((a) => ({ ...a, customer: { id: project.customer.id, name: project.customer.name } }))} showProject={false} />
          </CardBody>
        )}

        {tab === "files" && (
          <div>
            <div className="flex items-center justify-between gap-2 px-5 py-3">
              <p className="text-sm text-slate-500">見積書・契約書・提案資料など。ファイル実体はストレージに保存され、業務データとは分離して管理されます。</p>
              <Button size="sm" icon={<FilePlus2 className="size-4" />} onClick={() => setFileOpen(true)}>
                ファイルを追加
              </Button>
            </div>
            <FileTable files={project.files.map((f) => ({ ...f, project: { id: project.id, name: project.name, code: project.code, assigneeId: project.assigneeId } }))} />
          </div>
        )}

        {tab === "history" && (
          <CardBody>
            <p className="mb-4 text-sm text-slate-500">この案件および関連するタスク・対応履歴・ファイルに対する変更の記録です。「誰が・いつ・何を」変更したかを追跡できます。</p>
            {history.length === 0 ? (
              <EmptyState compact title="変更履歴はありません" />
            ) : (
              <ol className="divide-y divide-slate-100">
                {history.map((h) => (
                  <li key={h.id} className="flex gap-4 py-3">
                    <span className="w-32 shrink-0 text-xs tabular-nums text-slate-500">{formatDateTime(h.createdAt)}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={AUDIT_ACTION[h.action].tone} size="sm">
                          {AUDIT_ACTION[h.action].label}
                        </Badge>
                        <span className="text-xs text-slate-500">{ENTITY_TYPE_LABEL[h.entityType] ?? h.entityType}</span>
                        <span className="text-sm font-medium text-slate-800">{h.entityLabel}</span>
                        <span className="text-xs text-slate-500">— {h.user?.name ?? "システム"}</span>
                      </div>
                      {h.changes.length > 0 ? (
                        <div className="mt-1.5">
                          <AuditChanges changes={h.changes} compact />
                        </div>
                      ) : (
                        h.summary && <p className="mt-1 text-xs text-slate-600">{h.summary}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardBody>
        )}
      </Card>

      <TaskFormModal open={taskModal.open} onClose={() => setTaskModal({ open: false, editing: null })} fixedProjectId={project.id} users={users} editing={taskModal.editing} />
      <ActivityFormModal open={activityOpen} onClose={() => setActivityOpen(false)} fixedCustomerId={project.customerId} fixedProjectId={project.id} />
      <FileUploadModal open={fileOpen} onClose={() => setFileOpen(false)} fixedProjectId={project.id} />
      <AiAssistModal open={aiOpen} onClose={() => setAiOpen(false)} projectId={project.id} users={users} defaultAssigneeId={project.assigneeId} />
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={remove}
        loading={deleting}
        danger
        title="案件を削除しますか？"
        confirmLabel="削除する"
        message={
          <>
            「{project.name}」を削除します。紐づくタスク ({project.tasks.length}件)・ファイル ({project.files.length}件) も削除されます。対応履歴は顧客側に残ります。
            <br />
            <span className="text-xs text-slate-500">この操作は取り消せません。削除の記録は監査ログに残ります。</span>
          </>
        }
      />
    </div>
  );
}
