import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { supportsSystemNotifications } from '@/lib/runtime';
import { registerForPushNotificationsAsync } from '@/lib/pushRegister';
import { toast } from '@/lib/toast';

type NotifData = {
  screen?: string;
  kind?: string;
  section?: string;
};

function routeFromData(data: NotifData | undefined): string | null {
  if (!data) return null;
  if (data.screen === 'assistant') return '/assistant';
  if (data.screen === 'goals') return '/(tabs)/goals';
  if (data.screen === 'transactions') return '/transactions';
  if (data.screen === 'import' || data.screen === 'import-sms') return '/import-sms';
  if (data.screen === 'settings') return '/(tabs)/settings';
  if (data.screen === 'home') return '/(tabs)';
  return null;
}

/**
 * Registers push token, listens for incoming messages, and routes taps.
 * Skipped in Expo Go (SDK 53+). See:
 * https://docs.expo.dev/push-notifications/push-notifications-setup/
 * https://docs.expo.dev/push-notifications/receiving-notifications/
 */
export default function NotificationActions() {
  const router = useRouter();
  const lastToastId = useRef<string | null>(null);

  useEffect(() => {
    if (!supportsSystemNotifications()) return;

    let receivedSub: { remove: () => void } | undefined;
    let responseSub: { remove: () => void } | undefined;

    (async () => {
      try {
        await registerForPushNotificationsAsync();
        const Notifications = await import('expo-notifications');

        // Foreground: fetch / surface message content
        receivedSub = Notifications.addNotificationReceivedListener((notification) => {
          const id = notification.request.identifier;
          if (lastToastId.current === id) return;
          lastToastId.current = id;

          const { title, body, data } = notification.request.content;
          const payload = data as NotifData | undefined;
          // Local sticky live widgets should not spam toasts
          if (payload?.kind === 'live') return;

          if (title || body) {
            toast.info(body || '', title || 'Financial Copilot');
          }
        });

        // User tapped notification (background / closed / foreground)
        responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
          const action = response.actionIdentifier;
          const data = response.notification.request.content.data as NotifData;

          if (action === 'ask_ai' || data?.screen === 'assistant') {
            router.push('/assistant');
            return;
          }
          if (action === 'view_goals' || data?.screen === 'goals') {
            router.push('/(tabs)/goals');
            return;
          }
          if (action === 'categorize' || data?.screen === 'transactions') {
            router.push('/transactions');
            return;
          }
          if (action === 'check_in') {
            router.push('/(tabs)');
            return;
          }

          const href = routeFromData(data);
          if (href) router.push(href as never);
        });
      } catch {
        // ignore
      }
    })();

    return () => {
      receivedSub?.remove();
      responseSub?.remove();
    };
  }, [router]);

  return null;
}
