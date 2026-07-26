import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ScrollView,
  useWindowDimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import NaviiAvatar from '@/components/NaviiAvatar';
import PrimaryButton from '@/components/PrimaryButton';
import { seedFromEmail } from '@/lib/navii';
import { getSession, saveSession } from '@/lib/session';
import {
  accountExists,
  authenticateAccount,
  changeAccountPassword,
  registerAccount,
} from '@/lib/accounts';
import { haptics } from '@/lib/haptics';
import { notificationService } from '@/lib/notificationStore';
import { notifyAuthEvent } from '@/lib/liveActivity';
import {
  authenticateBiometric,
  getBiometricLabel,
  isBiometricUnlockEnabled,
  markAppUnlocked,
} from '@/lib/biometrics';
import { allowDemoCredentials, isEnterpriseMode } from '@/lib/runtime';

const DEMO_CREDENTIALS = {
  email: 'demo@financialcopilot.com',
  password: 'demo123',
  name: 'Demo User',
};

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const isLogin = mode === 'login';
  const isSignup = mode === 'signup';
  const isForgot = mode === 'forgot';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [bioReady, setBioReady] = useState(false);
  const [bioLabel, setBioLabel] = useState('Biometrics');
  const [submitBusy, setSubmitBusy] = useState(false);
  const nameRef = React.useRef<TextInput>(null);
  const emailRef = React.useRef<TextInput>(null);
  const passwordRef = React.useRef<TextInput>(null);
  const resetStep1Ref = React.useRef<TextInput>(null);
  const resetStep2Ref = React.useRef<TextInput>(null);
  const resetStep3Ref = React.useRef<TextInput>(null);

  const [forgotStep, setForgotStep] = useState<'email' | 'new' | 'done'>('email');
  const [forgotNewPw, setForgotNewPw] = useState('');
  const [forgotConfirmPw, setForgotConfirmPw] = useState('');
  const [forgotShowPw, setForgotShowPw] = useState(false);
  const [forgotShowConfirmPw, setForgotShowConfirmPw] = useState(false);
  const [forgotVerifyCode, setForgotVerifyCode] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

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
    try {
      await markAppUnlocked();
    } catch {
      /* ignore non-critical */
    }
    try {
      void notifyAuthEvent('login', displayName);
    } catch {
      /* ignore non-critical */
    }
    try {
      await router.replace('/(tabs)');
    } catch {
      /* ignore non-critical */
    }
  };

  const switchMode = (next: 'login' | 'signup' | 'forgot') => {
    setMode(next);
    setSubmitBusy(false);
    setPassword('');
    setConfirmPassword('');
    setShowPw(false);
    setShowConfirmPw(false);
    setForgotStep('email');
    setForgotNewPw('');
    setForgotConfirmPw('');
    setForgotShowPw(false);
    setForgotShowConfirmPw(false);
    setForgotVerifyCode('');
    if (next !== 'signup') setAcceptedTerms(false);
  };

  const handleAuth = async () => {
    if (submitBusy) return;
    Keyboard.dismiss();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !password) {
      notificationService.error('Enter email and password');
      return;
    }

    if (isSignup) {
      if (password !== confirmPassword) {
        notificationService.error('Passwords do not match');
        return;
      }
      if (!acceptedTerms) {
        notificationService.error(
          'Accept the Terms & Conditions to create an account',
        );
        return;
      }
    }

    setSubmitBusy(true);
    // Let the loading state paint before CPU-heavy password hashing.
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => setTimeout(resolve, 20));
    });

    try {
      if (isLogin) {
        const demoAllowed = allowDemoCredentials();
        if (
          demoAllowed &&
          trimmedEmail === DEMO_CREDENTIALS.email &&
          password === DEMO_CREDENTIALS.password
        ) {
          await saveSession(trimmedEmail, DEMO_CREDENTIALS.name);
          notificationService.success('Signed in');
          await enterApp(DEMO_CREDENTIALS.name);
          return;
        }

        const account = await authenticateAccount(trimmedEmail, password);
        if (account) {
          await saveSession(account.email, account.name, account.phone);
          notificationService.success('Signed in');
          await enterApp(account.name);
          return;
        }

        notificationService.error(
          'Check your email and password, or create an account',
          'Invalid login',
        );
        return;
      }

      if (isSignup) {
        const result = await registerAccount({
          email: trimmedEmail,
          password,
          name: name.trim() || trimmedEmail.split('@')[0] || 'User',
          acceptedTerms: true,
        });
        if (!result.ok) {
          notificationService.error(result.error);
          return;
        }
        await saveSession(
          result.account.email,
          result.account.name,
          result.account.phone,
        );
        notificationService.success('Account created');
        await enterApp(result.account.name);
      }
    } finally {
      setSubmitBusy(false);
    }
  };

  const handleForgotSubmit = async () => {
    if (submitBusy) return;
    setSubmitBusy(true);
    Keyboard.dismiss();
    try {
      if (forgotStep === 'email') {
        const trimmedEmail = email.trim().toLowerCase();
        if (!trimmedEmail) {
          notificationService.error('Enter your email');
          return;
        }
        const exists = await accountExists(trimmedEmail);
        if (!exists && !allowDemoCredentials()) {
          notificationService.error(
            "We don't have that email on file. Sign up instead.",
            'Unknown email',
          );
          return;
        }
        setForgotVerifyCode('');
        notificationService.info(
          `On-device reset ready for ${trimmedEmail}`,
          'Local recovery',
        );
        setForgotStep('new');
        return;
      }
      if (forgotStep === 'new') {
        const trimmedEmail = email.trim().toLowerCase();
        if (!trimmedEmail) {
          notificationService.error('Enter your email');
          setForgotStep('email');
          return;
        }
        if (!forgotNewPw) {
          notificationService.error('Enter a new password');
          return;
        }
        if (forgotNewPw !== forgotConfirmPw) {
          notificationService.error('Passwords do not match');
          return;
        }
        const changed = await changeAccountPassword(
          trimmedEmail,
          forgotVerifyCode.trim(),
          forgotNewPw,
        );
        if (!changed.ok) {
          notificationService.error(changed.error);
          return;
        }
        setForgotStep('done');
        setEmail(trimmedEmail);
        setPassword('');
        notificationService.success('Password reset complete');
        return;
      }
      if (forgotStep === 'done') {
        switchMode('login');
      }
    } finally {
      setSubmitBusy(false);
    }
  };

  const handleBiometricLogin = async () => {
    Keyboard.dismiss();
    const session = await getSession();
    if (!session) {
      notificationService.error('Sign in with your password once first');
      return;
    }
    const ok = await authenticateBiometric(`Sign in with ${bioLabel}`);
    if (ok) {
      await enterApp(session.name);
    } else {
      notificationService.error('Biometric unlock cancelled');
    }
  };

  const dismissKeyboard = () => Keyboard.dismiss();
  const iosKbOffset = Math.max(insets.top, 0);
  const avatarSize = windowHeight < 680 ? 64 : 88;
  const enterprise = isEnterpriseMode();
  const canUseDemo = allowDemoCredentials();

  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const confirmPwRef = React.useRef<TextInput>(null);

  const handleSubmit = async () => {
    if (isForgot) {
      await handleForgotSubmit();
      return;
    }
    await handleAuth();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? iosKbOffset : 0}
      >
        <TouchableWithoutFeedback onPress={dismissKeyboard}>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: Math.max(insets.bottom + 24, 32) },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          >
            <View style={styles.header}>
              <NaviiAvatar
                seed={previewSeed}
                size={avatarSize}
                mood={
                  isForgot ? 'wink' : isLogin ? 'happy' : 'wink'
                }
              />
              <Text style={[styles.title, windowHeight < 680 && styles.titleCompact]}>
                Financial Copilot
              </Text>
              <Text style={styles.subtitle}>
                {isForgot
                  ? forgotStep === 'done'
                    ? 'Password reset complete'
                    : forgotStep === 'new'
                      ? 'Set a new password'
                      : 'Recover access to your ledger'
                  : enterprise
                    ? isLogin
                      ? 'Secure sign-in · encrypted storage'
                      : 'Secure sign-up · encrypted storage'
                    : isLogin
                      ? 'Sign in to your ledger'
                      : 'Create your account'}
              </Text>
            </View>

            <View style={styles.form}>
              {!isForgot && isSignup ? (
                <View style={styles.inputWrap}>
                  <MaterialCommunityIcons
                    name="account-outline"
                    size={20}
                    color={theme.colors.muted}
                  />
                  <TextInput
                    ref={nameRef}
                    style={styles.input}
                    placeholder="Full name"
                    placeholderTextColor={theme.colors.muted}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    returnKeyType="next"
                    onSubmitEditing={() => emailRef.current?.focus()}
                    blurOnSubmit={false}
                  />
                </View>
              ) : null}

              {!isForgot ? (
                <View style={styles.inputWrap}>
                  <MaterialCommunityIcons
                    name="email-outline"
                    size={20}
                    color={theme.colors.muted}
                  />
                  <TextInput
                    ref={emailRef}
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor={theme.colors.muted}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    blurOnSubmit={false}
                  />
                </View>
              ) : forgotStep === 'email' ? (
                <View style={styles.inputWrap}>
                  <MaterialCommunityIcons
                    name="email-outline"
                    size={20}
                    color={theme.colors.muted}
                  />
                  <TextInput
                    ref={resetStep1Ref}
                    style={styles.input}
                    placeholder="Your email on file"
                    placeholderTextColor={theme.colors.muted}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    returnKeyType="done"
                    onSubmitEditing={() => void handleForgotSubmit()}
                    blurOnSubmit={false}
                  />
                </View>
              ) : null}

              {forgotStep === 'new' ? (
                <View style={styles.inputWrap}>
                  <MaterialCommunityIcons
                    name="email-outline"
                    size={20}
                    color={theme.colors.muted}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Recovery email (read-only)"
                    placeholderTextColor={theme.colors.muted}
                    value={email}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    editable={false}
                    selectTextOnFocus={false}
                  />
                </View>
              ) : null}

              {!isForgot ? (
                <View style={styles.inputWrap}>
                  <MaterialCommunityIcons
                    name="lock-outline"
                    size={20}
                    color={theme.colors.muted}
                  />
                  <TextInput
                    ref={passwordRef}
                    style={styles.input}
                    placeholder={isLogin ? 'Password' : 'New password'}
                    placeholderTextColor={theme.colors.muted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPw}
                    returnKeyType={isLogin ? 'done' : 'next'}
                    onSubmitEditing={() => {
                      if (isLogin) void handleSubmit();
                      else confirmPwRef.current?.focus();
                    }}
                    blurOnSubmit={false}
                    autoCorrect={false}
                    autoCapitalize="none"
                  />
                  <View style={styles.inputRight}>
                    <TouchableOpacity
                      onPress={() => {
                        setShowPw((v) => !v);
                        void haptics.select();
                      }}
                      hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
                    >
                      <MaterialCommunityIcons
                        name={showPw ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={theme.colors.muted}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : forgotStep === 'new' ? (
                <View style={styles.inputWrap}>
                  <MaterialCommunityIcons
                    name="lock-outline"
                    size={20}
                    color={theme.colors.muted}
                  />
                  <TextInput
                    ref={resetStep2Ref}
                    style={styles.input}
                    placeholder="New password"
                    placeholderTextColor={theme.colors.muted}
                    value={forgotNewPw}
                    onChangeText={setForgotNewPw}
                    secureTextEntry={!forgotShowPw}
                    returnKeyType="next"
                    onSubmitEditing={() => resetStep3Ref.current?.focus()}
                    blurOnSubmit={false}
                    autoCorrect={false}
                    autoCapitalize="none"
                  />
                  <View style={styles.inputRight}>
                    <TouchableOpacity
                      onPress={() => {
                        setForgotShowPw((v) => !v);
                        void haptics.select();
                      }}
                      hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
                    >
                      <MaterialCommunityIcons
                        name={forgotShowPw ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={theme.colors.muted}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}

              {(!isForgot && isSignup) ? (
                <View style={styles.inputWrap}>
                  <MaterialCommunityIcons
                    name="lock-check-outline"
                    size={20}
                    color={theme.colors.muted}
                  />
                  <TextInput
                    ref={confirmPwRef}
                    style={styles.input}
                    placeholder="Confirm password"
                    placeholderTextColor={theme.colors.muted}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPw}
                    returnKeyType="done"
                    onSubmitEditing={() => void handleSubmit()}
                    autoCorrect={false}
                    autoCapitalize="none"
                  />
                  <View style={styles.inputRight}>
                    <TouchableOpacity
                      onPress={() => {
                        setShowConfirmPw((v) => !v);
                        void haptics.select();
                      }}
                      hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
                    >
                      <MaterialCommunityIcons
                        name={showConfirmPw ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={theme.colors.muted}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}

              {isForgot && forgotStep === 'new' ? (
                <View style={styles.inputWrap}>
                  <MaterialCommunityIcons
                    name="lock-check-outline"
                    size={20}
                    color={theme.colors.muted}
                  />
                  <TextInput
                    ref={resetStep3Ref}
                    style={styles.input}
                    placeholder="Confirm new password"
                    placeholderTextColor={theme.colors.muted}
                    value={forgotConfirmPw}
                    onChangeText={setForgotConfirmPw}
                    secureTextEntry={!forgotShowConfirmPw}
                    returnKeyType="done"
                    onSubmitEditing={() => void handleSubmit()}
                    autoCorrect={false}
                    autoCapitalize="none"
                  />
                  <View style={styles.inputRight}>
                    <TouchableOpacity
                      onPress={() => {
                        setForgotShowConfirmPw((v) => !v);
                        void haptics.select();
                      }}
                      hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
                    >
                      <MaterialCommunityIcons
                        name={forgotShowConfirmPw ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={theme.colors.muted}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}

              {isForgot && forgotStep !== 'done' ? (
                <View style={styles.recoverNote}>
                  <MaterialCommunityIcons
                    name="shield-lock-outline"
                    size={16}
                    color={theme.colors.cedarDeep}
                  />
                  <Text style={styles.recoverNoteText}>
                    Recoveries run on-device since this app keeps your encrypted ledger locally.
                  </Text>
                </View>
              ) : null}

              {!isForgot && isSignup ? (
                <View style={styles.termsRow}>
                  <TouchableOpacity
                    style={[
                      styles.termsCheck,
                      acceptedTerms && styles.termsCheckOn,
                    ]}
                    onPress={() => {
                      setAcceptedTerms((v) => !v);
                      void haptics.select();
                    }}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: acceptedTerms }}
                    hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                  >
                    {acceptedTerms ? (
                      <MaterialCommunityIcons
                        name="check"
                        size={16}
                        color={theme.colors.white}
                      />
                    ) : null}
                  </TouchableOpacity>
                  <Text style={styles.termsText}>
                    I agree to the{' '}
                    <Text
                      style={styles.termsLink}
                      onPress={() => {
                        void haptics.select();
                        router.push('/terms');
                      }}
                    >
                      Terms & Conditions
                    </Text>
                  </Text>
                </View>
              ) : null}

              <PrimaryButton
                label={
                  isForgot
                    ? forgotStep === 'email'
                      ? 'Continue'
                      : forgotStep === 'new'
                        ? 'Reset password'
                        : 'Back to sign in'
                    : isLogin
                      ? submitBusy
                        ? 'Signing in…'
                        : 'Sign in'
                      : submitBusy
                        ? 'Creating account…'
                        : 'Create account'
                }
                icon={
                  isForgot
                    ? forgotStep === 'done'
                      ? 'login'
                      : 'shield-check-outline'
                    : 'login'
                }
                onPress={handleSubmit}
                loading={submitBusy}
                disabled={submitBusy || (isSignup && !acceptedTerms)}
              />

              {!isForgot && bioReady ? (
                <PrimaryButton
                  label={`Use ${bioLabel}`}
                  icon="fingerprint"
                  variant="secondary"
                  onPress={handleBiometricLogin}
                />
              ) : null}

              {!isForgot ? (
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or continue with</Text>
                  <View style={styles.dividerLine} />
                </View>
              ) : null}

              {!isForgot ? (
                <View style={styles.oauthRow}>
                  <TouchableOpacity
                    style={styles.oauthBtn}
                    activeOpacity={0.7}
                    onPress={async () => {
                      dismissKeyboard();
                      await haptics.select();
                      notificationService.info(
                        'Google sign-in coming soon with an enterprise build',
                        'Google',
                      );
                    }}
                  >
                    <MaterialCommunityIcons
                      name="google"
                      size={22}
                      color={theme.colors.ink}
                    />
                    <Text style={styles.oauthText}>Google</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.oauthBtn}
                    activeOpacity={0.7}
                    onPress={async () => {
                      dismissKeyboard();
                      await haptics.select();
                      notificationService.info(
                        'Apple sign-in coming soon with an enterprise build',
                        'Apple',
                      );
                    }}
                  >
                    <MaterialCommunityIcons
                      name="apple"
                      size={22}
                      color={theme.colors.ink}
                    />
                    <Text style={styles.oauthText}>Apple</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {!isForgot && canUseDemo ? (
                <TouchableOpacity
                  style={styles.demoButton}
                  onPress={async () => {
                    await haptics.select();
                    switchMode('login');
                    setEmail(DEMO_CREDENTIALS.email);
                    setPassword(DEMO_CREDENTIALS.password);
                    notificationService.info(
                      'Demo email and password filled in',
                      'Ready to go',
                    );
                  }}
                >
                  <MaterialCommunityIcons
                    name="account-check-outline"
                    size={18}
                    color={theme.colors.cedarDeep}
                  />
                  <Text style={styles.demoButtonText}>Use demo credentials</Text>
                </TouchableOpacity>
              ) : null}

              {isLogin && !isForgot ? (
                <TouchableOpacity
                  style={styles.forgotButton}
                  onPress={() => {
                    switchMode('forgot');
                    setForgotStep('email');
                  }}
                >
                  <MaterialCommunityIcons
                    name="help-circle-outline"
                    size={16}
                    color={theme.colors.brass}
                  />
                  <Text style={styles.forgotButtonText}>Forgot password?</Text>
                </TouchableOpacity>
              ) : null}

              {!isForgot ? (
                <TouchableOpacity
                  style={styles.switchButton}
                  onPress={() => switchMode(isLogin ? 'signup' : 'login')}
                >
                  <Text style={styles.switchButtonText}>
                    {isLogin
                      ? "Don't have an account? Sign up"
                      : 'Already have an account? Sign in'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.switchButton}
                  onPress={() => switchMode('login')}
                >
                  <Text style={styles.switchButtonText}>Back to sign in</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.paper,
  },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 16,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: theme.colors.ink,
    marginTop: 16,
  },
  titleCompact: {
    fontSize: 22,
  },
  subtitle: {
    fontSize: 15,
    color: theme.colors.muted,
    marginTop: 6,
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
  inputRight: {
    paddingLeft: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recoverNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: theme.colors.sage,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: theme.radius.sm,
  },
  recoverNoteText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.cedarDeep,
    lineHeight: 18,
    fontWeight: '500',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 2,
  },
  termsCheck: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  termsCheckOn: {
    backgroundColor: theme.colors.cedar,
    borderColor: theme.colors.cedar,
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: theme.colors.muted,
    fontWeight: '500',
  },
  termsLink: {
    color: theme.colors.brass,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  forgotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    gap: 6,
  },
  forgotButtonText: {
    color: theme.colors.brass,
    fontSize: 14,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
    marginBottom: 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.line,
  },
  dividerText: {
    fontSize: 12,
    color: theme.colors.muted,
    fontWeight: '600',
  },
  oauthRow: {
    flexDirection: 'row',
    gap: 12,
  },
  oauthBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
  },
  oauthText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.ink,
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
