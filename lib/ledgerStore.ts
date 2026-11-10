import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Transaction } from '@/lib/financeContext';

const IMPORTED_KEY = 'imported_transactions_v1';
const BALANCE_KEY = 'ledger_balance_v1';

/**
 * New calculations do not add a sample opening balance. A balance already
 * saved on the device is returned as stored. This file does not guess which
 * saved totals included the old GH₵ 12,500 sample figure. See
 * docs/release/LEDGER-TOTAL-MIGRATION.md. That rewrite is not implemented.
 */
export type LedgerBalance = {
  total: number;
  income: number;
  expenses: number;
  currency: 'GHS';
  updatedAt: string;
  smsImports: number;
};

function normalizeTxId(id: string, index: number): string {
  if (
    id.startsWith('sms-') ||
    id.startsWith('inbox-') ||
    id.startsWith('demo-') ||
    id.startsWith('pdf-')
  ) {
    return id;
  }
  return `sms-legacy-${id}-${index}`;
}

export function hasRealImportedTransactions(list: Transaction[]): boolean {
  return list.some(
    (t) =>
      !t.id.startsWith('demo-') &&
      !t.id.startsWith('sms-demo-') &&
      !t.id.includes('demo'),
  );
}

export async function getImportedTransactions(): Promise<Transaction[]> {
  try {
    const raw = await AsyncStorage.getItem(IMPORTED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Transaction[];
    let dirty = false;
    const normalized = parsed.map((t, i) => {
      const nextId = normalizeTxId(String(t.id), i);
      if (nextId !== t.id) dirty = true;
      return { ...t, id: nextId };
    });
    if (dirty) {
      await AsyncStorage.setItem(IMPORTED_KEY, JSON.stringify(normalized));
    }
    return normalized;
  } catch {
    return [];
  }
}

function computeFromTransactions(imported: Transaction[]): LedgerBalance {
  const hasReal = hasRealImportedTransactions(imported);
  const realImported = hasReal
    ? imported.filter(
        (t) =>
          !t.id.startsWith('demo-') &&
          !t.id.startsWith('sms-demo-') &&
          !t.id.includes('demo'),
      )
    : imported;

  const income = realImported
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const expenses = realImported
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const total = income - expenses;

  return {
    total,
    income,
    expenses,
    currency: 'GHS',
    updatedAt: new Date().toISOString(),
    smsImports: realImported.length,
  };
}

function emptyBalance(): LedgerBalance {
  return {
    total: 0,
    income: 0,
    expenses: 0,
    currency: 'GHS',
    updatedAt: new Date().toISOString(),
    smsImports: 0,
  };
}

async function readSavedBalance(): Promise<LedgerBalance | null> {
  try {
    const raw = await AsyncStorage.getItem(BALANCE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as LedgerBalance;
    if (!cached || typeof cached.total !== 'number') return null;
    return cached;
  } catch {
    return null;
  }
}

export async function getLedgerBalance(): Promise<LedgerBalance> {
  const saved = await readSavedBalance();
  if (saved) return saved;

  const existing = await AsyncStorage.getItem(BALANCE_KEY);
  if (existing) {
    // Saved text could not be read as a balance. Leave it in place.
    return emptyBalance();
  }

  const fresh = computeFromTransactions(await getImportedTransactions());
  await AsyncStorage.setItem(BALANCE_KEY, JSON.stringify(fresh));
  return fresh;
}

export async function recalculateLedgerBalance(
  imported?: Transaction[],
  smsReportedBalance?: number | null,
): Promise<LedgerBalance> {
  const list = imported ?? (await getImportedTransactions());
  const computed = computeFromTransactions(list);
  const previous = await readSavedBalance();

  if (typeof smsReportedBalance === 'number' && Number.isFinite(smsReportedBalance)) {
    // The imported alert stated an available balance. That is part of the import the person just ran.
    computed.total = smsReportedBalance;
  } else if (previous) {
    const incomeDelta = computed.income - (Number(previous.income) || 0);
    const expenseDelta = computed.expenses - (Number(previous.expenses) || 0);
    computed.total = previous.total + incomeDelta - expenseDelta;
  }

  await AsyncStorage.setItem(BALANCE_KEY, JSON.stringify(computed));
  return computed;
}

function isDemoLikeId(id: string) {
  return id.includes('demo') || id.startsWith('sms-demo');
}

export async function addImportedTransactions(
  next: Transaction[],
  options?: {
    smsReportedBalance?: number | null;
    /** When true, drop previously imported demo/sample rows so real SMS replace them. */
    replaceDemo?: boolean;
  },
): Promise<{ transactions: Transaction[]; balance: LedgerBalance; added: number }> {
  let existing = await getImportedTransactions();
  if (options?.replaceDemo) {
    existing = existing.filter((t) => !isDemoLikeId(t.id));
  }

  const beforeCount = existing.length;
  const merged = [...next, ...existing];
  const deduped = merged.filter(
    (tx, index, arr) =>
      arr.findIndex(
        (t) =>
          t.merchant === tx.merchant &&
          t.amount === tx.amount &&
          t.date === tx.date &&
          t.category === tx.category,
      ) === index,
  );
  const trimmed = deduped.slice(0, 200);
  await AsyncStorage.setItem(IMPORTED_KEY, JSON.stringify(trimmed));
  const balance = await recalculateLedgerBalance(trimmed, options?.smsReportedBalance ?? null);
  const added = Math.max(trimmed.length - beforeCount, next.length);

  // After any real import, purge leftover sample rows / seed goals.
  if (hasRealImportedTransactions(trimmed) || options?.replaceDemo) {
    try {
      const { ensureRealDataEverywhere } = await import('@/lib/sampleData');
      await ensureRealDataEverywhere();
    } catch {
      // non-fatal
    }
  }

  return { transactions: trimmed, balance, added: Math.max(0, added) };
}

export async function clearImportedTransactions(): Promise<void> {
  await AsyncStorage.removeItem(IMPORTED_KEY);
  await AsyncStorage.removeItem(BALANCE_KEY);
}
