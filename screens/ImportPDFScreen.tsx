import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { toast } from 'sonner-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

type ImportPDFScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ImportPDF'>;
};

export default function ImportPDFScreen({ navigation }: ImportPDFScreenProps) {
  const [loading, setLoading] = useState(false);

  const handlePDFPick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
      });

      if (!result.canceled) {
        setLoading(true);
        // Here you would normally upload and process the PDF
        // For demo purposes, we'll simulate processing
        setTimeout(() => {
          setLoading(false);
          toast.success('PDF processed successfully');
          navigation.navigate('Transactions');
        }, 2000);
      }
    } catch (err) {
      toast.error('Failed to pick PDF');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
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
              <Text style={styles.supportedText}>
                Supported: Bank Statements, Mobile Money Reports
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.infoSection}>
          <View style={styles.infoItem}>
            <MaterialCommunityIcons name="bank" size={24} color="#007AFF" />
            <Text style={styles.infoText}>Supports major banks</Text>
          </View>
          <View style={styles.infoItem}>
            <MaterialCommunityIcons name="shield-check" size={24} color="#007AFF" />
            <Text style={styles.infoText}>Secure processing</Text>
          </View>
          <View style={styles.infoItem}>
            <MaterialCommunityIcons name="eye-off" size={24} color="#007AFF" />
            <Text style={styles.infoText}>Private & confidential</Text>
          </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    padding: 16,
  },
  uploadArea: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    marginBottom: 24,
  },
  uploadText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  supportedText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  infoSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    gap: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    fontSize: 16,
    color: '#333',
  },
});