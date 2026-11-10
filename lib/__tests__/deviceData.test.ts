import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { registerAccount } from '@/lib/accounts';
import { clearSharedOnDeviceFinancialData, deleteLocalAccount } from '@/lib/deviceData';
import { getGoals, upsertGoal } from '@/lib/goalsStore';
import { addImportedTransactions, getLedgerBalance } from '@/lib/ledgerStore';
import { getSession, saveSession } from '@/lib/session';

const resetSecureStore = () =>
  (SecureStore as unknown as { __reset: () => void }).__reset();

async function accountEmails(): Promise<string[]> {
  return Object.keys(JSON.parse((await SecureStore.getItemAsync('accounts_v2')) || '{}'));
}

describe('on-device account and shared ledger', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    resetSecureStore();
  });

  it('deletes only the signed-in account and leaves the shared ledger and the other account', async () => {
    await registerAccount({ email: 'ada@example.com', password: 'secret12', name: 'Ada', acceptedTerms: true });
    await registerAccount({ email: 'bea@example.com', password: 'secret22', name: 'Bea', acceptedTerms: true });
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

    expect(await accountEmails()).toEqual(['bea@example.com']);
    expect(await getSession()).toBeNull();
    expect((await getGoals()).map((goal) => goal.name)).toEqual(['Rent']);
    expect((await getLedgerBalance()).total).toBe(balanceBefore);
    expect((await getLedgerBalance()).smsImports).toBe(1);
  }, 20000);

  it('clears the shared ledger only when that separate action is used', async () => {
    await registerAccount({ email: 'bea@example.com', password: 'secret22', name: 'Bea', acceptedTerms: true });
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

    expect(await accountEmails()).toEqual(['bea@example.com']);
    expect(await getGoals()).toEqual([]);
    expect((await getLedgerBalance()).smsImports).toBe(0);
    expect((await getLedgerBalance()).total).toBe(0);
  }, 20000);
});