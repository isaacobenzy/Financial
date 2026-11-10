import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  useWindowDimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { parseSmsList } from '@/utils/smsParser';
import { addImportedTransactions } from '@/lib/ledgerStore';
import { recordActivity } from '@/lib/achievements';
import { haptic } from '@/lib/haptics';
import { toast } from '@/lib/toast';
import { afterImportInsights } from '@/lib/insightsNotify';

export default function PasteSmsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  React.useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = () => setKeyboardVisible(true);
    const onHide = () => setKeyboardVisible(false);
    const s = Keyboard.addListener(showEvent, onShow);
    const h = Keyboard.addListener(hideEvent, onHide);
    return () => {
      s.remove();
      h.remove();
    };
  }, []);

  const leave = () => {
    Keyboard.dismiss();
    void haptic('selection');
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/settings');
  };

  const importPaste = async () => {
    Keyboard.dismiss();
    const body = text.trim();
    if (!body) {
      toast.error('Paste a MoMo or bank SMS first');
      return;
    }

    setBusy(true);
    try {
      const { transactions, latestReportedBalance } = parseSmsList([
        {
          id: `paste-${Date.now()}`,
          body,
          date: String(Date.now()),
          address: 'PASTED',
        },
      ]);

      if (!transactions.length) {
        await haptic('error');
        toast.error('Could not find a GHS amount and credit/debit wording');
        return;
      }

      const { balance, added } = await addImportedTransactions(transactions, {
        smsReportedBalance: latestReportedBalance,
        replaceDemo: true,
      });
      await recordActivity();
      await haptic('success');
      await afterImportInsights({
        addedCount: added || transactions.length,
        balance,
        usingDemo: false,
      });
      setText('');
      router.replace('/(tabs)');
    } catch {
      await haptic('error');
      toast.error('Import failed');
    } finally {
      setBusy(false);
    }
  };

  const iosKbOffset = Math.max(insets.top, 0);
  const inputMinHeight = Math.max(180, windowHeight * 0.3);
  const bottomPad = keyboardVisible
    ? Math.max(24, insets.bottom + 12)
    : Math.max(24, insets.bottom + 16);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? iosKbOffset : 0}
      >
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
          <View style={styles.flex}>
            <View style={styles.header}>
              <TouchableOpacity
                onPress={leave}
                style={styles.backBtn}
                accessibilityLabel="Close"
              >
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color={theme.colors.ink}
                />
              </TouchableOpacity>
              <Text style={styles.title}>Paste SMS</Text>
              <View style={{ width: 40 }} />
            </View>

            <ScrollView
              ref={scrollRef}
              contentContainerStyle={[styles.content, { paddingBottom: bottomPad }]}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
            >
              <View style={styles.info}>
                <MaterialCommunityIcons
                  name="cellphone-message"
                  size={22}
                  color={theme.colors.cedar}
                />
                <Text style={styles.infoText}>
                  On iOS (and as a fallback anywhere), paste a mobile-money or bank alert. We parse
                  it on your device — nothing is uploaded.
                </Text>
              </View>

              <TextInput
                ref={inputRef}
                style={[styles.input, { minHeight: inputMinHeight }]}
                multiline
                placeholder={`Example:\nPayment received for GHS 50.00 from Kofi. Current Balance: GHS 1,250.00`}
                placeholderTextColor={theme.colors.tabInactive}
                value={text}
                onChangeText={setText}
                textAlignVertical="top"
                autoCorrect={false}
                autoCapitalize="none"
                onFocus={() => {
                  setTimeout(() => {
                    scrollRef.current?.scrollToEnd({ animated: true });
                  }, 200);
                }}
              />

              <TouchableOpacity
                style={[styles.primary, busy && styles.disabled]}
                onPress={importPaste}
                disabled={busy}
              >
                <MaterialCommunityIcons name="import" size={18} color={theme.colors.white} />
                <Text style={styles.primaryText}>
                  {busy ? 'Importing…' : 'Import into ledger'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.paper,
  },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
  },
  backBtn: { width: 40 },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  info: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: theme.colors.sage,
    borderRadius: theme.radius.md,
    padding: 14,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.cedarDeep,
  },
  input: {
    minHeight: 180,
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.line,
    padding: 16,
    fontSize: 15,
    color: theme.colors.ink,
    lineHeight: 22,
  },
  primary: {
    backgroundColor: theme.colors.cedar,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  disabled: { opacity: 0.6 },
  primaryText: {
    color: theme.colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
});
