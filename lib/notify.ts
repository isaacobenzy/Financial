/**
 * Thin adapter — prefer `sendActivityPush` / `notificationService`.
 * Kept so existing call sites keep working.
 */

import { notificationService } from '@/lib/notificationStore';
import { sendActivityPush } from '@/lib/pushNotifications';
import type { PushCategory } from '@/lib/notificationSettingsStore';
import {
  markNotifiedToday,
  nextEveningTriggerDate,
  NOTIFY_IDS,
  shouldNotifyToday,
} from '@/lib/notificationPolicy';

export type NotifyKind =
  | 'login'
  | 'logout'
  | 'import'
  | 'goal'
  | 'anomaly'
  | 'streak'
  | 'info';

export type NotifySurface = 'toast' | 'os' | 'both';

function categoryFor(kind: NotifyKind): PushCategory {
  switch (kind) {
    case 'goal':
      return 'goal_alerts';
    case 'import':
      return 'import_alerts';
    case 'streak':
      return 'streak_alerts';
    case 'anomaly':
      return 'insight_alerts';
    case 'login':
    case 'logout':
      return 'security';
    default:
      return 'general';
  }
}

function identifierFor(kind: NotifyKind, options?: { categoryId?: string; data?: Record<string, string> }) {
  if (kind === 'streak') return NOTIFY_IDS.streakDaily;
  if (kind === 'import') return NOTIFY_IDS.importDigest;
  if (kind === 'anomaly') return NOTIFY_IDS.anomalyFood;
  if (kind === 'login' || kind === 'logout') return NOTIFY_IDS.authSession;
  if (kind === 'goal' && options?.data?.goalId) {
    return `fc-goal-${options.data.goalId}-${options.categoryId ?? 'update'}`;
  }
  return undefined;
}

export async function notifyUser(
  title: string,
  body: string,
  kind: NotifyKind = 'info',
  options?: {
    categoryId?: string;
    channelId?: string;
    data?: Record<string, string>;
    silentToast?: boolean;
    /** Where to surface. Auth should use `toast`. Default `both`. */
    surface?: NotifySurface;
  },
): Promise<void> {
  const surface: NotifySurface = options?.surface ?? 'both';
  const showToast = surface === 'toast' || surface === 'both';
  const showOs = surface === 'os' || surface === 'both';

  if (showToast && !options?.silentToast) {
    if (kind === 'logout' || kind === 'info' || kind === 'streak' || kind === 'anomaly') {
      notificationService.info(body, title);
    } else {
      notificationService.success(body, title);
    }
  }

  if (!showOs) return;

  // Local OS push — never delay the in-app toast
  void sendActivityPush({
    title,
    body,
    category: categoryFor(kind),
    identifier: identifierFor(kind, options),
    skipToastFallback: true,
    data: {
      ...options?.data,
      href:
        options?.data?.screen === 'goals'
          ? '/(tabs)/goals'
          : options?.data?.screen === 'assistant'
            ? '/assistant'
            : options?.data?.screen === 'transactions'
              ? '/transactions'
              : '/(tabs)',
    },
  });
}

/**
 * Schedule a single evening streak reminder (stable id).
 * Skips if already checked in today or already scheduled/notified for today.
 */
export async function scheduleStreakReminder(): Promise<void> {
  try {
    const { getStreak } = await import('@/lib/achievements');
    const streak = await getStreak();
    const today = new Date().toISOString().slice(0, 10);
    if (streak.lastActiveDate === today) {
      // Already checked in — cancel any pending streak alert
      const { cancelNotificationById } = await import('@/lib/pushNotifications');
      await cancelNotificationById(NOTIFY_IDS.streakDaily);
      return;
    }

    if (!(await shouldNotifyToday('streak_reminder'))) {
      return;
    }

    const when = nextEveningTriggerDate(20, 0);
    await sendActivityPush({
      title: 'Streak at risk',
      body: 'Open Financial Copilot tonight to keep your money streak alive.',
      category: 'streak_alerts',
      identifier: NOTIFY_IDS.streakDaily,
      triggerDate: when,
      data: { href: '/(tabs)', screen: 'home' },
    });
    await markNotifiedToday('streak_reminder');
  } catch {
    // ignore
  }
}
