import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { getAllTransactions, type Transaction } from '@/lib/financeContext';
import { theme } from '@/constants/theme';

type CategoryIcons = {
  shopping: 'cart';
  salary: 'cash';
  transport: 'car';
  food: 'food';
  utilities: 'lightning-bolt';
  entertainment: 'movie';
  other: 'dots-horizontal';
};

const categoryIcons: CategoryIcons = {
  shopping: 'cart',
  salary: 'cash',
  transport: 'car',
  food: 'food',
  utilities: 'lightning-bolt',
  entertainment: 'movie',
  other: 'dots-horizontal',
};

export default function TransactionCard() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useFocusEffect(
    useCallback(() => {
      getAllTransactions().then((list) => setTransactions(list.slice(0, 8)));
    }, []),
  );

  const getIcon = (category: string) =>
    categoryIcons[category as keyof CategoryIcons] ?? categoryIcons.other;

  if (!transactions.length) {
    return (
      <View style={[styles.container, styles.empty]}>
        <Text style={styles.emptyText}>No transactions yet — import SMS to fill your ledger.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {transactions.map((transaction, index) => {
        const rowKey = `row-${index}-${transaction.id}-${transaction.merchant}-${transaction.amount}`;
        return (
          <View
            key={rowKey}
            style={[
              styles.transaction,
              index === transactions.length - 1 && styles.transactionLast,
            ]}
          >
            <View
              style={[
                styles.iconContainer,
                {
                  backgroundColor:
                    transaction.type === 'income'
                      ? 'rgba(82,183,136,0.15)'
                      : 'rgba(231,111,81,0.12)',
                },
              ]}
            >
              <MaterialCommunityIcons
                name={getIcon(transaction.category)}
                size={22}
                color={transaction.type === 'income' ? theme.colors.mint : theme.colors.coral}
              />
            </View>

            <View style={styles.details}>
              <Text style={styles.merchant}>{transaction.merchant}</Text>
              <Text style={styles.date}>{transaction.date}</Text>
            </View>

            <Text
              style={[
                styles.amount,
                {
                  color:
                    transaction.type === 'income' ? theme.colors.mint : theme.colors.coral,
                },
              ]}
            >
              {transaction.type === 'income' ? '+' : ''}
              {transaction.amount.toFixed(2)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.lg,
    marginHorizontal: 16,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: theme.colors.line,
    ...theme.shadow.soft,
  },
  empty: {
    padding: 20,
  },
  emptyText: {
    color: theme.colors.muted,
    fontSize: 13,
    textAlign: 'center',
  },
  transaction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
  },
  transactionLast: {
    borderBottomWidth: 0,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  details: {
    flex: 1,
    marginLeft: 12,
  },
  merchant: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.ink,
  },
  date: {
    fontSize: 12,
    color: theme.colors.muted,
    marginTop: 2,
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
  },
});
