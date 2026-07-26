import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import TransactionCard from '@/components/TransactionCard';
import BalanceHeader from '@/components/BalanceHeader';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Financial Copilot</Text>
        <TouchableOpacity onPress={() => router.push('/settings')}>
          <MaterialCommunityIcons name="cog" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <BalanceHeader />

        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionChip} onPress={() => router.push('/explore')}>
            <MaterialCommunityIcons name="message-text" size={18} color="#007AFF" />
            <Text style={styles.actionText}>Import SMS</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionChip} onPress={() => router.push('/budget-goals')}>
            <MaterialCommunityIcons name="target" size={18} color="#007AFF" />
            <Text style={styles.actionText}>Budgets</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.transactionsHeader}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <TouchableOpacity onPress={() => router.push('/transactions')}>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>

        <TransactionCard />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  actionText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 14,
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  viewAll: {
    color: '#007AFF',
    fontSize: 14,
  },
});
