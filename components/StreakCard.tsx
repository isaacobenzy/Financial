import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import {
  getAchievements,
  getStreak,
  recordActivity,
  type Achievement,
  type StreakState,
} from '@/lib/achievements';
import { theme } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { toast } from '@/lib/toast';

const ICONS: Record<Achievement['icon'], keyof typeof MaterialCommunityIcons.glyphMap> = {
  fire: 'fire',
  trophy: 'trophy-outline',
  target: 'bullseye-arrow',
  'message-check': 'message-check-outline',
  'piggy-bank': 'piggy-bank-outline',
  'shield-check': 'shield-check-outline',
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

/** Compact animated streak strip with clear check-in guidance. */
export default function StreakCard({ compact = true }: { compact?: boolean }) {
  const pulse = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0.35)).current;
  const [streak, setStreak] = useState<StreakState>({ current: 0, best: 0, lastActiveDate: null });
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  const refresh = useCallback(async () => {
    const next = await recordActivity();
    setStreak(next);
    setAchievements(await getAchievements());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulse, {
            toValue: 1.12,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glow, {
            toValue: 0.85,
            duration: 700,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulse, {
            toValue: 1,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glow, {
            toValue: 0.35,
            duration: 700,
            useNativeDriver: true,
          }),
        ]),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [glow, pulse]);

  const unlocked = achievements.filter((a) => a.unlocked).slice(0, 2);
  const checkedIn = streak.lastActiveDate === todayKey();
  const nextBadge =
    streak.best < 3 ? '3-day badge' : streak.best < 7 ? '7-day badge' : 'keep going';

  const onCheckIn = async () => {
    await haptic('selection');
    const before = await getStreak();
    const next = await recordActivity();
    setStreak(next);
    setAchievements(await getAchievements());

    if (before.lastActiveDate === todayKey()) {
      toast.info(
        `You're checked in for today. Come back tomorrow to grow toward the ${nextBadge}.`,
        `${next.current}-day streak`,
      );
      return;
    }

    await haptic('success');
    toast.success(
      next.current === 1
        ? 'Day 1 logged. Open the app again tomorrow to continue.'
        : `Day ${next.current} logged. Best: ${next.best}.`,
      'Streak updated',
    );
  };

  return (
    <View style={styles.wrap}>
      <TouchableOpacity style={styles.strip} onPress={onCheckIn} activeOpacity={0.9}>
        <Animated.View
          style={[
            styles.flameWrap,
            {
              transform: [{ scale: pulse }],
              opacity: glow.interpolate({ inputRange: [0.35, 0.85], outputRange: [0.9, 1] }),
            },
          ]}
        >
          <MaterialCommunityIcons name="fire" size={22} color={theme.colors.brass} />
        </Animated.View>

        <View style={styles.copy}>
          <Text style={styles.label}>{checkedIn ? 'Checked in today' : 'Tap to check in'}</Text>
          <Text style={styles.value}>
            {streak.current} day{streak.current === 1 ? '' : 's'}
            <Text style={styles.best}> · best {streak.best}</Text>
          </Text>
          {!compact ? (
            <Text style={styles.hint}>Open once a day · next: {nextBadge}</Text>
          ) : null}
        </View>

        {unlocked.map((item) => (
          <View key={item.id} style={styles.badge}>
            <MaterialCommunityIcons
              name={ICONS[item.icon]}
              size={14}
              color={theme.colors.cedar}
            />
          </View>
        ))}
      </TouchableOpacity>
      <Text style={styles.footerHint}>
        Streaks: open Home/Goals daily. Goals: raise Current to Target, then Mark complete.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.colors.cedarDeep,
    borderRadius: theme.radius.pill,
    paddingVertical: 10,
    paddingHorizontal: 14,
    ...theme.shadow.soft,
  },
  flameWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(176,137,104,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1 },
  label: {
    color: theme.colors.sage,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  value: {
    color: theme.colors.white,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 1,
  },
  best: {
    color: theme.colors.brassSoft,
    fontSize: 12,
    fontWeight: '600',
  },
  hint: {
    color: theme.colors.brassSoft,
    fontSize: 11,
    marginTop: 2,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerHint: {
    paddingHorizontal: 6,
    fontSize: 11,
    lineHeight: 15,
    color: theme.colors.muted,
  },
});
