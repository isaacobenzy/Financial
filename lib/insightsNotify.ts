import AsyncStorage from '@react-native-async-storage/async-storage';
import { getImportedTransactions, type LedgerBalance } from '@/lib/ledgerStore';
import { getGoals } from '@/lib/goalsStore';
import { notifyUser, scheduleStreakReminder } from '@/lib/notify';
import { refreshWidgetSnapshot } from '@/lib/widgetBridge';
import type { Transaction } from '@/lib/financeContext';

const MILESTONE_KEY = 'goal_milestones_sent_v1';

function weekStartMs() {
  const d = new Date();
  const day = d.getDay();
  const diff = (day + 6) % 7; // Monday-start
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - diff);
  return d.getTime();
}

function spentThisWeek(transactions: Transaction[]) {
  const start = weekStartMs();
  return transactions
    .filter((t) => t.type === 'expense' && new Date(t.date).getTime() >= start)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
}

function categorySpend(transactions: Transaction[], category: string) {
  return transactions
    .filter((t) => t.type === 'expense' && t.category === category)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
}

/** After a successful import — digest + widget refresh + optional anomaly. */
export async function afterImportInsights(params: {
  addedCount: number;
  balance: LedgerBalance;
  usingDemo: boolean;
}): Promise<void> {
  const imported = await getImportedTransactions();
  const weekSpend = spentThisWeek(imported);

  await notifyUser(
    'Import digest',
    `${params.addedCount} new transaction${params.addedCount === 1 ? '' : 's'} imported, GHS ${weekSpend.toFixed(0)} spent this week`,
    'import',
    {
      categoryId: 'import_digest',
      data: { screen: 'transactions' },
    },
  );

  await refreshWidgetSnapshot();
  await checkGoalMilestones();
  await checkSpendAnomaly(imported);
  await scheduleStreakReminder();
}

async function checkGoalMilestones(): Promise<void> {
  const goals = await getGoals();
  let sent: Record<string, number> = {};
  try {
    const raw = await AsyncStorage.getItem(MILESTONE_KEY);
    if (raw) sent = JSON.parse(raw) as Record<string, number>;
  } catch {
    sent = {};
  }

  for (const goal of goals) {
    if (!goal.target) continue;
    const pct = Math.min(100, Math.round((goal.current / goal.target) * 100));
    const thresholds = [50, 90, 100] as const;
    const prev = sent[goal.id] ?? 0;

    for (const mark of thresholds) {
      if (pct >= mark && prev < mark) {
        const label =
          mark === 100
            ? `You hit 100% on “${goal.name}”`
            : `“${goal.name}” is at ${mark}% of target`;
        await notifyUser('Goal milestone', label, 'goal', {
          categoryId: 'goal_milestone',
          data: { screen: 'goals', goalId: goal.id },
        });
        sent[goal.id] = mark;
      }
    }
  }

  await AsyncStorage.setItem(MILESTONE_KEY, JSON.stringify(sent));
}

/** Simple grounded anomaly: food spend vs remaining transactions average. */
async function checkSpendAnomaly(transactions: Transaction[]): Promise<void> {
  const expenses = transactions.filter((t) => t.type === 'expense');
  if (expenses.length < 4) return;

  const food = categorySpend(expenses, 'food');
  const other = expenses
    .filter((t) => t.category !== 'food')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const otherAvg = other / Math.max(1, expenses.filter((t) => t.category !== 'food').length);
  const foodAvg =
    food / Math.max(1, expenses.filter((t) => t.category === 'food').length);

  if (otherAvg > 0 && foodAvg > otherAvg * 1.4) {
    const pct = Math.round(((foodAvg - otherAvg) / otherAvg) * 100);
    await notifyUser(
      'Spend nudge',
      `Food spend is about ${pct}% above your usual category average this period.`,
      'anomaly',
      { data: { screen: 'assistant' } },
    );
  }
}

export async function onAppOpenHygiene(): Promise<void> {
  await refreshWidgetSnapshot();
  await scheduleStreakReminder();
}
