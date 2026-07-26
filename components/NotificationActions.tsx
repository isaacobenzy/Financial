import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import {
  registerForPushNotifications,
  setupNotificationResponseListeners,
  warmPushStack,
} from '@/lib/pushNotifications';
import { startLiveActivityFeed } from '@/lib/liveActivityFeed';
import { useNotificationSettingsStore } from '@/lib/notificationSettingsStore';

/**
 * Bootstrap push registration + deep-link listeners (BetLive pattern).
 */
export default function NotificationActions() {
  const router = useRouter();

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    (async () => {
      // Warm native module + channels first so the first alert is instant
      void warmPushStack();
      await useNotificationSettingsStore.getState().hydrate();
      await registerForPushNotifications();
      cleanup = await setupNotificationResponseListeners((href) => {
        router.push(href as never);
      });
      startLiveActivityFeed();
    })();

    return () => cleanup?.();
  }, [router]);

  return null;
}
