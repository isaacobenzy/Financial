import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import {
  clearAppUnlock,
  isAppUnlocked,
  isBiometricUnlockEnabled,
} from '@/lib/biometrics';
import { getSession } from '@/lib/session';

const PUBLIC = new Set(['/', '/onboarding', '/login', '/unlock']);

/** Re-lock after background when biometric unlock is enabled and the soft session expired. */
export default function BioSessionGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const onChange = async (next: AppStateStatus) => {
      const prev = appState.current;
      appState.current = next;

      if (prev.match(/inactive|background/) && next === 'active') {
        const session = await getSession();
        const bioOn = await isBiometricUnlockEnabled();
        if (!session || !bioOn) return;

        const unlocked = await isAppUnlocked();
        if (!unlocked && !PUBLIC.has(pathname)) {
          await clearAppUnlock();
          router.replace('/unlock');
        }
      }

      if (next === 'background') {
        // Soft expiry is time-based; clearing on background forces Face ID every return.
        // Keep TTL-based unlock instead — no clear here.
      }
    };

    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [pathname, router]);

  return null;
}
