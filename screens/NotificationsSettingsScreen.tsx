import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { useNotificationSettingsStore } from '@/lib/notificationSettingsStore';
import {
  getCachedExpoPushToken,
  registerForPushNotifications,
  sendActivityPush,
} from '@/lib/pushNotifications';
import { notificationService } from '@/lib/notificationStore';
import { isExpoGo } from '@/lib/runtime';
import { haptics } from '@/lib/haptics';

export default function NotificationsSettingsScreen() {
  const router = useRouter();
  const store = useNotificationSettingsStore();
  const [token, setToken] = useState<string | null>(getCachedExpoPushToken());
  const [busy, setBusy] = useState(false);
  const expoGo = isExpoGo();

  useFocusEffect(
    useCallback(() => {
      void store.hydrate();
      setToken(getCachedExpoPushToken());
    }, [store]),
  );

  const handlePushToggle = async (enabled: boolean) => {
    store.setPushEnabled(enabled);
    await haptics.select();
    if (enabled) {
      setBusy(true);
      try {
        const next = await registerForPushNotifications();
        setToken(next);
        if (next) notificationService.success('Push notifications enabled');
        else if (expoGo) {
          notificationService.warning(
            'Expo Go cannot register Android push. Use a development build.',
            'Expo Go limit',
          );
        } else {
          notificationService.warning('Enable notifications in system settings');
        }
      } finally {
        setBusy(false);
      }
    }
  };

  const sendTest = async () => {
    setBusy(true);
    try {
      if (!token) {
        const next = await registerForPushNotifications();
        setToken(next);
      }
      await sendActivityPush({
        title: 'Financial Copilot',
        body: 'Test alert — feel (haptic), see (toast), hear (OS sound).',
        category: 'general',
        data: { href: '/(tabs)/settings' },
      });
      notificationService.info('Test sent (remote → local → toast fallback)');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <View style={styles.back} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>
          Feel (haptics), see (toasts), and hear (OS push). Categories gate every push before send.
        </Text>

        {expoGo ? (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>
              Expo Go on Android (SDK 53+) cannot use remote push. Install a development / preview
              build for real lock-screen alerts. Toasts + haptics still work here.
            </Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Master</Text>
          <Row
            label="Enable push notifications"
            value={store.pushEnabled}
            onValueChange={handlePushToggle}
          />
          <Row
            label="Haptic feedback"
            description="Login, tabs, AI reply, goals, and toast pairing"
            value={store.hapticsEnabled}
            onValueChange={store.setHapticsEnabledSetting}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <Row
            label="Live ledger"
            description="Balance / lock-screen live updates"
            value={store.ledgerLive}
            onValueChange={store.setLedgerLive}
          />
          <Row
            label="Goals & milestones"
            description="Created, updated, almost done, completed"
            value={store.goalAlerts}
            onValueChange={store.setGoalAlerts}
          />
          <Row
            label="Streak reminders"
            description="Daily check-in and risk alerts"
            value={store.streakAlerts}
            onValueChange={store.setStreakAlerts}
          />
          <Row
            label="Import digests"
            description="SMS / paste import summaries"
            value={store.importAlerts}
            onValueChange={store.setImportAlerts}
          />
          <Row
            label="Insights & nudges"
            description="Spend anomalies and tips"
            value={store.insightAlerts}
            onValueChange={store.setInsightAlerts}
          />
          <Row
            label="Security"
            description="Sign-in and session events"
            value={store.securityAlerts}
            onValueChange={store.setSecurityAlerts}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Device token</Text>
          <Text style={styles.token} selectable>
            {token || 'Not registered'}
          </Text>
          <TouchableOpacity style={styles.primary} onPress={sendTest} disabled={busy}>
            {busy ? (
              <ActivityIndicator color={theme.colors.white} />
            ) : (
              <Text style={styles.primaryText}>Send test notification</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.link}
            onPress={() => Linking.openURL('https://expo.dev/notifications')}
          >
            <Text style={styles.linkText}>Open Expo push tool</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({
  label,
  description,
  value,
  onValueChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowCopy}>
        <Text style={styles.rowLabel}>{label}</Text>
        {description ? <Text style={styles.rowDesc}>{description}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={async (v) => {
          await haptics.select();
          onValueChange(v);
        }}
        trackColor={{ false: theme.colors.line, true: theme.colors.mint }}
        thumbColor={theme.colors.white}
      />
    </View>
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
  content: { padding: 16, paddingBottom: 40, gap: 14 },
  subtitle: { fontSize: 13, color: theme.colors.muted, lineHeight: 19 },
  banner: {
    backgroundColor: theme.colors.brassSoft,
    borderRadius: theme.radius.md,
    padding: 12,
  },
  bannerText: { fontSize: 12, color: theme.colors.cedarDeep, lineHeight: 18, fontWeight: '600' },
  section: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.muted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
  },
  rowCopy: { flex: 1, paddingRight: 12 },
  rowLabel: { fontSize: 15, fontWeight: '600', color: theme.colors.ink },
  rowDesc: { fontSize: 12, color: theme.colors.muted, marginTop: 2 },
  token: {
    fontSize: 11,
    color: theme.colors.ink,
    fontFamily: 'SpaceMono',
    marginBottom: 12,
    lineHeight: 16,
  },
  primary: {
    backgroundColor: theme.colors.cedar,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryText: { color: theme.colors.white, fontWeight: '700' },
  link: { alignItems: 'center', paddingVertical: 12 },
  linkText: { color: theme.colors.brass, fontWeight: '700' },
});
