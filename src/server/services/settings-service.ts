import { prisma } from "@/server/db";
import { ForbiddenError } from "@/server/errors";
import { recordAudit, type AuditContext } from "@/server/audit/audit-service";
import { canManageSettings } from "@/lib/policy";
import { DEFAULT_DUE_SOON_DAYS, SETTING_KEYS } from "@/lib/constants";
import type { SettingsInput } from "@/lib/validation/schemas";
import type { FieldChange } from "@/lib/types";

export interface SystemSettings {
  organizationName: string;
  dueSoonDays: number;
}

const DEFAULTS: SystemSettings = {
  organizationName: "株式会社サンプル",
  dueSoonDays: DEFAULT_DUE_SOON_DAYS,
};

export async function getSettings(): Promise<SystemSettings> {
  const rows = await prisma.systemSetting.findMany();
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const dueSoon = Number(map.get(SETTING_KEYS.dueSoonDays));
  return {
    organizationName: map.get(SETTING_KEYS.organizationName) ?? DEFAULTS.organizationName,
    dueSoonDays: Number.isFinite(dueSoon) ? dueSoon : DEFAULTS.dueSoonDays,
  };
}

export async function getDueSoonDays(): Promise<number> {
  const row = await prisma.systemSetting.findUnique({ where: { key: SETTING_KEYS.dueSoonDays } });
  const n = Number(row?.value);
  return Number.isFinite(n) ? n : DEFAULT_DUE_SOON_DAYS;
}

export async function updateSettings(ctx: AuditContext, input: SettingsInput) {
  if (!canManageSettings(ctx.user)) throw new ForbiddenError("システム設定は管理者のみ変更できます");
  const before = await getSettings();
  const changes: FieldChange[] = [];
  if (before.organizationName !== input.organizationName)
    changes.push({ field: "organizationName", label: "組織名", before: before.organizationName, after: input.organizationName });
  if (before.dueSoonDays !== input.dueSoonDays)
    changes.push({ field: "dueSoonDays", label: "期限間近とみなす日数", before: String(before.dueSoonDays), after: String(input.dueSoonDays) });

  await prisma.$transaction(async (tx) => {
    await tx.systemSetting.upsert({
      where: { key: SETTING_KEYS.organizationName },
      create: { key: SETTING_KEYS.organizationName, value: input.organizationName },
      update: { value: input.organizationName },
    });
    await tx.systemSetting.upsert({
      where: { key: SETTING_KEYS.dueSoonDays },
      create: { key: SETTING_KEYS.dueSoonDays, value: String(input.dueSoonDays) },
      update: { value: String(input.dueSoonDays) },
    });
    if (changes.length) {
      await recordAudit(
        ctx,
        {
          action: "UPDATE",
          entityType: "setting",
          entityLabel: "システム設定",
          changes,
          summary: changes.map((c) => `${c.label}「${c.before}」→「${c.after}」`).join("、"),
        },
        tx,
      );
    }
  });
  return getSettings();
}
