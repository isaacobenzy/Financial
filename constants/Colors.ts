import { theme } from '@/constants/theme';

export default {
  light: {
    text: theme.colors.ink,
    background: theme.colors.paper,
    tint: theme.colors.cedar,
    tabIconDefault: theme.colors.tabInactive,
    tabIconSelected: theme.colors.cedar,
  },
  dark: {
    text: theme.colors.white,
    background: theme.colors.cedarDeep,
    tint: theme.colors.mint,
    tabIconDefault: theme.colors.tabInactive,
    tabIconSelected: theme.colors.mint,
  },
};
