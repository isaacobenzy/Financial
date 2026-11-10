import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { authenticateAccount, deleteAccount, registerAccount } from '@/lib/accounts';

const resetSecureStore = () =>
  (SecureStore as unknown as { __reset: () => void }).__reset();

async function readV2(): Promise<Record<string, { passwordHash: unknown }>> {
  return JSON.parse((await SecureStore.getItemAsync('accounts_v2')) || '{}');
}

describe('local accounts', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    resetSecureStore();
  });

  it('stores a hash, never the password, and verifies it', async () => {
    const created = await registerAccount({
      email: 'ada@example.com',
      password: 'secret12',
      name: 'Ada',
      acceptedTerms: true,
    });
    expect(created.ok).toBe(true);

    const stored = (await readV2())['ada@example.com'];
    expect(stored).toBeDefined();
    expect(JSON.stringify(stored)).not.toContain('secret12');
    expect(await authenticateAccount('ada@example.com', 'nope')).toBeNull();
    expect((await authenticateAccount('ada@example.com', 'secret12'))?.name).toBe('Ada');
  }, 20000);

  it('upgrades a legacy plaintext row from local_accounts_v1 only after a matching sign-in', async () => {
    await AsyncStorage.setItem(
      'local_accounts_v1',
      JSON.stringify([
        {
          email: 'legacy@example.com',
          password: 'legacy1',
          name: 'Legacy',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ]),
    );

    expect(await authenticateAccount('legacy@example.com', 'wrong')).toBeNull();
    const stillPlain = JSON.parse((await AsyncStorage.getItem('local_accounts_v1')) || '[]');
    expect(stillPlain[0].password).toBe('legacy1');

    const upgraded = await authenticateAccount('legacy@example.com', 'legacy1');
    expect(upgraded?.name).toBe('Legacy');
    expect(await AsyncStorage.getItem('local_accounts_v1')).toBeNull();
    const v2 = (await readV2())['legacy@example.com'];
    expect(JSON.stringify(v2)).not.toContain('legacy1');
  }, 20000);

  it('deleteAccount removes only that sign-in record', async () => {
    await registerAccount({ email: 'ada@example.com', password: 'secret12', acceptedTerms: true });
    await registerAccount({ email: 'bea@example.com', password: 'secret22', acceptedTerms: true });
    await deleteAccount('ADA@example.com');
    expect(Object.keys(await readV2())).toEqual(['bea@example.com']);
  }, 20000);
});
