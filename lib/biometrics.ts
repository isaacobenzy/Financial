import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

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
    const value = await SecureStore.getItemAsync(BIO_ENABLED_KEY);
    return value === '1';
  } catch {
    return false;
  }
}

export async function setBiometricUnlockEnabled(enabled: boolean): Promise<void> {
  if (enabled) {
    await SecureStore.setItemAsync(BIO_ENABLED_KEY, '1');
  } else {
    await SecureStore.deleteItemAsync(BIO_ENABLED_KEY);
    await SecureStore.deleteItemAsync(UNLOCK_SESSION_KEY);
  }
}

export async function isAppUnlocked(): Promise<boolean> {
  try {
    const raw = await SecureStore.getItemAsync(UNLOCK_SESSION_KEY);
    if (!raw) return false;
    const at = Number(raw);
    if (!Number.isFinite(at)) return false;
    return Date.now() - at < UNLOCK_TTL_MS;
  } catch {
    return false;
  }
}

export async function markAppUnlocked(): Promise<void> {
  await SecureStore.setItemAsync(UNLOCK_SESSION_KEY, String(Date.now()));
}

export async function clearAppUnlock(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(UNLOCK_SESSION_KEY);
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
