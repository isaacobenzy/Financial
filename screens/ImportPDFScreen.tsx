import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { toast } from '@/lib/toast';

export default function ImportPDFScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handlePDFPick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
      });

      if (!result.canceled) {
        setLoading(true);
        setTimeout(() => {
          setLoading(false);
          toast.success('PDF processed successfully');
          router.push('/transactions');
        }, 2000);
      }
    } catch {
      toast.error('Failed to pick PDF');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Import PDF Statement</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <TouchableOpacity
          style={styles.uploadArea}
          onPress={handlePDFPick}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="large" color="#007AFF" />
          ) : (
            <>
              <MaterialCommunityIcons name="file-upload" size={48} color="#007AFF" />
              <Text style={styles.uploadText}>Tap to Upload PDF</Text>
              <Text style={styles.supportedText}>Supported: bank and mobile money PDFs</Text>
            </>
          )}
        </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  uploadArea: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    padding: 48,
    alignItems: 'center',
    gap: 12,
  },
  uploadText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  supportedText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
