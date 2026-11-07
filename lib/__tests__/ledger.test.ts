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

  it('drops the old fictional GH₵ 12,500 opening balance and keeps an SMS-reported total', async () => {
    await addImportedTransactions([
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
    ]);

    const legacy: LedgerBalance = {
      total: 12500 + 100 - 40,
      income: 100,
      expenses: 40,
      currency: 'GHS',
      updatedAt: '2026-07-02T00:00:00.000Z',
      smsImports: 2,
    };
    await AsyncStorage.setItem('ledger_balance_v1', JSON.stringify(legacy));

    const corrected = await getLedgerBalance();
    expect(corrected.total).toBe(60);
    expect(corrected.income).toBe(100);
    expect(corrected.expenses).toBe(40);

    const reported: LedgerBalance = { ...corrected, total: 1240.5, smsImports: 2 };
    await AsyncStorage.setItem('ledger_balance_v1', JSON.stringify(reported));
    const kept = await getLedgerBalance();
    expect(kept.total).toBe(1240.5);
    expect((await getAllTransactions()).map((row) => row.merchant)).toEqual(['MTN MoMo', 'Kofi']);
  });

  it('does not treat a picked PDF as an imported statement', () => {
    const outcome = describePdfPick('statement.pdf');
    expect(outcome.imported).toBe(false);
    expect(outcome.fileName).toBe('statement.pdf');
    expect(outcome.message).toMatch(/not imported/i);
  });
});
