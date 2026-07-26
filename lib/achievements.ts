import AsyncStorage from '@react-native-async-storage/async-storage';
import { getImportedTransactions, getLedgerBalance } from '@/lib/ledgerStore';
import { getGoals } from '@/lib/goalsStore';

const STREAK_KEY = 'finance_streak_v1';

export type StreakState = {
  current: number;
  best: number;
  lastActiveDate: string | null;
};

export type Achievement = {
  id: string;
  title: string;
  detail: string;
  icon: 'fire' | 'trophy' | 'target' | 'message-check' | 'piggy-bank' | 'shield-check';
  unlocked: boolean;
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string) {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

export async function getStreak(): Promise<StreakState> {
  try {
    const raw = await AsyncStorage.getItem(STREAK_KEY);
    if (!raw) return { current: 0, best: 0, lastActiveDate: null };
    return JSON.parse(raw) as StreakState;
  } catch {
    return { current: 0, best: 0, lastActiveDate: null };
  }
}

/** Call when user imports SMS, chats AI, or checks budgets. */
export async function recordActivity(): Promise<StreakState> {
  const today = todayKey();
  const prev = await getStreak();

  if (prev.lastActiveDate === today) return prev;

  let current = 1;
  if (prev.lastActiveDate) {
    const gap = daysBetween(prev.lastActiveDate, today);
    current = gap === 1 ? prev.current + 1 : 1;
  }

  const next: StreakState = {
    current,
    best: Math.max(prev.best, current),
    lastActiveDate: today,
  };
  await AsyncStorage.setItem(STREAK_KEY, JSON.stringify(next));
  return next;
}

export async function getAchievements(): Promise<Achievement[]> {
  const [imported, balance, streak, goals] = await Promise.all([
    getImportedTransactions(),
    getLedgerBalance(),
    getStreak(),
    getGoals(),
  ]);

  const underBudgetCount = goals.filter(
    (g) => g.kind === 'budget' && g.current <= g.target,
  ).length;

  return [
    {
      id: 'first-import',
      title: 'First import',
      detail: 'Imported SMS into your ledger',
      icon: 'message-check',
      unlocked: imported.length > 0 || balance.smsImports > 0,
    },
    {
      id: 'streak-3',
      title: '3-day streak',
      detail: 'Opened or improved your ledger 3 days in a row',
      icon: 'fire',
      unlocked: streak.current >= 3 || streak.best >= 3,
    },
    {
      id: 'streak-7',
      title: 'Week warrior',
      detail: '7-day money mindfulness streak',
      icon: 'trophy',
      unlocked: streak.current >= 7 || streak.best >= 7,
    },
    {
      id: 'budget-guard',
      title: 'Budget guard',
      detail: 'Most categories within budget',
      icon: 'target',
      unlocked: underBudgetCount >= 3,
    },
    {
      id: 'savings-buffer',
      title: 'Healthy buffer',
      detail: 'Balance above GH₵ 1,000',
      icon: 'piggy-bank',
      unlocked: balance.total >= 1000,
    },
    {
      id: 'privacy-first',
      title: 'On-device ledger',
      detail: 'SMS parsing stays on your phone',
      icon: 'shield-check',
      unlocked: true,
    },
  ];
}
