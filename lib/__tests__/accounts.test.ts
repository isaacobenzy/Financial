import AsyncStorage from '@react-native-async-storage/async-storage';
import { authenticateAccount, registerAccount } from '@/lib/accounts';
import { isPasswordHash } from '@/lib/password';

describe('local accounts', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('stores a hash and upgrades a legacy plaintext password on successful sign-in', async () => {
    const created = await registerAccount({
      email: 'ada@example.com',
      password: 'secret1',
      name: 'Ada',
    });
    expect(created.ok).toBe(true);

    const raw = await AsyncStorage.getItem('local_accounts_v1');
    const stored = JSON.parse(raw || '[]')[0];
    expect(stored.password).not.toBe('secret1');
    expect(isPasswordHash(stored.password)).toBe(true);
    expect(await authenticateAccount('ada@example.com', 'nope')).toBeNull();
    expect((await authenticateAccount('ada@example.com', 'secret1'))?.name).toBe('Ada');

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
    const after = JSON.parse((await AsyncStorage.getItem('local_accounts_v1')) || '[]');
    expect(isPasswordHash(after[0].password)).toBe(true);
    expect(after[0].password).not.toBe('legacy1');
  }, 20000);
});
