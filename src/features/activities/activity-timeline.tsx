"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, MessageSquareText, Monitor, MoreHorizontal, Pencil, Phone, Trash2, Users, Building } from "lucide-react";
import type { ActivityType } from "@prisma/client";
import { ACTIVITY_TYPE } from "@/lib/constants";
import { canDeleteActivity, canEditActivity } from "@/lib/policy";
import { api } from "@/lib/api-client";
import { cn, formatDateTime } from "@/lib/utils";
import { useCurrentUser } from "@/components/layout/current-user-context";
import { useToast } from "@/components/ui/toast";
import { OptionBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/modal";
import { Avatar, EmptyState } from "@/components/ui/misc";
import { ActivityFormModal, type ActivityEditTarget } from "./activity-form-modal";

export interface TimelineActivity {
  id: string;
  customerId: string;
  projectId: string | null;
  userId: string;
  type: ActivityType;
  occurredAt: Date | string;
  title: string;
  content: string | null;
  user: { id: string; name: string };
  customer?: { id: string; name: string } | null;
  project?: { id: string; name: string; code: string } | null;
}

const typeIcon: Record<ActivityType, React.ReactNode> = {
  PHONE: <Phone className="size-3.5" />,
  EMAIL: <Mail className="size-3.5" />,
  VISIT: <Building className="size-3.5" />,
  ONLINE_MEETING: <Monitor className="size-3.5" />,
  INTERNAL: <Users className="size-3.5" />,
  OTHER: <MessageSquareText className="size-3.5" />,
};

const typeBg: Record<ActivityType, string> = {
  PHONE: "bg-blue-100 text-blue-700",
  EMAIL: "bg-violet-100 text-violet-700",
  VISIT: "bg-emerald-100 text-emerald-700",
  ONLINE_MEETING: "bg-amber-100 text-amber-700",
  INTERNAL: "bg-slate-200 text-slate-700",
  OTHER: "bg-slate-100 text-slate-600",
};

/**
 * 対応履歴のタイムライン表示。顧客詳細・案件詳細・対応履歴一覧で共通利用。
 */
export function ActivityTimeline({
  activities,
  showCustomer,
  showProject = true,
  emptyMessage = "対応履歴がまだありません",
}: {
  activities: TimelineActivity[];
  showCustomer?: boolean;
  showProject?: boolean;
  emptyMessage?: string;
}) {
  const user = useCurrentUser();
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState<ActivityEditTarget | null>(null);
  const [deleting, setDeleting] = useState<TimelineActivity | null>(null);
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await api.delete(`/api/activities/${deleting.id}`);
      toast.success("対応履歴を削除しました");
      setDeleting(null);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "削除に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  if (activities.length === 0) {
    return <EmptyState compact title={emptyMessage} description="「対応履歴を登録」から電話・メール・訪問などの記録を追加できます" />;
  }

  return (
    <>
      <ol className="relative space-y-0">
        {activities.map((a, i) => {
          const editable = canEditActivity(user, a);
          const deletable = canDeleteActivity(user, a);
          return (
            <li key={a.id} className="relative flex gap-3 pb-5">
              {i < activities.length - 1 && <span className="absolute left-[15px] top-8 h-[calc(100%-1.25rem)] w-px bg-slate-200" aria-hidden />}
              <span className={cn("relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full ring-4 ring-white", typeBg[a.type])}>
                {typeIcon[a.type]}
              </span>
              <div className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-4 py-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <time className="text-xs tabular-nums text-slate-500">{formatDateTime(a.occurredAt)}</time>
                  <OptionBadge option={ACTIVITY_TYPE[a.type]} dot={false} size="sm" />
                  <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                    <Avatar name={a.user.name} size="xs" /> {a.user.name}
                  </span>
                  {(editable || deletable) && (
                    <span className="ml-auto flex items-center gap-1">
                      {editable && (
                        <Button variant="ghost" size="xs" onClick={() => setEditing(a)} icon={<Pencil className="size-3" />} aria-label="編集">
                          編集
                        </Button>
                      )}
                      {deletable && (
                        <Button variant="ghost" size="xs" className="text-red-600 hover:bg-red-50" onClick={() => setDeleting(a)} icon={<Trash2 className="size-3" />} aria-label="削除">
                          削除
                        </Button>
                      )}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-sm font-medium text-slate-900">{a.title}</p>
                {a.content && <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{a.content}</p>}
                {(showCustomer || (showProject && a.project)) && (
                  <p className="mt-2 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                    {showCustomer && a.customer && (
                      <Link href={`/customers/${a.customer.id}`} className="hover:text-primary-700 hover:underline">
                        {a.customer.name}
                      </Link>
                    )}
                    {showProject && a.project && (
                      <>
                        {showCustomer && <MoreHorizontal className="size-3 text-slate-300" />}
                        <Link href={`/projects/${a.project.id}`} className="hover:text-primary-700 hover:underline">
                          <span className="font-mono text-[11px] text-slate-400">{a.project.code}</span> {a.project.name}
                        </Link>
                      </>
                    )}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <ActivityFormModal open={!!editing} onClose={() => setEditing(null)} editing={editing} fixedCustomerId={editing?.customerId} />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        loading={busy}
        danger
        title="対応履歴を削除しますか？"
        confirmLabel="削除する"
        message={
          <>
            「{deleting?.title}」を削除します。この操作は取り消せません。
            <br />
            <span className="text-xs text-slate-500">※ 削除の記録は監査ログに残ります</span>
          </>
        }
      />
    </>
  );
}
