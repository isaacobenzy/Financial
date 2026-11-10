import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import {
  TERMS_INTRO,
  TERMS_LAST_UPDATED,
  TERMS_SECTIONS,
  TERMS_VERSION,
} from '@/lib/legal';

export default function TermsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={22}
            color={theme.colors.ink}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms & Conditions</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom + 28, 36) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.badge}>
            <MaterialCommunityIcons
              name="file-document-outline"
              size={18}
              color={theme.colors.cedarDeep}
            />
            <Text style={styles.badgeText}>Legal</Text>
          </View>
          <Text style={styles.title}>Terms & Conditions</Text>
          <Text style={styles.meta}>
            Last updated {TERMS_LAST_UPDATED} · Version {TERMS_VERSION}
          </Text>
          <Text style={styles.intro}>{TERMS_INTRO}</Text>
        </View>

        {TERMS_SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}

        <View style={styles.footnote}>
          <MaterialCommunityIcons
            name="shield-check-outline"
            size={16}
            color={theme.colors.cedarDeep}
          />
          <Text style={styles.footnoteText}>
            Creating an account confirms you have read and agree to these Terms.
          </Text>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  hero: {
    marginBottom: 20,
  },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.sage,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.sm,
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.cedarDeep,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.ink,
    letterSpacing: -0.3,
  },
  meta: {
    marginTop: 8,
    fontSize: 13,
    color: theme.colors.muted,
    fontWeight: '600',
  },
  intro: {
    marginTop: 14,
    fontSize: 15,
    lineHeight: 23,
    color: theme.colors.ink,
  },
  section: {
    marginBottom: 18,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.cedarDeep,
    marginBottom: 8,
  },
  sectionBody: {
    fontSize: 14,
    lineHeight: 22,
    color: theme.colors.muted,
  },
  footnote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: theme.colors.sage,
    borderRadius: theme.radius.md,
    padding: 14,
    marginTop: 4,
  },
  footnoteText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.cedarDeep,
    fontWeight: '600',
  },
});
