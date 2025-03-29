import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Add these type definitions at the top
type Transaction = {
  id: string;
  type: 'income' | 'expense';
  category: keyof CategoryIcons;
  merchant: string;
  amount: number;
  date: string;
};

type CategoryIcons = {
  shopping: 'cart' | 'shopping';
  salary: 'cash';
  transport: 'car';
  food: 'food';
  utilities: 'lightning-bolt';
  entertainment: 'movie';
  other: 'dots-horizontal';
};

// Update the mock data to use the correct icon names
const mockTransactions: Transaction[] = [
  {
    id: '1',
    type: 'expense',
    category: 'shopping',
    merchant: 'Shoprite',
    amount: -250.00,
    date: '2024-03-29',
  },
  {
    id: '2',
    type: 'income',
    category: 'salary',
    merchant: 'Employer Ltd',
    amount: 5000.00,
    date: '2024-03-28',
  },
  {
    id: '3',
    type: 'expense',
    category: 'transport',
    merchant: 'Uber',
    amount: -45.00,
    date: '2024-03-28',
  },
];

type CategoryColors = {
  [K in keyof CategoryIcons]: string;
};

const categoryIcons: CategoryIcons = {
  shopping: 'cart',
  salary: 'cash',
  transport: 'car',
  food: 'food',
  utilities: 'lightning-bolt',
  entertainment: 'movie',
  other: 'dots-horizontal'
};

const categoryColors: CategoryColors = {
  shopping: '#FF6B6B',
  salary: '#51CF66',
  transport: '#339AF0',
  food: '#FAB005',
  utilities: '#845EF7',
  entertainment: '#FF922B',
  other: '#868E96'
};

export default function TransactionCard() {
  // Update the getCategoryIcon function
  const getCategoryIcon = (category: keyof CategoryIcons) => {
    return categoryIcons[category] || categoryIcons.other;
  };

  const getCategoryColor = (category: keyof CategoryColors) => {
    return categoryColors[category] || categoryColors.other;
  };
  return (
    <View style={styles.container}>
      {mockTransactions.map((transaction) => (
        <View key={transaction.id} style={styles.transaction}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons 
              name={getCategoryIcon(transaction.category)} 
              size={24} 
              color={transaction.type === 'income' ? '#4CAF50' : '#F44336'} 
            />
          </View>
          
          <View style={styles.details}>
            <Text style={styles.merchant}>{transaction.merchant}</Text>
            <Text style={styles.date}>{transaction.date}</Text>
          </View>
          
          <Text style={[
            styles.amount,
            { color: transaction.type === 'income' ? '#4CAF50' : '#F44336' }
          ]}>
            {transaction.type === 'income' ? '+' : ''}{transaction.amount.toFixed(2)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  transaction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  details: {
    flex: 1,
    marginLeft: 12,
  },
  merchant: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  date: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
  },
});