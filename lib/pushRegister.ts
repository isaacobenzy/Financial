import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { supportsSystemNotifications } from '@/lib/runtime';

const TOKEN_KEY = 'expo_push_token_v1';
const BRAND_COLOR = '#1B4332';

/**
 * Registers for Expo push notifications (dev / production builds only).
 * Pattern from: https://docs.expo.dev/push-notifications/push-notifications-setup/
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!supportsSystemNotifications()) return null;

  try {
    const Notifications = await import('expo-notifications');

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Financial Copilot',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: BRAND_COLOR,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
      await Notifications.setNotificationChannelAsync('ledger', {
        name: 'Ledger updates',
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: BRAND_COLOR,
      });
      await Notifications.setNotificationChannelAsync('insights', {
        name: 'Insights & goals',
        importance: Notifications.AndroidImportance.HIGH,
        lightColor: '#B08968',
      });
      await Notifications.setNotificationChannelAsync('live', {
        name: 'Live lock-screen widgets',
        importance: Notifications.AndroidImportance.LOW,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        lightColor: BRAND_COLOR,
      });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== 'granted') {
      const asked = await Notifications.requestPermissionsAsync();
      status = asked.status;
    }
    if (status !== 'granted') return null;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId || typeof projectId !== 'string') {
      console.warn('[push] Missing eas.projectId in app.json');
      return null;
    }

    const token = (
      await Notifications.getExpoPushTokenAsync({
        projectId,
      })
    ).data;

    await AsyncStorage.setItem(TOKEN_KEY, token);
    return token;
  } catch (error) {
    console.warn('[push] registration failed', error);
    return null;
  }
}

export async function getStoredPushToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/** Send a test notification via Expo Push API (device must have a token). */
export async function sendTestPushNotification(expoPushToken: string): Promise<boolean> {
  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: expoPushToken,
        sound: 'default',
        title: 'Financial Copilot',
        body: 'Test push — your branded logo should appear on Android.',
        data: { screen: 'home', kind: 'info' },
        channelId: 'default',
        priority: 'high',
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
