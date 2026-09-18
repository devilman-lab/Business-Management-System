import type { Metadata } from "next";
import { requireUser } from "@/server/auth/require-user";
import { ImportWizard } from "@/features/admin/import-wizard";

export const metadata: Metadata = { title: "CSV取込" };

export default async function ImportPage() {
  await requireUser();
  return <ImportWizard />;
}
