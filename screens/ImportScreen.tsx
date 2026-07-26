import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { requestAllAppPermissions } from '@/lib/permissions';
import { toast } from '@/lib/toast';
import { theme } from '@/constants/theme';
import { haptic } from '@/lib/haptics';

export default function ImportScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Bring data in</Text>
        <Text style={styles.title}>Import</Text>
      </View>

      <View style={styles.content}>
        {Platform.OS === 'android' ? (
          <TouchableOpacity
            style={styles.importOption}
            onPress={async () => {
              await haptic('selection');
              router.push('/import-sms');
            }}
          >
            <View style={styles.iconBadge}>
              <MaterialCommunityIcons name="message-text" size={28} color={theme.colors.cedar} />
            </View>
            <Text style={styles.optionTitle}>Import SMS</Text>
            <Text style={styles.optionDescription}>
              Pull MoMo and bank alerts after granting SMS permission
            </Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={styles.importOption}
          onPress={async () => {
            await haptic('selection');
            router.push('/paste-sms');
          }}
        >
          <View style={styles.iconBadge}>
            <MaterialCommunityIcons name="content-paste" size={28} color={theme.colors.cedar} />
          </View>
          <Text style={styles.optionTitle}>Paste SMS</Text>
          <Text style={styles.optionDescription}>
            Best on iOS — paste a bank or MoMo alert into your ledger
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.importOption}
          onPress={async () => {
            await haptic('selection');
            router.push('/import-pdf');
          }}
        >
          <View style={styles.iconBadge}>
            <MaterialCommunityIcons name="file-pdf-box" size={28} color={theme.colors.cedar} />
          </View>
          <Text style={styles.optionTitle}>Upload statement</Text>
          <Text style={styles.optionDescription}>
            Choose a PDF bank or mobile-money report from your files
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.permCard}
          onPress={async () => {
            await haptic('medium');
            await requestAllAppPermissions();
            toast.success('Permission prompts shown');
          }}
        >
          <MaterialCommunityIcons name="shield-check-outline" size={22} color={theme.colors.brass} />
          <View style={styles.permCopy}>
            <Text style={styles.permTitle}>Grant permissions</Text>
            <Text style={styles.permText}>SMS, files, and notifications where available</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.muted} />
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
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
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
  content: {
    padding: 16,
    gap: 14,
  },
  importOption: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.colors.line,
    ...theme.shadow.soft,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  optionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  optionDescription: {
    marginTop: 6,
    fontSize: 13,
    color: theme.colors.muted,
    lineHeight: 18,
  },
  permCard: {
    marginTop: 4,
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  permCopy: { flex: 1 },
  permTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  permText: {
    fontSize: 12,
    color: theme.colors.muted,
    marginTop: 2,
  },
});
