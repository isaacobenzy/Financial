import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { seedFromEmail } from '@/lib/navii';

const SECURE_SESSION_KEY = 'user_session_v2';
const LEGACY_SESSION_KEY = 'user_session_v1';

export type UserSession = {
  email: string;
  name: string;
  phone?: string;
  naviiSeed: string;
  signedInAt: string;
};

async function readSecureSession(): Promise<UserSession | null> {
  try {
    const raw = await SecureStore.getItemAsync(SECURE_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as UserSession;
  } catch {
    return null;
  }
}

async function writeSecureSession(session: UserSession): Promise<void> {
  await SecureStore.setItemAsync(SECURE_SESSION_KEY, JSON.stringify(session));
}

async function migrateLegacySession(): Promise<UserSession | null> {
  try {
    const raw = await AsyncStorage.getItem(LEGACY_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      email: string;
      name?: string;
      phone?: string;
    } | null;
    if (!parsed || !parsed.email) return null;
    const migrated: UserSession = {
      email: parsed.email.trim().toLowerCase(),
      name: parsed.name?.trim() || parsed.email.split('@')[0] || 'User',
      phone: parsed.phone?.trim() || undefined,
      naviiSeed: seedFromEmail(parsed.email.trim().toLowerCase()),
      signedInAt: new Date().toISOString(),
    };
    await writeSecureSession(migrated);
    try {
      await AsyncStorage.removeItem(LEGACY_SESSION_KEY);
    } catch {
      // non-fatal
    }
    return migrated;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<UserSession | null> {
  const secure = await readSecureSession();
  if (secure) return secure;
  return migrateLegacySession();
}

export async function saveSession(
  email: string,
  name?: string,
  phone?: string,
): Promise<UserSession> {
  const normalized = email.trim().toLowerCase();
  const session: UserSession = {
    email: normalized,
    name: name?.trim() || normalized.split('@')[0] || 'User',
    phone: phone?.trim() || undefined,
    naviiSeed: seedFromEmail(normalized),
    signedInAt: new Date().toISOString(),
  };
  await writeSecureSession(session);
  try {
    await AsyncStorage.removeItem(LEGACY_SESSION_KEY);
  } catch {
    // non-fatal
  }
  return session;
}

export async function setSessionActive(
  active: boolean,
  options?: { session?: UserSession },
): Promise<void> {
  if (active) {
    const current = options?.session || (await getSession());
    if (!current) return;
    await writeSecureSession({
      ...current,
      signedInAt: new Date().toISOString(),
    });
    return;
  }
  await clearSession();
}

export async function updateSession(patch: {
  name?: string;
  phone?: string;
}): Promise<UserSession | null> {
  const current = await getSession();
  if (!current) return null;
  const next: UserSession = {
    ...current,
    name: patch.name?.trim() || current.name,
    phone:
      patch.phone !== undefined
        ? patch.phone.trim() || undefined
        : current.phone,
    naviiSeed: seedFromEmail(current.email),
    signedInAt: current.signedInAt || new Date().toISOString(),
  };
  await writeSecureSession(next);
  return next;
}

export async function clearSession(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(SECURE_SESSION_KEY);
  } catch {
    // non-fatal
  }
  try {
    await AsyncStorage.removeItem(LEGACY_SESSION_KEY);
  } catch {
    // non-fatal
  }
}
