import type { ProjectStatus } from "@prisma/client";

/**
 * グラフ用のステータス色。バッジの色調と揃え、画面全体で「同じ色 = 同じ状態」になるようにする。
 * 隣接ペアの色覚多様性 (CVD) 分離は検証済み。ラベル・凡例・数値表を必ず併記する。
 */
export const PROJECT_STATUS_CHART_COLOR: Record<ProjectStatus, string> = {
  NOT_STARTED: "#a3b1c6",
  IN_PROGRESS: "#3b82f6",
  WAITING_REVIEW: "#f59e0b",
  ON_HOLD: "#475569",
  COMPLETED: "#10b981",
};
