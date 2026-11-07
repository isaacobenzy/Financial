import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Transaction } from '@/lib/financeContext';

const IMPORTED_KEY = 'imported_transactions_v1';
const BALANCE_KEY = 'ledger_balance_v1';

/**
 * Older builds added GH₵ 12,500 to every total that was not taken from an SMS
 * "available balance" line. That number was sample data, not the user's money.
 * Cached totals that still match `12500 + income - expenses` are rewritten
 * without it. A cached total that does not match that formula is kept, because
 * an imported alert previously set it. Imported rows are never deleted here.
 */
const LEGACY_FICTIONAL_OPENING = 12500;

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
  // Legacy numeric SMS ids ("2","3") collided with React keys / demos
  return `sms-legacy-${id}-${index}`;
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
  const income = imported
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const expenses = imported
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const total = income - expenses;

  return {
    total,
    income,
    expenses,
    currency: 'GHS',
    updatedAt: new Date().toISOString(),
    smsImports: imported.length,
  };
}

function sameMoney(a: LedgerBalance, b: LedgerBalance): boolean {
  return (
    a.total === b.total &&
    a.income === b.income &&
    a.expenses === b.expenses &&
    a.smsImports === b.smsImports &&
    a.currency === b.currency
  );
}

export async function getLedgerBalance(): Promise<LedgerBalance> {
  const imported = await getImportedTransactions();
  const fresh = computeFromTransactions(imported);
  let cached: LedgerBalance | null = null;
  try {
    const raw = await AsyncStorage.getItem(BALANCE_KEY);
    if (raw) cached = JSON.parse(raw) as LedgerBalance;
  } catch {
    cached = null;
  }

  if (!cached) {
    await AsyncStorage.setItem(BALANCE_KEY, JSON.stringify(fresh));
    return fresh;
  }

  const legacyTotal = LEGACY_FICTIONAL_OPENING + fresh.income - fresh.expenses;
  const fictionalOpening = cached.smsImports === 0 || cached.total === legacyTotal;
  const next: LedgerBalance = fictionalOpening ? fresh : { ...fresh, total: cached.total };
  if (!sameMoney(cached, next)) {
    await AsyncStorage.setItem(BALANCE_KEY, JSON.stringify(next));
  }
  return next;
}

export async function recalculateLedgerBalance(
  imported?: Transaction[],
  smsReportedBalance?: number | null,
): Promise<LedgerBalance> {
  const list = imported ?? (await getImportedTransactions());
  const computed = computeFromTransactions(list);

  if (typeof smsReportedBalance === 'number' && Number.isFinite(smsReportedBalance)) {
    computed.total = smsReportedBalance;
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
  return { transactions: trimmed, balance, added: Math.max(0, added) };
}

export async function clearImportedTransactions(): Promise<void> {
  await AsyncStorage.removeItem(IMPORTED_KEY);
  await AsyncStorage.removeItem(BALANCE_KEY);
}
