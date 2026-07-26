import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useRouter } from 'expo-router';
import {
  dismissNonLiveTrayAlerts,
  registerForPushNotifications,
  setupNotificationResponseListeners,
  warmPushStack,
} from '@/lib/pushNotifications';
import { startLiveActivityFeed } from '@/lib/liveActivityFeed';
import { useNotificationSettingsStore } from '@/lib/notificationSettingsStore';
import { scheduleStreakReminder } from '@/lib/notify';
import { checkAndApplyUpdates } from '@/lib/otaUpdates';

/**
 * Bootstrap push registration + deep-link listeners (BetLive pattern).
 * Foreground hygiene clears stale non-live OS alerts so home/login do not
 * feel like notifications "came back." Also checks EAS Update on boot/resume.
 */
export default function NotificationActions() {
  const router = useRouter();

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    (async () => {
      // OTA first so testers land on the latest JS after install
      void checkAndApplyUpdates();
      void warmPushStack();
      await useNotificationSettingsStore.getState().hydrate();
      await registerForPushNotifications();
      cleanup = await setupNotificationResponseListeners((href) => {
        router.push(href as never);
      });
      startLiveActivityFeed();
      void scheduleStreakReminder();
    })();

    const onAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        void dismissNonLiveTrayAlerts();
        void checkAndApplyUpdates();
      }
    };
    const sub = AppState.addEventListener('change', onAppState);
    void dismissNonLiveTrayAlerts();

    return () => {
      cleanup?.();
      sub.remove();
    };
  }, [router]);

  return null;
}
