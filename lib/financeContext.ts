import { getImportedTransactions, getLedgerBalance } from '@/lib/ledgerStore';
import { getGoals } from '@/lib/goalsStore';

export type Transaction = {
  id: string;
  type: 'income' | 'expense';
  category: string;
  merchant: string;
  amount: number;
  date: string;
};

export async function getAllTransactions(): Promise<Transaction[]> {
  const imported = await getImportedTransactions();
  return imported.map((t, i) => ({
    ...t,
    id: t.id.startsWith('sms-') || t.id.startsWith('inbox-') || t.id.startsWith('pdf-') ? t.id : `sms-${t.id}-${i}`,
  }));
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
