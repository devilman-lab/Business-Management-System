"use client";

import { createContext, useContext } from "react";
import type { CurrentUser } from "@/lib/types";

const Ctx = createContext<CurrentUser | null>(null);

export function CurrentUserProvider({ user, children }: { user: CurrentUser; children: React.ReactNode }) {
  return <Ctx.Provider value={user}>{children}</Ctx.Provider>;
}

/** クライアントコンポーネントでログインユーザーを参照する (ボタン表示の権限判定などに使用) */
export function useCurrentUser(): CurrentUser {
  const u = useContext(Ctx);
  if (!u) throw new Error("useCurrentUser は CurrentUserProvider の内側で使用してください");
  return u;
}
