import { useCallback } from 'react';
import {
  haptics,
  hapticImpact,
  hapticNotify,
  withHapticFeedback,
  type HapticImpact,
  type HapticNotification,
} from '@/lib/haptics';

export function useHaptics() {
  const buttonPress = useCallback(() => void haptics.buttonPress(), []);
  const primaryAction = useCallback(() => void haptics.primaryAction(), []);
  const destructiveAction = useCallback(() => void haptics.destructiveAction(), []);
  const success = useCallback(() => void haptics.success(), []);
  const error = useCallback(() => void haptics.error(), []);
  const warning = useCallback(() => void haptics.warning(), []);
  const select = useCallback(() => void haptics.select(), []);
  const scrollTick = useCallback(() => void haptics.scrollTick(), []);
  const longPress = useCallback(() => void haptics.longPress(), []);
  const premium = useCallback(() => void haptics.premium(), []);
  const impact = useCallback((style: HapticImpact) => void hapticImpact(style), []);
  const notify = useCallback((type: HapticNotification) => void hapticNotify(type), []);
  const withFeedback = useCallback(
    <T,>(
      fn: () => Promise<T>,
      options?: { onSuccess?: HapticNotification | false; onError?: HapticNotification | false },
    ) => withHapticFeedback(fn, options),
    [],
  );

  return {
    buttonPress,
    primaryAction,
    destructiveAction,
    success,
    error,
    warning,
    select,
    scrollTick,
    longPress,
    premium,
    impact,
    notify,
    withFeedback,
  };
}
