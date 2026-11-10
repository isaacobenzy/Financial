import { decideFinancialShare, isAiConfigured } from '@/lib/aiShare';

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

/**
 * Chat entry point. Does not read EXPO_PUBLIC_OPENROUTER_API_KEY or any other
 * client secret, and does not call a model provider. A safe design needs an
 * authenticated backend the owner operates. This repo does not have one, and
 * inventing a proxy that still embeds a billable key would not be safe.
 */
export function isOpenRouterConfigured(): boolean {
  return isAiConfigured();
}

export async function askOpenRouter(
  _userMessage: string,
  _history: ChatMessage[] = [],
): Promise<string> {
  const decision = await decideFinancialShare();
  throw new Error(decision.message);
}
