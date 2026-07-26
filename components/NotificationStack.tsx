import React, { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useNotificationStore,
  type NotificationType,
} from '@/lib/notificationStore';
import { tabBarClearance } from '@/constants/layout';
import { theme } from '@/constants/theme';

const ACCENT: Record<NotificationType, string> = {
  success: theme.colors.mint,
  error: theme.colors.coral,
  warning: theme.colors.brass,
  info: theme.colors.cedar,
};

const FILL: Record<NotificationType, string> = {
  success: theme.colors.mintSoft,
  error: theme.colors.coralSoft,
  warning: theme.colors.brassWash,
  info: theme.colors.sageWash,
};

const ICONS: Record<NotificationType, keyof typeof MaterialCommunityIcons.glyphMap> = {
  success: 'check-circle-outline',
  error: 'alert-circle-outline',
  warning: 'alert-outline',
  info: 'information-outline',
};

function truncateMessage(message: string, max = 140): string {
  const compact = message.replace(/\s+/g, ' ').trim();
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max - 1).trimEnd()}…`;
}

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
  const enterFrom = Platform.OS === 'web' ? 18 : -16;
  const translateY = useRef(new Animated.Value(enterFrom)).current;
  const accent = ACCENT[type];
  const fill = FILL[type];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, speed: 18, bounciness: 5 }),
    ]).start();
  }, [opacity, translateY]);

  const hide = () => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(translateY, {
        toValue: enterFrom,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss(id));
  };

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.white,
          borderColor: type === 'error' ? 'rgba(231, 111, 81, 0.28)' : theme.colors.line,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={[styles.accent, { backgroundColor: accent }]} />
      <View style={[styles.iconWrap, { backgroundColor: fill }]}>
        <MaterialCommunityIcons name={ICONS[type]} size={20} color={accent} />
      </View>
      <View style={styles.copy}>
        {title ? <Text style={styles.title}>{title}</Text> : null}
        <Text style={styles.message} numberOfLines={3}>
          {truncateMessage(message)}
        </Text>
        {action ? (
          <Pressable onPress={action.onPress} style={styles.action}>
            <Text style={[styles.actionText, { color: accent }]}>{action.label}</Text>
          </Pressable>
        ) : null}
      </View>
      <Pressable onPress={hide} hitSlop={10} style={styles.close} accessibilityLabel="Dismiss">
        <MaterialCommunityIcons name="close" size={18} color={theme.colors.muted} />
      </Pressable>
    </Animated.View>
  );
}

/**
 * Global in-app alerts.
 * Web: dock above the floating tab bar so they don’t collide with the preview banner.
 * Native: top of screen under the status bar.
 */
export default function NotificationStack() {
  const notifications = useNotificationStore((s) => s.notifications);
  const remove = useNotificationStore((s) => s.remove);
  const insets = useSafeAreaInsets();

  const toast = notifications[notifications.length - 1];
  if (!toast) return null;

  const webBottom = tabBarClearance(insets.bottom) + 8;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.root,
        Platform.OS === 'web'
          ? { bottom: webBottom, top: undefined, paddingBottom: 0 }
          : { paddingTop: insets.top + 8 },
      ]}
    >
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
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    paddingRight: 8,
    ...theme.shadow.soft,
    shadowOpacity: 0.14,
    elevation: 8,
  },
  accent: {
    width: 4,
    alignSelf: 'stretch',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  copy: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    minWidth: 0,
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
