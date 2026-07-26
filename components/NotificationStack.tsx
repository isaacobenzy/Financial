import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useNotificationStore,
  type NotificationType,
} from '@/lib/notificationStore';
import { theme } from '@/constants/theme';

/** Your original light toast look — paper cards, brand accents. */
const ACCENT: Record<NotificationType, string> = {
  success: theme.colors.mint,
  error: theme.colors.coral,
  warning: theme.colors.brass,
  info: theme.colors.brass,
};

const ICONS: Record<NotificationType, keyof typeof MaterialCommunityIcons.glyphMap> = {
  success: 'check-circle',
  error: 'alert-circle',
  warning: 'alert',
  info: 'information',
};

function ToastCard({
  id,
  type,
  title,
  message,
  action,
  onDismiss,
}: {
  id: string;
  type: NotificationType;
  title?: string;
  message: string;
  action?: { label: string; onPress: () => void };
  onDismiss: (id: string) => void;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-16)).current;
  const accent = ACCENT[type];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 6 }),
    ]).start();
  }, [opacity, translateY]);

  const hide = () => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: -16, duration: 160, useNativeDriver: true }),
    ]).start(() => onDismiss(id));
  };

  return (
    <Animated.View style={[styles.card, { opacity, transform: [{ translateY }] }]}>
      <View style={[styles.accent, { backgroundColor: accent }]} />
      <View style={[styles.iconWrap, { backgroundColor: `${accent}22` }]}>
        <MaterialCommunityIcons name={ICONS[type]} size={22} color={accent} />
      </View>
      <View style={styles.copy}>
        {title ? <Text style={styles.title}>{title}</Text> : null}
        <Text style={styles.message}>{message}</Text>
        {action ? (
          <Pressable onPress={action.onPress} style={styles.action}>
            <Text style={[styles.actionText, { color: accent }]}>{action.label}</Text>
          </Pressable>
        ) : null}
      </View>
      <Pressable onPress={hide} hitSlop={10} style={styles.close}>
        <MaterialCommunityIcons name="close" size={18} color={theme.colors.muted} />
      </Pressable>
    </Animated.View>
  );
}

/** Global in-app alerts — original Financial Copilot toast UI. */
export default function NotificationStack() {
  const notifications = useNotificationStore((s) => s.notifications);
  const remove = useNotificationStore((s) => s.remove);
  const insets = useSafeAreaInsets();

  // Latest only — snappy like the previous ToastHost
  const toast = notifications[notifications.length - 1];
  if (!toast) return null;

  return (
    <View pointerEvents="box-none" style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <ToastCard
        key={toast.id}
        id={toast.id}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        action={toast.action}
        onDismiss={remove}
      />
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
  action: { marginTop: 8 },
  actionText: { fontSize: 13, fontWeight: '700' },
  close: {
    padding: 8,
  },
});
