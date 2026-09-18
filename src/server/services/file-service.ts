import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { ForbiddenError, NotFoundError, ValidationError } from "@/server/errors";
import { recordAudit, type AuditContext } from "@/server/audit/audit-service";
import { getStorageProvider } from "@/server/storage";
import { canDeleteFile, canUploadFile } from "@/lib/policy";
import { FILE_CATEGORY } from "@/lib/constants";
import type { PagedResult } from "@/lib/types";
import type { FileMetaInput, FileQuery } from "@/lib/validation/schemas";

export const fileInclude = {
  project: {
    select: {
      id: true,
      name: true,
      code: true,
      assigneeId: true,
      customer: { select: { id: true, name: true } },
    },
  },
  uploadedBy: { select: { id: true, name: true } },
} satisfies Prisma.ProjectFileInclude;

export type FileItem = Prisma.ProjectFileGetPayload<{ include: typeof fileInclude }>;

/** アップロード制限 (本番ではウイルススキャン等も検討) */
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_MIME_PREFIXES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument",
  "application/vnd.ms-excel",
  "application/msword",
  "application/vnd.ms-powerpoint",
  "text/csv",
  "text/plain",
  "image/png",
  "image/jpeg",
  "image/gif",
  "application/zip",
  "application/octet-stream",
];

export async function getFileList(q: FileQuery): Promise<PagedResult<FileItem>> {
  const and: Prisma.ProjectFileWhereInput[] = [];
  if (q.q) {
    and.push({
      OR: [
        { name: { contains: q.q } },
        { description: { contains: q.q } },
        { project: { name: { contains: q.q } } },
        { project: { customer: { name: { contains: q.q } } } },
      ],
    });
  }
  if (q.projectId) and.push({ projectId: q.projectId });
  if (q.category?.length) and.push({ category: { in: q.category } });
  const where = and.length ? { AND: and } : {};
  const [items, total] = await Promise.all([
    prisma.projectFile.findMany({
      where,
      include: fileInclude,
      orderBy: { createdAt: "desc" },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
    prisma.projectFile.count({ where }),
  ]);
  return { items, total, page: q.page, pageSize: q.pageSize, totalPages: Math.max(1, Math.ceil(total / q.pageSize)) };
}

export async function getFile(id: string) {
  const f = await prisma.projectFile.findUnique({ where: { id }, include: fileInclude });
  if (!f) throw new NotFoundError("ファイルが見つかりません");
  return f;
}

export async function uploadFile(
  ctx: AuditContext,
  projectId: string,
  file: { name: string; mimeType: string; data: Buffer },
  meta: FileMetaInput,
) {
  if (!canUploadFile(ctx.user)) throw new ForbiddenError();
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, customerId: true },
  });
  if (!project) throw new NotFoundError("案件が見つかりません");
  if (file.data.length === 0) throw new ValidationError("ファイルが空です");
  if (file.data.length > MAX_FILE_SIZE) throw new ValidationError("ファイルサイズは10MB以下にしてください");
  if (!ALLOWED_MIME_PREFIXES.some((p) => file.mimeType.startsWith(p)))
    throw new ValidationError("このファイル形式はアップロードできません");

  const storage = getStorageProvider();
  const stored = await storage.put({ data: file.data, fileName: file.name, mimeType: file.mimeType });

  try {
    return await prisma.$transaction(async (tx) => {
      const created = await tx.projectFile.create({
        data: {
          projectId,
          name: file.name.slice(0, 200),
          category: meta.category,
          mimeType: file.mimeType,
          size: file.data.length,
          storageProvider: stored.provider,
          storageKey: stored.key,
          description: meta.description ?? null,
          uploadedById: ctx.user?.id ?? null,
        },
        include: fileInclude,
      });
      await recordAudit(
        ctx,
        {
          action: "CREATE",
          entityType: "file",
          entityId: created.id,
          entityLabel: created.name,
          summary: `ファイル「${created.name}」(${FILE_CATEGORY[created.category].label})を追加`,
          projectId,
          customerId: project.customerId,
        },
        tx,
      );
      return created;
    });
  } catch (e) {
    await storage.delete(stored.key);
    throw e;
  }
}

export async function readFileContent(id: string) {
  const f = await getFile(id);
  const data = await getStorageProvider().get(f.storageKey);
  return { file: f, data };
}

export async function deleteFile(ctx: AuditContext, id: string) {
  const target = await getFile(id);
  if (!canDeleteFile(ctx.user, target)) throw new ForbiddenError("このファイルを削除する権限がありません");
  await prisma.$transaction(async (tx) => {
    await tx.projectFile.delete({ where: { id } });
    await recordAudit(
      ctx,
      {
        action: "DELETE",
        entityType: "file",
        entityId: id,
        entityLabel: target.name,
        summary: `ファイル「${target.name}」を削除`,
        projectId: target.projectId,
        customerId: target.project.customer.id,
      },
      tx,
    );
  });
  await getStorageProvider().delete(target.storageKey);
}
