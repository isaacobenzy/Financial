import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  ActivityIndicator,
  Pressable,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { tabBarClearance } from '@/constants/layout';
import { theme } from '@/constants/theme';
import { askOpenRouter, isOpenRouterConfigured, type ChatMessage } from '@/lib/openrouter';
import {
  applyGoalAction,
  describeGoalAction,
  extractGoalActionsFromReply,
  type GoalActionProposal,
} from '@/lib/goalActions';
import {
  AI_WEEKLY_MESSAGE_LIMIT,
  consumeAiQuota,
  getAiQuota,
  type AiQuotaStatus,
} from '@/lib/aiQuota';
import {
  loadChatHistory,
  MAX_CHAT_HISTORY,
  saveChatHistory,
  type StoredChatMessage,
} from '@/lib/chatHistory';
import { haptics } from '@/lib/haptics';
import { recordActivity } from '@/lib/achievements';
import { notificationService } from '@/lib/notificationStore';
import { setTabBarHidden } from '@/lib/tabBarVisibility';
import { getSession } from '@/lib/session';

const DEFAULT_PROMPTS = [
  'How much did I spend recently?',
  'Create a weekly food budget I can confirm',
  'Suggest a daily savings goal',
  'Analyze my spending habits',
];

type ActionCardState = 'pending' | 'applied' | 'dismissed' | 'failed';

type UiMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  tone?: 'error';
  actions?: GoalActionProposal[];
  actionStates?: ActionCardState[];
};

const WELCOME_MESSAGE: UiMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Hi — type below and send any question about your balance, spending, goals, or imports. I only answer finance questions about your account.',
};

function toStored(messages: UiMessage[]): StoredChatMessage[] {
  return messages
    .filter((m) => m.id !== 'welcome')
    .map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      tone: m.tone,
      actionsJson: m.actions?.length ? JSON.stringify(m.actions) : undefined,
      actionStatesJson: m.actionStates?.length
        ? JSON.stringify(m.actionStates)
        : undefined,
    }));
}

function fromStored(list: StoredChatMessage[]): UiMessage[] {
  return list.map((m) => {
    let actions: GoalActionProposal[] | undefined;
    let actionStates: ActionCardState[] | undefined;
    try {
      if (m.actionsJson) actions = JSON.parse(m.actionsJson) as GoalActionProposal[];
    } catch {
      actions = undefined;
    }
    try {
      if (m.actionStatesJson) {
        actionStates = JSON.parse(m.actionStatesJson) as ActionCardState[];
      }
    } catch {
      actionStates = undefined;
    }
    return {
      id: m.id,
      role: m.role,
      content: m.content,
      tone: m.tone,
      actions,
      actionStates,
    };
  });
}

function withHistoryCap(messages: UiMessage[]): UiMessage[] {
  const welcome = messages.find((m) => m.id === 'welcome');
  const rest = messages.filter((m) => m.id !== 'welcome').slice(-MAX_CHAT_HISTORY);
  return welcome ? [welcome, ...rest] : rest;
}

function friendlyAiFailure(detail: string): { toast: string; bubble: string } {
  const lower = detail.toLowerCase();
  if (lower.includes('not configured') || lower.includes('expo_public_openrouter')) {
    return {
      toast: 'This build is missing the OpenRouter API key.',
      bubble:
        'I can’t reach the AI service yet. Set EXPO_PUBLIC_OPENROUTER_API_KEY for this environment, then rebuild or restart with a cleared cache.',
    };
  }
  if (lower.includes('401') || lower.includes('unauthorized') || lower.includes('invalid api')) {
    return {
      toast: 'The OpenRouter key was rejected.',
      bubble: 'Authentication with the AI service failed. Check that your OpenRouter key is valid and has credit.',
    };
  }
  if (lower.includes('network') || lower.includes('fetch') || lower.includes('failed to fetch')) {
    return {
      toast: 'Network issue — check your connection and try again.',
      bubble: 'I couldn’t reach the AI service. Check your connection, then send your question again.',
    };
  }
  return {
    toast: 'Couldn’t get a reply just now. Try again in a moment.',
    bubble: 'I couldn’t answer that just now. Please try again in a moment.',
  };
}

export default function AssistantScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const params = useLocalSearchParams<{ suggest?: string }>();
  const listRef = useRef<FlatList<UiMessage>>(null);
  const inputRef = useRef<TextInput>(null);
  const composerLift = useRef(new Animated.Value(0)).current;
  const composerEnter = useRef(new Animated.Value(28)).current;
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [messages, setMessages] = useState<UiMessage[]>([WELCOME_MESSAGE]);
  const [quota, setQuota] = useState<AiQuotaStatus | null>(null);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const configured = isOpenRouterConfigured();

  const persistMessages = useCallback((next: UiMessage[]) => {
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      void saveChatHistory(toStored(next));
    }, 120);
  }, []);

  // Absolute tab dock can still paint over stack screens — hide while focused.
  useFocusEffect(
    useCallback(() => {
      setTabBarHidden(true);
      let active = true;
      (async () => {
        const [stored, q, session] = await Promise.all([
          loadChatHistory(),
          getAiQuota(),
          getSession(),
        ]);
        if (!active) return;
        setQuota(q);
        if (stored.length) {
          const restored = withHistoryCap([WELCOME_MESSAGE, ...fromStored(stored)]);
          setMessages(restored);
        } else {
          const welcome = {
            ...WELCOME_MESSAGE,
            content: session
              ? `Hi ${session.name.split(' ')[0] || 'there'} — ask about your balance, spending, or goals. You have ${q.remaining} AI messages left this week.`
              : WELCOME_MESSAGE.content,
          };
          setMessages([welcome]);
        }
      })();
      return () => {
        active = false;
        setTabBarHidden(false);
      };
    }, []),
  );

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

  const scrollToBottom = useCallback(
    (animated = true, delay = 0) => {
      const ref = listRef.current;
      if (!ref) return;
      if (delay <= 0) {
        try {
          ref.scrollToEnd({ animated });
        } catch {
          /* noop */
        }
        return;
      }
      const id = setTimeout(() => {
        try {
          ref.scrollToEnd({ animated });
        } catch {
          /* noop */
        }
        clearTimeout(id);
      }, delay);
    },
    [],
  );

  const inputMaxHeight = useMemo(() => {
    const ratio = keyboardVisible ? 0.14 : 0.2;
    const softCap = keyboardVisible ? 110 : 150;
    return Math.min(softCap, Math.max(56, Math.round(windowHeight * ratio)));
  }, [keyboardVisible, windowHeight]);

  useEffect(() => {
    Animated.spring(composerEnter, {
      toValue: 0,
      speed: 18,
      bounciness: 5,
      useNativeDriver: true,
    }).start();
    const t = setTimeout(() => inputRef.current?.focus(), 380);
    return () => clearTimeout(t);
  }, [composerEnter]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const frameEvent = Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : 'keyboardDidChangeFrame';

    let cancelled = false;
    let lastShowKHeight = -1;
    let lastFrameKHeight = -1;

    const onShow = (e: { duration?: number; endCoordinates: { height: number } }) => {
      if (cancelled) return;
      const kHeight = e.endCoordinates?.height ?? 0;
      if (kHeight === lastShowKHeight) return;
      lastShowKHeight = kHeight;
      const duration = typeof e.duration === 'number' && e.duration > 0 ? e.duration : 250;
      const lift = Platform.OS === 'ios' ? 6: Math.min(20, Math.max(10, kHeight * 0.045));
      setKeyboardVisible(true);
      setKeyboardHeight(kHeight);
      Animated.timing(composerLift, {
        toValue: lift,
        duration,
        useNativeDriver: true,
      }).start();
      scrollToBottom(true, duration + 60);
    };

    const onHide = (e: { duration?: number }) => {
      if (cancelled) return;
      lastShowKHeight = -1;
      lastFrameKHeight = -1;
      const duration = typeof e.duration === 'number' && e.duration > 0 ? e.duration : 220;
      setKeyboardVisible(false);
      setKeyboardHeight(0);
      Animated.timing(composerLift, {
        toValue: 0,
        duration,
        useNativeDriver: true,
      }).start();
    };

    const onFrame = (e: { duration?: number; endCoordinates: { height: number } }) => {
      if (cancelled) return;
      const kHeight = e.endCoordinates?.height ?? 0;
      if (kHeight > 0 && kHeight !== lastFrameKHeight) {
        lastFrameKHeight = kHeight;
        setKeyboardHeight(kHeight);
      }
    };

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);
    const frameSub = Keyboard.addListener(frameEvent, onFrame);
    return () => {
      cancelled = true;
      showSub.remove();
      hideSub.remove();
      frameSub.remove();
    };
  }, [composerLift, scrollToBottom]);

  const sendPrompt = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const quotaCheck = await getAiQuota();
    if (quotaCheck.exhausted) {
      setQuota(quotaCheck);
      notificationService.error(
        `Weekly AI limit reached (${AI_WEEKLY_MESSAGE_LIMIT}/week). Try again next week.`,
        'Limit reached',
      );
      void haptics.error();
      return;
    }

    const reserved = await consumeAiQuota();
    if (!reserved) {
      setQuota(await getAiQuota());
      notificationService.error(
        `Weekly AI limit reached (${AI_WEEKLY_MESSAGE_LIMIT}/week). Try again next week.`,
        'Limit reached',
      );
      return;
    }
    setQuota(reserved);

    const userMsg: UiMessage = {
      id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role: 'user',
      content: trimmed,
    };

    setMessages((prev) => {
      const next = withHistoryCap([...prev, userMsg]);
      persistMessages(next);
      return next;
    });
    setMessage('');
    setLoading(true);

    try {
      const history: ChatMessage[] = withHistoryCap([...messages, userMsg])
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role, content: m.content }));

      const prior = history.slice(0, -1);
      const reply = await askOpenRouter(trimmed, prior);
      const { text: replyText, actions } = extractGoalActionsFromReply(reply);
      await recordActivity();
      void haptics.success();
      setMessages((prev) => {
        const next = withHistoryCap([
          ...prev,
          {
            id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            role: 'assistant' as const,
            content: replyText,
            actions,
            actionStates: actions.map(() => 'pending' as ActionCardState),
          },
        ]);
        persistMessages(next);
        return next;
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Something went wrong';
      const friendly = friendlyAiFailure(detail);
      notificationService.error(friendly.toast, 'AI unavailable');
      setMessages((prev) => {
        const next = withHistoryCap([
          ...prev,
          {
            id: `e-${Date.now()}`,
            role: 'assistant' as const,
            tone: 'error' as const,
            content: friendly.bubble,
          },
        ]);
        persistMessages(next);
        return next;
      });
    } finally {
      setLoading(false);
      scrollToBottom(true, 40);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 60);
    }
  };

  // Always clear the floating tab dock height at rest (iOS was fully covered;
  // Android only showed the top of the composer). Keyboard open: light cushion.
  const composerPadBottom = keyboardVisible
    ? Platform.OS === 'ios'
      ? 10
      : 12
    : tabBarClearance(insets.bottom) + (Platform.OS === 'ios' ? 10 : 6);

  const iosKbOffset = Math.max(insets.top + 8, 12);

  const showQuickPrompts = !keyboardVisible || windowHeight > 680;

  const onContentSizeChange = useCallback(() => {
    scrollToBottom(true, 10);
  }, [scrollToBottom]);

  const onListLayout = useCallback(() => {
    scrollToBottom(false, 0);
  }, [scrollToBottom]);

  const onInputFocus = useCallback(() => {
    scrollToBottom(true, 120);
  }, [scrollToBottom]);

  const onInputLayout = useCallback(() => {
    scrollToBottom(false, 20);
  }, [scrollToBottom]);

  const goBack = useCallback(() => {
    Keyboard.dismiss();
    setTabBarHidden(false);
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }, [router]);

  const setActionState = useCallback(
    (messageId: string, index: number, state: ActionCardState) => {
      setMessages((prev) => {
        const updated = prev.map((m) => {
          if (m.id !== messageId || !m.actionStates) return m;
          const nextStates = [...m.actionStates];
          nextStates[index] = state;
          return { ...m, actionStates: nextStates };
        });
        persistMessages(updated);
        return updated;
      });
    },
    [persistMessages],
  );

  const confirmAction = useCallback(
    async (messageId: string, index: number, action: GoalActionProposal) => {
      setActionState(messageId, index, 'pending');
      const result = await applyGoalAction(action);
      if (!result.ok) {
        setActionState(messageId, index, 'failed');
        notificationService.error(result.error, 'Goal action');
        void haptics.error();
        return;
      }
      setActionState(messageId, index, 'applied');
      notificationService.success(result.message, 'Goal updated');
      void haptics.success();
      await recordActivity();
    },
    [setActionState],
  );

  const dismissAction = useCallback(
    (messageId: string, index: number) => {
      setActionState(messageId, index, 'dismissed');
      void haptics.select();
    },
    [setActionState],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? iosKbOffset : 0}
      >
        <View style={styles.flex}>
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <TouchableOpacity
                onPress={goBack}
                style={styles.backBtn}
                accessibilityLabel="Close assistant"
              >
                <MaterialCommunityIcons name="arrow-left" size={22} color={theme.colors.ink} />
              </TouchableOpacity>
              <View style={styles.headerCopy}>
                <Text style={styles.eyebrow}>Copilot</Text>
                <Text style={styles.title} numberOfLines={1}>
                  Ask your ledger
                </Text>
                {quota ? (
                  <Text style={styles.quotaHint}>
                    {quota.exhausted
                      ? `Weekly limit reached (${quota.limit} messages)`
                      : `${quota.remaining} of ${quota.limit} AI messages left this week`}
                    {' · '}
                    keeps last {MAX_CHAT_HISTORY} chats
                  </Text>
                ) : null}
              </View>
            </View>
            {!configured ? (
              <View style={styles.configHint}>
                <MaterialCommunityIcons
                  name="key-alert-outline"
                  size={16}
                  color={theme.colors.coral}
                />
                <Text style={styles.configHintText}>
                  AI isn’t configured on this build. Add the OpenRouter key, then rebuild.
                </Text>
              </View>
            ) : null}
          </View>

          {showQuickPrompts ? (
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
                    disabled={loading || Boolean(quota?.exhausted)}
                  >
                    <Text style={styles.promptText}>{item}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          ) : null}

          <View
            style={[
              styles.chatListWrapper,
              {
                minHeight: Math.max(
                  180,
                  windowHeight -
                    (showQuickPrompts ? 180 : 130) -
                    iosKbOffset -
                    (keyboardVisible ? keyboardHeight : Math.max(insets.bottom, 40)) -
                    80,
                ),
              },
            ]}
          >
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(item) => item.id}
              style={styles.flex}
              contentContainerStyle={styles.chatList}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              onContentSizeChange={onContentSizeChange}
              onLayout={onListLayout}
              renderItem={({ item }) => {
                const isError = item.tone === 'error';
                const actions = item.actions || [];
                return (
                  <View style={styles.messageBlock}>
                    <View
                      style={[
                        styles.bubble,
                        item.role === 'user' ? styles.userBubble : styles.assistantBubble,
                        isError && styles.errorBubble,
                      ]}
                    >
                      {isError ? (
                        <View style={styles.errorHeader}>
                          <MaterialCommunityIcons
                            name="alert-circle-outline"
                            size={16}
                            color={theme.colors.coral}
                          />
                          <Text style={styles.errorLabel}>Couldn’t complete</Text>
                        </View>
                      ) : null}
                      <Text
                        style={[
                          styles.messageText,
                          item.role === 'user' ? styles.userText : styles.assistantText,
                          isError && styles.errorText,
                        ]}
                      >
                        {item.content}
                      </Text>
                    </View>

                    {actions.length
                      ? actions.map((action, index) => {
                          const state = item.actionStates?.[index] || 'pending';
                          return (
                            <View key={`${item.id}-action-${index}`} style={styles.actionCard}>
                              <View style={styles.actionHeader}>
                                <MaterialCommunityIcons
                                  name="bullseye-arrow"
                                  size={18}
                                  color={theme.colors.cedar}
                                />
                                <Text style={styles.actionTitle}>Goal suggestion</Text>
                              </View>
                              <Text style={styles.actionBody}>
                                {describeGoalAction(action)}
                              </Text>
                              {state === 'pending' ? (
                                <View style={styles.actionRow}>
                                  <TouchableOpacity
                                    style={styles.actionDismiss}
                                    onPress={() => dismissAction(item.id, index)}
                                  >
                                    <Text style={styles.actionDismissText}>Dismiss</Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    style={styles.actionConfirm}
                                    onPress={() => void confirmAction(item.id, index, action)}
                                  >
                                    <Text style={styles.actionConfirmText}>Confirm</Text>
                                  </TouchableOpacity>
                                </View>
                              ) : (
                                <Text
                                  style={[
                                    styles.actionStatus,
                                    state === 'applied' && styles.actionStatusOk,
                                    state === 'failed' && styles.actionStatusBad,
                                  ]}
                                >
                                  {state === 'applied'
                                    ? 'Applied to your goals'
                                    : state === 'dismissed'
                                      ? 'Dismissed'
                                      : 'Couldn’t apply — try again from Goals'}
                                </Text>
                              )}
                            </View>
                          );
                        })
                      : null}
                  </View>
                );
              }}
              ListFooterComponent={
                loading ? (
                  <View style={styles.typing}>
                    <ActivityIndicator color={theme.colors.cedar} />
                    <Text style={styles.typingText}>Thinking…</Text>
                  </View>
                ) : null
              }
            />
          </View>
        </View>

        <Animated.View
          style={[
            styles.inputContainer,
            {
              paddingBottom: composerPadBottom,
              transform: [
                {
                  translateY: Animated.add(composerEnter, Animated.multiply(composerLift, -1)),
                },
              ],
            },
          ]}
        >
          <TextInput
            ref={inputRef}
            style={[styles.input, { maxHeight: inputMaxHeight }]}
            placeholder="Chat about your money…"
            placeholderTextColor={theme.colors.muted}
            value={message}
            onChangeText={setMessage}
            multiline
            editable
            blurOnSubmit={false}
            returnKeyType="default"
            autoCorrect
            autoCapitalize="sentences"
            textAlignVertical="top"
            onFocus={onInputFocus}
            onLayout={onInputLayout}
          />
          <Pressable
            style={({ pressed }) => [
              styles.sendButton,
              (!message.trim() || loading) && styles.sendDisabled,
              pressed && styles.sendPressed,
            ]}
                onPress={() => sendPrompt(message)}
            disabled={!message.trim() || loading || Boolean(quota?.exhausted)}
            accessibilityLabel="Send message"
          >
            <MaterialCommunityIcons name="send" size={20} color={theme.colors.white} />
          </Pressable>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.paper,
    zIndex: 100,
    elevation: 30,
  },
  flex: {
    flex: 1,
  },
  chatListWrapper: {
    flex: 1,
    minHeight: 200,
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
  headerCopy: { flex: 1, minWidth: 0 },
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
  quotaHint: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.muted,
  },
  configHint: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.coralSoft,
    borderWidth: 1,
    borderColor: 'rgba(231, 111, 81, 0.28)',
  },
  configHintText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: theme.colors.cedarDeep,
    fontWeight: '600',
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
    maxWidth: 280,
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
  messageBlock: {
    gap: 8,
  },
  actionCard: {
    alignSelf: 'flex-start',
    maxWidth: '92%',
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    padding: 12,
    gap: 8,
    ...theme.shadow.soft,
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.brass,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  actionBody: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: theme.colors.ink,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  actionDismiss: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.line,
    alignItems: 'center',
    backgroundColor: theme.colors.paper,
  },
  actionDismissText: {
    fontWeight: '700',
    color: theme.colors.muted,
    fontSize: 13,
  },
  actionConfirm: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    backgroundColor: theme.colors.cedar,
  },
  actionConfirmText: {
    fontWeight: '700',
    color: theme.colors.white,
    fontSize: 13,
  },
  actionStatus: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.muted,
  },
  actionStatusOk: {
    color: theme.colors.mint,
  },
  actionStatusBad: {
    color: theme.colors.coral,
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
  errorBubble: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: 'rgba(231, 111, 81, 0.28)',
    shadowOpacity: 0.04,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  errorLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    color: theme.colors.coral,
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
  errorText: {
    color: theme.colors.cedarDeep,
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
    zIndex: 40,
    elevation: 24,
  },
  input: {
    flex: 1,
    minHeight: 52,
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
