import Constants from 'expo-constants';
import { Platform } from 'react-native';

/** Expo Go cannot use remote push / full notification APIs (SDK 53+). */
export function isExpoGo(): boolean {
  const ownership = Constants.appOwnership;
  const env = String(Constants.executionEnvironment ?? '');
  return ownership === 'expo' || env === 'storeClient';
}

export function isWeb(): boolean {
  return Platform.OS === 'web';
}

/**
 * Local/system notifications only work in a development or production build.
 * Never import expo-notifications inside Expo Go on Android (SDK 53+ throws).
 */
export function supportsSystemNotifications(): boolean {
  if (isWeb()) return false;
  if (isExpoGo()) return false;
  return true;
}

/** Android inbox SMS — not available on web, iOS, or Expo Go. */
export function supportsNativeSmsInbox(): boolean {
  return Platform.OS === 'android' && !isExpoGo();
}

/** Prefer Paste SMS on web/iOS; Import SMS only on real Android builds. */
export function primarySmsImportHref(): '/paste-sms' | '/import-sms' {
  return supportsNativeSmsInbox() ? '/import-sms' : '/paste-sms';
}

export function primarySmsImportLabel(): string {
  return supportsNativeSmsInbox() ? 'Import SMS' : 'Paste SMS';
}
