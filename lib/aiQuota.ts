import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSession } from '@/lib/session';

/** Soft cap: each signed-in user may send this many AI prompts per calendar week. */
export const AI_WEEKLY_MESSAGE_LIMIT = 12;

const QUOTA_PREFIX = 'ai_quota_v1:';

export type AiQuotaStatus = {
  used: number;
  limit: number;
  remaining: number;
  weekKey: string;
  exhausted: boolean;
};

/** ISO-like week key: YYYY-Www (UTC). */
export function currentWeekKey(date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function storageKey(email: string, weekKey: string) {
  return `${QUOTA_PREFIX}${email}:${weekKey}`;
}

async function resolveEmail(email?: string | null): Promise<string> {
  if (email?.trim()) return email.trim().toLowerCase();
  const session = await getSession();
  return (session?.email || 'guest').trim().toLowerCase();
}

export async function getAiQuota(email?: string | null): Promise<AiQuotaStatus> {
  const who = await resolveEmail(email);
  const weekKey = currentWeekKey();
  let used = 0;
  try {
    const raw = await AsyncStorage.getItem(storageKey(who, weekKey));
    if (raw) {
      const n = Number(raw);
      if (Number.isFinite(n) && n >= 0) used = Math.floor(n);
    }
  } catch {
    used = 0;
  }
  const remaining = Math.max(0, AI_WEEKLY_MESSAGE_LIMIT - used);
  return {
    used,
    limit: AI_WEEKLY_MESSAGE_LIMIT,
    remaining,
    weekKey,
    exhausted: remaining <= 0,
  };
}

/**
 * Reserve one AI send. Returns updated quota, or null if already exhausted
 * (nothing is incremented when exhausted).
 */
export async function consumeAiQuota(
  email?: string | null,
): Promise<AiQuotaStatus | null> {
  const status = await getAiQuota(email);
  if (status.exhausted) return null;
  const who = await resolveEmail(email);
  const nextUsed = status.used + 1;
  try {
    await AsyncStorage.setItem(
      storageKey(who, status.weekKey),
      String(nextUsed),
    );
  } catch {
    // still return optimistic status
  }
  const remaining = Math.max(0, AI_WEEKLY_MESSAGE_LIMIT - nextUsed);
  return {
    used: nextUsed,
    limit: AI_WEEKLY_MESSAGE_LIMIT,
    remaining,
    weekKey: status.weekKey,
    exhausted: remaining <= 0,
  };
}
