import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { toast } from '@/lib/toast';
import { theme } from '@/constants/theme';
import NaviiAvatar from '@/components/NaviiAvatar';
import { seedFromEmail } from '@/lib/navii';
import { getSession, saveSession } from '@/lib/session';
import { authenticateAccount, registerAccount } from '@/lib/accounts';
import { haptic } from '@/lib/haptics';
import { notifyAuthEvent } from '@/lib/liveActivity';
import {
  authenticateBiometric,
  getBiometricLabel,
  isBiometricUnlockEnabled,
  markAppUnlocked,
} from '@/lib/biometrics';

const DEMO_CREDENTIALS = {
  email: 'demo@financialcopilot.com',
  password: 'demo123',
  name: 'Demo User',
};

export default function LoginScreen() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [bioReady, setBioReady] = useState(false);
  const [bioLabel, setBioLabel] = useState('Biometrics');

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const session = await getSession();
        const enabled = await isBiometricUnlockEnabled();
        setBioReady(Boolean(session && enabled));
        setBioLabel(await getBiometricLabel());
      })();
    }, []),
  );

  const previewSeed = useMemo(
    () => seedFromEmail(email || DEMO_CREDENTIALS.email),
    [email],
  );

  const enterApp = async (displayName?: string) => {
    await markAppUnlocked();
    await haptic('success', 'login');
    await notifyAuthEvent('login', displayName);
    router.replace('/(tabs)');
  };

  const handleAuth = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      toast.error('Enter email and password');
      return;
    }

    if (isLogin) {
      if (
        trimmedEmail === DEMO_CREDENTIALS.email &&
        password === DEMO_CREDENTIALS.password
      ) {
        await saveSession(trimmedEmail, DEMO_CREDENTIALS.name);
        await enterApp(DEMO_CREDENTIALS.name);
        return;
      }

      const account = await authenticateAccount(trimmedEmail, password);
      if (account) {
        await saveSession(account.email, account.name, account.phone);
        await enterApp(account.name);
        return;
      }

      toast.error('Check your email and password, or create an account', 'Invalid login');
      return;
    }

    const result = await registerAccount({
      email: trimmedEmail,
      password,
      name: name.trim() || trimmedEmail.split('@')[0] || 'User',
    });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    const account = await authenticateAccount(trimmedEmail, password);
    if (!account) {
      toast.error('Account created but sign-in failed — try logging in');
      setIsLogin(true);
      return;
    }
    await saveSession(account.email, account.name, account.phone);
    toast.success('Account created');
    await enterApp(account.name);
  };

  const handleBiometricLogin = async () => {
    const session = await getSession();
    if (!session) {
      toast.error('Sign in with your password once first');
      return;
    }
    const ok = await authenticateBiometric(`Sign in with ${bioLabel}`);
    if (ok) {
      await enterApp(session.name);
    } else {
      toast.error('Biometric unlock cancelled');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <NaviiAvatar seed={previewSeed} size={88} mood={isLogin ? 'happy' : 'wink'} />
        <Text style={styles.title}>Financial Copilot</Text>
        <Text style={styles.subtitle}>
          {isLogin ? 'Sign in to your ledger' : 'Create your account'}
        </Text>
      </View>

      <View style={styles.form}>
        {!isLogin ? (
          <View style={styles.inputWrap}>
            <MaterialCommunityIcons name="account-outline" size={20} color={theme.colors.muted} />
            <TextInput
              style={styles.input}
              placeholder="Full name"
              placeholderTextColor={theme.colors.muted}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>
        ) : null}
        <View style={styles.inputWrap}>
          <MaterialCommunityIcons name="email-outline" size={20} color={theme.colors.muted} />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={theme.colors.muted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>
        <View style={styles.inputWrap}>
          <MaterialCommunityIcons name="lock-outline" size={20} color={theme.colors.muted} />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={theme.colors.muted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity style={styles.authButton} onPress={handleAuth}>
          <MaterialCommunityIcons name="login" size={18} color={theme.colors.white} />
          <Text style={styles.authButtonText}>{isLogin ? 'Sign in' : 'Create account'}</Text>
        </TouchableOpacity>

        {bioReady ? (
          <TouchableOpacity style={styles.bioButton} onPress={handleBiometricLogin}>
            <MaterialCommunityIcons name="fingerprint" size={20} color={theme.colors.cedarDeep} />
            <Text style={styles.bioButtonText}>Use {bioLabel}</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={styles.demoButton}
          onPress={() => {
            setIsLogin(true);
            setEmail(DEMO_CREDENTIALS.email);
            setPassword(DEMO_CREDENTIALS.password);
            toast.info('Demo email and password filled in', 'Ready to go');
          }}
        >
          <MaterialCommunityIcons name="account-check-outline" size={18} color={theme.colors.cedarDeep} />
          <Text style={styles.demoButtonText}>Use demo credentials</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.switchButton} onPress={() => setIsLogin(!isLogin)}>
          <Text style={styles.switchButtonText}>
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.paper,
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: theme.colors.ink,
    marginTop: 18,
  },
  subtitle: {
    fontSize: 15,
    color: theme.colors.muted,
    marginTop: 8,
    textAlign: 'center',
  },
  form: {
    padding: 24,
    gap: 14,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.colors.white,
    paddingHorizontal: 14,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: theme.colors.ink,
  },
  authButton: {
    backgroundColor: theme.colors.cedar,
    padding: 16,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  authButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  bioButton: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.cedar,
    padding: 16,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  bioButtonText: {
    color: theme.colors.cedarDeep,
    fontSize: 15,
    fontWeight: '700',
  },
  demoButton: {
    backgroundColor: theme.colors.sage,
    padding: 16,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  demoButtonText: {
    color: theme.colors.cedarDeep,
    fontSize: 15,
    fontWeight: '700',
  },
  switchButton: {
    alignItems: 'center',
    padding: 8,
  },
  switchButtonText: {
    color: theme.colors.brass,
    fontSize: 14,
    fontWeight: '600',
  },
});
