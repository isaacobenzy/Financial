import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLedgerBalance } from '@/lib/ledgerStore';
import { getGoals } from '@/lib/goalsStore';
import { getStreak } from '@/lib/achievements';
import { isBalanceHidden } from '@/lib/privacy';

const WIDGET_KEY = 'widget_snapshot_v1';

export type WidgetSnapshot = {
  updatedAt: string;
  balanceHidden: boolean;
  balanceDisplay: string;
  balanceRaw: number;
  streakCurrent: number;
  streakBest: number;
  checkedInToday: boolean;
  topGoalName: string | null;
  topGoalPct: number;
  currency: 'GHS';
};

function formatMoney(value: number) {
  return `GH₵ ${value.toLocaleString('en-GH', { minimumFractionDigits: 2 })}`;
}

export async function buildWidgetSnapshot(): Promise<WidgetSnapshot> {
  const [balance, goals, streak, hidden] = await Promise.all([
    getLedgerBalance(),
    getGoals(),
    getStreak(),
    isBalanceHidden(),
  ]);

  const active = goals.filter((g) => g.period === 'monthly' && g.status !== 'completed');
  const top = active[0] || goals.find((g) => g.period === 'monthly') || null;
  const topGoalPct =
    top && top.target > 0 ? Math.min(100, Math.round((top.current / top.target) * 100)) : 0;

  const today = new Date().toISOString().slice(0, 10);

  return {
    updatedAt: new Date().toISOString(),
    balanceHidden: hidden,
    balanceDisplay: hidden ? '••••••' : formatMoney(balance.total),
    balanceRaw: balance.total,
    streakCurrent: streak.current,
    streakBest: streak.best,
    checkedInToday: streak.lastActiveDate === today,
    topGoalName: top?.name ?? null,
    topGoalPct,
    currency: balance.currency,
  };
}

export async function refreshWidgetSnapshot(): Promise<WidgetSnapshot> {
  const snap = await buildWidgetSnapshot();
  await AsyncStorage.setItem(WIDGET_KEY, JSON.stringify(snap));
  return snap;
}

export async function getWidgetSnapshot(): Promise<WidgetSnapshot> {
  return refreshWidgetSnapshot();
}
