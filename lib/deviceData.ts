import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteAccount } from '@/lib/accounts';
import { clearStreak } from '@/lib/achievements';
import { clearFinancialShareConsent } from '@/lib/aiShare';
import { clearAppUnlock, setBiometricUnlockEnabled } from '@/lib/biometrics';
import { clearGoals } from '@/lib/goalsStore';
import { clearImportedTransactions } from '@/lib/ledgerStore';
import { setBalanceHidden } from '@/lib/privacy';
import { clearSession, getSession } from '@/lib/session';

const EXTRA_KEYS = [
  'widget_snapshot_v1',
  'balance_hidden_v1',
  'sms_prefer_real_v1',
  'live_sections_v1',
  'fc_live_snap_hash_v1',
  'goal_milestones_sent_v1',
  'notification_settings_v1',
];

/**
 * Removes this device account and the phone's shared ledger.
 * Accounts are local. The ledger, goals, and imports are not split per account,
 * so clearing them affects every profile that used this install. Other account
 * rows are left in place. Nothing is sent to a server.
 */
export async function deleteOnDeviceAccountData(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  await deleteAccount(normalized);
  const session = await getSession();
  if (!session || session.email === normalized) await clearSession();
  await clearImportedTransactions();
  await clearGoals();
  await clearStreak();
  await clearFinancialShareConsent();
  await setBiometricUnlockEnabled(false);
  await clearAppUnlock();
  await setBalanceHidden(false);

  const keys = await AsyncStorage.getAllKeys();
  const dynamic = keys.filter((key) => key.startsWith('fc_notify_cd_'));
  const present = EXTRA_KEYS.filter((key) => keys.includes(key));
  const remove = [...present, ...dynamic];
  if (remove.length) await AsyncStorage.multiRemove(remove);
}
