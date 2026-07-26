/**
 * Live activity pulses — update in-app store AND mirror to push with deep link.
 * Demo feed optional; production events call emitActivityPulse from business code.
 */

import { useLiveActivityStore } from '@/lib/liveActivityStore';
import type { PushCategory } from '@/lib/notificationSettingsStore';

const DEMO_FLAG = process.env.EXPO_PUBLIC_DEMO_LIVE_FEED === '1';

let feedTimer: ReturnType<typeof setInterval> | null = null;
let started = false;

/** One-shot pulse for goals, imports, streaks, insights. */
export async function emitActivityPulse(params: {
  kind: 'ledger' | 'goal' | 'streak' | 'import' | 'insight';
  title: string;
  body: string;
  href?: string;
  goalId?: string;
}) {
  useLiveActivityStore.getState().pushPulse({
    kind: params.kind,
    title: params.title,
    body: params.body,
  });

  const category: PushCategory =
    params.kind === 'goal'
      ? 'goal_alerts'
      : params.kind === 'streak'
        ? 'streak_alerts'
        : params.kind === 'import'
          ? 'import_alerts'
          : params.kind === 'insight'
            ? 'insight_alerts'
            : 'ledger_live';

  const { sendActivityPush } = await import('@/lib/pushNotifications');
  await sendActivityPush({
    title: params.title,
    body: params.body,
    category,
    data: {
      href:
        params.href ||
        (params.kind === 'goal'
          ? '/(tabs)/goals'
          : params.kind === 'import'
            ? '/import-sms'
            : '/(tabs)'),
      goalId: params.goalId,
      screen:
        params.kind === 'goal' ? 'goals' : params.kind === 'import' ? 'import' : 'home',
    },
  });
}

export async function publishLedgerLiveFromSnapshot() {
  try {
    const { buildWidgetSnapshot } = await import('@/lib/widgetBridge');
    const snap = await buildWidgetSnapshot();
    const statusLine = [
      snap.balanceHidden ? 'Balance private' : snap.balanceDisplay,
      snap.topGoalName ? `${snap.topGoalName} ${snap.topGoalPct}%` : null,
      `Streak ${snap.streakCurrent}d`,
    ]
      .filter(Boolean)
      .join(' · ');

    useLiveActivityStore.getState().upsertLiveLedger({
      id: 'ledger-live',
      balanceDisplay: snap.balanceDisplay,
      streakCurrent: snap.streakCurrent,
      topGoalName: snap.topGoalName,
      topGoalPct: snap.topGoalPct,
      statusLine,
      updatedAt: Date.now(),
      active: true,
    });

    // Sticky lock-screen widgets (Android)
    const { publishLiveSections } = await import('@/lib/liveActivity');
    await publishLiveSections(snap);
  } catch {
    // ignore
  }
}

/** Demo pulses for QA — set EXPO_PUBLIC_DEMO_LIVE_FEED=1 */
export function startLiveActivityFeed() {
  if (started || !DEMO_FLAG) return;
  started = true;

  void publishLedgerLiveFromSnapshot();
  void emitActivityPulse({
    kind: 'ledger',
    title: 'Ledger live',
    body: 'Demo pulse — your balance widget is active.',
    href: '/(tabs)',
  });

  feedTimer = setInterval(() => {
    void publishLedgerLiveFromSnapshot();
  }, 60_000);
}

export function stopLiveActivityFeed() {
  if (feedTimer) {
    clearInterval(feedTimer);
    feedTimer = null;
  }
  started = false;
}
