import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supportsSystemNotifications } from '@/lib/runtime';
import type { WidgetSnapshot } from '@/lib/widgetBridge';

export type LiveSection = 'overview' | 'balance' | 'goals' | 'streak';

const LIVE_PREF_KEY = 'live_sections_v1';
const BRAND = '#1B4332';

const SECTION_IDS: Record<LiveSection, string> = {
  overview: 'fc-live-overview',
  balance: 'fc-live-balance',
  goals: 'fc-live-goals',
  streak: 'fc-live-streak',
};

export type LiveSectionPrefs = Record<LiveSection, boolean>;

const DEFAULT_PREFS: LiveSectionPrefs = {
  overview: true,
  balance: true,
  goals: true,
  streak: true,
};

export async function getLiveSectionPrefs(): Promise<LiveSectionPrefs> {
  try {
    const raw = await AsyncStorage.getItem(LIVE_PREF_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as LiveSectionPrefs) };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export async function setLiveSectionPref(
  section: LiveSection,
  enabled: boolean,
): Promise<LiveSectionPrefs> {
  const prefs = await getLiveSectionPrefs();
  prefs[section] = enabled;
  await AsyncStorage.setItem(LIVE_PREF_KEY, JSON.stringify(prefs));
  if (!enabled) {
    await dismissSection(section);
  } else {
    await publishLiveSections();
  }
  return prefs;
}

async function dismissSection(section: LiveSection): Promise<void> {
  if (!supportsSystemNotifications()) return;
  try {
    const Notifications = await import('expo-notifications');
    await Notifications.dismissNotificationAsync(SECTION_IDS[section]);
  } catch {
    // ignore
  }
}

async function ensureLiveChannel(
  Notifications: typeof import('expo-notifications'),
): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('live', {
    name: 'Live lock-screen widgets',
    importance: Notifications.AndroidImportance.LOW,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    lightColor: BRAND,
    bypassDnd: false,
  });
}

async function postSticky(
  Notifications: typeof import('expo-notifications'),
  id: string,
  title: string,
  body: string,
  screen: string,
): Promise<void> {
  await Notifications.dismissNotificationAsync(id).catch(() => undefined);
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: {
      title,
      body,
      data: { kind: 'live', screen, section: id },
      sticky: Platform.OS === 'android',
      autoDismiss: Platform.OS !== 'android',
      ...(Platform.OS === 'android'
        ? {
            channelId: 'live',
            color: BRAND,
            priority: Notifications.AndroidNotificationPriority.LOW,
          }
        : {}),
    },
    trigger: null,
  });
}

/**
 * Publishes branded sticky notifications that act as lock-screen / shade
 * “live widgets” for each enabled section (Android). Uses the app notification
 * icon from the expo-notifications config plugin.
 */
export async function publishLiveSections(snap?: WidgetSnapshot): Promise<void> {
  if (!supportsSystemNotifications()) return;

  try {
    const Notifications = await import('expo-notifications');
    const data =
      snap || (await (await import('@/lib/widgetBridge')).buildWidgetSnapshot());
    const prefs = await getLiveSectionPrefs();
    await ensureLiveChannel(Notifications);

    if (prefs.overview) {
      await postSticky(
        Notifications,
        SECTION_IDS.overview,
        'Financial Copilot · Live',
        [
          data.balanceHidden ? 'Balance hidden' : data.balanceDisplay,
          data.topGoalName ? `${data.topGoalName} ${data.topGoalPct}%` : null,
          `Streak ${data.streakCurrent}d`,
        ]
          .filter(Boolean)
          .join(' · '),
        'home',
      );
    }

    if (prefs.balance) {
      await postSticky(
        Notifications,
        SECTION_IDS.balance,
        'Balance',
        data.balanceHidden
          ? 'Hidden for privacy — open app to reveal'
          : `${data.balanceDisplay} · tap to open ledger`,
        'home',
      );
    }

    if (prefs.goals) {
      await postSticky(
        Notifications,
        SECTION_IDS.goals,
        'Goals',
        data.topGoalName
          ? `${data.topGoalName} · ${data.topGoalPct}% of target`
          : 'Add a goal to track progress here',
        'goals',
      );
    }

    if (prefs.streak) {
      await postSticky(
        Notifications,
        SECTION_IDS.streak,
        'Money streak',
        data.checkedInToday
          ? `Day ${data.streakCurrent} · checked in today · best ${data.streakBest}d`
          : `Day ${data.streakCurrent} · open app to check in · best ${data.streakBest}d`,
        'home',
      );
    }
  } catch {
    // ignore
  }
}

/** @deprecated use publishLiveSections */
export async function publishLiveActivity(
  snap?: WidgetSnapshot,
  options?: { title?: string; body?: string },
): Promise<void> {
  if (options?.title || options?.body) {
    if (!supportsSystemNotifications()) return;
    try {
      const Notifications = await import('expo-notifications');
      await ensureLiveChannel(Notifications);
      await postSticky(
        Notifications,
        SECTION_IDS.overview,
        options.title || 'Financial Copilot · Live',
        options.body || 'Open Financial Copilot',
        'home',
      );
    } catch {
      // ignore
    }
    return;
  }
  await publishLiveSections(snap);
}

export async function clearLiveActivity(): Promise<void> {
  if (!supportsSystemNotifications()) return;
  try {
    const Notifications = await import('expo-notifications');
    await Promise.all(
      (Object.keys(SECTION_IDS) as LiveSection[]).map((key) =>
        Notifications.dismissNotificationAsync(SECTION_IDS[key]).catch(() => undefined),
      ),
    );
  } catch {
    // ignore
  }
}

export async function notifyAuthEvent(
  kind: 'login' | 'logout',
  name?: string,
): Promise<void> {
  const { notifyUser } = await import('@/lib/notify');
  if (kind === 'login') {
    // Toast + shade first; sticky widgets refresh in the background
    void notifyUser(
      'Signed in',
      name ? `Welcome back, ${name}.` : 'Welcome back to Financial Copilot.',
      'login',
      { data: { screen: 'home' } },
    );
    if (supportsSystemNotifications()) {
      void publishLiveSections();
    }
  } else {
    void clearLiveActivity();
    void notifyUser('Signed out', 'Session ended. Live widgets cleared.', 'logout');
  }
}
