import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const SettingsScreen = () => {
  const [isDarkMode, setIsDarkMode] = React.useState(false);
  const [isNotificationsEnabled, setIsNotificationsEnabled] = React.useState(true);
  const [isBiometricEnabled, setIsBiometricEnabled] = React.useState(false);

  const settingsOptions = [
    {
      title: 'Account',
      items: [
        {
          icon: 'account-circle' as const,
          label: 'Profile Information',
          onPress: () => {},
        },
        {
          icon: 'shield-lock' as const,
          label: 'Security',
          onPress: () => {},
        },
        {
          icon: 'bell' as const,
          label: 'Notifications',
          onPress: () => {},
          switch: {
            value: isNotificationsEnabled,
            onValueChange: setIsNotificationsEnabled,
          },
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: 'theme-light-dark',
          label: 'Dark Mode',
          onPress: () => {},
          switch: {
            value: isDarkMode,
            onValueChange: setIsDarkMode,
          },
        },
        {
          icon: 'fingerprint',
          label: 'Biometric Login',
          onPress: () => {},
          switch: {
            value: isBiometricEnabled,
            onValueChange: setIsBiometricEnabled,
          },
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          icon: 'help-circle',
          label: 'Help Center',
          onPress: () => {},
        },
        {
          icon: 'information',
          label: 'About',
          onPress: () => {},
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>
      
      <ScrollView style={styles.content}>
        {settingsOptions.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.items.map((item, itemIndex) => (
              <TouchableOpacity
                key={itemIndex}
                style={styles.settingItem}
                onPress={item.onPress}
              >
                <View style={styles.settingItemLeft}>
                  <MaterialCommunityIcons
                    name={item.icon}
                    size={24}
                    color="#007AFF"
                  />
                  <Text style={styles.settingItemLabel}>{item.label}</Text>
                </View>
                {item.switch ? (
                  <Switch
                    value={item.switch.value}
                    onValueChange={item.switch.onValueChange}
                    trackColor={{ false: '#767577', true: '#81b0ff' }}
                    thumbColor={item.switch.value ? '#007AFF' : '#f4f3f4'}
                  />
                ) : (
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={24}
                    color="#999"
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginLeft: 16,
    marginBottom: 8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingItemLabel: {
    fontSize: 16,
    color: '#333',
  },
});

export default SettingsScreen;