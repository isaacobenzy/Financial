export const theme = {
  colors: {
    ink: '#14201B',
    cedar: '#1B4332',
    cedarDeep: '#0F2A20',
    sage: '#D8E5DD',
    paper: '#F3F7F4',
    white: '#FFFFFF',
    brass: '#B08968',
    brassSoft: '#E8D5C4',
    mint: '#52B788',
    coral: '#E76F51',
    /** Soft fills for toasts / inline alerts (keep coral accent, not full red panels). */
    coralSoft: 'rgba(231, 111, 81, 0.10)',
    mintSoft: 'rgba(82, 183, 136, 0.12)',
    brassWash: 'rgba(176, 137, 104, 0.14)',
    sageWash: 'rgba(216, 229, 221, 0.65)',
    muted: '#5C6B63',
    line: '#D5E0D9',
    tabInactive: '#8A9A91',
  },
  radius: {
    sm: 10,
    md: 16,
    lg: 22,
    pill: 999,
  },
  shadow: {
    soft: {
      shadowColor: '#0F2A20',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 4,
    },
  },
} as const;
