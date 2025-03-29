import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function BalanceHeader() {
  return (
    <View style={styles.container}>
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Total Balance</Text>
        <Text style={styles.balanceAmount}>GH₵ 12,500.00</Text>
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="arrow-up-circle" size={24} color="#4CAF50" />
            <View>
              <Text style={styles.statLabel}>Income</Text>
              <Text style={styles.statAmount}>GH₵ 15,000</Text>
            </View>
          </View>
          
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="arrow-down-circle" size={24} color="#F44336" />
            <View>
              <Text style={styles.statLabel}>Expenses</Text>
              <Text style={styles.statAmount}>GH₵ 2,500</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  balanceCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  statAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
});