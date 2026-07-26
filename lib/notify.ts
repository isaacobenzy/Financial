/**
 * Thin adapter — prefer `sendActivityPush` / `notificationService`.
 * Kept so existing call sites keep working.
 */

import { notificationService } from '@/lib/notificationStore';
import { sendActivityPush } from '@/lib/pushNotifications';
import type { PushCategory } from '@/lib/notificationSettingsStore';

export type NotifyKind =
  | 'login'
  | 'logout'
  | 'import'
  | 'goal'
  | 'anomaly'
  | 'streak'
  | 'info';

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

export async function notifyUser(
  title: string,
  body: string,
  kind: NotifyKind = 'info',
  options?: {
    categoryId?: string;
    channelId?: string;
    data?: Record<string, string>;
    silentToast?: boolean;
  },
): Promise<void> {
  if (!options?.silentToast) {
    if (kind === 'logout' || kind === 'info' || kind === 'streak' || kind === 'anomaly') {
      notificationService.info(body, title);
    } else {
      notificationService.success(body, title);
    }
  }

  // Local OS push — never delay the in-app toast
  void sendActivityPush({
    title,
    body,
    category: categoryFor(kind),
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

export async function scheduleStreakReminder(): Promise<void> {
  try {
    await sendActivityPush({
      title: 'Streak at risk',
      body: 'Open Financial Copilot tonight to keep your money streak alive.',
      category: 'streak_alerts',
      data: { href: '/(tabs)', screen: 'home' },
    });
  } catch {
    // ignore
  }
}
