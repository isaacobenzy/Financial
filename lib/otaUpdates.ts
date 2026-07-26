/**
 * EAS Update (OTA) — installed preview/production APKs fetch JS updates
 * without reinstalling, as long as runtimeVersion + channel match.
 *
 * Skips Expo Go, web, and __DEV__ (Metro).
 * Docs: https://docs.expo.dev/eas-update/getting-started/
 */

import { Platform } from 'react-native';
import { isExpoGo, isWeb } from '@/lib/runtime';

export async function checkAndApplyUpdates(): Promise<{
  applied: boolean;
  reason?: string;
}> {
  if (__DEV__) return { applied: false, reason: 'dev' };
  if (isWeb() || Platform.OS === 'web') return { applied: false, reason: 'web' };
  if (isExpoGo()) return { applied: false, reason: 'expo_go' };

  try {
    const Updates = await import('expo-updates');
    if (!Updates.isEnabled) {
      return { applied: false, reason: 'disabled' };
    }

    const check = await Updates.checkForUpdateAsync();
    if (!check.isAvailable) {
      return { applied: false, reason: 'up_to_date' };
    }

    await Updates.fetchUpdateAsync();
    await Updates.reloadAsync();
    return { applied: true };
  } catch {
    return { applied: false, reason: 'error' };
  }
}
