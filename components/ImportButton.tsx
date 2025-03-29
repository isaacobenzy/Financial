import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function ImportButton() {
  return (
    <View style={styles.container}>
      <View style={styles.importSection}>
        <TouchableOpacity style={styles.importButton}>
          <MaterialCommunityIcons name="message-text" size={24} color="#007AFF" />
          <Text style={styles.importText}>Import SMS</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.importButton}>
          <MaterialCommunityIcons name="file-pdf-box" size={24} color="#007AFF" />
          <Text style={styles.importText}>Upload Statement</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  importSection: {
    flexDirection: 'row',
    gap: 12,
  },
  importButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  importText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '500',
  },
});