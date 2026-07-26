import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Vibration } from 'react-native';

export type HapticKind =
  | 'light'
  | 'medium'
  | 'heavy'
  | 'success'
  | 'warning'
  | 'error'
  | 'selection';

/** Only these scopes fire when haptics are enabled in Settings. */
export type HapticScope = 'login' | 'tab' | 'ai' | 'goals' | 'preview';

const HAPTICS_KEY = 'haptics_enabled_v1';

/** When each feedback fires (Settings copy). */
export const HAPTIC_GUIDE: Array<{ when: string; kind: HapticKind; scope: HapticScope }> = [
  { when: 'Login success', kind: 'success', scope: 'login' },
  { when: 'Tab bar tap', kind: 'selection', scope: 'tab' },
  { when: 'AI reply ready', kind: 'success', scope: 'ai' },
  { when: 'Goals save / progress', kind: 'success', scope: 'goals' },
];

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

function vibrateFallback(kind: HapticKind) {
  try {
    if (kind === 'success' || kind === 'heavy') {
      Vibration.vibrate([0, 35, 40, 35]);
    } else if (kind === 'error' || kind === 'warning') {
      Vibration.vibrate([0, 40, 50, 40]);
    } else if (kind === 'medium') {
      Vibration.vibrate(28);
    } else if (kind === 'selection') {
      Vibration.vibrate(12);
    } else {
      Vibration.vibrate(18);
    }
  } catch {
    // ignore
  }
}

/**
 * Device feedback for allow-listed scopes only.
 * Pass `preview` from Settings “Try feedback”. Unscoped calls are no-ops.
 */
export async function haptic(kind: HapticKind = 'light', scope?: HapticScope) {
  if (Platform.OS === 'web') return;
  if (!scope) return;

  const allowed: HapticScope[] = ['login', 'tab', 'ai', 'goals', 'preview'];
  if (!allowed.includes(scope)) return;

  if (scope !== 'preview' && !(await isHapticsEnabled())) return;

  try {
    const Haptics = await import('expo-haptics');
    switch (kind) {
      case 'success':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return;
      case 'warning':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return;
      case 'error':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      case 'selection':
        await Haptics.selectionAsync();
        return;
      case 'medium':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        return;
      case 'heavy':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        return;
      default:
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        return;
    }
  } catch {
    vibrateFallback(kind);
  }
}
