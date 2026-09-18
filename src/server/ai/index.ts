import type { AiProvider } from "./ai-provider";
import { RuleBasedAiProvider } from "./rule-based-provider";

export type { AiProvider, ProjectContextForAi, ProjectSummary, TaskSuggestion } from "./ai-provider";

let cached: AiProvider | undefined;

/** 環境に応じた AI プロバイダを返す (API キー未設定ならルールベース) */
export async function getAiProvider(): Promise<AiProvider> {
  if (cached) return cached;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    const { AnthropicAiProvider } = await import("./anthropic-provider");
    cached = new AnthropicAiProvider(apiKey);
  } else {
    cached = new RuleBasedAiProvider();
  }
  return cached;
}
