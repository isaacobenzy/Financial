import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter, useSegments } from 'expo-router';
import {
  getPermissionStatuses,
  openAppSettings,
  requestAllAppPermissions,
  requestPermission,
  type PermissionStatus,
} from '@/lib/permissions';
import { toast } from '@/lib/toast';
import { theme } from '@/constants/theme';
import NaviiAvatar from '@/components/NaviiAvatar';
import { clearSession, getSession, type UserSession } from '@/lib/session';
import {
  clearAppUnlock,
  getBiometricLabel,
  isBiometricHardwareAvailable,
  isBiometricUnlockEnabled,
  enableBiometricUnlock,
  setBiometricUnlockEnabled,
} from '@/lib/biometrics';
import { haptic, HAPTIC_GUIDE } from '@/lib/haptics';
import { notifyUser } from '@/lib/notify';

export default function SettingsScreen() {
  const router = useRouter();
  const segments = useSegments();
  const isTab = segments.includes('(tabs)');
  const [session, setSession] = useState<UserSession | null>(null);
  const [permissions, setPermissions] = useState<PermissionStatus[]>([]);
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [bioOn, setBioOn] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioLabel, setBioLabel] = useState('Biometrics');

  const refresh = useCallback(async () => {
    setSession(await getSession());
    setPermissions(await getPermissionStatuses());
    setBioOn(await isBiometricUnlockEnabled());
    setBioAvailable(await isBiometricHardwareAvailable());
    setBioLabel(await getBiometricLabel());
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const grantAll = async () => {
    setLoadingPerms(true);
    try {
      const next = await requestAllAppPermissions();
      setPermissions(next);
      await haptic('success');
      toast.success('Permissions updated for this device');
    } finally {
      setLoadingPerms(false);
    }
  };

  const toggleBio = async (value: boolean) => {
    if (value) {
      const ok = await enableBiometricUnlock();
      setBioOn(ok);
      if (ok) {
        await haptic('success');
        toast.success(`${bioLabel} unlock enabled`);
      } else {
        await haptic('error');
        toast.error('Could not enable biometrics');
      }
    } else {
      await setBiometricUnlockEnabled(false);
      await clearAppUnlock();
      setBioOn(false);
      await haptic('selection');
      toast.info(`${bioLabel} unlock turned off`);
    }
    setPermissions(await getPermissionStatuses());
  };

  const logout = async () => {
    await clearSession();
    await clearAppUnlock();
    await haptic('warning');
    await notifyUser('Signed out', 'Your session ended. Come back anytime.', 'logout');
    router.replace('/login');
  };

  const onPermPress = async (perm: PermissionStatus) => {
    await haptic('selection');
    if (perm.alternateAction === 'paste-sms') {
      router.push('/paste-sms');
      return;
    }
    if (!perm.available) {
      toast.info(perm.description);
      return;
    }
    if (perm.granted) {
      await openAppSettings();
      return;
    }
    const ok = await requestPermission(perm.id);
    setPermissions(await getPermissionStatuses());
    if (ok) {
      toast.success(`${perm.label} is on`, 'Permission granted');
      await haptic('success');
    } else {
      toast.error(`${perm.label} was denied`, 'Permission needed');
      await haptic('error');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        {!isTab ? (
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.ink} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backButton} />
        )}
        <Text style={styles.title}>Settings</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.profileCard}>
          <NaviiAvatar
            seed={session?.naviiSeed || 'guest@financialcopilot.com'}
            size={72}
            mood="serious"
          />
          <View style={styles.profileCopy}>
            <Text style={styles.profileName}>{session?.name || 'Guest'}</Text>
            <Text style={styles.profileEmail}>{session?.email || 'Not signed in'}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          <View style={styles.bioRow}>
            <View style={styles.permIcon}>
              <MaterialCommunityIcons name="fingerprint" size={22} color={theme.colors.cedar} />
            </View>
            <View style={styles.permCopy}>
              <Text style={styles.permLabel}>Unlock with {bioLabel}</Text>
              <Text style={styles.permDesc}>
                {bioAvailable
                  ? 'Required on launch and to reveal a hidden balance'
                  : 'Not available on this device'}
              </Text>
            </View>
            <Switch
              value={bioOn}
              onValueChange={toggleBio}
              disabled={!bioAvailable}
              trackColor={{ false: theme.colors.line, true: theme.colors.mint }}
              thumbColor={theme.colors.white}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Haptic feedback</Text>
          <Text style={styles.sectionDescription}>
            Short vibrations mark important actions. Tap “Try feedback” to feel success / error.
          </Text>
          {HAPTIC_GUIDE.slice(0, 6).map((row) => (
            <View key={row.when} style={styles.hapticRow}>
              <Text style={styles.hapticWhen}>{row.when}</Text>
              <Text style={styles.hapticKind}>{row.kind}</Text>
            </View>
          ))}
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={async () => {
              await haptic('success');
              toast.success('That was a success pulse');
              setTimeout(() => void haptic('error'), 400);
            }}
          >
            <Text style={styles.secondaryBtnText}>Try feedback</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Permissions</Text>
          <Text style={styles.sectionDescription}>
            Android can read financial SMS. iOS uses Paste SMS and PDF import instead.
          </Text>

          {permissions
            .filter((p) => p.id !== 'biometrics')
            .map((perm) => (
              <TouchableOpacity key={perm.id} style={styles.permRow} onPress={() => onPermPress(perm)}>
                <View style={styles.permIcon}>
                  <MaterialCommunityIcons
                    name={
                      perm.id === 'sms'
                        ? 'message-text-outline'
                        : perm.id === 'storage'
                          ? 'folder-outline'
                          : 'bell-outline'
                    }
                    size={22}
                    color={perm.granted ? theme.colors.mint : theme.colors.brass}
                  />
                </View>
                <View style={styles.permCopy}>
                  <Text style={styles.permLabel}>{perm.label}</Text>
                  <Text style={styles.permDesc}>{perm.description}</Text>
                </View>
                <MaterialCommunityIcons
                  name={
                    perm.alternateAction === 'paste-sms'
                      ? 'content-paste'
                      : perm.granted
                        ? 'check-circle'
                        : 'chevron-right'
                  }
                  size={22}
                  color={perm.granted ? theme.colors.mint : theme.colors.muted}
                />
              </TouchableOpacity>
            ))}

          <TouchableOpacity style={styles.primaryBtn} onPress={grantAll} disabled={loadingPerms}>
            {loadingPerms ? (
              <ActivityIndicator color={theme.colors.white} />
            ) : (
              <>
                <MaterialCommunityIcons name="shield-check" size={18} color={theme.colors.white} />
                <Text style={styles.primaryBtnText}>Grant available permissions</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={openAppSettings}>
            <Text style={styles.secondaryBtnText}>Open system settings</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account & import</Text>
          <TouchableOpacity style={styles.linkRow} onPress={() => router.push('/import-sms')}>
            <View style={styles.linkLeft}>
              <MaterialCommunityIcons name="message-text-outline" size={20} color={theme.colors.cedar} />
              <Text style={styles.linkText}>Import SMS</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.muted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkRow} onPress={() => router.push('/paste-sms')}>
            <View style={styles.linkLeft}>
              <MaterialCommunityIcons name="content-paste" size={20} color={theme.colors.cedar} />
              <Text style={styles.linkText}>Paste SMS</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.muted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkRow} onPress={() => router.push('/import-pdf')}>
            <View style={styles.linkLeft}>
              <MaterialCommunityIcons name="file-pdf-box" size={20} color={theme.colors.cedar} />
              <Text style={styles.linkText}>Upload PDF statement</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.muted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkRow} onPress={() => router.push('/assistant')}>
            <View style={styles.linkLeft}>
              <MaterialCommunityIcons name="cash-multiple" size={20} color={theme.colors.cedar} />
              <Text style={styles.linkText}>AI assistant</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.muted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkRow} onPress={() => router.push('/transactions')}>
            <View style={styles.linkLeft}>
              <MaterialCommunityIcons name="swap-horizontal" size={20} color={theme.colors.cedar} />
              <Text style={styles.linkText}>Transactions</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.muted} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal</Text>
          <View style={styles.legalBox}>
            <Text style={styles.legalText}>
              Financial Copilot stores ledger data on your device. SMS parsing stays local. AI
              questions use your ledger context via OpenRouter. By using the app you agree to use demo
              credentials responsibly and not submit sensitive OTPs.
            </Text>
          </View>
          <TouchableOpacity style={styles.linkRow} onPress={logout}>
            <View style={styles.linkLeft}>
              <MaterialCommunityIcons name="logout" size={20} color={theme.colors.coral} />
              <Text style={[styles.linkText, { color: theme.colors.coral }]}>Log out</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.coral} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.paper,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
  },
  backButton: {
    width: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  content: { flex: 1 },
  profileCard: {
    marginTop: 20,
    marginHorizontal: 16,
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.lg,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: theme.colors.line,
    ...theme.shadow.soft,
  },
  profileCopy: { flex: 1 },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  profileEmail: {
    fontSize: 13,
    color: theme.colors.muted,
    marginTop: 2,
  },
  naviiBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.paper,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
  },
  naviiBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.brass,
  },
  section: {
    marginTop: 16,
    marginHorizontal: 16,
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  sectionDescription: {
    fontSize: 13,
    color: theme.colors.muted,
    marginTop: 6,
    marginBottom: 14,
    lineHeight: 18,
  },
  bioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  primaryBtn: {
    backgroundColor: theme.colors.cedar,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: {
    color: theme.colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryBtn: {
    marginTop: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: theme.colors.brass,
    fontWeight: '700',
  },
  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
  },
  permIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permCopy: {
    flex: 1,
    marginHorizontal: 12,
  },
  permLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.ink,
  },
  permDesc: {
    fontSize: 12,
    color: theme.colors.muted,
    marginTop: 2,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
  },
  linkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  linkText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.ink,
  },
  legalBox: {
    marginTop: 10,
    marginBottom: 8,
    backgroundColor: theme.colors.paper,
    borderRadius: theme.radius.md,
    padding: 12,
  },
  legalText: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.muted,
  },
  hapticRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
  },
  hapticWhen: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.ink,
    fontWeight: '600',
  },
  hapticKind: {
    fontSize: 12,
    color: theme.colors.brass,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
});
