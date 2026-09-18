import { apiHandler, ok, parseBody } from "@/server/api/handler";
import { getSettings, updateSettings } from "@/server/services/settings-service";
import { settingsSchema } from "@/lib/validation/schemas";

export const GET = apiHandler(async () => ok(await getSettings()));

export const PUT = apiHandler(
  async ({ req, audit }) => {
    const input = await parseBody(req, settingsSchema);
    return ok(await updateSettings(audit, input));
  },
  { adminOnly: true },
);
