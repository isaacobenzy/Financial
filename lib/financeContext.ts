import { getImportedTransactions, getLedgerBalance } from '@/lib/ledgerStore';
import { getGoals } from '@/lib/goalsStore';
import { goalActionProtocolPrompt } from '@/lib/goalActions';

export type Transaction = {
  id: string;
  type: 'income' | 'expense';
  category: string;
  merchant: string;
  amount: number;
  date: string;
};

function isSampleId(id: string): boolean {
  return id.startsWith('demo-') || id.startsWith('sms-demo-') || id.includes('demo');
}

export async function getAllTransactions(): Promise<Transaction[]> {
  const imported = await getImportedTransactions();
  // Real imports only — never mix in or fall back to sample rows.
  return imported
    .filter((t) => !isSampleId(t.id))
    .map((t, i) => ({
      ...t,
      id:
        t.id.startsWith('sms-') || t.id.startsWith('inbox-') || t.id.startsWith('pdf-')
          ? t.id
          : `sms-${t.id}-${i}`,
    }));
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
