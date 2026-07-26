import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const APP_MODE: 'enterprise' | 'standard' = 'enterprise';

export function isEnterpriseMode(): boolean {
  return APP_MODE === 'enterprise';
}

export function isExpoGo(): boolean {
  const ownership = Constants.appOwnership;
  const env = String(Constants.executionEnvironment ?? '');
  return ownership === 'expo' || env === 'storeClient';
}

export function isWeb(): boolean {
  return Platform.OS === 'web';
}

export function supportsSystemNotifications(): boolean {
  if (isWeb()) return false;
  if (isEnterpriseMode()) return true;
  if (isExpoGo()) return false;
  return true;
}

export function supportsNativeSmsInbox(): boolean {
  return Platform.OS === 'android' && !isExpoGo();
}

export function primarySmsImportHref(): '/paste-sms' | '/import-sms' {
  return supportsNativeSmsInbox() ? '/import-sms' : '/paste-sms';
}

export function primarySmsImportLabel(): string {
  return supportsNativeSmsInbox() ? 'Import SMS' : 'Paste SMS';
}

export function showExpoBanners(): boolean {
  if (isEnterpriseMode()) return false;
  return isExpoGo();
}

export function showTestNotifications(): boolean {
  if (isEnterpriseMode()) return false;
  return !isWeb();
}

export function allowDemoCredentials(): boolean {
  if (isEnterpriseMode()) return false;
  return !isWeb() || true;
}

export function allowDemoDataFallbacks(): boolean {
  if (isEnterpriseMode()) return false;
  return true;
}
