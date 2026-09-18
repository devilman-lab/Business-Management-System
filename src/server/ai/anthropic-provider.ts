import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { AiProvider, ProjectContextForAi, ProjectSummary, TaskSuggestion } from "./ai-provider";
import { RuleBasedAiProvider } from "./rule-based-provider";

/**
 * Anthropic Claude を利用した候補生成。
 * ANTHROPIC_API_KEY が設定されている場合のみ使用される。
 * 応答は JSON として受け取り、zod で検証してから画面へ返す (不正な出力を通さない)。
 * API エラー時はルールベースへフォールバックし、デモが止まらないようにする。
 */

const MODEL = "claude-opus-5";

const suggestionSchema = z.object({
  suggestions: z
    .array(
      z.object({
        title: z.string().min(1).max(120),
        description: z.string().max(500).default(""),
        priority: z.enum(["HIGH", "MEDIUM", "LOW"]).default("MEDIUM"),
        dueInDays: z.number().int().min(0).max(365).nullable().default(null),
        reason: z.string().max(300).default(""),
      }),
    )
    .max(5),
});

const summarySchema = z.object({
  summary: z.string().min(1).max(1000),
  risks: z.array(z.string().max(200)).max(5).default([]),
  nextActions: z.array(z.string().max(200)).max(5).default([]),
});

const SYSTEM_PROMPT = `あなたは日本企業の業務管理システムのアシスタントです。
案件の情報 (概要・タスク・対応履歴) をもとに、担当者の判断を助ける情報を日本語で生成します。
出力は必ず指定された JSON のみを返し、前後に説明文やコードブロックを付けないでください。
推測で事実を作らず、与えられた情報から読み取れる内容に限定してください。`;

function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("JSON が見つかりません");
  return JSON.parse(text.slice(start, end + 1));
}

export class AnthropicAiProvider implements AiProvider {
  readonly name = "anthropic";
  private readonly client: Anthropic;
  private readonly fallback = new RuleBasedAiProvider();

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  private async ask(prompt: string): Promise<string> {
    // Claude Opus 5: 適応的思考は既定で有効。低〜中程度の effort で十分な単純タスク。
    // fallbacks: "default" により、安全分類による拒否時はサーバー側で代替モデルに切り替わる。
    const response = await this.client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium" },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    });
    if (response.stop_reason === "refusal") throw new Error("AI が応答を拒否しました");
    return response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
  }

  async suggestTasks(ctx: ProjectContextForAi): Promise<TaskSuggestion[]> {
    try {
      const text = await this.ask(
        `以下の案件情報から、担当者が次に行うべきタスク候補を最大5件提案してください。
既に存在するタスクと重複するものは提案しないでください。
JSON形式: {"suggestions":[{"title":"","description":"","priority":"HIGH|MEDIUM|LOW","dueInDays":数値またはnull,"reason":"提案理由"}]}

案件情報:
${JSON.stringify(ctx, null, 2)}`,
      );
      return suggestionSchema.parse(extractJson(text)).suggestions;
    } catch (e) {
      console.warn("[ai] Anthropic API での候補生成に失敗したためルールベースへフォールバックします:", e);
      return this.fallback.suggestTasks(ctx);
    }
  }

  async summarizeProject(ctx: ProjectContextForAi): Promise<ProjectSummary> {
    try {
      const text = await this.ask(
        `以下の案件情報を、担当者引き継ぎ用に要約してください。
JSON形式: {"summary":"3〜4文の要約","risks":["懸念点"],"nextActions":["次にすべきこと"]}

案件情報:
${JSON.stringify(ctx, null, 2)}`,
      );
      return { ...summarySchema.parse(extractJson(text)), source: this.name };
    } catch (e) {
      console.warn("[ai] Anthropic API での要約に失敗したためルールベースへフォールバックします:", e);
      return this.fallback.summarizeProject(ctx);
    }
  }
}
