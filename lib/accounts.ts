import AsyncStorage from '@react-native-async-storage/async-storage';
import { seedFromEmail } from '@/lib/navii';
import { hashPassword, isPasswordHash, verifyPassword } from '@/lib/password';

const ACCOUNTS_KEY = 'local_accounts_v1';

export type LocalAccount = {
  email: string;
  /**
   * PBKDF2 verifier for accounts created or signed in after hashing shipped.
   * Older rows may still hold the original password until that person signs in
   * successfully. The plaintext is then replaced. Rows are not deleted.
   */
  password: string;
  name: string;
  phone?: string;
  createdAt: string;
};

async function loadAccounts(): Promise<LocalAccount[]> {
  try {
    const raw = await AsyncStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as LocalAccount[];
  } catch {
    return [];
  }
}

async function saveAccounts(list: LocalAccount[]): Promise<void> {
  await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list));
}

export async function registerAccount(input: {
  email: string;
  password: string;
  name: string;
  phone?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  const name = input.name.trim();

  if (!email.includes('@')) return { ok: false, error: 'Enter a valid email' };
  if (password.length < 6) return { ok: false, error: 'Password must be at least 6 characters' };
  if (!name) return { ok: false, error: 'Enter your name' };

  const list = await loadAccounts();
  if (list.some((a) => a.email === email)) {
    return { ok: false, error: 'An account with this email already exists' };
  }

  list.push({
    email,
    password: await hashPassword(password),
    name,
    phone: input.phone?.trim() || undefined,
    createdAt: new Date().toISOString(),
  });
  await saveAccounts(list);
  return { ok: true };
}

export async function authenticateAccount(
  email: string,
  password: string,
): Promise<LocalAccount | null> {
  const normalized = email.trim().toLowerCase();
  const list = await loadAccounts();
  const idx = list.findIndex((a) => a.email === normalized);
  if (idx < 0) return null;
  const account = list[idx];

  if (isPasswordHash(account.password)) {
    return verifyPassword(password, account.password) ? account : null;
  }

  // Legacy plaintext row. Upgrade only after the password matches. A mismatch
  // leaves the row untouched so the person can try again.
  if (account.password !== password) return null;
  const hashed = await hashPassword(password);
  // Keep the existing row if the new verifier cannot be checked. Do not clear the account.
  if (!verifyPassword(password, hashed)) return account;
  const upgraded: LocalAccount = { ...account, password: hashed };
  list[idx] = upgraded;
  await saveAccounts(list);
  return upgraded;
}

export async function updateAccountProfile(
  email: string,
  patch: { name?: string; phone?: string; password?: string },
): Promise<LocalAccount | null> {
  const normalized = email.trim().toLowerCase();
  const list = await loadAccounts();
  const idx = list.findIndex((a) => a.email === normalized);
  if (idx < 0) return null;

  const nextPassword =
    patch.password && patch.password.length >= 6
      ? await hashPassword(patch.password)
      : list[idx].password;

  const next: LocalAccount = {
    ...list[idx],
    name: patch.name?.trim() || list[idx].name,
    phone: patch.phone !== undefined ? patch.phone.trim() || undefined : list[idx].phone,
    password: nextPassword,
  };
  list[idx] = next;
  await saveAccounts(list);
  return next;
}

export async function deleteAccount(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  const list = await loadAccounts();
  await saveAccounts(list.filter((a) => a.email !== normalized));
}

export function accountNaviiSeed(email: string) {
  return seedFromEmail(email);
}
