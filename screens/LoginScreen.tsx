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
import { haptic } from '@/lib/haptics';
import { notifyUser } from '@/lib/notify';
import {
  authenticateBiometric,
  getBiometricLabel,
  isBiometricUnlockEnabled,
  markAppUnlocked,
} from '@/lib/biometrics';

const DEMO_CREDENTIALS = {
  email: 'demo@financialcopilot.com',
  password: 'demo123',
};

export default function LoginScreen() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
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

  const enterApp = async () => {
    await markAppUnlocked();
    router.replace('/(tabs)');
  };

  const handleAuth = async () => {
    if (isLogin) {
      if (email === DEMO_CREDENTIALS.email && password === DEMO_CREDENTIALS.password) {
        await saveSession(email, 'Demo User');
        await haptic('success');
        await notifyUser('Signed in', 'Welcome back to Financial Copilot', 'login');
        await enterApp();
      } else {
        await haptic('error');
        toast.error('Use the demo credentials below', 'Invalid login');
      }
    } else {
      await haptic('warning');
      toast.info('Please use the demo credentials for this build', 'Demo only');
    }
  };

  const handleBiometricLogin = async () => {
    const session = await getSession();
    if (!session) {
      toast.error('Sign in with demo credentials once first');
      return;
    }
    const ok = await authenticateBiometric(`Sign in with ${bioLabel}`);
    if (ok) {
      await haptic('success');
      await notifyUser('Unlocked', `Welcome back, ${session.name}`, 'login');
      router.replace('/(tabs)');
    } else {
      await haptic('error');
      toast.error('Biometric unlock cancelled');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <NaviiAvatar seed={previewSeed} size={88} mood={isLogin ? 'happy' : 'wink'} />
        <Text style={styles.title}>Financial Copilot</Text>
        <Text style={styles.subtitle}>Your AI-powered ledger companion</Text>
      </View>

      <View style={styles.form}>
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
          <Text style={styles.authButtonText}>{isLogin ? 'Login' : 'Sign Up'}</Text>
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
            {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Login'}
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
