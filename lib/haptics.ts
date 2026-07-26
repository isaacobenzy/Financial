import { Platform, Vibration } from 'react-native';

export type HapticKind =
  | 'light'
  | 'medium'
  | 'heavy'
  | 'success'
  | 'warning'
  | 'error'
  | 'selection';

/** When each feedback fires in the app (for Settings / docs). */
export const HAPTIC_GUIDE: Array<{ when: string; kind: HapticKind }> = [
  { when: 'Tab bar tap', kind: 'selection' },
  { when: 'Open AI / navigate', kind: 'selection' },
  { when: 'Send AI message', kind: 'light' },
  { when: 'AI reply ready', kind: 'success' },
  { when: 'Hide / show balance', kind: 'selection' },
  { when: 'Login success', kind: 'success' },
  { when: 'Login error', kind: 'error' },
  { when: 'Import / grant SMS', kind: 'medium' },
  { when: 'Import saved', kind: 'success' },
  { when: 'Goal saved', kind: 'success' },
];

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

/** Device feedback — expo-haptics when available, otherwise Vibration. */
export async function haptic(kind: HapticKind = 'light') {
  if (Platform.OS === 'web') return;

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
