import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const KEY = 'notification_settings_v1';

export type PushCategory =
  | 'ledger_live'
  | 'goal_alerts'
  | 'streak_alerts'
  | 'import_alerts'
  | 'insight_alerts'
  | 'security'
  | 'general';

type NotificationSettingsState = {
  pushEnabled: boolean;
  hapticsEnabled: boolean;
  ledgerLive: boolean;
  goalAlerts: boolean;
  streakAlerts: boolean;
  importAlerts: boolean;
  insightAlerts: boolean;
  securityAlerts: boolean;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setPushEnabled: (v: boolean) => void;
  setHapticsEnabledSetting: (v: boolean) => void;
  setLedgerLive: (v: boolean) => void;
  setGoalAlerts: (v: boolean) => void;
  setStreakAlerts: (v: boolean) => void;
  setImportAlerts: (v: boolean) => void;
  setInsightAlerts: (v: boolean) => void;
  setSecurityAlerts: (v: boolean) => void;
  allowsCategory: (category: PushCategory) => boolean;
};

async function persist(partial: Partial<NotificationSettingsState>) {
  try {
    const current = useNotificationSettingsStore.getState();
    const next = {
      pushEnabled: current.pushEnabled,
      hapticsEnabled: current.hapticsEnabled,
      ledgerLive: current.ledgerLive,
      goalAlerts: current.goalAlerts,
      streakAlerts: current.streakAlerts,
      importAlerts: current.importAlerts,
      insightAlerts: current.insightAlerts,
      securityAlerts: current.securityAlerts,
      ...partial,
    };
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export const useNotificationSettingsStore = create<NotificationSettingsState>((set, get) => ({
  pushEnabled: true,
  hapticsEnabled: true,
  ledgerLive: true,
  goalAlerts: true,
  streakAlerts: true,
  importAlerts: true,
  insightAlerts: true,
  securityAlerts: true,
  hydrated: false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<NotificationSettingsState>;
        set({
          pushEnabled: parsed.pushEnabled ?? true,
          hapticsEnabled: parsed.hapticsEnabled ?? true,
          ledgerLive: parsed.ledgerLive ?? true,
          goalAlerts: parsed.goalAlerts ?? true,
          streakAlerts: parsed.streakAlerts ?? true,
          importAlerts: parsed.importAlerts ?? true,
          insightAlerts: parsed.insightAlerts ?? true,
          securityAlerts: parsed.securityAlerts ?? true,
          hydrated: true,
        });
        if (parsed.hapticsEnabled === false) {
          const { setHapticsEnabled } = await import('@/lib/haptics');
          await setHapticsEnabled(false);
        }
        return;
      }
    } catch {
      // ignore
    }
    set({ hydrated: true });
  },

  setPushEnabled: (pushEnabled) => {
    set({ pushEnabled });
    void persist({ pushEnabled });
  },
  setHapticsEnabledSetting: (hapticsEnabled) => {
    set({ hapticsEnabled });
    void persist({ hapticsEnabled });
    void import('@/lib/haptics').then((m) => m.setHapticsEnabled(hapticsEnabled));
  },
  setLedgerLive: (ledgerLive) => {
    set({ ledgerLive });
    void persist({ ledgerLive });
  },
  setGoalAlerts: (goalAlerts) => {
    set({ goalAlerts });
    void persist({ goalAlerts });
  },
  setStreakAlerts: (streakAlerts) => {
    set({ streakAlerts });
    void persist({ streakAlerts });
  },
  setImportAlerts: (importAlerts) => {
    set({ importAlerts });
    void persist({ importAlerts });
  },
  setInsightAlerts: (insightAlerts) => {
    set({ insightAlerts });
    void persist({ insightAlerts });
  },
  setSecurityAlerts: (securityAlerts) => {
    set({ securityAlerts });
    void persist({ securityAlerts });
  },

  allowsCategory: (category) => {
    const s = get();
    if (!s.pushEnabled) return false;
    switch (category) {
      case 'ledger_live':
        return s.ledgerLive;
      case 'goal_alerts':
        return s.goalAlerts;
      case 'streak_alerts':
        return s.streakAlerts;
      case 'import_alerts':
        return s.importAlerts;
      case 'insight_alerts':
        return s.insightAlerts;
      case 'security':
        return s.securityAlerts;
      default:
        return true;
    }
  },
}));
