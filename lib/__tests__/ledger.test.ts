import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAllTransactions } from '@/lib/financeContext';
import {
  addImportedTransactions,
  getLedgerBalance,
  type LedgerBalance,
} from '@/lib/ledgerStore';
import { describePdfPick } from '@/lib/pdfImport';

describe('ledger math', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('does not invent a balance or sample merchants when nothing was imported', async () => {
    const balance = await getLedgerBalance();
    expect(balance.total).toBe(0);
    expect(balance.income).toBe(0);
    expect(balance.expenses).toBe(0);
    const rows = await getAllTransactions();
    expect(rows.map((row) => row.merchant)).not.toContain('Shoprite');
    expect(rows).toHaveLength(0);
  });

  it('leaves a previously saved total unchanged, including one that matches 12500 plus activity', async () => {
    const transactions = [
      {
        id: 'sms-1',
        type: 'income' as const,
        category: 'transfer',
        merchant: 'MTN MoMo',
        amount: 100,
        date: '2026-07-01',
      },
      {
        id: 'sms-2',
        type: 'expense' as const,
        category: 'food',
        merchant: 'Kofi',
        amount: -40,
        date: '2026-07-02',
      },
    ];
    await AsyncStorage.setItem('imported_transactions_v1', JSON.stringify(transactions));

    const legacy: LedgerBalance = {
      total: 12500 + 100 - 40,
      income: 100,
      expenses: 40,
      currency: 'GHS',
      updatedAt: '2026-07-02T00:00:00.000Z',
      smsImports: 2,
    };
    await AsyncStorage.setItem('ledger_balance_v1', JSON.stringify(legacy));
    const before = await AsyncStorage.getItem('ledger_balance_v1');

    const kept = await getLedgerBalance();
    expect(kept.total).toBe(12560);
    expect(kept.income).toBe(100);
    expect(kept.expenses).toBe(40);
    expect(await AsyncStorage.getItem('ledger_balance_v1')).toBe(before);
    expect((await getAllTransactions()).map((row) => row.merchant)).toEqual(['MTN MoMo', 'Kofi']);
  });

  it('does not add a sample opening balance on a new import, and keeps an existing total when activity changes', async () => {
    const first = await addImportedTransactions([
      {
        id: 'sms-1',
        type: 'income',
        category: 'transfer',
        merchant: 'MTN MoMo',
        amount: 100,
        date: '2026-07-01',
      },
    ]);
    expect(first.balance.total).toBe(100);

    const saved: LedgerBalance = {
      total: 12560,
      income: 100,
      expenses: 40,
      currency: 'GHS',
      updatedAt: '2026-07-02T00:00:00.000Z',
      smsImports: 2,
    };
    await AsyncStorage.setItem('ledger_balance_v1', JSON.stringify(saved));
    await AsyncStorage.setItem(
      'imported_transactions_v1',
      JSON.stringify([
        {
          id: 'sms-1',
          type: 'income',
          category: 'transfer',
          merchant: 'MTN MoMo',
          amount: 100,
          date: '2026-07-01',
        },
        {
          id: 'sms-2',
          type: 'expense',
          category: 'food',
          merchant: 'Kofi',
          amount: -40,
          date: '2026-07-02',
        },
      ]),
    );

    const next = await addImportedTransactions([
      {
        id: 'sms-3',
        type: 'expense',
        category: 'food',
        merchant: 'Waakye',
        amount: -10,
        date: '2026-07-03',
      },
    ]);
    expect(next.balance.total).toBe(12550);
  });

  it('does not treat a picked PDF as an imported statement', () => {
    const outcome = describePdfPick('statement.pdf');
    expect(outcome.imported).toBe(false);
    expect(outcome.fileName).toBe('statement.pdf');
    expect(outcome.message).toMatch(/not imported/i);
  });
});
