import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useNotificationStore,
  type NotificationType,
} from '@/lib/notificationStore';
import { theme } from '@/constants/theme';

const TOAST_BG = '#1a1c1f';
const TOAST_BORDER = 'rgba(255,255,255,0.14)';
const TOAST_TITLE = '#F4F6FB';
const TOAST_BODY = 'rgba(244,246,251,0.78)';
const TOAST_MUTED = 'rgba(244,246,251,0.55)';

const ACCENT: Record<NotificationType, string> = {
  success: theme.colors.mint,
  error: theme.colors.coral,
  warning: '#F5B942',
  info: '#5AD1E5',
};

const ICONS: Record<NotificationType, keyof typeof MaterialCommunityIcons.glyphMap> = {
  success: 'check-circle',
  error: 'alert-circle',
  warning: 'alert',
  info: 'information',
};

function NotificationItem({
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
  const slideAnim = useRef(new Animated.Value(0)).current;
  const accent = ACCENT[type];

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
      tension: 80,
    }).start();
  }, [slideAnim]);

  const handleDismiss = () => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(() => onDismiss(id));
  };

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 0],
  });
  const opacity = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <Animated.View style={[styles.item, { transform: [{ translateY }], opacity }]}>
      <View
        style={[
          styles.card,
          { backgroundColor: TOAST_BG, borderColor: TOAST_BORDER, borderLeftColor: accent },
        ]}
        accessibilityRole="alert"
      >
        <View style={[styles.iconWrap, { backgroundColor: `${accent}22` }]}>
          <MaterialCommunityIcons name={ICONS[type]} size={22} color={accent} />
        </View>
        <View style={styles.copy}>
          {title ? (
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          ) : null}
          <Text style={styles.message} numberOfLines={3}>
            {message}
          </Text>
          {action ? (
            <TouchableOpacity
              onPress={action.onPress}
              style={[styles.actionBtn, { borderColor: accent }]}
              hitSlop={8}
            >
              <Text style={[styles.actionLabel, { color: accent }]}>{action.label}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity onPress={handleDismiss} style={styles.close} hitSlop={10}>
          <MaterialCommunityIcons name="close" size={18} color={TOAST_MUTED} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

/** Global toast stack — mount above navigation. */
export default function NotificationStack() {
  const notifications = useNotificationStore((s) => s.notifications);
  const remove = useNotificationStore((s) => s.remove);
  const insets = useSafeAreaInsets();

  if (notifications.length === 0) return null;

  return (
    <View
      style={[styles.stack, { top: Math.max(insets.top, 8) + 8 }]}
      pointerEvents="box-none"
    >
      {notifications.map((n) => (
        <NotificationItem
          key={n.id}
          id={n.id}
          type={n.type}
          title={n.title}
          message={n.message}
          action={n.action}
          onDismiss={remove}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 99999,
    elevation: 99999,
  },
  item: { marginBottom: 8 },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderLeftWidth: 4,
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.45,
        shadowRadius: 16,
      },
      android: { elevation: 12 },
      default: {},
    }),
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, minWidth: 0, paddingTop: 1 },
  title: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
    color: TOAST_TITLE,
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
    color: TOAST_BODY,
  },
  actionBtn: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
  },
  actionLabel: { fontSize: 12, fontWeight: '700' },
  close: { padding: 4, marginTop: 2 },
});
