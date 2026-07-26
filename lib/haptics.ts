/**
 * Semantic haptic feedback (BetLive pattern).
 * Never throws — silently no-ops when unsupported or disabled in Settings.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Vibration } from 'react-native';

export type HapticImpact = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';
export type HapticNotification = 'success' | 'error' | 'warning';

const HAPTICS_KEY = 'haptics_enabled_v1';
let cachedEnabled: boolean | null = null;

export async function isHapticsEnabled(): Promise<boolean> {
  if (cachedEnabled !== null) return cachedEnabled;
  try {
    const raw = await AsyncStorage.getItem(HAPTICS_KEY);
    cachedEnabled = raw !== '0';
  } catch {
    cachedEnabled = true;
  }
  return cachedEnabled;
}

export async function setHapticsEnabled(enabled: boolean): Promise<void> {
  cachedEnabled = enabled;
  await AsyncStorage.setItem(HAPTICS_KEY, enabled ? '1' : '0');
}

function vibrateFallback(kind: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning' | 'selection') {
  try {
    if (kind === 'success' || kind === 'heavy') Vibration.vibrate([0, 35, 40, 35]);
    else if (kind === 'error' || kind === 'warning') Vibration.vibrate([0, 40, 50, 40]);
    else if (kind === 'medium') Vibration.vibrate(28);
    else if (kind === 'selection') Vibration.vibrate(12);
    else Vibration.vibrate(18);
  } catch {
    // ignore
  }
}

async function allowed(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  return isHapticsEnabled();
}

export const hapticImpact = async (style: HapticImpact = 'medium') => {
  if (!(await allowed())) return;
  try {
    const Haptics = await import('expo-haptics');
    const styles = Haptics.ImpactFeedbackStyle;
    const map: Record<HapticImpact, (typeof styles)[keyof typeof styles]> = {
      light: styles.Light,
      medium: styles.Medium,
      heavy: styles.Heavy,
      rigid: styles.Heavy,
      soft: styles.Light,
    };
    await Haptics.impactAsync(map[style]);
  } catch {
    vibrateFallback(style === 'heavy' || style === 'rigid' ? 'heavy' : style === 'medium' ? 'medium' : 'light');
  }
};

export const hapticNotify = async (type: HapticNotification) => {
  if (!(await allowed())) return;
  try {
    const Haptics = await import('expo-haptics');
    const map = {
      success: Haptics.NotificationFeedbackType.Success,
      error: Haptics.NotificationFeedbackType.Error,
      warning: Haptics.NotificationFeedbackType.Warning,
    } as const;
    await Haptics.notificationAsync(map[type]);
  } catch {
    vibrateFallback(type);
  }
};

export const hapticSelect = async () => {
  if (!(await allowed())) return;
  try {
    const Haptics = await import('expo-haptics');
    await Haptics.selectionAsync();
  } catch {
    vibrateFallback('selection');
  }
};

export const haptics = {
  buttonPress: () => hapticImpact('light'),
  primaryAction: () => hapticImpact('medium'),
  destructiveAction: () => hapticImpact('heavy'),
  success: () => hapticNotify('success'),
  error: () => hapticNotify('error'),
  warning: () => hapticNotify('warning'),
  select: () => hapticSelect(),
  scrollTick: () => hapticImpact('light'),
  longPress: () => hapticImpact('medium'),
  premium: () => hapticImpact('rigid'),
};

export const withHapticFeedback = async <T,>(
  fn: () => Promise<T>,
  options: {
    onSuccess?: HapticNotification | false;
    onError?: HapticNotification | false;
  } = { onSuccess: 'success', onError: 'error' },
): Promise<T> => {
  try {
    const result = await fn();
    if (options.onSuccess) await hapticNotify(options.onSuccess);
    return result;
  } catch (error) {
    if (options.onError) await hapticNotify(options.onError);
    throw error;
  }
};

/** Settings copy — when feedback fires. */
export const HAPTIC_GUIDE = [
  { when: 'Button / CTA press', kind: 'buttonPress' },
  { when: 'Tab / filter select', kind: 'select' },
  { when: 'Login / goal success', kind: 'success' },
  { when: 'Errors', kind: 'error' },
] as const;

/**
 * Legacy shim — prefer `haptics.buttonPress()` / `notificationService`.
 * Scopes are ignored; master Settings toggle still applies.
 */
export type HapticKind =
  | 'light'
  | 'medium'
  | 'heavy'
  | 'success'
  | 'warning'
  | 'error'
  | 'selection';

export type HapticScope = 'login' | 'tab' | 'ai' | 'goals' | 'preview';

export async function haptic(kind: HapticKind = 'light', _scope?: HapticScope) {
  switch (kind) {
    case 'success':
      return haptics.success();
    case 'error':
      return haptics.error();
    case 'warning':
      return haptics.warning();
    case 'selection':
      return haptics.select();
    case 'medium':
    case 'heavy':
      return hapticImpact(kind);
    default:
      return haptics.buttonPress();
  }
}
