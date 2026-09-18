import { getAiProvider, type ProjectContextForAi } from "@/server/ai";
import { getProjectDetail } from "./project-service";
import { ACTIVITY_TYPE, PRIORITY, PROJECT_STATUS, TASK_STATUS } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/utils";

/** 案件詳細を AI プロバイダ向けの表示用コンテキストへ変換する (ID 等の内部情報は渡さない) */
async function buildContext(projectId: string): Promise<ProjectContextForAi> {
  const p = await getProjectDetail(projectId);
  return {
    name: p.name,
    code: p.code,
    description: p.description,
    customerName: p.customer.name,
    status: PROJECT_STATUS[p.status].label,
    priority: PRIORITY[p.priority].label,
    progress: p.progress,
    dueDate: p.dueDate ? formatDate(p.dueDate) : null,
    assigneeName: p.assignee?.name ?? null,
    tasks: p.tasks.map((t) => ({
      title: t.title,
      status: TASK_STATUS[t.status].label,
      dueDate: t.dueDate ? formatDate(t.dueDate) : null,
      assigneeName: t.assignee?.name ?? null,
    })),
    activities: p.activities.slice(0, 15).map((a) => ({
      occurredAt: formatDateTime(a.occurredAt),
      type: ACTIVITY_TYPE[a.type].label,
      userName: a.user.name,
      title: a.title,
      content: a.content,
    })),
  };
}

export async function suggestTasksForProject(projectId: string) {
  const provider = await getAiProvider();
  const ctx = await buildContext(projectId);
  const suggestions = await provider.suggestTasks(ctx);
  return { provider: provider.name, suggestions };
}

export async function summarizeProject(projectId: string) {
  const provider = await getAiProvider();
  const ctx = await buildContext(projectId);
  return provider.summarizeProject(ctx);
}
