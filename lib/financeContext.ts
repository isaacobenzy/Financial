import { getImportedTransactions, getLedgerBalance } from '@/lib/ledgerStore';
import { getGoals } from '@/lib/goalsStore';
import { SEED_GOALS } from '@/lib/goalsSeed';

export type Transaction = {
  id: string;
  type: 'income' | 'expense';
  category: string;
  merchant: string;
  amount: number;
  date: string;
};

export const DEMO_BALANCE = {
  total: 12500,
  income: 15000,
  expenses: 2500,
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
  // Guarantee unique React keys even if old AsyncStorage ids collide with demos
  const taggedImported = imported.map((t, i) => ({
    ...t,
    id: t.id.startsWith('sms-') || t.id.startsWith('inbox-') ? t.id : `sms-${t.id}-${i}`,
  }));
  return [...taggedImported, ...DEMO_TRANSACTIONS];
}

export async function buildFinanceSystemPrompt(): Promise<string> {
  const transactions = await getAllTransactions();
  const imported = await getImportedTransactions();
  const balance = await getLedgerBalance();

  const txLines = transactions
    .slice(0, 40)
    .map(
      (t) =>
        `- ${t.date} | ${t.merchant} | ${t.category} | ${t.type} | ${t.amount} ${balance.currency}`,
    )
    .join('\n');

  const goals = await getGoals();
  const budgetLines = goals
    .map(
      (g) =>
        `- ${g.name} (${g.period}, ${g.kind}): current ${g.current} / target ${g.target} ${balance.currency}`,
    )
    .join('\n');

  return [
    'You are Financial Copilot, a personal finance assistant for THIS user only.',
    'STRICT SCOPE: Answer ONLY questions about their money, balance, spending, income, budgets, goals, SMS imports, transactions, savings habits, or short Ghana personal-finance tips grounded in the ledger below.',
    'The user can type free-form questions — still stay in scope.',
    'Off-topic (politics, coding, celebrities, homework, general chat): reply with exactly one short refusal and ask a finance question instead.',
    'Never invent merchants or amounts. If data is missing, say what is missing and suggest Import SMS or Paste SMS.',
    'Prefer SMS-imported totals when present. Keep answers under 120 words. Use GHS.',
    '',
    `Total balance: ${balance.total.toFixed(2)} ${balance.currency}`,
    `SMS-imported income: ${balance.income.toFixed(2)} ${balance.currency}`,
    `SMS-imported expenses: ${balance.expenses.toFixed(2)} ${balance.currency}`,
    `Imported SMS transactions: ${imported.length}`,
    `Ledger updated: ${balance.updatedAt}`,
    '',
    'Recent transactions (imported first):',
    txLines || '- none',
    '',
    'Financial goals (live, user-editable):',
    budgetLines || '- none set',
  ].join('\n');
}
