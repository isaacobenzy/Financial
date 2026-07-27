import { getImportedTransactions, getLedgerBalance } from '@/lib/ledgerStore';
import { getGoals } from '@/lib/goalsStore';
import { SEED_GOALS } from '@/lib/goalsSeed';
import { goalActionProtocolPrompt } from '@/lib/goalActions';

export type Transaction = {
  id: string;
  type: 'income' | 'expense';
  category: string;
  merchant: string;
  amount: number;
  date: string;
};

export const DEMO_BALANCE = {
  total: 0,
  income: 0,
  expenses: 0,
  currency: 'GHS' as const,
};

export const DEMO_TRANSACTIONS: Transaction[] = [
  {
    id: 'demo-shoprite',
    type: 'expense',
    category: 'shopping',
    merchant: 'Shoprite',
    amount: -250,
    date: '2024-03-29',
  },
  {
    id: 'demo-salary',
    type: 'income',
    category: 'salary',
    merchant: 'Employer Ltd',
    amount: 5000,
    date: '2024-03-28',
  },
  {
    id: 'demo-uber',
    type: 'expense',
    category: 'transport',
    merchant: 'Uber',
    amount: -45,
    date: '2024-03-28',
  },
  {
    id: 'demo-kfc',
    type: 'expense',
    category: 'food',
    merchant: 'KFC Accra',
    amount: -85,
    date: '2024-03-27',
  },
  {
    id: 'demo-ecg',
    type: 'expense',
    category: 'utilities',
    merchant: 'ECG Prepaid',
    amount: -120,
    date: '2024-03-26',
  },
];

export const DEMO_BUDGETS = SEED_GOALS.map((g) => ({
  name: g.name,
  spent: g.spent,
  budget: g.budget,
}));

export async function getAllTransactions(): Promise<Transaction[]> {
  const imported = await getImportedTransactions();
  const taggedImported: Transaction[] = imported.map((t, i) => ({
    ...t,
    id:
      t.id.startsWith('sms-') ||
      t.id.startsWith('inbox-') ||
      t.id.startsWith('pdf-') ||
      t.id.startsWith('demo-')
        ? t.id
        : `sms-${t.id}-${i}`,
  }));

  const hasRealData = taggedImported.some(
    (t) =>
      !t.id.startsWith('demo-') &&
      !t.id.startsWith('sms-demo-') &&
      !t.id.includes('demo'),
  );

  // Once real imports exist, never mix or fall back to sample rows.
  if (hasRealData) {
    return taggedImported.filter(
      (t) =>
        !t.id.startsWith('demo-') &&
        !t.id.startsWith('sms-demo-') &&
        !t.id.includes('demo'),
    );
  }

  // Empty ledger until the user imports — no synthetic Shoprite/salary samples.
  return taggedImported.filter(
    (t) =>
      !t.id.startsWith('demo-') &&
      !t.id.startsWith('sms-demo-') &&
      !t.id.includes('demo'),
  );
}

export async function buildFinanceSystemPrompt(): Promise<string> {
  const transactions = await getAllTransactions();
  const imported = await getImportedTransactions();
  const balance = await getLedgerBalance();

  const hasReal = transactions.some(
    (t) =>
      !t.id.startsWith('demo-') &&
      !t.id.startsWith('sms-demo-') &&
      !t.id.includes('demo'),
  );

  const txLines = transactions
    .slice(0, 50)
    .map(
      (t) =>
        `- ${t.date} | ${t.merchant} | ${t.category} | ${t.type} | ${t.amount} ${balance.currency}${
          t.id.startsWith('demo-') || t.id.includes('demo') ? ' (sample)' : ''
        }`,
    )
    .join('\n');

  const goals = await getGoals();
  const budgetLines = goals
    .map(
      (g) =>
        `- id:${g.id} | ${g.name} (${g.period}, ${g.kind}): current ${g.current} / target ${g.target} ${balance.currency} — status ${g.status}`,
    )
    .join('\n');

  const dataStatus = hasReal
    ? 'Data status: Using REAL imported transactions from this device. Sample data has been cleared.'
    : 'DATA STATUS WARNING: No real SMS or paste imports yet. The ledger is empty of real activity. Tell the user to Import SMS or Paste SMS — do not invent sample merchants or amounts.';

  return [
    'You are Financial Copilot, a personal finance assistant for THIS user only.',
    'STRICT SCOPE: Answer ONLY questions about their money, balance, spending, income, budgets, goals, SMS imports, transactions, savings habits, or short Ghana personal-finance tips grounded in the ledger below.',
    'The user can type free-form questions — still stay in scope.',
    'You may suggest daily, weekly, monthly, or yearly goals/plans and propose create/update/delete/progress actions using the GOAL ACTIONS protocol.',
    'Off-topic (politics, coding, celebrities, homework, general chat): reply with exactly one short refusal and ask a finance question instead.',
    'Never invent merchants or amounts. If data is missing, say what is missing and suggest Import SMS or Paste SMS.',
    'When the ledger has no real imports, say so clearly and recommend Import SMS / Paste SMS. Do not invent sample merchants.',
    'Prefer SMS-imported totals when present. Keep answers under 120 words. Use GHS.',
    '',
    dataStatus,
    `Total balance: ${balance.total.toFixed(2)} ${balance.currency}`,
    `Real income: ${balance.income.toFixed(2)} ${balance.currency}`,
    `Real expenses: ${balance.expenses.toFixed(2)} ${balance.currency}`,
    `Imported transactions (real): ${hasReal ? balance.smsImports : 0}`,
    `Ledger updated: ${balance.updatedAt}`,
    '',
    'Recent transactions:',
    txLines || '- none imported yet',
    '',
    'Financial goals (user-editable; include id when proposing updates):',
    budgetLines || '- none set yet',
    '',
    goalActionProtocolPrompt(),
  ].join('\n');
}
