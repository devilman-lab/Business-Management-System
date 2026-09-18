"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, FolderPlus, Mail, MapPin, MessageSquarePlus, Pencil, Phone, Trash2 } from "lucide-react";
import type { CustomerDetail } from "@/server/repositories/customer-repository";
import type { TaskListItem } from "@/server/repositories/task-repository";
import { CUSTOMER_STATUS, PRIORITY, PROJECT_STATUS, TASK_STATUS } from "@/lib/constants";
import { canDeleteCustomer, canEditCustomer } from "@/lib/policy";
import { api } from "@/lib/api-client";
import { formatDate, formatDateTime } from "@/lib/utils";
import { useCurrentUser } from "@/components/layout/current-user-context";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { OptionBadge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/modal";
import { DescriptionList, DueDate, EmptyState, PageHeader, ProgressBar, UserChip } from "@/components/ui/misc";
import { Table, TableWrapper, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { ActivityFormModal } from "@/features/activities/activity-form-modal";
import { ActivityTimeline } from "@/features/activities/activity-timeline";

export function CustomerDetailView({ customer, openTasks, dueSoonDays }: { customer: CustomerDetail; openTasks: TaskListItem[]; dueSoonDays: number }) {
  const user = useCurrentUser();
  const router = useRouter();
  const toast = useToast();
  const [activityOpen, setActivityOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const activeProjects = customer.projects.filter((p) => p.status !== "COMPLETED");
  const lastActivity = customer.activities[0];

  const remove = async () => {
    setDeleting(true);
    try {
      await api.delete(`/api/customers/${customer.id}`);
      toast.success("顧客を削除しました");
      router.push("/customers");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "削除に失敗しました");
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={customer.name}
        breadcrumbs={[{ label: "顧客・取引先", href: "/customers" }, { label: customer.name }]}
        meta={
          <>
            <span className="font-mono text-xs text-slate-500">{customer.code}</span>
            <OptionBadge option={CUSTOMER_STATUS[customer.status]} />
            {customer.industry && <span className="text-xs text-slate-500">{customer.industry}</span>}
            <span className="text-xs text-slate-500">
              社内担当: <UserChip name={customer.assignee?.name} size="xs" />
            </span>
          </>
        }
        actions={
          <>
            <Button variant="outline" icon={<MessageSquarePlus className="size-4" />} onClick={() => setActivityOpen(true)}>
              対応履歴を登録
            </Button>
            <Link href={`/projects/new?customerId=${customer.id}`}>
              <Button variant="outline" icon={<FolderPlus className="size-4" />}>
                案件を追加
              </Button>
            </Link>
            {canEditCustomer(user, customer) && (
              <Link href={`/customers/${customer.id}/edit`}>
                <Button icon={<Pencil className="size-4" />}>編集</Button>
              </Link>
            )}
            {canDeleteCustomer(user) && (
              <Button variant="ghost" className="text-red-600 hover:bg-red-50" icon={<Trash2 className="size-4" />} onClick={() => setDeleteOpen(true)}>
                削除
              </Button>
            )}
          </>
        }
      />

      {/* サマリー */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryTile label="案件数" value={`${customer.projects.length} 件`} sub={`進行中 ${activeProjects.length} 件`} />
        <SummaryTile label="未完了タスク" value={`${openTasks.length} 件`} sub={`期限超過 ${openTasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date(new Date().setHours(0, 0, 0, 0))).length} 件`} />
        <SummaryTile label="対応履歴" value={`${customer.activities.length} 件`} sub={lastActivity ? `最終: ${formatDate(lastActivity.occurredAt)}` : "記録なし"} />
        <SummaryTile label="登録日" value={formatDate(customer.createdAt)} sub={`最終更新 ${formatDateTime(customer.updatedAt)}`} />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        {/* 左: 基本情報 */}
        <div className="min-w-0 space-y-5">
          <Card>
            <CardHeader title="基本情報" />
            <CardBody>
              <DescriptionList
                columns={1}
                items={[
                  { label: "顧客名 (会社名)", value: customer.name },
                  { label: "フリガナ", value: customer.nameKana },
                  { label: "業種", value: customer.industry },
                  { label: "ステータス", value: <OptionBadge option={CUSTOMER_STATUS[customer.status]} /> },
                  { label: "社内担当", value: <UserChip name={customer.assignee?.name} department={customer.assignee?.department} /> },
                  { label: "登録者", value: customer.createdBy?.name },
                ]}
              />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="連絡先" />
            <CardBody>
              <DescriptionList
                columns={1}
                items={[
                  {
                    label: "先方担当者",
                    value: customer.contactName ? (
                      <>
                        {customer.contactName}
                        {customer.contactTitle && <span className="ml-2 text-xs text-slate-500">{customer.contactTitle}</span>}
                      </>
                    ) : null,
                  },
                  {
                    label: "電話番号",
                    value: customer.phone ? (
                      <a href={`tel:${customer.phone}`} className="inline-flex items-center gap-1.5 hover:text-primary-700 hover:underline">
                        <Phone className="size-3.5 text-slate-400" /> {customer.phone}
                      </a>
                    ) : null,
                  },
                  {
                    label: "メールアドレス",
                    value: customer.email ? (
                      <a href={`mailto:${customer.email}`} className="inline-flex items-center gap-1.5 break-all hover:text-primary-700 hover:underline">
                        <Mail className="size-3.5 shrink-0 text-slate-400" /> {customer.email}
                      </a>
                    ) : null,
                  },
                  {
                    label: "住所",
                    value: customer.address ? (
                      <span className="inline-flex items-start gap-1.5">
                        <MapPin className="mt-0.5 size-3.5 shrink-0 text-slate-400" /> {customer.address}
                      </span>
                    ) : null,
                  },
                ]}
              />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="備考・引き継ぎメモ" />
            <CardBody>
              {customer.notes ? <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{customer.notes}</p> : <p className="text-sm text-slate-400">メモはありません</p>}
            </CardBody>
          </Card>
        </div>

        {/* 右: 関連情報 */}
        <div className="min-w-0 space-y-5 xl:col-span-2">
          <Card>
            <CardHeader
              title="関連案件"
              description={`${customer.projects.length} 件`}
              actions={
                <Link href={`/projects?customerId=${customer.id}`} className="text-xs font-medium text-primary-700 hover:underline">
                  案件一覧で見る
                </Link>
              }
            />
            {customer.projects.length === 0 ? (
              <EmptyState
                compact
                icon={<Building2 className="size-6" />}
                title="案件がありません"
                action={
                  <Link href={`/projects/new?customerId=${customer.id}`}>
                    <Button variant="outline" size="sm" icon={<FolderPlus className="size-4" />}>
                      案件を追加
                    </Button>
                  </Link>
                }
              />
            ) : (
              <TableWrapper>
                <Table layout="auto">
                  <THead>
                    <tr>
                      <Th>案件</Th>
                      <Th>担当者</Th>
                      <Th>ステータス</Th>
                      <Th>優先度</Th>
                      <Th className="w-36">進捗</Th>
                      <Th>期限</Th>
                      <Th align="right">タスク</Th>
                    </tr>
                  </THead>
                  <TBody>
                    {customer.projects.map((p) => (
                      <Tr key={p.id}>
                        <Td>
                          <Link href={`/projects/${p.id}`} className="font-medium text-slate-900 hover:text-primary-700 hover:underline">
                            {p.name}
                          </Link>
                          <span className="block font-mono text-[11px] text-slate-400">{p.code}</span>
                        </Td>
                        <Td>
                          <UserChip name={p.assignee?.name} />
                        </Td>
                        <Td>
                          <OptionBadge option={PROJECT_STATUS[p.status]} />
                        </Td>
                        <Td>
                          <OptionBadge option={PRIORITY[p.priority]} dot={false} />
                        </Td>
                        <Td>
                          <ProgressBar value={p.progress} />
                        </Td>
                        <Td>
                          <DueDate value={p.dueDate} completed={p.status === "COMPLETED"} soonDays={dueSoonDays} />
                        </Td>
                        <Td align="right" className="tabular-nums">
                          {p._count.tasks}
                        </Td>
                      </Tr>
                    ))}
                  </TBody>
                </Table>
              </TableWrapper>
            )}
          </Card>

          <Card>
            <CardHeader
              title="未完了タスク"
              description="この顧客の案件に紐づく未着手・進行中のタスク"
              actions={
                <Link href={`/tasks?customerId=${customer.id}`} className="text-xs font-medium text-primary-700 hover:underline">
                  タスク一覧で見る
                </Link>
              }
            />
            {openTasks.length === 0 ? (
              <EmptyState compact title="未完了のタスクはありません" />
            ) : (
              <TableWrapper>
                <Table layout="auto">
                  <THead>
                    <tr>
                      <Th>タスク</Th>
                      <Th>案件</Th>
                      <Th>担当者</Th>
                      <Th>ステータス</Th>
                      <Th>優先度</Th>
                      <Th>期限</Th>
                    </tr>
                  </THead>
                  <TBody>
                    {openTasks.map((t) => (
                      <Tr key={t.id}>
                        <Td className="font-medium text-slate-900">
                          <Link href={`/projects/${t.projectId}?tab=tasks`} className="hover:text-primary-700 hover:underline">
                            {t.title}
                          </Link>
                        </Td>
                        <Td className="text-xs text-slate-500">{t.project.name}</Td>
                        <Td>
                          <UserChip name={t.assignee?.name} />
                        </Td>
                        <Td>
                          <OptionBadge option={TASK_STATUS[t.status]} />
                        </Td>
                        <Td>
                          <OptionBadge option={PRIORITY[t.priority]} dot={false} />
                        </Td>
                        <Td>
                          <DueDate value={t.dueDate} completed={false} soonDays={dueSoonDays} />
                        </Td>
                      </Tr>
                    ))}
                  </TBody>
                </Table>
              </TableWrapper>
            )}
          </Card>

          <Card>
            <CardHeader
              title="対応履歴"
              description="この顧客に関するすべての対応記録 (案件横断・新しい順)"
              actions={
                <Button size="sm" variant="outline" icon={<MessageSquarePlus className="size-4" />} onClick={() => setActivityOpen(true)}>
                  対応履歴を登録
                </Button>
              }
            />
            <CardBody>
              <ActivityTimeline activities={customer.activities} showProject />
            </CardBody>
          </Card>
        </div>
      </div>

      <ActivityFormModal open={activityOpen} onClose={() => setActivityOpen(false)} fixedCustomerId={customer.id} />
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={remove}
        loading={deleting}
        danger
        title="顧客を削除しますか？"
        confirmLabel="削除する"
        message={
          <>
            「{customer.name}」を削除します。対応履歴も削除され、この操作は取り消せません。
            {customer.projects.length > 0 && (
              <span className="mt-2 block rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">
                案件が {customer.projects.length} 件紐づいているため削除できません。先に案件を削除するか、ステータスを「取引終了」に変更してください。
              </span>
            )}
          </>
        }
      />
    </div>
  );
}

function SummaryTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-card">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-0.5 text-lg font-semibold text-slate-900">{value}</p>
      {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
    </div>
  );
}
