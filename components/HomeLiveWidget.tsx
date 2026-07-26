import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { theme } from '@/constants/theme';
import { getWidgetSnapshot, refreshWidgetSnapshot, type WidgetSnapshot } from '@/lib/widgetBridge';
import { isBalanceHidden, setBalanceHidden } from '@/lib/privacy';
import { authenticateBiometric, isBiometricUnlockEnabled } from '@/lib/biometrics';
import { haptic } from '@/lib/haptics';
import { toast } from '@/lib/toast';

/** In-app live widget — balance can be hidden/shown with the eye control. */
export default function HomeLiveWidget() {
  const [snap, setSnap] = useState<WidgetSnapshot | null>(null);

  const reload = useCallback(async () => {
    setSnap(await getWidgetSnapshot());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const toggleHidden = async () => {
    await haptic('selection');
    const currentlyHidden = await isBalanceHidden();

    if (currentlyHidden) {
      const bioOn = await isBiometricUnlockEnabled();
      if (bioOn) {
        const ok = await authenticateBiometric('Confirm to show balance on widget');
        if (!ok) {
          await haptic('error');
          toast.error('Biometric check needed to show balance');
          return;
        }
      }
      await setBalanceHidden(false);
    } else {
      await setBalanceHidden(true);
    }

    setSnap(await refreshWidgetSnapshot());
  };

  if (!snap) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.captionRow}>
        <Text style={styles.caption}>Live widget</Text>
        <Text style={styles.captionHint}>
          {snap.checkedInToday ? 'Streak checked in today' : 'Open daily to grow streak'}
        </Text>
      </View>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.balanceCol}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Balance</Text>
              <TouchableOpacity
                onPress={toggleHidden}
                style={styles.eyeBtn}
                accessibilityLabel={snap.balanceHidden ? 'Show balance' : 'Hide balance'}
                hitSlop={10}
              >
                <MaterialCommunityIcons
                  name={snap.balanceHidden ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={theme.colors.sage}
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.balance}>{snap.balanceDisplay}</Text>
            <Text style={styles.hint}>
              {snap.balanceHidden ? 'Tap the eye to reveal' : 'Tap the eye to hide'}
            </Text>
          </View>
          <View style={styles.streak}>
            <MaterialCommunityIcons name="fire" size={18} color={theme.colors.brass} />
            <Text style={styles.streakText}>{snap.streakCurrent}d</Text>
          </View>
        </View>
        {snap.topGoalName ? (
          <View style={styles.goalBlock}>
            <View style={styles.goalTop}>
              <Text style={styles.goalName} numberOfLines={1}>
                {snap.topGoalName}
              </Text>
              <Text style={styles.goalPct}>{snap.topGoalPct}%</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${snap.topGoalPct}%` }]} />
            </View>
          </View>
        ) : (
          <Text style={styles.hint}>Add a goal in the Goals tab to track progress here</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  captionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
    gap: 8,
  },
  caption: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: theme.colors.brass,
  },
  captionHint: {
    flex: 1,
    textAlign: 'right',
    fontSize: 11,
    color: theme.colors.muted,
    fontWeight: '600',
  },
  card: {
    backgroundColor: theme.colors.cedarDeep,
    borderRadius: theme.radius.lg,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(216,229,221,0.16)',
    ...theme.shadow.soft,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  balanceCol: { flex: 1, paddingRight: 8 },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    color: theme.colors.sage,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  eyeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balance: {
    color: theme.colors.white,
    fontSize: 26,
    fontWeight: '700',
    marginTop: 4,
  },
  hint: {
    color: theme.colors.brassSoft,
    fontSize: 11,
    marginTop: 4,
  },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(176,137,104,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
  },
  streakText: {
    color: theme.colors.brassSoft,
    fontWeight: '700',
    fontSize: 13,
  },
  goalBlock: { gap: 8 },
  goalTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  goalName: {
    flex: 1,
    color: theme.colors.sage,
    fontSize: 13,
    fontWeight: '600',
  },
  goalPct: {
    color: theme.colors.mint,
    fontWeight: '700',
    fontSize: 13,
  },
  track: {
    height: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: theme.colors.mint,
    borderRadius: 999,
  },
});
