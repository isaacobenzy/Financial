import AsyncStorage from '@react-native-async-storage/async-storage';
import { seedFromEmail } from '@/lib/navii';

const SESSION_KEY = 'user_session_v1';

export type UserSession = {
  email: string;
  name: string;
  /** Navii avatar seed — stable per user */
  naviiSeed: string;
};

export async function getSession(): Promise<UserSession | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserSession;
  } catch {
    return null;
  }
}

export async function saveSession(email: string, name?: string): Promise<UserSession> {
  const normalized = email.trim().toLowerCase();
  const session: UserSession = {
    email: normalized,
    name: name?.trim() || normalized.split('@')[0] || 'User',
    naviiSeed: seedFromEmail(normalized),
  };
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}
