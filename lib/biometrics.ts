import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { isWeb } from '@/lib/runtime';

const BIO_ENABLED_KEY = 'biometric_unlock_v1';
const UNLOCK_SESSION_KEY = 'biometric_unlocked_at_v1';

/** Soft unlock window after successful Face ID / fingerprint (ms). */
const UNLOCK_TTL_MS = 5 * 60 * 1000;

type LocalAuthModule = typeof import('expo-local-authentication');

async function getLocalAuth(): Promise<LocalAuthModule | null> {
  try {
    return await import('expo-local-authentication');
  } catch {
    return null;
  }
}

/** SecureStore is a no-op stub on web — fall back to AsyncStorage so login works. */
async function storageGet(key: string): Promise<string | null> {
  if (isWeb()) {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  }
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  }
}

async function storageSet(key: string, value: string): Promise<void> {
  if (isWeb()) {
    await AsyncStorage.setItem(key, value);
    return;
  }
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    await AsyncStorage.setItem(key, value);
  }
}

async function storageDelete(key: string): Promise<void> {
  if (isWeb()) {
    await AsyncStorage.removeItem(key);
    return;
  }
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    await AsyncStorage.removeItem(key).catch(() => undefined);
  }
}

export async function isBiometricHardwareAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const LocalAuth = await getLocalAuth();
  if (!LocalAuth) return false;
  try {
    const hasHardware = await LocalAuth.hasHardwareAsync();
    const enrolled = await LocalAuth.isEnrolledAsync();
    return hasHardware && enrolled;
  } catch {
    return false;
  }
}

export async function getBiometricLabel(): Promise<string> {
  const LocalAuth = await getLocalAuth();
  if (!LocalAuth) return 'Biometrics';
  try {
    const types = await LocalAuth.supportedAuthenticationTypesAsync();
    const face = types.includes(LocalAuth.AuthenticationType.FACIAL_RECOGNITION);
    const finger = types.includes(LocalAuth.AuthenticationType.FINGERPRINT);
    if (face && Platform.OS === 'ios') return 'Face ID';
    if (finger) return 'Fingerprint';
    if (face) return 'Face unlock';
  } catch {
    // fall through
  }
  return Platform.OS === 'ios' ? 'Face ID' : 'Fingerprint';
}

export async function isBiometricUnlockEnabled(): Promise<boolean> {
  try {
    const value = await storageGet(BIO_ENABLED_KEY);
    return value === '1';
  } catch {
    return false;
  }
}

export async function setBiometricUnlockEnabled(enabled: boolean): Promise<void> {
  if (enabled) {
    await storageSet(BIO_ENABLED_KEY, '1');
  } else {
    await storageDelete(BIO_ENABLED_KEY);
    await storageDelete(UNLOCK_SESSION_KEY);
  }
}

export async function isAppUnlocked(): Promise<boolean> {
  try {
    const raw = await storageGet(UNLOCK_SESSION_KEY);
    if (!raw) return false;
    const at = Number(raw);
    if (!Number.isFinite(at)) return false;
    return Date.now() - at < UNLOCK_TTL_MS;
  } catch {
    return false;
  }
}

export async function markAppUnlocked(): Promise<void> {
  await storageSet(UNLOCK_SESSION_KEY, String(Date.now()));
}

export async function clearAppUnlock(): Promise<void> {
  try {
    await storageDelete(UNLOCK_SESSION_KEY);
  } catch {
    // ignore
  }
}

export async function authenticateBiometric(reason?: string): Promise<boolean> {
  const LocalAuth = await getLocalAuth();
  if (!LocalAuth) return false;

  const available = await isBiometricHardwareAvailable();
  if (!available) return false;

  try {
    const label = await getBiometricLabel();
    const result = await LocalAuth.authenticateAsync({
      promptMessage: reason || `Unlock with ${label}`,
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
      fallbackLabel: 'Use passcode',
    });
    if (result.success) {
      await markAppUnlocked();
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** Enable biometrics only after a successful prompt. */
export async function enableBiometricUnlock(): Promise<boolean> {
  const ok = await authenticateBiometric('Confirm to enable biometric unlock');
  if (!ok) return false;
  await setBiometricUnlockEnabled(true);
  return true;
}
