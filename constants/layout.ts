import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

/** Floating tab bar metrics — keep AiFab / screen padding / toasts in sync. */
export const TAB_BAR = {
  height: isWeb ? 64 : Platform.OS === 'ios' ? 72 : 68,
  bottomOffset: isWeb ? 12 : Platform.OS === 'ios' ? 24 : 14,
  horizontalInset: isWeb ? 14 : 16,
} as const;

export function tabBarClearance(safeBottom = 0): number {
  return TAB_BAR.bottomOffset + TAB_BAR.height + 12 + Math.max(safeBottom - 8, 0);
}

/** Scroll content padding so lists clear the floating dock. */
export function tabContentPaddingBottom(safeBottom = 0): number {
  return tabBarClearance(safeBottom) + 8;
}
