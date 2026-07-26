import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';

const DISMISS_KEY = 'web_preview_banner_dismissed_v1';

/**
 * Compact, dismissible notice for the shareable web preview.
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
      <MaterialCommunityIcons name="monitor-cellphone" size={16} color={theme.colors.brass} />
      <View style={styles.copy}>
        <Text style={styles.body}>
          Web preview — SMS, push, and biometrics need the Android APK.
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
        <MaterialCommunityIcons name="close" size={16} color={theme.colors.muted} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 14,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.sageWash,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  copy: { flex: 1 },
  body: {
    fontSize: 12,
    lineHeight: 16,
    color: theme.colors.cedarDeep,
    fontWeight: '600',
  },
});
