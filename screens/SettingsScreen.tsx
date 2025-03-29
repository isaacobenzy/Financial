import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const settingsOptions = [
  {
    title: 'Profile',
    icon: 'account',
    description: 'Manage your personal information',
  },
  {
    title: 'Notifications',
    icon: 'bell',
    description: 'Configure push notifications',
  },
  {
    title: 'Categories',
    icon: 'tag',
    description: 'Customize transaction categories',
  },
  {
    title: 'Bank Connections',
    icon: 'bank',
    description: 'Manage linked bank accounts',
  },
  {
    title: 'Export Data',
    icon: 'download',
    description: 'Export your financial data',
  },
  {
    title: 'Security',
    icon: 'shield-check',
    description: 'Privacy and security settings',
  },
];

export default function SettingsScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView style={styles.content}>
        {settingsOptions.map((option, index) => (
          <TouchableOpacity 
            key={option.title} 
            style={[
              styles.settingItem,
              index === settingsOptions.length - 1 && styles.lastItem
            ]}
          >
            <View style={styles.settingIcon}>
              <MaterialCommunityIcons name={option.icon} size={24} color="#007AFF" />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>{option.title}</Text>
              <Text style={styles.settingDescription}>{option.description}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#666" />
          </TouchableOpacity>
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