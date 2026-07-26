import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { supportsSystemNotifications } from '@/lib/runtime';

/** Routes actionable notification buttons — skipped in Expo Go. */
export default function NotificationActions() {
  const router = useRouter();

  useEffect(() => {
    if (!supportsSystemNotifications()) return;

    let sub: { remove: () => void } | undefined;

    (async () => {
      try {
        const Notifications = await import('expo-notifications');
        sub = Notifications.addNotificationResponseReceivedListener((response) => {
          const action = response.actionIdentifier;
          const data = response.notification.request.content.data as {
            screen?: string;
          };

          if (action === 'ask_ai' || data?.screen === 'assistant') {
            router.push('/assistant');
            return;
          }
          if (action === 'view_goals' || data?.screen === 'goals') {
            router.push('/(tabs)/goals');
            return;
          }
          if (action === 'categorize' || action === 'check_in' || data?.screen === 'transactions') {
            router.push(data?.screen === 'transactions' ? '/transactions' : '/(tabs)');
          }
        });
      } catch {
        // ignore
      }
    })();

    return () => sub?.remove();
  }, [router]);

  return null;
}
