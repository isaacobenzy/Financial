/**
 * Expo Push — register → channels → token → category-gated send
 * waterfall: remote Expo Push → local schedule → in-app toast.
 * Pattern from BetLive; adapted for Financial Copilot.
 *
 * Expo Go (Android SDK 53+): remote push unsupported — never crash.
 * Prefer a development / preview build for real Android push.
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import type { Href } from 'expo-router';
import type { PushCategory } from '@/lib/notificationSettingsStore';

type NotificationsModule = typeof import('expo-notifications');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BRAND = '#1B4332';

let handlerConfigured = false;
let cachedExpoPushToken: string | null = null;
let listenersAttached = false;

function isExpoGo(): boolean {
  return (
    Constants.appOwnership === 'expo' ||
    String(Constants.executionEnvironment ?? '') === 'storeClient'
  );
}

/** Remote push + module init can error in Expo Go on Android (SDK 53+). */
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
    return Notifications;
  } catch {
    return null;
  }
}

async function ensureAndroidChannels(Notifications: NotificationsModule) {
  if (Platform.OS !== 'android') return;

  const channels: Array<{
    id: string;
    name: string;
    importance: number;
  }> = [
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
      id: 'default',
      name: 'Financial Copilot',
      importance: Notifications.AndroidImportance.MAX,
    },
    {
      id: 'live',
      name: 'Lock-screen widgets',
      importance: Notifications.AndroidImportance.LOW,
    },
  ];

  for (const ch of channels) {
    await Notifications.setNotificationChannelAsync(ch.id, {
      name: ch.name,
      importance: ch.importance,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: BRAND,
      sound: 'default',
    });
  }
}

function channelForCategory(category: PushCategory): string {
  if (category === 'ledger_live') return 'ledger_live';
  if (category === 'goal_alerts') return 'goals';
  if (category === 'general' || category === 'security') return 'default';
  return 'activity';
}

export function getCachedExpoPushToken(): string | null {
  return cachedExpoPushToken;
}

export async function registerForPushNotifications(): Promise<string | null> {
  try {
    const Device = await import('expo-device');
    if (!Device.isDevice && Platform.OS !== 'web') {
      // Simulators can still get tokens on some platforms; physical preferred
    }
  } catch {
    // ignore
  }

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

export async function sendViaExpoPushService(params: {
  title: string;
  body: string;
  category?: PushCategory;
  data?: Record<string, unknown>;
  channelId?: string;
}): Promise<boolean> {
  // Prefer cached token — never block UI waiting on re-registration
  const to = cachedExpoPushToken;
  if (!to) return false;

  const category = params.category ?? 'general';
  try {
    const res = await fetch(EXPO_PUSH_URL, {
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
        channelId: params.channelId ?? channelForCategory(category),
        data: { category, ...params.data },
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function allowCategory(category: PushCategory): Promise<boolean> {
  const { useNotificationSettingsStore } = await import('@/lib/notificationSettingsStore');
  return useNotificationSettingsStore.getState().allowsCategory(category);
}

async function fallbackToast(title: string, body: string) {
  const { notificationService } = await import('@/lib/notificationStore');
  notificationService.info(body, title);
}

/** Prefer Expo Push Service; fall back to local schedule, then in-app toast. */
export async function sendActivityPush(params: {
  title: string;
  body: string;
  category?: PushCategory;
  data?: Record<string, unknown>;
  /** When caller already showed a toast (e.g. notificationService). */
  skipToastFallback?: boolean;
}): Promise<void> {
  const category = params.category ?? 'general';
  if (!(await allowCategory(category))) return;

  const viaExpo = await sendViaExpoPushService({
    title: params.title,
    body: params.body,
    category,
    data: params.data,
  });
  if (viaExpo) return;

  const Notifications = await getNotifications();
  if (!Notifications) {
    if (!params.skipToastFallback) await fallbackToast(params.title, params.body);
    return;
  }

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: params.title,
        body: params.body,
        data: { category, ...params.data },
        sound: true,
        ...(Platform.OS === 'android'
          ? { channelId: channelForCategory(category), color: BRAND }
          : {}),
      },
      trigger: null,
    });
  } catch {
    if (!params.skipToastFallback) await fallbackToast(params.title, params.body);
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

/**
 * Deep-link when the user taps a notification.
 * Prefers data.href, then entity ids (goalId, screen).
 */
export async function setupNotificationResponseListeners(
  onNavigate: (href: Href) => void,
): Promise<() => void> {
  const Notifications = await getNotifications();
  if (!Notifications || listenersAttached) {
    return () => undefined;
  }
  listenersAttached = true;

  const received = Notifications.addNotificationReceivedListener(() => {
    // Foreground: OS banner already shown via handler; toast optional
  });

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
      onNavigate(
        (data.screen === 'import' ? '/import-sms' : '/transactions') as Href,
      );
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
