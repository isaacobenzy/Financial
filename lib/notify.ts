import { Platform } from 'react-native';
import { toast } from '@/lib/toast';
import { supportsSystemNotifications } from '@/lib/runtime';

export type NotifyKind =
  | 'login'
  | 'logout'
  | 'import'
  | 'goal'
  | 'anomaly'
  | 'streak'
  | 'info';

let categoriesReady = false;

async function ensureChannelsAndCategories(
  Notifications: typeof import('expo-notifications'),
): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('ledger', {
      name: 'Ledger updates',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 40],
      lightColor: '#1B4332',
    });
    await Notifications.setNotificationChannelAsync('insights', {
      name: 'Insights & goals',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 30, 40, 30],
      lightColor: '#B08968',
    });
  }

  if (categoriesReady) return;
  try {
    await Notifications.setNotificationCategoryAsync('import_digest', [
      { identifier: 'categorize', buttonTitle: 'Categorize', options: { opensAppToForeground: true } },
      { identifier: 'ask_ai', buttonTitle: 'Ask AI', options: { opensAppToForeground: true } },
    ]);
    await Notifications.setNotificationCategoryAsync('goal_milestone', [
      { identifier: 'view_goals', buttonTitle: 'View goals', options: { opensAppToForeground: true } },
    ]);
    await Notifications.setNotificationCategoryAsync('streak_risk', [
      { identifier: 'check_in', buttonTitle: 'Check in', options: { opensAppToForeground: true } },
    ]);
    categoriesReady = true;
  } catch {
    // ignore
  }
}

/**
 * In-app toast always. System notifications only in a development / production build
 * (never import expo-notifications inside Expo Go — it throws on Android).
 */
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
      toast.info(body, title);
    } else {
      toast.success(body, title);
    }
  }

  if (!supportsSystemNotifications()) return;

  try {
    const Notifications = await import('expo-notifications');

    await Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: kind === 'goal' || kind === 'anomaly',
        shouldSetBadge: false,
      }),
    });

    const perms = await Notifications.getPermissionsAsync();
    let status = (perms as { status?: string }).status;
    if (status !== 'granted') {
      const asked = await Notifications.requestPermissionsAsync();
      status = (asked as { status?: string }).status;
    }
    if (status !== 'granted') return;

    await ensureChannelsAndCategories(Notifications);

    const channelId =
      options?.channelId ||
      (kind === 'import' || kind === 'login' || kind === 'logout' ? 'ledger' : 'insights');

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: kind === 'goal' || kind === 'anomaly' ? 'default' : false,
        data: { kind, ...(options?.data || {}) },
        ...(options?.categoryId ? { categoryIdentifier: options.categoryId } : {}),
        ...(Platform.OS === 'android' ? { channelId } : {}),
      },
      trigger: null,
    });
  } catch {
    // toast already shown
  }
}

export async function scheduleStreakReminder(): Promise<void> {
  if (!supportsSystemNotifications()) return;
  try {
    const Notifications = await import('expo-notifications');
    const perms = await Notifications.getPermissionsAsync();
    if ((perms as { status?: string }).status !== 'granted') return;

    await ensureChannelsAndCategories(Notifications);

    const existing = await Notifications.getAllScheduledNotificationsAsync();
    if (existing.some((n) => n.content.data?.kind === 'streak')) return;

    const trigger = new Date();
    trigger.setHours(20, 0, 0, 0);
    if (trigger.getTime() <= Date.now()) trigger.setDate(trigger.getDate() + 1);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Streak at risk',
        body: 'Open Financial Copilot tonight to keep your money streak alive.',
        data: { kind: 'streak' },
        categoryIdentifier: 'streak_risk',
        ...(Platform.OS === 'android' ? { channelId: 'insights' } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: trigger,
      } as never,
    });
  } catch {
    // ignore
  }
}
