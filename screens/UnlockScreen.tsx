import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import {
  authenticateBiometric,
  getBiometricLabel,
  isAppUnlocked,
  isBiometricUnlockEnabled,
} from '@/lib/biometrics';
import { getSession } from '@/lib/session';
import { haptic } from '@/lib/haptics';
import NaviiAvatar from '@/components/NaviiAvatar';

export default function UnlockScreen() {
  const router = useRouter();
  const [label, setLabel] = useState('Biometrics');
  const [name, setName] = useState('User');
  const [seed, setSeed] = useState('guest@financialcopilot.com');
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const session = await getSession();
      if (!session) {
        router.replace('/login');
        return;
      }
      if (cancelled) return;
      setName(session.name);
      setSeed(session.naviiSeed);
      setLabel(await getBiometricLabel());

      const enabled = await isBiometricUnlockEnabled();
      if (!enabled || (await isAppUnlocked())) {
        router.replace('/(tabs)');
        return;
      }
      setReady(true);
      setBusy(true);
      const ok = await authenticateBiometric(`Unlock Financial Copilot`);
      if (cancelled) return;
      if (ok) {
        await haptic('success');
        router.replace('/(tabs)');
      } else {
        await haptic('error');
        setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const tryUnlock = async () => {
    setBusy(true);
    try {
      const ok = await authenticateBiometric(`Unlock with ${label}`);
      if (ok) {
        await haptic('success');
        router.replace('/(tabs)');
      } else {
        await haptic('error');
      }
    } finally {
      setBusy(false);
    }
  };

  if (!ready) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={theme.colors.cedar} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <NaviiAvatar seed={seed} size={88} mood="serious" />
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>{name}</Text>
        <Text style={styles.hint}>Use {label} to open your ledger</Text>

        <TouchableOpacity style={styles.primary} onPress={tryUnlock} disabled={busy}>
          {busy ? (
            <ActivityIndicator color={theme.colors.white} />
          ) : (
            <>
              <MaterialCommunityIcons name="fingerprint" size={22} color={theme.colors.white} />
              <Text style={styles.primaryText}>Unlock with {label}</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondary}
          onPress={async () => {
            await haptic('selection');
            router.replace('/login');
          }}
        >
          <Text style={styles.secondaryText}>Use password instead</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.paper,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.lg,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.line,
    ...theme.shadow.soft,
  },
  title: {
    marginTop: 16,
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 15,
    color: theme.colors.muted,
  },
  hint: {
    marginTop: 12,
    fontSize: 13,
    color: theme.colors.brass,
    fontWeight: '600',
    textAlign: 'center',
  },
  primary: {
    marginTop: 28,
    width: '100%',
    backgroundColor: theme.colors.cedar,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryText: {
    color: theme.colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
  secondary: {
    marginTop: 14,
    paddingVertical: 10,
  },
  secondaryText: {
    color: theme.colors.brass,
    fontWeight: '700',
  },
});
