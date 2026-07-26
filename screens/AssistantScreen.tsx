import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { askOpenRouter, type ChatMessage } from '@/lib/openrouter';
import { toast } from '@/lib/toast';
import { haptic } from '@/lib/haptics';
import { recordActivity } from '@/lib/achievements';

const DEFAULT_PROMPTS = [
  'How much did I spend recently?',
  'Show my highest expenses',
  'Suggest a budget plan',
  'Analyze my spending habits',
];

type UiMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

export default function AssistantScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ suggest?: string }>();
  const listRef = useRef<FlatList<UiMessage>>(null);
  const inputRef = useRef<TextInput>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<UiMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "Hi — type below and send any question about your balance, spending, goals, or imports. I only answer finance questions about your account.",
    },
  ]);

  const quickPrompts = useMemo(() => {
    if (typeof params.suggest === 'string' && params.suggest.trim()) {
      return params.suggest
        .split('|')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 4);
    }
    return DEFAULT_PROMPTS;
  }, [params.suggest]);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 350);
    return () => clearTimeout(t);
  }, []);

  const sendPrompt = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    void haptic('light');
    const userMsg: UiMessage = {
      id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role: 'user',
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMsg]);
    setMessage('');
    setLoading(true);

    try {
      const history: ChatMessage[] = [...messages, userMsg]
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role, content: m.content }));

      const prior = history.slice(0, -1);
      const reply = await askOpenRouter(trimmed, prior);
      await recordActivity();
      void haptic('success');
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          role: 'assistant',
          content: reply,
        },
      ]);
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Something went wrong';
      void haptic('error');
      toast.error(detail, 'AI unavailable');
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          content: `I couldn't answer that just now.\n\n${detail}`,
        },
      ]);
    } finally {
      setLoading(false);
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
        inputRef.current?.focus();
      });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity
              onPress={() => {
                void haptic('selection');
                if (router.canGoBack()) router.back();
                else router.replace('/(tabs)');
              }}
              style={styles.backBtn}
              accessibilityLabel="Close assistant"
            >
              <MaterialCommunityIcons name="arrow-left" size={22} color={theme.colors.ink} />
            </TouchableOpacity>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>Copilot</Text>
              <Text style={styles.title}>Ask your ledger</Text>
            </View>
          </View>
        </View>

        <View style={styles.quickPrompts}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
            data={quickPrompts}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.promptsContainer}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.promptButton}
                onPress={() => sendPrompt(item)}
                disabled={loading}
              >
                <Text style={styles.promptText}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          style={styles.flex}
          contentContainerStyle={styles.chatList}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="interactive"
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => (
            <View
              style={[
                styles.bubble,
                item.role === 'user' ? styles.userBubble : styles.assistantBubble,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  item.role === 'user' ? styles.userText : styles.assistantText,
                ]}
              >
                {item.content}
              </Text>
            </View>
          )}
          ListFooterComponent={
            loading ? (
              <View style={styles.typing}>
                <ActivityIndicator color={theme.colors.cedar} />
                <Text style={styles.typingText}>Thinking…</Text>
              </View>
            ) : null
          }
        />

        <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Type your question here…"
            placeholderTextColor={theme.colors.muted}
            value={message}
            onChangeText={setMessage}
            multiline
            // Keep typing available even while a reply loads
            editable
            blurOnSubmit={false}
            returnKeyType="default"
            autoCorrect
            autoCapitalize="sentences"
            textAlignVertical="top"
          />
          <Pressable
            style={({ pressed }) => [
              styles.sendButton,
              (!message.trim() || loading) && styles.sendDisabled,
              pressed && styles.sendPressed,
            ]}
            onPress={() => sendPrompt(message)}
            disabled={!message.trim() || loading}
            accessibilityLabel="Send message"
          >
            <MaterialCommunityIcons name="send" size={20} color={theme.colors.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.paper,
  },
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { flex: 1 },
  eyebrow: {
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: theme.colors.brass,
    fontWeight: '700',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.ink,
    marginTop: 2,
  },
  quickPrompts: {
    paddingBottom: 4,
  },
  promptsContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  promptButton: {
    backgroundColor: theme.colors.sage,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.radius.pill,
    marginRight: 8,
  },
  promptText: {
    color: theme.colors.cedarDeep,
    fontSize: 13,
    fontWeight: '600',
  },
  chatList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10,
    flexGrow: 1,
  },
  bubble: {
    maxWidth: '86%',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: theme.radius.md,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: 6,
    ...theme.shadow.soft,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.cedar,
    borderTopRightRadius: 6,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  assistantText: {
    color: theme.colors.ink,
  },
  userText: {
    color: theme.colors.white,
  },
  typing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  typingText: {
    color: theme.colors.muted,
    fontSize: 13,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 10,
    backgroundColor: theme.colors.white,
    borderTopWidth: 1,
    borderTopColor: theme.colors.line,
  },
  input: {
    flex: 1,
    minHeight: 52,
    maxHeight: 140,
    backgroundColor: theme.colors.paper,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.line,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: theme.colors.ink,
  },
  sendButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.cedar,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendPressed: {
    opacity: 0.85,
  },
  sendDisabled: {
    opacity: 0.4,
  },
});
