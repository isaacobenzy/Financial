import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isEnterpriseMode, allowDemoCredentials } from '@/lib/runtime';
import {
  evaluatePassword,
  hashPassword,
  pbkdf2IterationsForRuntime,
  type PasswordHash,
  validateEmail,
  verifyPassword,
} from '@/lib/authCrypto';
import { TERMS_VERSION } from '@/lib/legal';

const ACCOUNTS_KEY = 'accounts_v2';
const LEGACY_ACCOUNTS_KEY = 'accounts_v1';
const DEMO_EMAIL = 'demo@financialcopilot.com';

export type AccountRecord = {
  email: string;
  name: string;
  phone?: string;
  createdAt: string;
  passwordHash: PasswordHash;
  acceptedTermsAt?: string;
  acceptedTermsVersion?: string;
};

export type LegacyAccountRecord = {
  email: string;
  name: string;
  password?: string;
  phone?: string;
  createdAt?: string;
};

export type RegisterResult =
  | { ok: true; email: string; account: AccountRecord }
  | { ok: false; error: string };

async function readAccounts(): Promise<Record<string, AccountRecord>> {
  try {
    const raw = await SecureStore.getItemAsync(ACCOUNTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return Object(parsed) === parsed ? (parsed as Record<string, AccountRecord>) : {};
  } catch {
    return {};
  }
}

async function writeAccounts(list: Record<string, AccountRecord>): Promise<void> {
  const payload = JSON.stringify(list);
  await SecureStore.setItemAsync(ACCOUNTS_KEY, payload);
}

function keyOf(email: string): string {
  return String(email || '').trim().toLowerCase();
}

async function tryLegacyAuthenticate(
  email: string,
  password: string,
): Promise<AccountRecord | null> {
  try {
    const legacy = await AsyncStorage.getItem(LEGACY_ACCOUNTS_KEY);
    if (!legacy) return null;
    const list = JSON.parse(legacy) as LegacyAccountRecord[];
    const key = keyOf(email);
    const found = list.find((l) => keyOf(l.email) === key);
    if (!found) return null;
    if (!found.password) return null;
    if (String(found.password) !== String(password)) return null;

    const hashed = await hashPassword(password);
    const migrated: AccountRecord = {
      email: key,
      name: found.name || key.split('@')[0] || 'User',
      phone: found.phone,
      createdAt: found.createdAt || new Date().toISOString(),
      passwordHash: hashed,
    };
    const accounts = await readAccounts();
    accounts[key] = migrated;
    await writeAccounts(accounts);
    const filteredList = list.filter((l) => keyOf(l.email) !== key);
    try {
      if (filteredList.length === 0) {
        await AsyncStorage.removeItem(LEGACY_ACCOUNTS_KEY);
      } else {
        await AsyncStorage.setItem(
          LEGACY_ACCOUNTS_KEY,
          JSON.stringify(filteredList),
        );
      }
    } catch {
      // non-fatal
    }
    return migrated;
  } catch {
    return null;
  }
}

async function tryLegacyMigrateAll(): Promise<void> {
  try {
    const legacy = await AsyncStorage.getItem(LEGACY_ACCOUNTS_KEY);
    if (!legacy) return;
    const list = JSON.parse(legacy) as LegacyAccountRecord[];
    if (!Array.isArray(list) || list.length === 0) return;
    const accounts = await readAccounts();
    let migrated = 0;
    for (const rec of list) {
      const key = keyOf(rec.email);
      if (!key || accounts[key]) continue;
      const plain = rec.password;
      if (!plain) continue;
      const hashed = await hashPassword(plain);
      accounts[key] = {
        email: key,
        name: rec.name || key.split('@')[0] || 'User',
        phone: rec.phone,
        createdAt: rec.createdAt || new Date().toISOString(),
        passwordHash: hashed,
      };
      migrated++;
    }
    if (migrated > 0) {
      await writeAccounts(accounts);
    }
    try {
      await AsyncStorage.removeItem(LEGACY_ACCOUNTS_KEY);
    } catch {
      // non-fatal
    }
  } catch {
    // non-fatal
  }
}

export async function registerAccount(params: {
  email: string;
  password: string;
  name?: string;
  phone?: string;
  acceptedTerms?: boolean;
}): Promise<RegisterResult> {
  const trimmedEmail = keyOf(params.email);
  const trimmedName = String(params.name || '').trim();
  const trimmedPhone = String(params.phone || '').trim() || undefined;
  const plainPw = String(params.password || '');

  if (!trimmedEmail) return { ok: false, error: 'Email is required' };
  if (!validateEmail(trimmedEmail)) {
    return { ok: false, error: 'Enter a valid email address' };
  }
  if (!plainPw) return { ok: false, error: 'Password is required' };
  if (!params.acceptedTerms) {
    return {
      ok: false,
      error: 'Accept the Terms & Conditions to create an account',
    };
  }

  const strength = evaluatePassword(plainPw);
  const enterprise = isEnterpriseMode();

  if (enterprise) {
    if (strength.score < 2) {
      const need = strength.errors.join(', ');
      return {
        ok: false,
        error: `Password too weak for enterprise. Required: ${need || 'stronger password'}`,
      };
    }
  } else {
    if (plainPw.length < 6) {
      return { ok: false, error: 'Password must be at least 6 characters' };
    }
    if (strength.score < 1) {
      return {
        ok: false,
        error: `Password too simple: ${strength.errors.join(', ')}`,
      };
    }
  }

  try {
    if (await accountExists(trimmedEmail)) {
      return { ok: false, error: 'An account with this email already exists' };
    }

    const passwordHash = await hashPassword(plainPw);
    const displayName =
      trimmedName ||
      trimmedEmail.split('@')[0]?.replace(/[._-]+/g, ' ').trim() ||
      'User';
    const now = new Date().toISOString();
    const record: AccountRecord = {
      email: trimmedEmail,
      name: displayName.replace(/\b\w/g, (c) => c.toUpperCase()),
      phone: trimmedPhone,
      createdAt: now,
      passwordHash,
      acceptedTermsAt: now,
      acceptedTermsVersion: TERMS_VERSION,
    };
    const accounts = await readAccounts();
    if (accounts[trimmedEmail]) {
      return { ok: false, error: 'An account with this email already exists' };
    }
    accounts[trimmedEmail] = record;
    await writeAccounts(accounts);
    return { ok: true, email: trimmedEmail, account: record };
  } catch (err) {
    const message =
      err instanceof Error && err.message
        ? err.message
        : 'Could not create account. Please try again.';
    return { ok: false, error: message };
  }
}

export async function authenticateAccount(
  email: string,
  password: string,
): Promise<AccountRecord | null> {
  const key = keyOf(email);
  if (!key || !password) return null;

  const accounts = await readAccounts();
  let found: AccountRecord | null = accounts[key] || null;
  if (!found) {
    const migrated = await tryLegacyAuthenticate(key, password);
    if (!migrated) return null;
    found = migrated;
  }

  const ok = await verifyPassword(password, found.passwordHash);
  if (!ok) return null;

  // After a successful login, quietly refresh older high-cost hashes so the
  // next sign-in feels snappy without blocking this one.
  if (found.passwordHash.iterations !== pbkdf2IterationsForRuntime()) {
    void (async () => {
      try {
        const latest = await readAccounts();
        const rec = latest[key];
        if (!rec) return;
        rec.passwordHash = await hashPassword(password);
        latest[key] = rec;
        await writeAccounts(latest);
      } catch {
        /* non-fatal */
      }
    })();
  }

  return {
    email: found.email,
    name: found.name,
    phone: found.phone,
    createdAt: found.createdAt,
    passwordHash: found.passwordHash,
  };
}

export async function updateAccountProfile(
  email: string,
  patch: Partial<{ name: string; phone: string }>,
): Promise<AccountRecord | null> {
  const key = keyOf(email);
  if (!key) return null;
  const accounts = await readAccounts();
  const account = accounts[key];
  if (!account) return null;
  if (typeof patch.name === 'string') {
    const trimmed = patch.name.trim();
    if (trimmed) account.name = trimmed;
  }
  if (typeof patch.phone === 'string') {
    const trimmed = patch.phone.trim();
    account.phone = trimmed || undefined;
  }
  accounts[key] = account;
  await writeAccounts(accounts);
  return account;
}

export async function accountExists(email: string): Promise<boolean> {
  const key = keyOf(email);
  if (!key) return false;
  if (allowDemoCredentials() && key === keyOf(DEMO_EMAIL)) return true;
  const accounts = await readAccounts();
  if (accounts[key]) return true;
  try {
    const legacy = await AsyncStorage.getItem(LEGACY_ACCOUNTS_KEY);
    if (!legacy) return false;
    const list = JSON.parse(legacy) as LegacyAccountRecord[];
    return list.some((l) => keyOf(l.email) === key);
  } catch {
    return false;
  }
}

export type ChangePasswordResult =
  | { ok: true }
  | { ok: false; error: string };

export async function changeAccountPassword(
  email: string,
  recoveryCode: string,
  newPassword: string,
): Promise<ChangePasswordResult> {
  const key = keyOf(email);
  if (!key) return { ok: false, error: 'Enter your email on file first' };
  if (!newPassword) return { ok: false, error: 'Enter a new password' };
  const strength = evaluatePassword(newPassword);
  if (isEnterpriseMode()) {
    if (strength.score < 2) {
      const need = strength.errors.join(', ');
      return {
        ok: false,
        error: need
          ? `Password too weak for enterprise: ${need}`
          : 'Password too weak for enterprise',
      };
    }
  } else if (newPassword.length < 6 || strength.score < 1) {
    return {
      ok: false,
      error: strength.errors.length
        ? `Password too simple: ${strength.errors.join(', ')}`
        : 'Password too simple',
    };
  }

  const isDemoReset =
    allowDemoCredentials() && key === keyOf(DEMO_EMAIL);

  if (isDemoReset) {
    const exists = await accountExists(DEMO_EMAIL);
    if (!exists) {
      const seeded = await registerAccount({
        email: DEMO_EMAIL,
        password: newPassword,
        name: 'Demo User',
        acceptedTerms: true,
      });
      if (!seeded.ok) return { ok: false, error: seeded.error };
    } else {
      const accounts = await readAccounts();
      const rec = accounts[key];
      if (!rec) {
        accounts[key] = {
          email: key,
          name: 'Demo User',
          createdAt: new Date().toISOString(),
          passwordHash: await hashPassword(newPassword),
        };
        await writeAccounts(accounts);
      } else {
        accounts[key] = {
          ...rec,
          passwordHash: await hashPassword(newPassword),
        };
        await writeAccounts(accounts);
      }
    }
    return { ok: true };
  }

  const accounts = await readAccounts();
  const rec = accounts[key];
  if (!rec) {
    try {
      const legacy = await AsyncStorage.getItem(LEGACY_ACCOUNTS_KEY);
      if (legacy) {
        const list = JSON.parse(legacy) as LegacyAccountRecord[];
        const idx = list.findIndex((l) => keyOf(l.email) === key);
        if (idx >= 0) {
          const was = list[idx];
          list.splice(idx, 1);
          try {
            if (list.length === 0) {
              await AsyncStorage.removeItem(LEGACY_ACCOUNTS_KEY);
            } else {
              await AsyncStorage.setItem(
                LEGACY_ACCOUNTS_KEY,
                JSON.stringify(list),
              );
            }
          } catch {
            /* non-fatal */
          }
          accounts[key] = {
            email: key,
            name: was.name || key.split('@')[0] || 'User',
            phone: was.phone,
            createdAt: was.createdAt || new Date().toISOString(),
            passwordHash: await hashPassword(newPassword),
          };
          await writeAccounts(accounts);
          return { ok: true };
        }
      }
    } catch {
      /* fall through */
    }
    return { ok: false, error: "We don't have that email on file. Sign up instead." };
  }

  accounts[key] = {
    ...rec,
    passwordHash: await hashPassword(newPassword),
  };
  await writeAccounts(accounts);
  return { ok: true };
}
