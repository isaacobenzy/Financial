import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
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
import { notificationService } from '@/lib/notificationStore';
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
import { notifyAuthEvent } from '@/lib/liveActivity';
import ProfileEditModal from '@/components/ProfileEditModal';
import {
  SettingsNavRow,
  SettingsSection,
  SettingsToggleRow,
} from '@/components/settings/SettingsChrome';

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
  const [profileOpen, setProfileOpen] = useState(false);

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
      notificationService.success('Permissions updated for this device');
    } finally {
      setLoadingPerms(false);
    }
  };

  const toggleBio = async (value: boolean) => {
    if (value) {
      const ok = await enableBiometricUnlock();
      setBioOn(ok);
      if (ok) notificationService.success(`${bioLabel} unlock enabled`);
      else notificationService.error('Could not enable biometrics');
    } else {
      await setBiometricUnlockEnabled(false);
      await clearAppUnlock();
      setBioOn(false);
      notificationService.info(`${bioLabel} unlock turned off`);
    }
    setPermissions(await getPermissionStatuses());
  };

  const logout = async () => {
    await clearSession();
    await clearAppUnlock();
    await notifyAuthEvent('logout');
    router.replace('/login');
  };

  const onPermPress = async (perm: PermissionStatus) => {
    if (perm.alternateAction === 'paste-sms') {
      router.push('/paste-sms');
      return;
    }
    if (!perm.available) {
      notificationService.info(perm.description);
      return;
    }
    if (perm.granted) {
      await openAppSettings();
      return;
    }
    const ok = await requestPermission(perm.id);
    setPermissions(await getPermissionStatuses());
    if (ok) notificationService.success(`${perm.label} is on`, 'Permission granted');
    else notificationService.error(`${perm.label} was denied`, 'Permission needed');
  };

  const visiblePerms = permissions.filter((p) => p.id !== 'biometrics');

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

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        <TouchableOpacity style={styles.profileCard} onPress={() => setProfileOpen(true)}>
          <NaviiAvatar
            seed={session?.naviiSeed || 'guest@financialcopilot.com'}
            size={72}
            mood="serious"
          />
          <View style={styles.profileCopy}>
            <Text style={styles.profileName}>{session?.name || 'Guest'}</Text>
            <Text style={styles.profileEmail}>{session?.email || 'Not signed in'}</Text>
            {session?.phone ? <Text style={styles.profileEmail}>{session.phone}</Text> : null}
            <Text style={styles.editHint}>Tap to edit profile</Text>
          </View>
          <MaterialCommunityIcons name="pencil-outline" size={22} color={theme.colors.brass} />
        </TouchableOpacity>

        <ProfileEditModal
          visible={profileOpen}
          onClose={() => setProfileOpen(false)}
          onSaved={setSession}
        />

        <SettingsSection title="Security">
          <SettingsToggleRow
            icon="fingerprint"
            label={`Unlock with ${bioLabel}`}
            description={
              bioAvailable
                ? 'Required on launch and to reveal a hidden balance'
                : 'Not available on this device'
            }
            value={bioOn}
            onValueChange={toggleBio}
            disabled={!bioAvailable}
            last
          />
        </SettingsSection>

        <SettingsSection title="Preferences">
          <SettingsNavRow
            icon="bell-ring-outline"
            label="Feedback & alerts"
            description="Haptics, toasts, push categories, live widgets"
            onPress={() => router.push('/notifications-settings')}
            last
          />
        </SettingsSection>

        <SettingsSection title="Permissions">
          {visiblePerms.map((perm, index) => (
            <SettingsNavRow
              key={perm.id}
              icon={
                perm.id === 'sms'
                  ? 'message-text-outline'
                  : perm.id === 'storage'
                    ? 'folder-outline'
                    : 'bell-outline'
              }
              label={perm.label}
              description={
                perm.granted
                  ? 'On · tap to open system settings'
                  : perm.alternateAction === 'paste-sms'
                    ? 'Use Paste SMS instead'
                    : 'Tap to allow'
              }
              onPress={() => onPermPress(perm)}
              last={index === visiblePerms.length - 1}
            />
          ))}
        </SettingsSection>

        <View style={styles.actions}>
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

        <SettingsSection title="Data & tools">
          <SettingsNavRow
            icon="message-text-outline"
            label="Import SMS"
            onPress={() => router.push('/import-sms')}
          />
          <SettingsNavRow
            icon="content-paste"
            label="Paste SMS"
            onPress={() => router.push('/paste-sms')}
          />
          <SettingsNavRow
            icon="file-pdf-box"
            label="Upload PDF statement"
            onPress={() => router.push('/import-pdf')}
          />
          <SettingsNavRow
            icon="cash-multiple"
            label="AI assistant"
            onPress={() => router.push('/assistant')}
          />
          <SettingsNavRow
            icon="swap-horizontal"
            label="Transactions"
            onPress={() => router.push('/transactions')}
            last
          />
        </SettingsSection>

        <SettingsSection title="Account">
          <View style={styles.legalBox}>
            <Text style={styles.legalText}>
              Ledger data stays on this device. SMS parsing is local. AI uses your ledger context via
              OpenRouter.
            </Text>
          </View>
          <SettingsNavRow
            icon="logout"
            label="Log out"
            onPress={logout}
            danger
            last
          />
        </SettingsSection>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.paper },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
  },
  backButton: { width: 40 },
  title: { fontSize: 20, fontWeight: '700', color: theme.colors.ink },
  content: { flex: 1 },
  contentInner: { paddingBottom: 120 },
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
  profileName: { fontSize: 18, fontWeight: '700', color: theme.colors.ink },
  profileEmail: { fontSize: 13, color: theme.colors.muted, marginTop: 2 },
  editHint: {
    fontSize: 12,
    color: theme.colors.brass,
    fontWeight: '700',
    marginTop: 6,
  },
  actions: { marginHorizontal: 16, marginTop: 12 },
  primaryBtn: {
    backgroundColor: theme.colors.cedar,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: { color: theme.colors.white, fontWeight: '700', fontSize: 15 },
  secondaryBtn: { marginTop: 10, paddingVertical: 12, alignItems: 'center' },
  secondaryBtnText: { color: theme.colors.brass, fontWeight: '700' },
  legalBox: {
    margin: 14,
    marginBottom: 0,
    backgroundColor: theme.colors.paper,
    borderRadius: theme.radius.md,
    padding: 12,
  },
  legalText: { fontSize: 12, lineHeight: 18, color: theme.colors.muted },
});
