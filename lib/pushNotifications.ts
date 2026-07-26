/**
 * Local-first OS notifications (instant + branded icons in native builds).
 * Remote Expo Push is opt-in background only — never blocks the shade alert.
 *
 * Expo Go (Android SDK 53+): no custom icon / limited push — use a preview APK.
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import type { Href } from 'expo-router';
import {
  useNotificationSettingsStore,
  type PushCategory,
} from '@/lib/notificationSettingsStore';

type NotificationsModule = typeof import('expo-notifications');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BRAND = '#1B4332';

let handlerConfigured = false;
let channelsReady = false;
let channelsPromise: Promise<void> | null = null;
let cachedExpoPushToken: string | null = null;
let listenersAttached = false;
let notificationsModule: NotificationsModule | null | undefined;
let modulePromise: Promise<NotificationsModule | null> | null = null;

function isExpoGo(): boolean {
  return (
    Constants.appOwnership === 'expo' ||
    String(Constants.executionEnvironment ?? '') === 'storeClient'
  );
}

function canLoadNotificationsModule(): boolean {
  if (isExpoGo() && Platform.OS === 'android') return false;
  if (Platform.OS === 'web') return false;
  return true;
}

function projectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    undefined
  );
}

async function getNotifications(): Promise<NotificationsModule | null> {
  if (!canLoadNotificationsModule()) return null;
  if (notificationsModule !== undefined) return notificationsModule;
  if (modulePromise) return modulePromise;

  modulePromise = (async () => {
    try {
      const Notifications = await import('expo-notifications');
      if (!handlerConfigured) {
        handlerConfigured = true;
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });
      }
      notificationsModule = Notifications;
      return Notifications;
    } catch {
      notificationsModule = null;
      return null;
    } finally {
      modulePromise = null;
    }
  })();

  return modulePromise;
}

async function ensureAndroidChannels(Notifications: NotificationsModule) {
  if (Platform.OS !== 'android' || channelsReady) return;
  if (channelsPromise) {
    await channelsPromise;
    return;
  }

  channelsPromise = (async () => {
    const channels: Array<{ id: string; name: string; importance: number }> = [
      {
        id: 'default',
        name: 'Financial Copilot',
        importance: Notifications.AndroidImportance.MAX,
      },
      {
        id: 'ledger_live',
        name: 'Live ledger',
        importance: Notifications.AndroidImportance.MAX,
      },
      {
        id: 'goals',
        name: 'Goals & milestones',
        importance: Notifications.AndroidImportance.HIGH,
      },
      {
        id: 'activity',
        name: 'Imports & streaks',
        importance: Notifications.AndroidImportance.HIGH,
      },
      {
        id: 'live',
        name: 'Lock-screen widgets',
        importance: Notifications.AndroidImportance.LOW,
      },
    ];

    await Promise.all(
      channels.map((ch) =>
        Notifications.setNotificationChannelAsync(ch.id, {
          name: ch.name,
          importance: ch.importance,
          vibrationPattern: [0, 120],
          lightColor: BRAND,
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
        }),
      ),
    );
    channelsReady = true;
  })();

  try {
    await channelsPromise;
  } finally {
    channelsPromise = null;
  }
}

function channelForCategory(category: PushCategory): string {
  if (category === 'ledger_live') return 'ledger_live';
  if (category === 'goal_alerts') return 'goals';
  if (category === 'general' || category === 'security') return 'default';
  return 'activity';
}

function allowCategory(category: PushCategory): boolean {
  return useNotificationSettingsStore.getState().allowsCategory(category);
}

export function getCachedExpoPushToken(): string | null {
  return cachedExpoPushToken;
}

/** Call once at app boot so the first alert is not paying module/channel cold-start cost. */
export async function warmPushStack(): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications) return;
  await ensureAndroidChannels(Notifications);
}

export async function registerForPushNotifications(): Promise<string | null> {
  const Notifications = await getNotifications();
  if (!Notifications) return null;

  try {
    const existing = await Notifications.getPermissionsAsync();
    let granted = existing.granted || existing.status === 'granted';
    if (!granted) {
      const asked = await Notifications.requestPermissionsAsync();
      granted = asked.granted || asked.status === 'granted';
    }
    if (!granted) return null;

    await ensureAndroidChannels(Notifications);

    const id = projectId();
    const token = await Notifications.getExpoPushTokenAsync(id ? { projectId: id } : undefined);
    cachedExpoPushToken = token.data;

    try {
      const { useLiveActivityStore } = await import('@/lib/liveActivityStore');
      useLiveActivityStore.getState().setExpoPushToken(token.data);
    } catch {
      // ignore
    }

    return token.data;
  } catch {
    return null;
  }
}

/** Optional remote mirror — never await from UI paths. Off by default (local is instant). */
function sendViaExpoPushServiceInBackground(params: {
  title: string;
  body: string;
  category: PushCategory;
  data?: Record<string, unknown>;
  channelId: string;
}): void {
  const to = cachedExpoPushToken;
  if (!to) return;

  void fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to,
      title: params.title,
      body: params.body,
      sound: 'default',
      priority: 'high',
      channelId: params.channelId,
      data: { category: params.category, ...params.data },
    }),
  }).catch(() => undefined);
}

async function fallbackToast(title: string, body: string) {
  const { notificationService } = await import('@/lib/notificationStore');
  notificationService.info(body, title);
}

/**
 * Instant local notification (branded small + large icons in a native build).
 * Set `mirrorRemote: true` only when you also need Expo Push delivery off-device.
 */
export async function sendActivityPush(params: {
  title: string;
  body: string;
  category?: PushCategory;
  data?: Record<string, unknown>;
  skipToastFallback?: boolean;
  mirrorRemote?: boolean;
}): Promise<void> {
  const category = params.category ?? 'general';
  if (!allowCategory(category)) return;

  const channelId = channelForCategory(category);
  const Notifications = await getNotifications();

  if (!Notifications) {
    if (!params.skipToastFallback) await fallbackToast(params.title, params.body);
    return;
  }

  try {
    // Only wait for channels on first use (warmed at boot)
    if (!channelsReady) {
      await ensureAndroidChannels(Notifications);
    }

    // Local schedule — no network. Icon/color come from the native build config.
    void Notifications.scheduleNotificationAsync({
      content: {
        title: params.title,
        body: params.body,
        data: { category, ...params.data },
        sound: 'default',
        ...(Platform.OS === 'android'
          ? {
              channelId,
              color: BRAND,
              sticky: false,
              autoDismiss: true,
              priority: Notifications.AndroidNotificationPriority.MAX,
            }
          : {}),
      },
      trigger: null,
    });
  } catch {
    if (!params.skipToastFallback) await fallbackToast(params.title, params.body);
    return;
  }

  if (params.mirrorRemote) {
    sendViaExpoPushServiceInBackground({
      title: params.title,
      body: params.body,
      category,
      data: params.data,
      channelId,
    });
  }
}

export async function sendGoalPush(params: {
  title: string;
  body: string;
  goalId?: string;
}) {
  await sendActivityPush({
    title: params.title,
    body: params.body,
    category: 'goal_alerts',
    data: {
      goalId: params.goalId,
      href: '/(tabs)/goals',
      screen: 'goals',
    },
  });
}

export async function sendLedgerLivePush(params: {
  title: string;
  body: string;
}) {
  await sendActivityPush({
    title: params.title,
    body: params.body,
    category: 'ledger_live',
    data: { href: '/(tabs)', screen: 'home' },
  });
}

export async function setupNotificationResponseListeners(
  onNavigate: (href: Href) => void,
): Promise<() => void> {
  const Notifications = await getNotifications();
  if (!Notifications || listenersAttached) {
    return () => undefined;
  }
  listenersAttached = true;

  const received = Notifications.addNotificationReceivedListener(() => undefined);

  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as Record<string, unknown>;
    const href = typeof data?.href === 'string' ? data.href : null;
    if (href) {
      onNavigate(href as Href);
      return;
    }
    if (typeof data?.goalId === 'string' || data?.screen === 'goals') {
      onNavigate('/(tabs)/goals' as Href);
      return;
    }
    if (data?.screen === 'assistant') {
      onNavigate('/assistant' as Href);
      return;
    }
    if (data?.screen === 'transactions' || data?.screen === 'import') {
      onNavigate((data.screen === 'import' ? '/import-sms' : '/transactions') as Href);
      return;
    }
    if (typeof data?.action === 'string' && data.action === 'ask_ai') {
      onNavigate('/assistant' as Href);
    }
  });

  return () => {
    listenersAttached = false;
    received.remove();
    sub.remove();
  };
}
