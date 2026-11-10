import {
  addGoalProgress,
  createEmptyGoal,
  getGoals,
  GOAL_PERIOD_LABELS,
  removeGoal,
  upsertGoal,
  type FinancialGoal,
  type GoalPeriod,
} from '@/lib/goalsStore';
import { refreshWidgetSnapshot } from '@/lib/widgetBridge';

export type GoalActionType =
  | 'create_goal'
  | 'update_goal'
  | 'delete_goal'
  | 'add_progress';

export type GoalActionProposal = {
  type: GoalActionType;
  /** Required for update/delete/progress; optional for create. */
  id?: string;
  name?: string;
  target?: number;
  current?: number;
  period?: GoalPeriod;
  kind?: 'budget' | 'savings';
  icon?: string;
  amount?: number;
};

const ACTION_FENCE_RE =
  /```(?:json)?\s*(\{[\s\S]*?"actions"\s*:\s*\[[\s\S]*?\]\s*\})\s*```/i;

const PERIODS = new Set<GoalPeriod>(['daily', 'weekly', 'monthly', 'yearly']);

function asPeriod(value: unknown): GoalPeriod | undefined {
  if (typeof value !== 'string') return undefined;
  const v = value.trim().toLowerCase() as GoalPeriod;
  return PERIODS.has(v) ? v : undefined;
}

function asKind(value: unknown): 'budget' | 'savings' | undefined {
  if (value === 'budget' || value === 'savings') return value;
  return undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function normalizeAction(raw: unknown): GoalActionProposal | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const type = String(o.type || '').trim() as GoalActionType;
  if (
    type !== 'create_goal' &&
    type !== 'update_goal' &&
    type !== 'delete_goal' &&
    type !== 'add_progress'
  ) {
    return null;
  }
  return {
    type,
    id: typeof o.id === 'string' ? o.id : undefined,
    name: typeof o.name === 'string' ? o.name.trim() : undefined,
    target: asNumber(o.target),
    current: asNumber(o.current),
    period: asPeriod(o.period),
    kind: asKind(o.kind),
    icon: typeof o.icon === 'string' ? o.icon : undefined,
    amount: asNumber(o.amount),
  };
}

/**
 * Split an AI reply into visible prose + optional goal action proposals.
 * The model should append a fenced JSON block with `{ "actions": [...] }`.
 */
export function extractGoalActionsFromReply(reply: string): {
  text: string;
  actions: GoalActionProposal[];
} {
  const source = String(reply || '');
  const fence = source.match(ACTION_FENCE_RE);
  if (!fence) {
    return { text: source.trim(), actions: [] };
  }

  let actions: GoalActionProposal[] = [];
  try {
    const parsed = JSON.parse(fence[1]) as { actions?: unknown };
    if (Array.isArray(parsed.actions)) {
      actions = parsed.actions
        .map(normalizeAction)
        .filter((a): a is GoalActionProposal => Boolean(a))
        .slice(0, 4);
    }
  } catch {
    actions = [];
  }

  const text = source.replace(fence[0], '').trim();
  return { text: text || 'Here’s a goal suggestion you can apply.', actions };
}

export function describeGoalAction(action: GoalActionProposal): string {
  switch (action.type) {
    case 'create_goal': {
      const period = action.period ? GOAL_PERIOD_LABELS[action.period] : 'Monthly';
      const kind = action.kind === 'budget' ? 'budget' : 'savings';
      const target = action.target ?? 0;
      return `Create ${period.toLowerCase()} ${kind} goal “${action.name || 'New goal'}” · GH₵ ${target.toLocaleString('en-GH')}`;
    }
    case 'update_goal':
      return `Update goal${action.name ? ` “${action.name}”` : action.id ? ` ${action.id}` : ''}`;
    case 'delete_goal':
      return `Delete goal${action.name ? ` “${action.name}”` : action.id ? ` ${action.id}` : ''}`;
    case 'add_progress': {
      const amt = action.amount ?? 0;
      const sign = amt >= 0 ? '+' : '';
      return `Add progress ${sign}${amt.toLocaleString('en-GH')} GH₵${action.name ? ` on “${action.name}”` : ''}`;
    }
    default:
      return 'Goal action';
  }
}

async function resolveGoal(action: GoalActionProposal): Promise<FinancialGoal | null> {
  const list = await getGoals();
  if (action.id) {
    const byId = list.find((g) => g.id === action.id);
    if (byId) return byId;
  }
  if (action.name) {
    const key = action.name.trim().toLowerCase();
    return list.find((g) => g.name.trim().toLowerCase() === key) || null;
  }
  return null;
}

export type ApplyGoalActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export async function applyGoalAction(
  action: GoalActionProposal,
): Promise<ApplyGoalActionResult> {
  try {
    if (action.type === 'create_goal') {
      const name = (action.name || '').trim();
      if (!name) return { ok: false, error: 'Goal needs a name' };
      const target = Math.max(0, action.target ?? 0);
      if (target <= 0) return { ok: false, error: 'Goal needs a target amount' };
      const goal = createEmptyGoal({
        name,
        target,
        current: Math.max(0, action.current ?? 0),
        period: action.period ?? 'monthly',
        kind: action.kind ?? 'savings',
        icon: action.icon || 'piggy-bank-outline',
      });
      await upsertGoal(goal);
      await refreshWidgetSnapshot();
      return {
        ok: true,
        message: `Created ${GOAL_PERIOD_LABELS[goal.period].toLowerCase()} goal “${goal.name}”`,
      };
    }

    if (action.type === 'update_goal') {
      const existing = await resolveGoal(action);
      if (!existing) return { ok: false, error: 'Could not find that goal to update' };
      const next: FinancialGoal = {
        ...existing,
        name: (action.name || existing.name).trim(),
        target:
          action.target !== undefined ? Math.max(0, action.target) : existing.target,
        current:
          action.current !== undefined ? Math.max(0, action.current) : existing.current,
        period: action.period ?? existing.period,
        kind: action.kind ?? existing.kind,
        icon: action.icon || existing.icon,
      };
      await upsertGoal(next);
      await refreshWidgetSnapshot();
      return { ok: true, message: `Updated “${next.name}”` };
    }

    if (action.type === 'delete_goal') {
      const existing = await resolveGoal(action);
      if (!existing) return { ok: false, error: 'Could not find that goal to delete' };
      await removeGoal(existing.id);
      await refreshWidgetSnapshot();
      return { ok: true, message: `Deleted “${existing.name}”` };
    }

    if (action.type === 'add_progress') {
      const existing = await resolveGoal(action);
      if (!existing) return { ok: false, error: 'Could not find that goal' };
      const amount = action.amount ?? 0;
      if (!amount) return { ok: false, error: 'Progress amount is missing' };
      await addGoalProgress(existing.id, amount);
      await refreshWidgetSnapshot();
      return {
        ok: true,
        message: `Updated progress on “${existing.name}”`,
      };
    }

    return { ok: false, error: 'Unknown action' };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Could not apply goal action',
    };
  }
}

/** Instructions appended to the finance system prompt. */
export function goalActionProtocolPrompt(): string {
  return [
    'GOAL ACTIONS (optional): When the user asks you to create, change, delete, or log progress on a goal/plan/budget target, end your reply with ONE fenced JSON block exactly like:',
    '```json',
    '{"actions":[{"type":"create_goal","name":"Food under 400","target":400,"period":"weekly","kind":"budget","icon":"food-outline"}]}',
    '```',
    'Allowed types: create_goal | update_goal | delete_goal | add_progress.',
    'Periods: daily | weekly | monthly | yearly. Kinds: budget | savings.',
    'For update_goal / delete_goal / add_progress include id from the goals list when possible, or exact name.',
    'For add_progress include "amount" (positive or negative number in GHS).',
    'Never invent ledger transactions. Propose at most 3 actions. Keep the prose under 120 words BEFORE the JSON block.',
    'Do NOT claim the goal was saved — the user must confirm in the app.',
  ].join('\n');
}
