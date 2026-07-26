import Constants from 'expo-constants';
import { Platform } from 'react-native';

/** Expo Go cannot use remote push / full notification APIs (SDK 53+). */
export function isExpoGo(): boolean {
  const ownership = Constants.appOwnership;
  const env = String(Constants.executionEnvironment ?? '');
  return ownership === 'expo' || env === 'storeClient';
}

/**
 * Local/system notifications only work in a development or production build.
 * Never import expo-notifications inside Expo Go on Android (SDK 53+ throws).
 */
export function supportsSystemNotifications(): boolean {
  if (Platform.OS === 'web') return false;
  if (isExpoGo()) return false;
  return true;
}
