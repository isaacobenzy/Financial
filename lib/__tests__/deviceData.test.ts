import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerAccount } from '@/lib/accounts';
import { clearSharedOnDeviceFinancialData, deleteLocalAccount } from '@/lib/deviceData';
import { getGoals, upsertGoal } from '@/lib/goalsStore';
import { addImportedTransactions, getLedgerBalance } from '@/lib/ledgerStore';
import { saveSession } from '@/lib/session';

describe('on-device account and shared ledger', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('deletes only the signed-in account and leaves the shared ledger and the other account', async () => {
    await registerAccount({ email: 'ada@example.com', password: 'secret1', name: 'Ada' });
    await registerAccount({ email: 'bea@example.com', password: 'secret2', name: 'Bea' });
    await saveSession('ada@example.com', 'Ada');
    await upsertGoal({
      id: 'goal-rent',
      name: 'Rent',
      target: 500,
      current: 100,
      period: 'monthly',
      kind: 'savings',
      icon: 'home',
      status: 'active',
    });
    await addImportedTransactions([
      {
        id: 'sms-1',
        type: 'expense',
        category: 'food',
        merchant: 'Waakye',
        amount: -20,
        date: '2026-07-01',
      },
    ]);
    const balanceBefore = (await getLedgerBalance()).total;

    await deleteLocalAccount('ada@example.com');

    const accounts = JSON.parse((await AsyncStorage.getItem('local_accounts_v1')) || '[]');
    expect(accounts.map((account: { email: string }) => account.email)).toEqual(['bea@example.com']);
    expect(await AsyncStorage.getItem('user_session_v1')).toBeNull();
    expect((await getGoals()).map((goal) => goal.name)).toEqual(['Rent']);
    expect((await getLedgerBalance()).total).toBe(balanceBefore);
    expect((await getLedgerBalance()).smsImports).toBe(1);
  }, 20000);

  it('clears the shared ledger only when that separate action is used', async () => {
    await registerAccount({ email: 'bea@example.com', password: 'secret2', name: 'Bea' });
    await addImportedTransactions([
      {
        id: 'sms-1',
        type: 'expense',
        category: 'food',
        merchant: 'Waakye',
        amount: -20,
        date: '2026-07-01',
      },
    ]);
    await upsertGoal({
      id: 'goal-rent',
      name: 'Rent',
      target: 500,
      current: 100,
      period: 'monthly',
      kind: 'savings',
      icon: 'home',
      status: 'active',
    });

    await clearSharedOnDeviceFinancialData();

    const accounts = JSON.parse((await AsyncStorage.getItem('local_accounts_v1')) || '[]');
    expect(accounts.map((account: { email: string }) => account.email)).toEqual(['bea@example.com']);
    expect(await getGoals()).toEqual([]);
    expect((await getLedgerBalance()).smsImports).toBe(0);
    expect((await getLedgerBalance()).total).toBe(0);
  }, 20000);
});