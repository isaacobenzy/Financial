import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function ImportScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Import Data</Text>
      </View>

      <View style={styles.content}>
        <TouchableOpacity style={styles.importOption}>
          <MaterialCommunityIcons name="message-text" size={32} color="#007AFF" />
          <Text style={styles.optionTitle}>Import SMS</Text>
          <Text style={styles.optionDescription}>
            Import transactions from your SMS messages automatically
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.importOption}>
          <MaterialCommunityIcons name="file-pdf-box" size={32} color="#007AFF" />
          <Text style={styles.optionTitle}>Upload Statement</Text>
          <Text style={styles.optionDescription}>
            Upload bank statements or mobile money reports in PDF format
          </Text>
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <MaterialCommunityIcons name="information" size={24} color="#666" />
          <Text style={styles.infoText}>
            Your data is encrypted and stored securely on your device. We never share your financial information with third parties.
          </Text>
        </View>
      </View>
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
    padding: 16,
    gap: 16,
  },
  importOption: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
  },
});