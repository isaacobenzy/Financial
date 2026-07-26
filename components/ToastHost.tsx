import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { subscribeToast, type ToastPayload, type ToastTone } from '@/lib/toast';
import { theme } from '@/constants/theme';

const ICONS: Record<ToastTone, keyof typeof MaterialCommunityIcons.glyphMap> = {
  success: 'check-circle',
  error: 'alert-circle',
  info: 'information',
};

const COLORS: Record<ToastTone, string> = {
  success: theme.colors.mint,
  error: theme.colors.coral,
  info: theme.colors.brass,
};

export default function ToastHost() {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-16)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = () => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: -16, duration: 180, useNativeDriver: true }),
    ]).start(() => setToast(null));
  };

  useEffect(() => {
    return subscribeToast((next) => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setToast(next);
      opacity.setValue(0);
      translateY.setValue(-16);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, speed: 18, bounciness: 8 }),
      ]).start();
      hideTimer.current = setTimeout(hide, 3200);
    });
  }, [opacity, translateY]);

  if (!toast) return null;

  const accent = COLORS[toast.tone];

  return (
    <View pointerEvents="box-none" style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <Animated.View style={[styles.card, { opacity, transform: [{ translateY }] }]}>
        <View style={[styles.accent, { backgroundColor: accent }]} />
        <View style={[styles.iconWrap, { backgroundColor: `${accent}22` }]}>
          <MaterialCommunityIcons name={ICONS[toast.tone]} size={22} color={accent} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>{toast.title}</Text>
          <Text style={styles.message}>{toast.message}</Text>
        </View>
        <Pressable onPress={hide} hitSlop={10} style={styles.close}>
          <MaterialCommunityIcons name="close" size={18} color={theme.colors.muted} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingHorizontal: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.line,
    overflow: 'hidden',
    paddingRight: 8,
    ...theme.shadow.soft,
    shadowOpacity: 0.16,
    elevation: 8,
  },
  accent: {
    width: 5,
    alignSelf: 'stretch',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  copy: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  message: {
    fontSize: 13,
    color: theme.colors.muted,
    marginTop: 2,
    lineHeight: 18,
  },
  close: {
    padding: 8,
  },
});
