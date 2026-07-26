import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { getGoals, type FinancialGoal } from '@/lib/goalsStore';

export default function GoalsWidget() {
  const router = useRouter();
  const [goals, setGoals] = useState<FinancialGoal[]>([]);

  useFocusEffect(
    useCallback(() => {
      getGoals().then((list) =>
        setGoals(
          list.filter((g) => g.period === 'monthly' && g.status !== 'completed').slice(0, 2),
        ),
      );
    }, []),
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>Goals</Text>
        <TouchableOpacity
          onPress={async () => {
            await haptic('selection');
            router.push('/(tabs)/goals');
          }}
        >
          <Text style={styles.link}>View all</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        {goals.map((goal) => {
          const pct = goal.target > 0 ? Math.min((goal.current / goal.target) * 100, 100) : 0;
          const over = goal.kind === 'budget' && goal.current > goal.target;
          return (
            <View key={goal.id} style={styles.row}>
              <View style={styles.rowTop}>
                <Text style={styles.name} numberOfLines={1}>
                  {goal.name}
                </Text>
                <Text style={[styles.meta, over && styles.over]}>
                  GH₵ {goal.current} / {goal.target}
                </Text>
              </View>
              <View style={styles.track}>
                <View
                  style={[
                    styles.fill,
                    {
                      width: `${pct}%`,
                      backgroundColor: over ? theme.colors.coral : theme.colors.mint,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}

        {!goals.length ? (
          <TouchableOpacity
            style={styles.emptyRow}
            onPress={async () => {
              await haptic('selection');
              router.push('/(tabs)/goals');
            }}
          >
            <MaterialCommunityIcons name="bullseye-arrow" size={18} color={theme.colors.cedar} />
            <Text style={styles.empty}>Set your first goal</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    marginTop: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  link: {
    color: theme.colors.brass,
    fontWeight: '700',
    fontSize: 13,
  },
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.line,
    gap: 14,
    ...theme.shadow.soft,
  },
  row: { gap: 8 },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.ink,
    flex: 1,
  },
  meta: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.muted,
  },
  over: { color: theme.colors.coral },
  track: {
    height: 8,
    borderRadius: 999,
    backgroundColor: theme.colors.paper,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 6,
  },
  empty: {
    fontSize: 13,
    color: theme.colors.cedar,
    fontWeight: '700',
  },
});
