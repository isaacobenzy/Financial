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

/**
 * Bootstrap push registration + deep-link listeners (BetLive pattern).
 * Foreground hygiene clears stale non-live OS alerts so home/login do not
 * feel like notifications "came back."
 */
export default function NotificationActions() {
  const router = useRouter();

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    (async () => {
      void warmPushStack();
      await useNotificationSettingsStore.getState().hydrate();
      await registerForPushNotifications();
      cleanup = await setupNotificationResponseListeners((href) => {
        router.push(href as never);
      });
      startLiveActivityFeed();
      // Schedule evening streak once at boot (idempotent via stable id + daily gate)
      void scheduleStreakReminder();
    })();

    const onAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        void dismissNonLiveTrayAlerts();
      }
    };
    const sub = AppState.addEventListener('change', onAppState);
    // Clear stale tray alerts on first mount too
    void dismissNonLiveTrayAlerts();

    return () => {
      cleanup?.();
      sub.remove();
    };
  }, [router]);

  return null;
}
