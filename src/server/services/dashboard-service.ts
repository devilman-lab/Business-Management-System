import type { Prisma, ProjectStatus } from "@prisma/client";
import { prisma } from "@/server/db";
import { addDays, startOfToday, startOfTomorrow } from "@/lib/utils";
import { activityInclude } from "./activity-service";
import { projectListInclude } from "@/server/repositories/project-repository";
import { taskListInclude } from "@/server/repositories/task-repository";
import { getDueSoonDays } from "./settings-service";

export interface DashboardScope {
  /** 指定時は、そのユーザーが担当する案件・タスクに限定する */
  assigneeId?: string;
}

export async function getDashboardData(scope: DashboardScope) {
  const today = startOfToday();
  const tomorrow = startOfTomorrow();
  const dueSoonDays = await getDueSoonDays();

  const projectScope: Prisma.ProjectWhereInput = scope.assigneeId ? { assigneeId: scope.assigneeId } : {};
  const taskScope: Prisma.TaskWhereInput = scope.assigneeId
    ? { OR: [{ assigneeId: scope.assigneeId }, { project: { assigneeId: scope.assigneeId } }] }
    : {};
  const openTask: Prisma.TaskWhereInput = { status: { not: "COMPLETED" } };

  const [
    projectTotal,
    projectByStatus,
    overdueProjects,
    overdueTasks,
    todayTasks,
    dueSoonTasks,
    openTasks,
    recentProjects,
    recentActivities,
    overdueTaskList,
    todayTaskList,
    assigneeRows,
    users,
  ] = await Promise.all([
    prisma.project.count({ where: projectScope }),
    prisma.project.groupBy({ by: ["status"], where: projectScope, _count: { _all: true } }),
    prisma.project.count({
      where: { ...projectScope, dueDate: { lt: today }, status: { not: "COMPLETED" } },
    }),
    prisma.task.count({ where: { ...taskScope, ...openTask, dueDate: { lt: today } } }),
    prisma.task.count({ where: { ...taskScope, ...openTask, dueDate: { gte: today, lt: tomorrow } } }),
    prisma.task.count({
      where: { ...taskScope, ...openTask, dueDate: { gte: tomorrow, lt: addDays(today, dueSoonDays + 1) } },
    }),
    prisma.task.count({ where: { ...taskScope, ...openTask } }),
    prisma.project.findMany({
      where: projectScope,
      include: projectListInclude,
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
    prisma.activity.findMany({
      where: scope.assigneeId
        ? { OR: [{ userId: scope.assigneeId }, { project: { assigneeId: scope.assigneeId } }] }
        : {},
      include: activityInclude,
      orderBy: { occurredAt: "desc" },
      take: 8,
    }),
    prisma.task.findMany({
      where: { ...taskScope, ...openTask, dueDate: { lt: today } },
      include: taskListInclude,
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
    prisma.task.findMany({
      where: { ...taskScope, ...openTask, dueDate: { gte: today, lt: tomorrow } },
      include: taskListInclude,
      orderBy: { priority: "asc" },
      take: 5,
    }),
    prisma.project.groupBy({
      by: ["assigneeId", "status"],
      where: projectScope,
      _count: { _all: true },
    }),
    prisma.user.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, department: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const statusCounts: Record<ProjectStatus, number> = {
    NOT_STARTED: 0,
    IN_PROGRESS: 0,
    WAITING_REVIEW: 0,
    ON_HOLD: 0,
    COMPLETED: 0,
  };
  for (const row of projectByStatus) statusCounts[row.status] = row._count._all;

  // 担当者別の案件状況 (担当者未設定も1行として扱う)
  const byAssignee = new Map<string | null, { counts: Record<ProjectStatus, number>; total: number }>();
  for (const row of assigneeRows) {
    const key = row.assigneeId;
    const entry = byAssignee.get(key) ?? { counts: { ...statusCounts, NOT_STARTED: 0, IN_PROGRESS: 0, WAITING_REVIEW: 0, ON_HOLD: 0, COMPLETED: 0 }, total: 0 };
    entry.counts[row.status] += row._count._all;
    entry.total += row._count._all;
    byAssignee.set(key, entry);
  }
  const userMap = new Map(users.map((u) => [u.id, u]));
  const assigneeSummary = [...byAssignee.entries()]
    .map(([id, v]) => ({
      assignee: id ? (userMap.get(id) ?? { id, name: "(退職・無効ユーザー)", department: null }) : null,
      ...v,
    }))
    .sort((a, b) => b.total - a.total);

  return {
    dueSoonDays,
    kpis: {
      projectTotal,
      inProgress: statusCounts.IN_PROGRESS,
      completed: statusCounts.COMPLETED,
      waiting: statusCounts.NOT_STARTED + statusCounts.WAITING_REVIEW,
      notStarted: statusCounts.NOT_STARTED,
      waitingReview: statusCounts.WAITING_REVIEW,
      onHold: statusCounts.ON_HOLD,
      overdueProjects,
      overdueTasks,
      todayTasks,
      dueSoonTasks,
      openTasks,
    },
    statusCounts,
    assigneeSummary,
    recentProjects,
    recentActivities,
    overdueTaskList,
    todayTaskList,
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
