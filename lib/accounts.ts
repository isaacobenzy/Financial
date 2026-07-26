import AsyncStorage from '@react-native-async-storage/async-storage';
import { seedFromEmail } from '@/lib/navii';

const ACCOUNTS_KEY = 'local_accounts_v1';

export type LocalAccount = {
  email: string;
  /** Lightweight local hash — demo-grade, not server auth */
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
    password,
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
  return list.find((a) => a.email === normalized && a.password === password) ?? null;
}

export async function updateAccountProfile(
  email: string,
  patch: { name?: string; phone?: string; password?: string },
): Promise<LocalAccount | null> {
  const normalized = email.trim().toLowerCase();
  const list = await loadAccounts();
  const idx = list.findIndex((a) => a.email === normalized);
  if (idx < 0) {
    // Demo / session-only user — create a stub account row so profile persists
    if (!patch.name && !patch.phone) return null;
    const created: LocalAccount = {
      email: normalized,
      password: patch.password || '••••••',
      name: patch.name?.trim() || normalized.split('@')[0] || 'User',
      phone: patch.phone?.trim(),
      createdAt: new Date().toISOString(),
    };
    list.push(created);
    await saveAccounts(list);
    return created;
  }

  const next: LocalAccount = {
    ...list[idx],
    name: patch.name?.trim() || list[idx].name,
    phone: patch.phone !== undefined ? patch.phone.trim() || undefined : list[idx].phone,
    password: patch.password && patch.password.length >= 6 ? patch.password : list[idx].password,
  };
  list[idx] = next;
  await saveAccounts(list);
  return next;
}

export function accountNaviiSeed(email: string) {
  return seedFromEmail(email);
}
