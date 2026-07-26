import { create } from 'zustand';

export type LedgerLiveActivity = {
  id: string;
  balanceDisplay: string;
  streakCurrent: number;
  topGoalName: string | null;
  topGoalPct: number;
  statusLine: string;
  updatedAt: number;
  active: boolean;
};

export type ActivityPulse = {
  id: string;
  kind: 'ledger' | 'goal' | 'streak' | 'import' | 'insight';
  title: string;
  body: string;
  at: number;
};

type LiveActivityState = {
  expoPushToken: string | null;
  liveLedger: LedgerLiveActivity | null;
  recentPulses: ActivityPulse[];
  setExpoPushToken: (token: string | null) => void;
  upsertLiveLedger: (activity: LedgerLiveActivity) => void;
  endLiveLedger: () => void;
  pushPulse: (pulse: Omit<ActivityPulse, 'id' | 'at'> & { id?: string }) => void;
};

export const useLiveActivityStore = create<LiveActivityState>((set) => ({
  expoPushToken: null,
  liveLedger: null,
  recentPulses: [],
  setExpoPushToken: (expoPushToken) => set({ expoPushToken }),
  upsertLiveLedger: (liveLedger) =>
    set((state) => ({
      liveLedger,
      recentPulses: [
        {
          id: `pulse-${Date.now()}`,
          kind: 'ledger' as const,
          title: 'Ledger live',
          body: liveLedger.statusLine,
          at: Date.now(),
        },
        ...state.recentPulses,
      ].slice(0, 12),
    })),
  endLiveLedger: () =>
    set((state) =>
      state.liveLedger
        ? { liveLedger: { ...state.liveLedger, active: false } }
        : state,
    ),
  pushPulse: (pulse) =>
    set((state) => ({
      recentPulses: [
        {
          id: pulse.id ?? `pulse-${Date.now()}`,
          kind: pulse.kind,
          title: pulse.title,
          body: pulse.body,
          at: Date.now(),
        },
        ...state.recentPulses,
      ].slice(0, 12),
    })),
}));
