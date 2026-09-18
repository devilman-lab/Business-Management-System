import { apiHandler, ok } from "@/server/api/handler";

export const GET = apiHandler(async ({ user }) => ok({ user }));
