import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';

type Props = {
  visible: boolean;
  title: string;
  subtitle: string;
  onDone?: () => void;
};

/** Lock-screen / Live Activity style banner after import (in-app). */
export default function LiveImportBanner({ visible, title, subtitle, onDone }: Props) {
  const opacity = React.useRef(new Animated.Value(0)).current;
  const translate = React.useRef(new Animated.Value(-12)).current;

  useEffect(() => {
    if (!visible) return;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(translate, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();

    const t = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 280, useNativeDriver: true }).start(() =>
        onDone?.(),
      );
    }, 4200);
    return () => clearTimeout(t);
  }, [visible, onDone, opacity, translate]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.wrap, { opacity, transform: [{ translateY: translate }] }]}>
      <View style={styles.pill}>
        <MaterialCommunityIcons name="check-decagram" size={20} color={theme.colors.mint} />
        <View style={styles.copy}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 54,
    left: 16,
    right: 16,
    zIndex: 80,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.colors.cedarDeep,
    borderRadius: theme.radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(216,229,221,0.2)',
    ...theme.shadow.soft,
  },
  copy: { flex: 1 },
  title: {
    color: theme.colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  subtitle: {
    color: theme.colors.sage,
    fontSize: 12,
    marginTop: 2,
  },
});
