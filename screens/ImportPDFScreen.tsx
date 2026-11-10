import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { toast } from '@/lib/toast';
import { describePdfPick } from '@/lib/pdfImport';
import { theme } from '@/constants/theme';
import { haptic } from '@/lib/haptics';

export default function ImportPDFScreen() {
  const router = useRouter();
  const [pickedName, setPickedName] = useState<string | null>(null);

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
        const name = result.assets?.[0]?.name || 'PDF';
        const outcome = describePdfPick(name);
        setPickedName(outcome.fileName);
        await haptic('selection');
        toast.info(outcome.message, 'PDF import is off');
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
        <TouchableOpacity style={styles.uploadArea} onPress={handlePDFPick}>
          <View style={styles.iconBadge}>
            <MaterialCommunityIcons name="file-alert-outline" size={36} color={theme.colors.cedar} />
          </View>
          <Text style={styles.uploadText}>PDF import is not available</Text>
          <Text style={styles.supportedText}>
            You can pick a file to confirm it stays out of the ledger. This version does not read statement PDFs.
          </Text>
          {pickedName ? (
            <Text style={styles.supportedText}>Not imported: {pickedName}</Text>
          ) : null}
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
