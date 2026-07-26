import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { getLedgerBalance, type LedgerBalance } from '@/lib/ledgerStore';
import { DEMO_BALANCE } from '@/lib/financeContext';
import { theme } from '@/constants/theme';
import { isBalanceHidden, setBalanceHidden } from '@/lib/privacy';
import { authenticateBiometric, isBiometricUnlockEnabled } from '@/lib/biometrics';
import { haptic } from '@/lib/haptics';
import { toast } from '@/lib/toast';
import { refreshWidgetSnapshot } from '@/lib/widgetBridge';

function formatMoney(value: number) {
  return `GH₵ ${value.toLocaleString('en-GH', { minimumFractionDigits: 2 })}`;
}

const MASK = '••••••';

export default function BalanceHeader() {
  const [hidden, setHidden] = useState(false);
  const [balance, setBalance] = useState<LedgerBalance>({
    total: DEMO_BALANCE.total,
    income: DEMO_BALANCE.income,
    expenses: DEMO_BALANCE.expenses,
    currency: 'GHS',
    updatedAt: new Date().toISOString(),
    smsImports: 0,
  });

  useFocusEffect(
    useCallback(() => {
      isBalanceHidden().then(setHidden);
      getLedgerBalance().then((live) => {
        if (live.smsImports > 0) {
          setBalance(live);
          return;
        }
        setBalance({
          total: DEMO_BALANCE.total,
          income: DEMO_BALANCE.income,
          expenses: DEMO_BALANCE.expenses,
          currency: 'GHS',
          updatedAt: live.updatedAt,
          smsImports: 0,
        });
      });
    }, []),
  );

  const toggleHidden = async () => {
    await haptic('selection');

    if (hidden) {
      const bioOn = await isBiometricUnlockEnabled();
      if (bioOn) {
        const ok = await authenticateBiometric('Confirm to show your balance');
        if (!ok) {
          toast.error('Biometric check needed to show balance');
          await haptic('error');
          return;
        }
      }
      await setBalanceHidden(false);
      setHidden(false);
      void refreshWidgetSnapshot();
      return;
    }

    await setBalanceHidden(true);
    setHidden(true);
    void refreshWidgetSnapshot();
  };

  const show = (value: number) => (hidden ? MASK : formatMoney(value));

  return (
    <View style={styles.container}>
      <View style={styles.cardShell}>
        <View style={styles.balanceCard}>
          <View style={styles.topRow}>
            <Text style={styles.balanceLabel}>Total balance</Text>
            <View style={styles.topActions}>
              {balance.smsImports > 0 ? (
                <View style={styles.smsBadge}>
                  <MaterialCommunityIcons name="message-check" size={12} color={theme.colors.mint} />
                  <Text style={styles.smsBadgeText}>{balance.smsImports}</Text>
                </View>
              ) : null}
              <TouchableOpacity
                onPress={toggleHidden}
                style={styles.eyeBtn}
                accessibilityLabel={hidden ? 'Show balance' : 'Hide balance'}
                hitSlop={10}
              >
                <MaterialCommunityIcons
                  name={hidden ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={theme.colors.sage}
                />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.balanceAmount}>{show(balance.total)}</Text>

          <View style={styles.chips}>
            <View style={styles.chip}>
              <MaterialCommunityIcons name="arrow-up" size={14} color={theme.colors.mint} />
              <Text style={styles.chipLabel}>In</Text>
              <Text style={styles.chipValue}>{show(balance.income)}</Text>
            </View>
            <View style={styles.chip}>
              <MaterialCommunityIcons name="arrow-down" size={14} color={theme.colors.coral} />
              <Text style={styles.chipLabel}>Out</Text>
              <Text style={styles.chipValue}>{show(balance.expenses)}</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  cardShell: {
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    ...theme.shadow.soft,
  },
  balanceCard: {
    backgroundColor: theme.colors.cedar,
    padding: 20,
    // Soft depth without requiring expo-linear-gradient native link issues
    borderWidth: 1,
    borderColor: 'rgba(216,229,221,0.18)',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eyeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceLabel: {
    fontSize: 12,
    color: theme.colors.sage,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  smsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
  },
  smsBadgeText: {
    color: theme.colors.mint,
    fontSize: 11,
    fontWeight: '700',
  },
  balanceAmount: {
    fontSize: 34,
    fontWeight: '700',
    color: theme.colors.white,
    marginTop: 8,
    marginBottom: 16,
  },
  chips: {
    flexDirection: 'row',
    gap: 10,
  },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chipLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.sage,
  },
  chipValue: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.white,
    textAlign: 'right',
  },
});
