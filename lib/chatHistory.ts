import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSession } from '@/lib/session';

/** Keep the newest N chat bubbles; older ones are dropped from storage. */
export const MAX_CHAT_HISTORY = 5;

const HISTORY_PREFIX = 'ai_chat_history_v1:';

export type StoredChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  tone?: 'error';
  /** Serialized goal actions (optional). */
  actionsJson?: string;
  actionStatesJson?: string;
};

function keyFor(email: string) {
  return `${HISTORY_PREFIX}${email.trim().toLowerCase() || 'guest'}`;
}

export async function loadChatHistory(
  email?: string | null,
): Promise<StoredChatMessage[]> {
  try {
    const session = email ? null : await getSession();
    const who = (email || session?.email || 'guest').trim().toLowerCase();
    const raw = await AsyncStorage.getItem(keyFor(who));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredChatMessage[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && m.id)
      .slice(-MAX_CHAT_HISTORY);
  } catch {
    return [];
  }
}

export async function saveChatHistory(
  messages: StoredChatMessage[],
  email?: string | null,
): Promise<StoredChatMessage[]> {
  const session = email ? null : await getSession();
  const who = (email || session?.email || 'guest').trim().toLowerCase();
  const trimmed = messages
    .filter((m) => m.id !== 'welcome')
    .slice(-MAX_CHAT_HISTORY);
  try {
    await AsyncStorage.setItem(keyFor(who), JSON.stringify(trimmed));
  } catch {
    // non-fatal
  }
  return trimmed;
}

export async function clearChatHistory(email?: string | null): Promise<void> {
  const session = email ? null : await getSession();
  const who = (email || session?.email || 'guest').trim().toLowerCase();
  try {
    await AsyncStorage.removeItem(keyFor(who));
  } catch {
    // non-fatal
  }
}
