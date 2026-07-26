import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import TransactionCard from '@/components/TransactionCard';
import BalanceHeader from '@/components/BalanceHeader';
import NaviiAvatar from '@/components/NaviiAvatar';
import GoalsWidget from '@/components/GoalsWidget';
import StreakCard from '@/components/StreakCard';
import AiFab from '@/components/AiFab';
import HomeLiveWidget from '@/components/HomeLiveWidget';
import ProfileEditModal from '@/components/ProfileEditModal';
import { theme } from '@/constants/theme';
import { onAppOpenHygiene } from '@/lib/insightsNotify';
import { getSession, type UserSession } from '@/lib/session';
import { getLedgerBalance } from '@/lib/ledgerStore';
import { primarySmsImportHref, primarySmsImportLabel, supportsNativeSmsInbox } from '@/lib/runtime';

const STALE_MS = 7 * 24 * 60 * 60 * 1000;

export default function HomeScreen() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);
  const [needsImportCta, setNeedsImportCta] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getSession().then(setSession);
      void onAppOpenHygiene();
      getLedgerBalance().then((b) => {
        const stale =
          !b.updatedAt || Date.now() - new Date(b.updatedAt).getTime() > STALE_MS;
        setNeedsImportCta(b.smsImports === 0 || stale);
      });
    }, []),
  );

  const go = (href: string) => {
    router.push(href as never);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.eyebrow}>Ledger</Text>
          <Text style={styles.title}>
            {session ? `Hi, ${session.name}` : 'Financial Copilot'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.profileBtn}
          onPress={() => setProfileOpen(true)}
          accessibilityLabel="Edit profile"
        >
          <NaviiAvatar
            seed={session?.naviiSeed || 'guest@financialcopilot.com'}
            size={44}
            mood="happy"
          />
        </TouchableOpacity>
      </View>

      <ProfileEditModal
        visible={profileOpen}
        onClose={() => setProfileOpen(false)}
        onSaved={setSession}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        showsVerticalScrollIndicator={false}
      >
        <BalanceHeader />
        <HomeLiveWidget />
        <StreakCard compact />
        <GoalsWidget />

        {needsImportCta ? (
          <View style={styles.importHero}>
            <Text style={styles.importTitle}>Bring in your spend</Text>
            <Text style={styles.importCopy}>
              Connect alerts so balance and AI stay grounded in real activity.
            </Text>
            <View style={styles.importRow}>
              <TouchableOpacity
                style={styles.importPrimary}
                onPress={() => go(primarySmsImportHref())}
              >
                <MaterialCommunityIcons
                  name={supportsNativeSmsInbox() ? 'message-text-outline' : 'content-paste'}
                  size={18}
                  color={theme.colors.white}
                />
                <Text style={styles.importPrimaryText}>{primarySmsImportLabel()}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.importSecondary} onPress={() => go('/import-pdf')}>
                <MaterialCommunityIcons name="file-pdf-box" size={18} color={theme.colors.cedar} />
                <Text style={styles.importSecondaryText}>PDF</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        <View style={styles.transactionsHeader}>
          <Text style={styles.sectionTitle}>Recent activity</Text>
          <TouchableOpacity onPress={() => go('/transactions')}>
            <Text style={styles.viewAll}>View all</Text>
          </TouchableOpacity>
        </View>

        <TransactionCard />

        {!needsImportCta ? (
          <View style={styles.importPills}>
            <TouchableOpacity
              style={styles.pill}
              onPress={() => go(primarySmsImportHref())}
            >
              <MaterialCommunityIcons name="plus" size={14} color={theme.colors.cedar} />
              <Text style={styles.pillText}>Import</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.pill} onPress={() => go('/paste-sms')}>
              <MaterialCommunityIcons name="content-paste" size={14} color={theme.colors.cedar} />
              <Text style={styles.pillText}>Paste</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>

      <AiFab />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerLeft: { flex: 1 },
  eyebrow: {
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: theme.colors.brass,
    fontWeight: '700',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.ink,
    marginTop: 4,
  },
  profileBtn: {
    borderRadius: 24,
    ...theme.shadow.soft,
  },
  content: { flex: 1 },
  contentInner: { paddingBottom: 130 },
  importHero: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.line,
    gap: 8,
    ...theme.shadow.soft,
  },
  importTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  importCopy: {
    fontSize: 13,
    color: theme.colors.muted,
    lineHeight: 18,
  },
  importRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  importPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.cedar,
    borderRadius: theme.radius.md,
    paddingVertical: 12,
  },
  importPrimaryText: {
    color: theme.colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  importSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.paper,
  },
  importSecondaryText: {
    color: theme.colors.cedar,
    fontWeight: '700',
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  viewAll: {
    color: theme.colors.brass,
    fontSize: 14,
    fontWeight: '700',
  },
  importPills: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.cedar,
  },
});
