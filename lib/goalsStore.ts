import AsyncStorage from '@react-native-async-storage/async-storage';
import { SEED_GOALS } from '@/lib/goalsSeed';

const GOALS_KEY = 'financial_goals_v1';

export type FinancialGoal = {
  id: string;
  name: string;
  target: number;
  current: number;
  period: 'monthly' | 'yearly';
  kind: 'budget' | 'savings';
  icon: string;
  status: 'active' | 'completed';
};

function seedGoals(): FinancialGoal[] {
  return SEED_GOALS.map((b, i) => ({
    id: `goal-${i + 1}`,
    name: b.name,
    target: b.budget,
    current: b.spent,
    period: 'monthly' as const,
    kind: 'budget' as const,
    icon: b.icon,
    status: 'active' as const,
  }));
}

function withStatus(goal: Omit<FinancialGoal, 'status'> & { status?: 'active' | 'completed' }): FinancialGoal {
  if (goal.status === 'completed') {
    return { ...goal, status: 'completed' };
  }
  if (goal.kind === 'savings' && goal.target > 0 && goal.current >= goal.target) {
    return { ...goal, status: 'completed' };
  }
  return { ...goal, status: 'active' };
}

export async function getGoals(): Promise<FinancialGoal[]> {
  try {
    const raw = await AsyncStorage.getItem(GOALS_KEY);
    if (!raw) {
      const seeded = seedGoals();
      await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(seeded));
      return seeded;
    }
    return (JSON.parse(raw) as FinancialGoal[]).map((g) => withStatus(g));
  } catch {
    return seedGoals();
  }
}

async function persist(goals: FinancialGoal[]): Promise<FinancialGoal[]> {
  await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(goals));
  return goals;
}

export async function upsertGoal(goal: FinancialGoal): Promise<FinancialGoal[]> {
  const list = await getGoals();
  const next = withStatus(goal);
  const idx = list.findIndex((g) => g.id === next.id);
  if (idx >= 0) list[idx] = next;
  else list.push(next);
  return persist(list);
}

export async function removeGoal(id: string): Promise<FinancialGoal[]> {
  const list = await getGoals();
  return persist(list.filter((g) => g.id !== id));
}

export async function markGoalComplete(id: string): Promise<FinancialGoal[]> {
  const list = await getGoals();
  const idx = list.findIndex((g) => g.id === id);
  if (idx < 0) return list;
  const g = list[idx];
  list[idx] = {
    ...g,
    current: Math.max(g.current, g.target),
    status: 'completed',
  };
  return persist(list);
}

export async function reopenGoal(id: string): Promise<FinancialGoal[]> {
  const list = await getGoals();
  const idx = list.findIndex((g) => g.id === id);
  if (idx < 0) return list;
  list[idx] = { ...list[idx], status: 'active' };
  return persist(list);
}

export async function addGoalProgress(id: string, amount: number): Promise<FinancialGoal[]> {
  const list = await getGoals();
  const idx = list.findIndex((g) => g.id === id);
  if (idx < 0) return list;
  const g = list[idx];
  const current = Math.max(0, g.current + amount);
  list[idx] = withStatus({ ...g, current, status: 'active' });
  return persist(list);
}

export function createEmptyGoal(partial?: Partial<FinancialGoal>): FinancialGoal {
  return {
    id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: partial?.name || 'New goal',
    target: partial?.target ?? 500,
    current: partial?.current ?? 0,
    period: partial?.period ?? 'monthly',
    kind: partial?.kind ?? 'savings',
    icon: partial?.icon || 'piggy-bank-outline',
    status: 'active',
  };
}

export function goalProgressPct(goal: FinancialGoal): number {
  if (!goal.target) return 0;
  return Math.min(100, Math.round((goal.current / goal.target) * 100));
}
