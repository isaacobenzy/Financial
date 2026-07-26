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

type NotificationsModule = {
  AndroidImportance: { DEFAULT: number; HIGH: number; LOW: number };
  AndroidNotificationPriority?: { LOW: number };
  AndroidNotificationVisibility?: { PUBLIC: number };
  SchedulableTriggerInputTypes: { DATE: string };
  setNotificationChannelAsync: (id: string, options: Record<string, unknown>) => Promise<unknown>;
  setNotificationCategoryAsync: (
    id: string,
    actions: Array<Record<string, unknown>>,
  ) => Promise<unknown>;
  setNotificationHandler: (handler: {
    handleNotification: () => Promise<Record<string, unknown>>;
  }) => void;
  getPermissionsAsync: () => Promise<{ status?: string; granted?: boolean }>;
  requestPermissionsAsync: () => Promise<{ status?: string; granted?: boolean }>;
  scheduleNotificationAsync: (request: Record<string, unknown>) => Promise<string>;
  getAllScheduledNotificationsAsync: () => Promise<Array<{ content: { data?: { kind?: string } } }>>;
  dismissNotificationAsync: (id: string) => Promise<void>;
  addNotificationResponseReceivedListener: (
    listener: (response: unknown) => void,
  ) => { remove: () => void };
};

let categoriesReady = false;

async function loadNotifications(): Promise<NotificationsModule | null> {
  if (!supportsSystemNotifications()) return null;
  try {
    return (await import('expo-notifications')) as unknown as NotificationsModule;
  } catch {
    return null;
  }
}

async function ensureChannelsAndCategories(Notifications: NotificationsModule): Promise<void> {
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
 * (never import expo-notifications inside Expo Go — it errors on Android SDK 53+).
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

  const Notifications = await loadNotifications();
  if (!Notifications) return;

  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: kind === 'goal' || kind === 'anomaly',
        shouldSetBadge: false,
      }),
    });

    const perms = await Notifications.getPermissionsAsync();
    let status = perms.status;
    if (status !== 'granted') {
      const asked = await Notifications.requestPermissionsAsync();
      status = asked.status;
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
        sound: kind === 'goal' || kind === 'anomaly' || kind === 'login' ? 'default' : false,
        data: { kind, ...(options?.data || {}) },
        ...(options?.categoryId ? { categoryIdentifier: options.categoryId } : {}),
        ...(Platform.OS === 'android'
          ? {
              channelId,
              color: '#1B4332',
            }
          : {}),
      },
      trigger: null,
    });
  } catch {
    // toast already shown
  }
}

export async function scheduleStreakReminder(): Promise<void> {
  const Notifications = await loadNotifications();
  if (!Notifications) return;
  try {
    const perms = await Notifications.getPermissionsAsync();
    if (perms.status !== 'granted') return;

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
      },
    });
  } catch {
    // ignore
  }
}
