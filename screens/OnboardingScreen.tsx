import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

type Feature = {
  icon: 'chart-line' | 'robot-happy' | 'file-document';
  title: string;
  description: string;
};

const features: Feature[] = [
  {
    icon: 'chart-line',
    title: 'Track Expenses',
    description: 'Monitor your spending habits and track expenses in real-time',
  },
  {
    icon: 'robot-happy',
    title: 'AI Assistant',
    description: 'Get personalized financial advice from our AI assistant',
  },
  {
    icon: 'file-document',
    title: 'Import Statements',
    description: 'Easily import bank statements and SMS notifications',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="finance" size={64} color="#007AFF" />
        <Text style={styles.title}>Welcome to{'\n'}Financial Copilot</Text>
      </View>

      <View style={styles.features}>
        {features.map((feature) => (
          <View key={feature.title} style={styles.featureItem}>
            <MaterialCommunityIcons name={feature.icon} size={32} color="#007AFF" />
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDescription}>{feature.description}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.getStartedButton}
          onPress={() => router.push('/login')}
        >
          <Text style={styles.getStartedText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    alignItems: 'center',
    padding: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginTop: 24,
  },
  features: {
    padding: 24,
    gap: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#666',
  },
  actions: {
    padding: 24,
    marginTop: 'auto',
  },
  getStartedButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  getStartedText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
