import { Platform } from 'react-native';

/** Floating tab bar metrics — keep AiFab / screen padding in sync. */
export const TAB_BAR = {
  height: 72,
  bottomOffset: Platform.OS === 'ios' ? 24 : 16,
  horizontalInset: 16,
} as const;

export function tabBarClearance(safeBottom = 0): number {
  return TAB_BAR.bottomOffset + TAB_BAR.height + 12 + Math.max(safeBottom - 8, 0);
}
