import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteAccount } from '@/lib/accounts';
import { clearStreak } from '@/lib/achievements';
import { clearFinancialShareConsent } from '@/lib/aiShare';
import { clearAppUnlock, setBiometricUnlockEnabled } from '@/lib/biometrics';
import { clearGoals } from '@/lib/goalsStore';
import { clearImportedTransactions } from '@/lib/ledgerStore';
import { setBalanceHidden } from '@/lib/privacy';
import { clearSession, getSession } from '@/lib/session';

const SHARED_KEYS = [
  'widget_snapshot_v1',
  'balance_hidden_v1',
  'sms_prefer_real_v1',
  'live_sections_v1',
  'fc_live_snap_hash_v1',
  'goal_milestones_sent_v1',
];

/**
 * Removes one local account and that session.
 * The ledger and goals are not namespaced per account, so this does not touch them.
 * Hashing a password does not encrypt those records.
 */
export async function deleteLocalAccount(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  await deleteAccount(normalized);
  const session = await getSession();
  if (!session || session.email === normalized) {
    await clearSession();
    await clearAppUnlock();
  }
}

/**
 * Explicit wipe of the shared on-phone ledger and goals.
 * Does not delete account rows. Call only after a separate confirmation.
 */
export async function clearSharedOnDeviceFinancialData(): Promise<void> {
  await clearImportedTransactions();
  await clearGoals();
  await clearStreak();
  await clearFinancialShareConsent();
  await setBalanceHidden(false);

  const keys = await AsyncStorage.getAllKeys();
  const dynamic = keys.filter((key) => key.startsWith('fc_notify_cd_'));
  const present = SHARED_KEYS.filter((key) => keys.includes(key));
  const remove = [...present, ...dynamic];
  if (remove.length) await AsyncStorage.multiRemove(remove);
}

/** @deprecated Use deleteLocalAccount. Kept so older call sites do not wipe the shared ledger. */
export async function deleteOnDeviceAccountData(email: string): Promise<void> {
  await deleteLocalAccount(email);
}
