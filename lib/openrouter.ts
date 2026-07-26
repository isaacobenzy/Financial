import { buildFinanceSystemPrompt } from '@/lib/financeContext';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

/** Small model — override with EXPO_PUBLIC_OPENROUTER_MODEL in .env */
export const DEFAULT_OPENROUTER_MODEL =
  process.env.EXPO_PUBLIC_OPENROUTER_MODEL ?? 'meta-llama/llama-3.2-3b-instruct';

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

function getOpenRouterApiKey(): string | null {
  return process.env.EXPO_PUBLIC_OPENROUTER_API_KEY?.trim() || null;
}

export async function askOpenRouter(
  userMessage: string,
  history: ChatMessage[] = [],
): Promise<string> {
  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    throw new Error(
      'AI is not configured. Restart the app after setting EXPO_PUBLIC_OPENROUTER_API_KEY in .env.',
    );
  }

  const systemPrompt = await buildFinanceSystemPrompt();

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-8),
    { role: 'user', content: userMessage },
  ];

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/isaacobenzy/Financial',
      'X-Title': 'Financial Copilot',
    },
    body: JSON.stringify({
      model: DEFAULT_OPENROUTER_MODEL,
      messages,
      temperature: 0.3,
      max_tokens: 450,
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const detail =
      data?.error?.message || data?.message || `OpenRouter error (${response.status})`;
    throw new Error(detail);
  }

  const content = data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error('No response from the model. Try again.');
  }

  return content.trim();
}
