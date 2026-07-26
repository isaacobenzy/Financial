import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { toast } from '@/lib/toast';
import { theme } from '@/constants/theme';
import { haptic } from '@/lib/haptics';

export default function ImportPDFScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const leave = () => {
    void haptic('selection');
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/settings');
  };

  const handlePDFPick = async () => {
    try {
      await haptic('selection');
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
      });

      if (!result.canceled) {
        setLoading(true);
        setTimeout(async () => {
          setLoading(false);
          await haptic('success');
          toast.success('PDF processed successfully');
          router.replace('/transactions');
        }, 2000);
      }
    } catch {
      await haptic('error');
      toast.error('Failed to pick PDF');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={leave} accessibilityLabel="Close">
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>Import PDF</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <TouchableOpacity
          style={styles.uploadArea}
          onPress={handlePDFPick}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="large" color={theme.colors.cedar} />
          ) : (
            <>
              <View style={styles.iconBadge}>
                <MaterialCommunityIcons name="file-upload-outline" size={36} color={theme.colors.cedar} />
              </View>
              <Text style={styles.uploadText}>Tap to upload PDF</Text>
              <Text style={styles.supportedText}>Bank and mobile-money statements</Text>
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
    backgroundColor: theme.colors.paper,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  uploadArea: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.cedar,
    borderStyle: 'dashed',
    padding: 48,
    alignItems: 'center',
    gap: 12,
  },
  iconBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  uploadText: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  supportedText: {
    fontSize: 14,
    color: theme.colors.muted,
    textAlign: 'center',
  },
});
