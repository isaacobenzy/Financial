import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const categories = [
  {
    id: '1',
    name: 'Food & Dining',
    icon: 'food',
    currentSpent: 850,
    budget: 1000,
    color: '#FF6B6B',
  },
  {
    id: '2',
    name: 'Transportation',
    icon: 'car',
    currentSpent: 300,
    budget: 500,
    color: '#4ECDC4',
  },
  {
    id: '3',
    name: 'Shopping',
    icon: 'shopping',
    currentSpent: 1200,
    budget: 1000,
    color: '#45B7D1',
  },
  {
    id: '4',
    name: 'Bills & Utilities',
    icon: 'lightning-bolt',
    currentSpent: 450,
    budget: 600,
    color: '#96CEB4',
  },
];

export default function BudgetGoalsScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');

  const renderProgressBar = (spent, budget) => {
    const progress = Math.min((spent / budget) * 100, 100);
    const isOverBudget = spent > budget;

    return (
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: isOverBudget ? '#FF6B6B' : '#4CAF50' }]} />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Budget Goals</Text>
      </View>

      <View style={styles.periodSelector}>
        <TouchableOpacity 
          style={[styles.periodButton, selectedPeriod === 'monthly' && styles.periodButtonActive]}
          onPress={() => setSelectedPeriod('monthly')}
        >
          <Text style={[styles.periodButtonText, selectedPeriod === 'monthly' && styles.periodButtonTextActive]}>Monthly</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.periodButton, selectedPeriod === 'yearly' && styles.periodButtonActive]}
          onPress={() => setSelectedPeriod('yearly')}
        >
          <Text style={[styles.periodButtonText, selectedPeriod === 'yearly' && styles.periodButtonTextActive]}>Yearly</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {categories.map(category => (
          <View key={category.id} style={styles.categoryCard}>
            <View style={styles.categoryHeader}>
              <View style={[styles.iconContainer, { backgroundColor: category.color }]}>
                <MaterialCommunityIcons name={category.icon} size={24} color="#fff" />
              </View>
              <View style={styles.categoryInfo}>
                <Text style={styles.categoryName}>{category.name}</Text>
                <Text style={styles.budgetText}>
                  GH₵ {category.currentSpent} <Text style={styles.budgetTotal}>/ GH₵ {category.budget}</Text>
                </Text>
              </View>
              <TouchableOpacity style={styles.editButton}>
                <MaterialCommunityIcons name="pencil" size={20} color="#666" />
              </TouchableOpacity>
            </View>
            {renderProgressBar(category.currentSpent, category.budget)}
          </View>
        ))}

        <TouchableOpacity style={styles.addButton}>
          <MaterialCommunityIcons name="plus" size={24} color="#fff" />
          <Text style={styles.addButtonText}>Add New Budget Category</Text>
        </TouchableOpacity>
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
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  periodSelector: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#007AFF',
  },
  periodButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  categoryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryInfo: {
    flex: 1,
    marginLeft: 12,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  budgetText: {
    fontSize: 14,
    color: '#333',
    marginTop: 2,
  },
  budgetTotal: {
    color: '#666',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    marginVertical: 16,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});