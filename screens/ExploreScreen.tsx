import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { toast } from '@/lib/toast';
import { theme } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { recordActivity } from '@/lib/achievements';
import {
  DEMO_SMS,
  fetchInboxSms,
  openSmsSettingsIfBlocked,
  type SmsImportMode,
  type SmsMessage,
} from '@/lib/smsImport';
import { isFinancialSms, parseSmsList } from '@/utils/smsParser';
import { addImportedTransactions } from '@/lib/ledgerStore';
import { requestPermission } from '@/lib/permissions';
import { afterImportInsights } from '@/lib/insightsNotify';
import LiveImportBanner from '@/components/LiveImportBanner';

type Phase = 'landing' | 'loading' | 'ready' | 'empty';

export default function ExploreScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('landing');
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [usingDemo, setUsingDemo] = useState(false);
  const [mode, setMode] = useState<SmsImportMode>('unavailable');
  const [reason, setReason] = useState<string | undefined>();
  const [importing, setImporting] = useState(false);
  const [liveBanner, setLiveBanner] = useState<{ title: string; subtitle: string } | null>(null);

  const leaveScreen = () => {
    void haptic('selection');
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  const commitImport = async (list: SmsMessage[], demo: boolean) => {
    const { transactions, latestReportedBalance } = parseSmsList(list);
    if (!transactions.length) {
      await haptic('error');
      toast.error('No payment amounts could be parsed from these SMS');
      setPhase('ready');
      return;
    }

    setImporting(true);
    try {
      const { balance, added } = await addImportedTransactions(transactions, {
        smsReportedBalance: latestReportedBalance,
        replaceDemo: !demo,
      });
      await recordActivity();
      await haptic('success');

      const weekLabel = `GHS ${balance.expenses.toFixed(0)} expenses on ledger`;
      setLiveBanner({
        title: 'Import complete',
        subtitle: `${added} transactions added · ${weekLabel}`,
      });

      await afterImportInsights({
        addedCount: added || transactions.length,
        balance,
        usingDemo: demo,
      });

      setTimeout(() => router.replace('/(tabs)'), 900);
    } catch {
      await haptic('error');
      toast.error('Import failed');
      setPhase('ready');
    } finally {
      setImporting(false);
    }
  };

  const startWithDemo = async () => {
    await haptic('selection');
    setPhase('loading');
    const demo = DEMO_SMS.filter((m) => isFinancialSms(m.address, m.body));
    setMessages(demo);
    setUsingDemo(true);
    setMode('demo');
    setReason(undefined);
    setPhase('ready');
  };

  const cancelLoading = () => {
    setImporting(false);
    setPhase('empty');
    setReason(
      'Scan cancelled or timed out. Paste an SMS, use sample data, or try again from a development build.',
    );
    toast.info('You can paste SMS or use sample data instead', 'Import ready');
  };

  const requestAndScan = async () => {
    setPhase('loading');
    setUsingDemo(false);

    if (Platform.OS === 'android') {
      const granted = await requestPermission('sms');
      if (!granted) {
        toast.info('Permission needed to read financial SMS', 'SMS access');
        setPhase('landing');
        return;
      }
    }

    try {
      // Never allow silent demo fallback after Allow; fetchInboxSms always times out
      const result = await fetchInboxSms({ allowDemoFallback: false });
      setMessages(result.messages);
      setUsingDemo(false);
      setMode(result.mode);
      setReason(result.reason);

      if (result.mode === 'native' && result.messages.length > 0) {
        await commitImport(result.messages, false);
        return;
      }

      setPhase(result.messages.length ? 'ready' : 'empty');
    } catch {
      toast.error('Could not scan SMS — try Paste SMS instead');
      setPhase('empty');
      setReason('Inbox scan failed. Paste an alert or use sample data.');
    }
  };

  const importAll = async () => {
    if (!messages.length) {
      toast.error('No financial SMS to import');
      return;
    }
    await commitImport(messages, usingDemo);
  };

  const renderItem = ({ item }: { item: SmsMessage }) => {
    const { transactions } = parseSmsList([item]);
    const parsed = transactions[0];

    return (
      <View style={styles.messageCard}>
        <View style={styles.messageHeader}>
          <View style={styles.senderIcon}>
            <MaterialCommunityIcons name="message-text" size={18} color={theme.colors.cedar} />
          </View>
          <View style={styles.senderMeta}>
            <Text style={styles.sender}>{item.address}</Text>
            <Text style={styles.messageDate}>
              {new Date(parseInt(item.date, 10)).toLocaleDateString()}
            </Text>
          </View>
          {parsed ? (
            <Text
              style={[
                styles.amountBadge,
                { color: parsed.type === 'income' ? theme.colors.mint : theme.colors.coral },
              ]}
            >
              {parsed.type === 'income' ? '+' : ''}
              {parsed.amount.toFixed(2)}
            </Text>
          ) : null}
        </View>
        <Text style={styles.messageBody}>{item.body}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LiveImportBanner
        visible={Boolean(liveBanner)}
        title={liveBanner?.title || ''}
        subtitle={liveBanner?.subtitle || ''}
        onDone={() => setLiveBanner(null)}
      />

      <View style={styles.header}>
        <TouchableOpacity onPress={leaveScreen} style={styles.backButton} accessibilityLabel="Close">
          <MaterialCommunityIcons name="close" size={24} color={theme.colors.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>Import SMS</Text>
        <TouchableOpacity onPress={leaveScreen} style={styles.doneChip}>
          <Text style={styles.doneChipText}>Done</Text>
        </TouchableOpacity>
      </View>

      {phase === 'landing' ? (
        <View style={styles.permissionContainer}>
          <View style={styles.heroIcon}>
            <MaterialCommunityIcons name="shield-key-outline" size={40} color={theme.colors.cedar} />
          </View>
          <Text style={styles.permissionTitle}>Connect your alerts</Text>
          <Text style={styles.permissionText}>
            {Platform.OS === 'android'
              ? 'Allow SMS access, then we import MoMo/bank alerts into your ledger and replace sample data with real rows.'
              : 'iPhone cannot share the SMS inbox. Paste an alert, or try sample data below.'}
          </Text>

          {Platform.OS === 'android' ? (
            <TouchableOpacity style={styles.permissionButton} onPress={requestAndScan}>
              <MaterialCommunityIcons name="message-check-outline" size={18} color={theme.colors.white} />
              <Text style={styles.permissionButtonText}>Allow SMS & import</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={async () => {
                await haptic('selection');
                router.replace('/paste-sms');
              }}
            >
              <MaterialCommunityIcons name="content-paste" size={18} color={theme.colors.white} />
              <Text style={styles.permissionButtonText}>Paste an SMS alert</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.demoButton} onPress={startWithDemo}>
            <Text style={styles.demoButtonText}>Use sample financial SMS</Text>
          </TouchableOpacity>

          {Platform.OS === 'android' ? (
            <TouchableOpacity onPress={openSmsSettingsIfBlocked}>
              <Text style={styles.settingsLink}>Open system settings</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {phase === 'loading' || importing ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.cedar} size="large" />
          <Text style={styles.loadingText}>
            {importing ? 'Importing into your ledger…' : 'Reading financial alerts…'}
          </Text>
          <Text style={styles.loadingHint}>This usually finishes in a few seconds</Text>
          {phase === 'loading' && !importing ? (
            <TouchableOpacity style={styles.cancelScanBtn} onPress={cancelLoading}>
              <Text style={styles.cancelScanText}>Cancel & choose another way</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {phase === 'empty' ? (
        <View style={styles.permissionContainer}>
          <MaterialCommunityIcons name="inbox-remove-outline" size={48} color={theme.colors.brass} />
          <Text style={styles.permissionTitle}>No inbox data yet</Text>
          <Text style={styles.permissionText}>
            {reason ||
              'Permission is on, but we could not load financial SMS. Try Paste SMS, or rebuild a preview APK if the native SMS module is missing.'}
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={async () => {
              await haptic('selection');
              router.push('/paste-sms');
            }}
          >
            <MaterialCommunityIcons name="content-paste" size={18} color={theme.colors.white} />
            <Text style={styles.permissionButtonText}>Paste SMS instead</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.demoButton} onPress={startWithDemo}>
            <Text style={styles.demoButtonText}>Use sample SMS (optional)</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {phase === 'ready' ? (
        <>
          <View style={[styles.banner, usingDemo ? undefined : styles.bannerLive]}>
            <Text style={styles.bannerText}>
              {usingDemo
                ? 'Sample alerts — import will not replace real rows until you connect SMS'
                : mode === 'native'
                  ? 'Live financial SMS from your inbox'
                  : reason || 'Financial SMS ready to import'}
            </Text>
          </View>

          <FlatList
            data={messages}
            renderItem={renderItem}
            keyExtractor={(item, index) => `sms-${index}-${item.id}`}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <Text style={styles.empty}>No matching financial SMS found.</Text>
            }
          />

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.importBtn, (importing || !messages.length) && styles.importDisabled]}
              onPress={importAll}
              disabled={importing || !messages.length}
            >
              {importing ? (
                <ActivityIndicator color={theme.colors.white} />
              ) : (
                <>
                  <MaterialCommunityIcons name="database-import" size={20} color={theme.colors.white} />
                  <Text style={styles.importBtnText}>
                    {usingDemo ? 'Import sample data' : 'Import & replace demo'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </>
      ) : null}
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
  doneChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.sage,
  },
  doneChipText: { color: theme.colors.cedar, fontWeight: '700', fontSize: 13 },
  title: { fontSize: 20, fontWeight: '700', color: theme.colors.ink },
  banner: { backgroundColor: theme.colors.brassSoft, padding: 12 },
  bannerLive: { backgroundColor: theme.colors.sage },
  bannerText: {
    color: theme.colors.cedarDeep,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },
  list: { padding: 16, paddingBottom: 140 },
  messageCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.md,
    padding: 16,
    gap: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  messageHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  senderIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  senderMeta: { flex: 1 },
  sender: { fontSize: 15, fontWeight: '700', color: theme.colors.ink },
  messageBody: { fontSize: 14, color: theme.colors.muted, lineHeight: 20 },
  messageDate: { fontSize: 12, color: theme.colors.tabInactive, marginTop: 2 },
  amountBadge: { fontSize: 14, fontWeight: '700' },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 14,
  },
  heroIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: theme.colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  permissionTitle: { fontSize: 22, fontWeight: '700', color: theme.colors.ink, textAlign: 'center' },
  permissionText: {
    fontSize: 15,
    color: theme.colors.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
  permissionButton: {
    backgroundColor: theme.colors.cedar,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: theme.radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  permissionButtonText: { color: theme.colors.white, fontSize: 16, fontWeight: '700' },
  demoButton: { padding: 12 },
  demoButtonText: { color: theme.colors.brass, fontSize: 14, fontWeight: '700' },
  settingsLink: { color: theme.colors.muted, fontSize: 13, textDecorationLine: 'underline' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  loadingText: { color: theme.colors.muted, fontSize: 13 },
  loadingHint: { color: theme.colors.tabInactive, fontSize: 12, textAlign: 'center' },
  cancelScanBtn: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.sage,
  },
  cancelScanText: { color: theme.colors.cedarDeep, fontWeight: '700', fontSize: 14 },
  empty: { textAlign: 'center', color: theme.colors.muted, marginTop: 40 },
  footer: { position: 'absolute', left: 16, right: 16, bottom: 20, gap: 10 },
  importBtn: {
    backgroundColor: theme.colors.cedar,
    borderRadius: theme.radius.lg,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...theme.shadow.soft,
  },
  importDisabled: { opacity: 0.5 },
  importBtnText: { color: theme.colors.white, fontSize: 16, fontWeight: '700' },
});
