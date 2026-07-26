import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import NaviiAvatar from '@/components/NaviiAvatar';
import { theme } from '@/constants/theme';

type Feature = {
  icon: 'wallet-outline' | 'bullseye-arrow' | 'shield-lock-outline';
  title: string;
  description: string;
};

const features: Feature[] = [
  {
    icon: 'wallet-outline',
    title: 'Private ledger',
    description: 'Hide balances, import SMS or paste alerts on-device',
  },
  {
    icon: 'bullseye-arrow',
    title: 'Financial goals',
    description: 'Set monthly targets and track progress clearly',
  },
  {
    icon: 'shield-lock-outline',
    title: 'Biometric unlock',
    description: 'Face ID or fingerprint to open your account',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <NaviiAvatar seed="financial-copilot-welcome" size={96} mood="wink" />
        <Text style={styles.title}>Welcome to{'\n'}Financial Copilot</Text>
        <Text style={styles.caption}>Private ledger, goals, and grounded AI guidance</Text>
      </View>

      <View style={styles.features}>
        {features.map((feature) => (
          <View key={feature.title} style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <MaterialCommunityIcons name={feature.icon} size={22} color={theme.colors.cedar} />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDescription}>{feature.description}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.getStartedButton} onPress={() => router.push('/login')}>
          <Text style={styles.getStartedText}>Get started</Text>
          <MaterialCommunityIcons name="arrow-right" size={18} color={theme.colors.white} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.paper,
  },
  header: {
    alignItems: 'center',
    padding: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.ink,
    textAlign: 'center',
    marginTop: 20,
  },
  caption: {
    marginTop: 10,
    fontSize: 14,
    color: theme.colors.muted,
    textAlign: 'center',
  },
  features: {
    paddingHorizontal: 24,
    gap: 14,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.ink,
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 13,
    color: theme.colors.muted,
    lineHeight: 18,
  },
  actions: {
    padding: 24,
    marginTop: 'auto',
  },
  getStartedButton: {
    backgroundColor: theme.colors.cedar,
    padding: 16,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  getStartedText: {
    color: theme.colors.white,
    fontSize: 17,
    fontWeight: '700',
  },
});
