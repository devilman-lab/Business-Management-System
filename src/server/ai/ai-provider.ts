/**
 * AI 支援機能の抽象インターフェース。
 *
 * 方針 (Human-in-the-loop):
 *   AI は「候補」を生成するだけで、データを直接書き換えない。
 *   担当者が候補を確認・編集・承認して初めて正式なタスクとして登録される。
 *
 * 既定ではルールベースの実装で動作し、ANTHROPIC_API_KEY が設定されている場合のみ
 * LLM を利用する実装に切り替わる (API に依存せずデモが動作する)。
 */

export interface ProjectContextForAi {
  name: string;
  code: string;
  description: string | null;
  customerName: string;
  status: string; // 日本語ラベル
  priority: string;
  progress: number;
  dueDate: string | null; // yyyy/MM/dd
  assigneeName: string | null;
  tasks: { title: string; status: string; dueDate: string | null; assigneeName: string | null }[];
  activities: { occurredAt: string; type: string; userName: string; title: string; content: string | null }[];
}

export interface TaskSuggestion {
  title: string;
  description: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  /** 期限の目安 (今日から何日後か)。null は未定 */
  dueInDays: number | null;
  /** なぜこのタスクを提案したか (担当者が判断できるように根拠を示す) */
  reason: string;
}

export interface ProjectSummary {
  summary: string;
  risks: string[];
  nextActions: string[];
  /** 生成元 (rule-based | anthropic) */
  source: string;
}

export interface AiProvider {
  readonly name: string;
  suggestTasks(ctx: ProjectContextForAi): Promise<TaskSuggestion[]>;
  summarizeProject(ctx: ProjectContextForAi): Promise<ProjectSummary>;
}
