import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';

const DISMISS_KEY = 'web_preview_banner_dismissed_v1';

/**
 * Subtle, dismissible notice for the shareable web preview.
 * Native SMS / push / biometrics need the Android APK.
 */
export default function WebPreviewBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    let cancelled = false;
    (async () => {
      try {
        const dismissed = await AsyncStorage.getItem(DISMISS_KEY);
        if (!cancelled && dismissed !== '1') setVisible(true);
      } catch {
        if (!cancelled) setVisible(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (Platform.OS !== 'web' || !visible) return null;

  return (
    <View style={styles.wrap} accessibilityRole="summary">
      <MaterialCommunityIcons name="monitor-cellphone" size={18} color={theme.colors.brass} />
      <View style={styles.copy}>
        <Text style={styles.title}>Web preview</Text>
        <Text style={styles.body}>
          Try the ledger, goals, and AI here. SMS inbox, push alerts, and biometrics need the
          Android preview APK.
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => {
          setVisible(false);
          void AsyncStorage.setItem(DISMISS_KEY, '1');
        }}
        hitSlop={10}
        accessibilityLabel="Dismiss web preview notice"
      >
        <MaterialCommunityIcons name="close" size={18} color={theme.colors.muted} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: theme.radius.md,
    backgroundColor: 'rgba(27, 67, 50, 0.06)',
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  copy: { flex: 1, gap: 2 },
  title: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: theme.colors.cedar,
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.muted,
    fontWeight: '500',
  },
});
