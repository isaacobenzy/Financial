import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { toast } from '@/lib/toast';

type SettingSection = {
  title: string;
  description?: string;
  items: Array<{
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    label: string;
    onPress: () => void;
  }>;
};

export default function SettingsScreen() {
  const router = useRouter();

  const settingsOptions: SettingSection[] = [
    {
      title: 'Account',
      description: 'Manage your profile and security settings',
      items: [
        {
          icon: 'account-circle-outline',
          label: 'Profile Information',
          onPress: () => toast.info('Profile coming soon'),
        },
        {
          icon: 'shield-lock-outline',
          label: 'Security',
          onPress: () => toast.info('Security settings coming soon'),
        },
      ],
    },
    {
      title: 'Finance',
      description: 'Budgets and transaction tools',
      items: [
        {
          icon: 'target',
          label: 'Budget Goals',
          onPress: () => router.push('/budget-goals'),
        },
        {
          icon: 'swap-horizontal',
          label: 'Transactions',
          onPress: () => router.push('/transactions'),
        },
      ],
    },
    {
      title: 'Session',
      items: [
        {
          icon: 'logout',
          label: 'Log out',
          onPress: () => router.replace('/login'),
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView style={styles.content}>
        {settingsOptions.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.description ? (
              <Text style={styles.sectionDescription}>{section.description}</Text>
            ) : null}
            {section.items.map((item, itemIndex) => (
              <TouchableOpacity
                key={item.label}
                style={[
                  styles.settingItem,
                  itemIndex === section.items.length - 1 && styles.lastItem,
                ]}
                onPress={item.onPress}
              >
                <View style={styles.settingIcon}>
                  <MaterialCommunityIcons name={item.icon} size={24} color="#007AFF" />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>{item.label}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#666" />
              </TouchableOpacity>
            ))}
          </View>
        ))}

        <View style={styles.appInfo}>
          <Text style={styles.version}>Financial Copilot v1.0.0</Text>
          <Text style={styles.copyright}>© 2024 Financial Copilot</Text>
        </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
  },
  backButton: {
    width: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginLeft: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#999',
    marginLeft: 16,
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingContent: {
    flex: 1,
    marginLeft: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  appInfo: {
    padding: 24,
    alignItems: 'center',
  },
  version: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  copyright: {
    fontSize: 12,
    color: '#999',
  },
});
