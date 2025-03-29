import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

type SettingsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Settings'>;
};

type SettingSection = {
  title: string;
  description?: string;
  items: Array<{
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    label: string;
    onPress: () => void;
    switch?: {
      value: boolean;
      onValueChange: (value: boolean) => void;
    };
  }>;
};

const settingsOptions: SettingSection[] = [
  {
    title: 'Account',
    description: 'Manage your profile and security settings',
    items: [
      {
        icon: 'account-circle-outline',
        label: 'Profile Information',
        onPress: () => {},
      },
      {
        icon: 'shield-lock-outline',
        label: 'Security',
        onPress: () => {},
      },
    ],
  },
  // ... rest of your sections
];

export default function SettingsScreen({ navigation }: SettingsScreenProps) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView style={styles.content}>
        {settingsOptions.map((section, index) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.description && (
              <Text style={styles.sectionDescription}>{section.description}</Text>
            )}
            {section.items.map((item, itemIndex) => (
              <TouchableOpacity 
                key={item.label}
                style={[
                  styles.settingItem,
                  itemIndex === section.items.length - 1 && styles.lastItem
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
  settingDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
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