import Constants from 'expo-constants';
import { Platform } from 'react-native';

/** Expo Go cannot use remote push / full notification APIs (SDK 53+). */
export function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

export function supportsSystemNotifications(): boolean {
  if (Platform.OS === 'web') return false;
  return !isExpoGo();
}
