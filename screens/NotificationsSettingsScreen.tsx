import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { useNotificationSettingsStore } from '@/lib/notificationSettingsStore';
import {
  registerForPushNotifications,
} from '@/lib/pushNotifications';
import { notificationService } from '@/lib/notificationStore';
import {
  isEnterpriseMode,
  isWeb,
  showExpoBanners,
  supportsSystemNotifications,
} from '@/lib/runtime';
import { haptics } from '@/lib/haptics';
import {
  getLiveSectionPrefs,
  publishLiveSections,
  setLiveSectionPref,
  type LiveSection,
  type LiveSectionPrefs,
} from '@/lib/liveActivity';
import {
  SettingsSection,
  SettingsToggleRow,
} from '@/components/settings/SettingsChrome';

const LIVE_ROWS: Array<{
  key: LiveSection;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  desc: string;
}> = [
  {
    key: 'overview',
    icon: 'view-dashboard-outline',
    label: 'Overview live',
    desc: 'Balance · goal · streak summary',
  },
  {
    key: 'balance',
    icon: 'wallet-outline',
    label: 'Balance widget',
    desc: 'Lock-screen balance strip',
  },
  {
    key: 'goals',
    icon: 'bullseye-arrow',
    label: 'Goals widget',
    desc: 'Top goal progress on lock screen',
  },
  {
    key: 'streak',
    icon: 'fire',
    label: 'Streak widget',
    desc: 'Daily money streak status',
  },
];

export default function NotificationsSettingsScreen() {
  const router = useRouter();
  const store = useNotificationSettingsStore();
  const [busy, setBusy] = useState(false);
  const [livePrefs, setLivePrefs] = useState<LiveSectionPrefs>({
    overview: false,
    balance: false,
    goals: false,
    streak: false,
  });
  const onWeb = isWeb();
  const enterprise = isEnterpriseMode();
  const showBanners = showExpoBanners();
  const pushSupported = supportsSystemNotifications();

  useFocusEffect(
    useCallback(() => {
      void store.hydrate();
      void getLiveSectionPrefs().then(setLivePrefs);
    }, [store]),
  );

  const handlePushToggle = async (enabled: boolean) => {
    store.setPushEnabled(enabled);
    if (enabled) {
      setBusy(true);
      try {
        const next = await registerForPushNotifications();
        if (next) notificationService.success('Push notifications enabled');
        else {
          notificationService.warning('Enable notifications in device settings');
        }
      } finally {
        setBusy(false);
      }
    }
  };

  const toggleLive = async (section: LiveSection, value: boolean) => {
    if (!pushSupported) {
      notificationService.info('Live lock-screen widgets need a development build');
      return;
    }
    const next = await setLiveSectionPref(section, value);
    setLivePrefs(next);
    if (value) await publishLiveSections();
    notificationService.info(value ? `${section} widget on` : `${section} widget off`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>
          {enterprise ? 'Enterprise alerts' : 'Feedback & alerts'}
        </Text>
        <View style={styles.back} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>
          {enterprise
            ? 'Manage OS push notifications, haptics, and live widgets for your organization-issued device.'
            : 'Feel haptics, see in-app toasts, and hear OS push. Toggle what stays live on your lock screen.'}
        </Text>

        {onWeb ? (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>
              Web preview shows in-app toasts only. Install the native app for OS push and
              lock-screen widgets.
            </Text>
          </View>
        ) : null}

        {showBanners ? (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>
              Limited notification support in Expo Go. Build a native preview APK for full
              lock-screen alerts.
            </Text>
          </View>
        ) : null}

        <SettingsSection title="Master">
          <SettingsToggleRow
            icon="bell-outline"
            label="Enable push notifications"
            description="Master switch for all OS alerts"
            value={store.pushEnabled}
            onValueChange={handlePushToggle}
          />
          <SettingsToggleRow
            icon="vibrate"
            label="Haptic feedback"
            description="Paired with toasts and key actions"
            value={store.hapticsEnabled}
            onValueChange={store.setHapticsEnabledSetting}
            last
          />
        </SettingsSection>

        <SettingsSection title="Alert categories">
          <SettingsToggleRow
            label="Live ledger"
            description="Balance / lock-screen live updates"
            value={store.ledgerLive}
            onValueChange={store.setLedgerLive}
          />
          <SettingsToggleRow
            label="Goals & milestones"
            description="Created, updated, almost done, completed"
            value={store.goalAlerts}
            onValueChange={store.setGoalAlerts}
          />
          <SettingsToggleRow
            label="Streak reminders"
            description="Daily check-in and risk alerts"
            value={store.streakAlerts}
            onValueChange={store.setStreakAlerts}
          />
          <SettingsToggleRow
            label="Import digests"
            description="SMS / paste import summaries"
            value={store.importAlerts}
            onValueChange={store.setImportAlerts}
          />
          <SettingsToggleRow
            label="Insights & nudges"
            description="Spend anomalies and tips"
            value={store.insightAlerts}
            onValueChange={store.setInsightAlerts}
          />
          <SettingsToggleRow
            label="Security"
            description="Sign-in and session events"
            value={store.securityAlerts}
            onValueChange={store.setSecurityAlerts}
            last
          />
        </SettingsSection>

        <SettingsSection title="Live lock-screen widgets">
          {LIVE_ROWS.map((row, i) => (
            <SettingsToggleRow
              key={row.key}
              icon={row.icon}
              label={row.label}
              description={row.desc}
              value={livePrefs[row.key]}
              onValueChange={(v) => toggleLive(row.key, v)}
              last={i === LIVE_ROWS.length - 1}
            />
          ))}
        </SettingsSection>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.secondary}
            onPress={async () => {
              await haptics.buttonPress();
              await publishLiveSections();
              notificationService.success('Live widgets refreshed');
            }}
          >
            <Text style={styles.secondaryText}>Refresh live widgets</Text>
          </TouchableOpacity>
        </View>
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
  back: { width: 40 },
  title: { fontSize: 18, fontWeight: '700', color: theme.colors.ink },
  content: { paddingBottom: 48 },
  subtitle: {
    fontSize: 13,
    color: theme.colors.muted,
    lineHeight: 19,
    marginTop: 16,
    marginHorizontal: 20,
  },
  banner: {
    marginTop: 12,
    marginHorizontal: 16,
    backgroundColor: theme.colors.brassSoft,
    borderRadius: theme.radius.md,
    padding: 12,
  },
  bannerText: {
    fontSize: 12,
    color: theme.colors.cedarDeep,
    lineHeight: 18,
    fontWeight: '600',
  },
  actions: { marginHorizontal: 16, marginTop: 10 },
  secondary: { paddingVertical: 12, alignItems: 'center' },
  secondaryText: { color: theme.colors.brass, fontWeight: '700' },
});
