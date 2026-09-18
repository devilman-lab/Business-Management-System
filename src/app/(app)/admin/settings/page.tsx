import type { Metadata } from "next";
import { requireUser } from "@/server/auth/require-user";
import { getSettings } from "@/server/services/settings-service";
import { prisma } from "@/server/db";
import { resolveStorageProviderName } from "@/server/storage";
import { SettingsView } from "@/features/admin/settings-view";

export const metadata: Metadata = { title: "設定" };

export default async function SettingsPage() {
  await requireUser();
  const [settings, counts] = await Promise.all([
    getSettings(),
    Promise.all([prisma.user.count(), prisma.customer.count(), prisma.project.count(), prisma.task.count(), prisma.activity.count(), prisma.projectFile.count(), prisma.auditLog.count()]),
  ]);
  const [users, customers, projects, tasks, activities, files, auditLogs] = counts;
  return (
    <SettingsView
      settings={settings}
      system={{
        database: process.env.DATABASE_URL?.startsWith("file:") ? "SQLite (ローカル)" : "外部データベース",
        storage: resolveStorageProviderName(),
        ai: process.env.ANTHROPIC_API_KEY ? "Claude (Anthropic API)" : "ルールベース (API未接続)",
        counts: { users, customers, projects, tasks, activities, files, auditLogs },
      }}
    />
  );
}
