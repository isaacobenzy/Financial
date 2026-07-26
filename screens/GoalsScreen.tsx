import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { tabContentPaddingBottom } from '@/constants/layout';
import { theme } from '@/constants/theme';
import {
  addGoalProgress,
  createEmptyGoal,
  getGoals,
  goalProgressPct,
  markGoalComplete,
  removeGoal,
  reopenGoal,
  upsertGoal,
  type FinancialGoal,
} from '@/lib/goalsStore';
import { haptics } from '@/lib/haptics';
import { recordActivity } from '@/lib/achievements';
import { notificationService } from '@/lib/notificationStore';
import { refreshWidgetSnapshot } from '@/lib/widgetBridge';
import { emitActivityPulse } from '@/lib/liveActivityFeed';
import AiFab from '@/components/AiFab';

const ICON_OPTIONS: Array<keyof typeof MaterialCommunityIcons.glyphMap> = [
  'food-outline',
  'car-outline',
  'shopping-outline',
  'lightning-bolt-outline',
  'piggy-bank-outline',
  'home-outline',
  'airplane',
  'school-outline',
];

function iconName(icon: string): keyof typeof MaterialCommunityIcons.glyphMap {
  const map: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
    food: 'food-outline',
    car: 'car-outline',
    shopping: 'shopping-outline',
    'lightning-bolt': 'lightning-bolt-outline',
    'piggy-bank': 'piggy-bank-outline',
    home: 'home-outline',
    target: 'bullseye-arrow',
  };
  return map[icon] || (icon as keyof typeof MaterialCommunityIcons.glyphMap) || 'bullseye';
}

export default function GoalsScreen() {
  const insets = useSafeAreaInsets();
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [editing, setEditing] = useState<FinancialGoal | null>(null);
  const [isNewGoal, setIsNewGoal] = useState(false);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [current, setCurrent] = useState('');
  const [kind, setKind] = useState<'budget' | 'savings'>('savings');

  const refresh = useCallback(async () => {
    setGoals(await getGoals());
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
      void recordActivity();
    }, [refresh]),
  );

  const openEdit = (goal?: FinancialGoal) => {
    void haptics.select();
    const g = goal || createEmptyGoal({ period, kind: 'savings' });
    setIsNewGoal(!goal);
    setEditing(g);
    setName(g.name === 'New goal' && !goal ? '' : g.name);
    setTarget(String(g.target));
    setCurrent(String(g.current));
    setKind(g.kind);
  };

  const closeModal = () => {
    Keyboard.dismiss();
    setEditing(null);
    setIsNewGoal(false);
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (!name.trim()) {
      notificationService.error('Give your goal a name');
      return;
    }
    const next: FinancialGoal = {
      ...editing,
      name: name.trim(),
      target: Math.max(0, Number(target) || 0),
      current: Math.max(0, Number(current) || 0),
      period,
      kind,
      status: editing.status,
    };
    const list = await upsertGoal(next);
    setGoals(list);
    await recordActivity();
    await refreshWidgetSnapshot();
    notificationService.success(
      next.kind === 'savings'
        ? 'Raise Current toward Target to complete this goal'
        : 'Budget goal saved — keep Current at or under Target',
      'Goal saved',
    );
    await emitActivityPulse({
      kind: 'goal',
      title: isNewGoal ? 'Goal created' : 'Goal updated',
      body: `“${next.name}” is ready to track.`,
      href: '/(tabs)/goals',
      goalId: next.id,
    });
    closeModal();
  };

  const completeGoal = async (id: string) => {
    const before = goals.find((g) => g.id === id);
    const list = await markGoalComplete(id);
    setGoals(list);
    await recordActivity();
    await refreshWidgetSnapshot();
    notificationService.success('Nice work — goal marked complete');
    if (before) {
      await emitActivityPulse({
        kind: 'goal',
        title: 'Goal complete',
        body: `You finished “${before.name}”.`,
        href: '/(tabs)/goals',
        goalId: id,
      });
    }
    closeModal();
  };

  const bumpProgress = async (amount: number) => {
    if (!editing) return;
    const list = await addGoalProgress(editing.id, amount);
    setGoals(list);
    const updated = list.find((g) => g.id === editing.id);
    if (updated) {
      setEditing(updated);
      setCurrent(String(updated.current));
      if (updated.status === 'completed') {
        notificationService.success('Goal completed!');
        await emitActivityPulse({
          kind: 'goal',
          title: 'Goal complete',
          body: `You finished “${updated.name}”.`,
          href: '/(tabs)/goals',
          goalId: updated.id,
        });
      } else {
        await haptics.buttonPress();
        const pct =
          updated.target > 0
            ? Math.min(100, Math.round((updated.current / updated.target) * 100))
            : 0;
        if (pct >= 80) {
          await emitActivityPulse({
            kind: 'goal',
            title: 'Almost there',
            body: `“${updated.name}” is at ${pct}% of target.`,
            href: '/(tabs)/goals',
            goalId: updated.id,
          });
        }
      }
    }
    await refreshWidgetSnapshot();
  };

  const deleteGoal = async (id: string) => {
    const list = await removeGoal(id);
    setGoals(list);
    notificationService.info('Goal removed');
    closeModal();
  };

  const visible = goals.filter((g) => g.period === period);
  const active = visible.filter((g) => g.status !== 'completed');
  const done = visible.filter((g) => g.status === 'completed');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Targets</Text>
        <Text style={styles.title}>Financial goals</Text>
        <Text style={styles.howTo}>
          Tap Add goal → set Target & Current → use +100 or Mark complete. Streaks grow when you open
          the app once a day.
        </Text>
      </View>

      <View style={styles.periodRow}>
        {(['monthly', 'yearly'] as const).map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.periodBtn, period === p && styles.periodBtnActive]}
            onPress={async () => {
              await haptics.select();
              setPeriod(p);
            }}
          >
            <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
              {p === 'monthly' ? 'Monthly' : 'Yearly'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: tabContentPaddingBottom(insets.bottom) }]}
        showsVerticalScrollIndicator={false}
      >
        {active.map((goal) => {
          const pct = goalProgressPct(goal);
          const over = goal.kind === 'budget' && goal.current > goal.target;
          return (
            <TouchableOpacity
              key={goal.id}
              style={styles.card}
              onPress={() => openEdit(goal)}
              activeOpacity={0.85}
            >
              <View style={styles.cardTop}>
                <View style={styles.iconBadge}>
                  <MaterialCommunityIcons
                    name={iconName(goal.icon)}
                    size={22}
                    color={theme.colors.cedar}
                  />
                </View>
                <View style={styles.cardCopy}>
                  <Text style={styles.goalName}>{goal.name}</Text>
                  <Text style={[styles.goalMeta, over && styles.over]}>
                    GH₵ {goal.current.toLocaleString('en-GH')} / {goal.target.toLocaleString('en-GH')}
                    {' · '}
                    {goal.kind === 'savings' ? 'Savings' : 'Budget'}
                  </Text>
                </View>
                <Text style={styles.pctLabel}>{pct}%</Text>
              </View>
              <View style={styles.track}>
                <View
                  style={[
                    styles.fill,
                    {
                      width: `${pct}%`,
                      backgroundColor: over ? theme.colors.coral : theme.colors.mint,
                    },
                  ]}
                />
              </View>
            </TouchableOpacity>
          );
        })}

        {done.length ? (
          <Text style={styles.sectionLabel}>Completed</Text>
        ) : null}
        {done.map((goal) => (
          <TouchableOpacity
            key={goal.id}
            style={[styles.card, styles.cardDone]}
            onPress={() => openEdit(goal)}
          >
            <View style={styles.cardTop}>
              <MaterialCommunityIcons name="check-circle" size={22} color={theme.colors.mint} />
              <Text style={[styles.goalName, { flex: 1, marginLeft: 10 }]}>{goal.name}</Text>
              <Text style={styles.doneChip}>Done</Text>
            </View>
          </TouchableOpacity>
        ))}

        {!visible.length ? (
          <Text style={styles.empty}>No {period} goals yet — add one below.</Text>
        ) : null}

        <TouchableOpacity style={styles.addBtn} onPress={() => openEdit()}>
          <MaterialCommunityIcons name="plus" size={20} color={theme.colors.white} />
          <Text style={styles.addBtnText}>Add goal</Text>
        </TouchableOpacity>
      </ScrollView>

      <AiFab />

      <Modal visible={Boolean(editing)} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
        >
          <Pressable style={styles.modalBackdrop} onPress={closeModal} />
          <View style={styles.modalCard}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScroll}
            >
              <View style={styles.modalGrab} />
              <Text style={styles.modalTitle}>
                {goals.some((g) => g.id === editing?.id) ? 'Edit goal' : 'New goal'}
              </Text>

              <View style={styles.kindRow}>
                {(['savings', 'budget'] as const).map((k) => (
                  <TouchableOpacity
                    key={k}
                    style={[styles.kindChip, kind === k && styles.kindChipActive]}
                    onPress={() => setKind(k)}
                  >
                    <Text style={[styles.kindText, kind === k && styles.kindTextActive]}>
                      {k === 'savings' ? 'Savings' : 'Budget'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Name</Text>
              <TextInput
                style={styles.field}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Emergency fund"
                placeholderTextColor={theme.colors.tabInactive}
                returnKeyType="next"
              />
              <Text style={styles.fieldLabel}>Target (GH₵)</Text>
              <TextInput
                style={styles.field}
                value={target}
                onChangeText={setTarget}
                keyboardType="decimal-pad"
                placeholder="1000"
                placeholderTextColor={theme.colors.tabInactive}
              />
              <Text style={styles.fieldLabel}>
                Current (GH₵) — {kind === 'savings' ? 'amount saved so far' : 'amount spent so far'}
              </Text>
              <TextInput
                style={styles.field}
                value={current}
                onChangeText={setCurrent}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={theme.colors.tabInactive}
              />

              {editing && goals.some((g) => g.id === editing.id) ? (
                <View style={styles.quickRow}>
                  <TouchableOpacity style={styles.quickBtn} onPress={() => bumpProgress(50)}>
                    <Text style={styles.quickBtnText}>+50</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.quickBtn} onPress={() => bumpProgress(100)}>
                    <Text style={styles.quickBtnText}>+100</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.quickBtn} onPress={() => bumpProgress(-50)}>
                    <Text style={styles.quickBtnText}>-50</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              <View style={styles.iconPick}>
                {ICON_OPTIONS.map((ic) => (
                  <TouchableOpacity
                    key={ic}
                    style={[styles.iconChip, editing?.icon === ic && styles.iconChipActive]}
                    onPress={() => editing && setEditing({ ...editing, icon: ic })}
                  >
                    <MaterialCommunityIcons name={ic} size={18} color={theme.colors.cedar} />
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={saveEdit}>
                <Text style={styles.saveBtnText}>Save goal</Text>
              </TouchableOpacity>

              {editing && goals.some((g) => g.id === editing.id) ? (
                <>
                  {editing.status !== 'completed' ? (
                    <TouchableOpacity
                      style={styles.completeBtn}
                      onPress={() => completeGoal(editing.id)}
                    >
                      <MaterialCommunityIcons name="flag-checkered" size={18} color={theme.colors.white} />
                      <Text style={styles.completeBtnText}>Mark complete</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.reopenBtn}
                      onPress={async () => {
                        const list = await reopenGoal(editing.id);
                        setGoals(list);
                        const g = list.find((x) => x.id === editing.id);
                        if (g) setEditing(g);
                        notificationService.info('Goal reopened');
                      }}
                    >
                      <Text style={styles.reopenBtnText}>Reopen goal</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteGoal(editing.id)}>
                    <Text style={styles.deleteBtnText}>Delete</Text>
                  </TouchableOpacity>
                </>
              ) : null}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.paper },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
  eyebrow: {
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: theme.colors.brass,
    fontWeight: '700',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.ink,
    marginTop: 4,
  },
  howTo: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.muted,
  },
  periodRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.line,
    alignItems: 'center',
  },
  periodBtnActive: {
    backgroundColor: theme.colors.cedar,
    borderColor: theme.colors.cedar,
  },
  periodText: { fontWeight: '700', color: theme.colors.muted },
  periodTextActive: { color: theme.colors.white },
  list: { padding: 16, gap: 12 },
  sectionLabel: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.brass,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.line,
    gap: 12,
    ...theme.shadow.soft,
  },
  cardDone: { opacity: 0.85 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCopy: { flex: 1 },
  goalName: { fontSize: 16, fontWeight: '700', color: theme.colors.ink },
  goalMeta: { marginTop: 2, fontSize: 13, fontWeight: '600', color: theme.colors.muted },
  over: { color: theme.colors.coral },
  pctLabel: { fontSize: 14, fontWeight: '700', color: theme.colors.cedar },
  track: {
    height: 8,
    borderRadius: 999,
    backgroundColor: theme.colors.paper,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 999 },
  doneChip: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.mint,
  },
  empty: { textAlign: 'center', color: theme.colors.muted, marginVertical: 20 },
  addBtn: {
    marginTop: 8,
    backgroundColor: theme.colors.cedar,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addBtnText: { color: theme.colors.white, fontWeight: '700', fontSize: 15 },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,42,32,0.45)',
  },
  modalCard: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    maxHeight: '92%',
  },
  modalScroll: { padding: 20, paddingBottom: 40 },
  modalGrab: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.line,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.ink,
    marginBottom: 12,
  },
  kindRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  kindChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.line,
    alignItems: 'center',
    backgroundColor: theme.colors.paper,
  },
  kindChipActive: {
    backgroundColor: theme.colors.sage,
    borderColor: theme.colors.cedar,
  },
  kindText: { fontWeight: '700', color: theme.colors.muted },
  kindTextActive: { color: theme.colors.cedarDeep },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.muted,
    marginBottom: 6,
    marginTop: 8,
  },
  field: {
    backgroundColor: theme.colors.paper,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.colors.ink,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  quickRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  quickBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.sage,
    alignItems: 'center',
  },
  quickBtnText: { fontWeight: '700', color: theme.colors.cedarDeep },
  iconPick: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  iconChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  iconChipActive: {
    borderColor: theme.colors.cedar,
    backgroundColor: theme.colors.sage,
  },
  saveBtn: {
    marginTop: 18,
    backgroundColor: theme.colors.cedar,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: { color: theme.colors.white, fontWeight: '700' },
  completeBtn: {
    marginTop: 10,
    backgroundColor: theme.colors.mint,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  completeBtnText: { color: theme.colors.white, fontWeight: '700' },
  reopenBtn: { marginTop: 10, paddingVertical: 12, alignItems: 'center' },
  reopenBtnText: { color: theme.colors.brass, fontWeight: '700' },
  deleteBtn: { marginTop: 4, paddingVertical: 12, alignItems: 'center' },
  deleteBtnText: { color: theme.colors.coral, fontWeight: '700' },
});
