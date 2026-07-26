/**
 * Client-side notification hygiene: stable IDs, cooldowns, content hashing.
 * Prevents stacking / re-firing the same OS alerts on every home focus or login.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const COOLDOWN_PREFIX = 'fc_notify_cd_';
const LIVE_HASH_KEY = 'fc_live_snap_hash_v1';

export const NOTIFY_IDS = {
  streakDaily: 'fc-streak-daily',
  importDigest: 'fc-import-digest',
  anomalyFood: 'fc-anomaly-food',
  authSession: 'fc-auth-session',
  goalMilestone: (goalId: string, mark: number) => `fc-goal-${goalId}-${mark}`,
  goalLifecycle: (goalId: string, action: string) => `fc-goal-life-${goalId}-${action}`,
  activity: (kind: string) => `fc-activity-${kind}`,
} as const;

export type NotifyIdKind =
  | 'streak'
  | 'import'
  | 'anomaly'
  | 'auth'
  | 'goal'
  | 'ledger'
  | 'insight'
  | 'general';

const DAY_MS = 24 * 60 * 60 * 1000;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function notificationIdFor(kind: NotifyIdKind, entityId?: string): string {
  switch (kind) {
    case 'streak':
      return NOTIFY_IDS.streakDaily;
    case 'import':
      return NOTIFY_IDS.importDigest;
    case 'anomaly':
      return NOTIFY_IDS.anomalyFood;
    case 'auth':
      return NOTIFY_IDS.authSession;
    case 'goal':
      return entityId ? `fc-goal-${entityId}` : 'fc-goal';
    case 'ledger':
      return NOTIFY_IDS.activity('ledger');
    case 'insight':
      return NOTIFY_IDS.activity('insight');
    default:
      return entityId ? `fc-general-${entityId}` : 'fc-general';
  }
}

/** True if we have not notified for this key within ttlMs (or calendar day when ttl is a day). */
export async function shouldNotify(key: string, ttlMs: number = DAY_MS): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(COOLDOWN_PREFIX + key);
    if (!raw) return true;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return true;
    return Date.now() - ts >= ttlMs;
  } catch {
    return true;
  }
}

/** Calendar-day gate (resets at UTC midnight via ISO date string). */
export async function shouldNotifyToday(key: string): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(COOLDOWN_PREFIX + key);
    if (!raw) return true;
    // Stored as either timestamp or "YYYY-MM-DD"
    if (raw.includes('-') && raw.length >= 10) {
      return raw.slice(0, 10) !== todayKey();
    }
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return true;
    return new Date(ts).toISOString().slice(0, 10) !== todayKey();
  } catch {
    return true;
  }
}

export async function markNotified(key: string): Promise<void> {
  try {
    await AsyncStorage.setItem(COOLDOWN_PREFIX + key, String(Date.now()));
  } catch {
    // ignore
  }
}

export async function markNotifiedToday(key: string): Promise<void> {
  try {
    await AsyncStorage.setItem(COOLDOWN_PREFIX + key, todayKey());
  } catch {
    // ignore
  }
}

/** Stable content fingerprint for live sticky widgets (ignores updatedAt). */
export function hashWidgetContent(parts: {
  balanceHidden: boolean;
  balanceDisplay: string;
  streakCurrent: number;
  streakBest: number;
  checkedInToday: boolean;
  topGoalName: string | null;
  topGoalPct: number;
}): string {
  return [
    parts.balanceHidden ? '1' : '0',
    parts.balanceDisplay,
    parts.streakCurrent,
    parts.streakBest,
    parts.checkedInToday ? '1' : '0',
    parts.topGoalName ?? '',
    parts.topGoalPct,
  ].join('|');
}

export async function getLastLiveHash(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LIVE_HASH_KEY);
  } catch {
    return null;
  }
}

export async function setLastLiveHash(hash: string): Promise<void> {
  try {
    await AsyncStorage.setItem(LIVE_HASH_KEY, hash);
  } catch {
    // ignore
  }
}

export async function clearLastLiveHash(): Promise<void> {
  try {
    await AsyncStorage.removeItem(LIVE_HASH_KEY);
  } catch {
    // ignore
  }
}

/** Next evening local trigger (20:00). If already past 20:00 today, schedule tomorrow. */
export function nextEveningTriggerDate(hour = 20, minute = 0): Date {
  const d = new Date();
  d.setSeconds(0, 0);
  d.setHours(hour, minute, 0, 0);
  if (d.getTime() <= Date.now() + 60_000) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}
