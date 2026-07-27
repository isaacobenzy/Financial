import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getImportedTransactions,
  hasRealImportedTransactions,
  recalculateLedgerBalance,
} from '@/lib/ledgerStore';
import { getGoals } from '@/lib/goalsStore';
import { refreshWidgetSnapshot } from '@/lib/widgetBridge';

const IMPORTED_KEY = 'imported_transactions_v1';
const GOALS_KEY = 'financial_goals_v1';
const SAMPLE_PURGED_KEY = 'sample_data_purged_v1';

function isDemoLikeId(id: string) {
  return id.includes('demo') || id.startsWith('sms-demo');
}

/** Seeded goal ids look like `goal-1` … `goal-N` (no random suffix). */
function isSeedGoalId(id: string) {
  return /^goal-\d+$/.test(id);
}

/**
 * When the ledger has real imports, strip sample/demo rows, recompute balance
 * from real data only, and drop unmodified seed goals once.
 * Safe to call on every app open / import.
 */
export async function ensureRealDataEverywhere(): Promise<{
  purged: boolean;
  hadReal: boolean;
}> {
  const imported = await getImportedTransactions();
  const hadReal = hasRealImportedTransactions(imported);
  if (!hadReal) {
    return { purged: false, hadReal: false };
  }

  const realOnly = imported.filter((t) => !isDemoLikeId(t.id));
  let changed = realOnly.length !== imported.length;

  if (changed) {
    await AsyncStorage.setItem(IMPORTED_KEY, JSON.stringify(realOnly));
  }

  // Always recompute so a cached demo base balance cannot linger.
  await recalculateLedgerBalance(realOnly);

  let alreadyPurged = false;
  try {
    alreadyPurged = (await AsyncStorage.getItem(SAMPLE_PURGED_KEY)) === '1';
  } catch {
    alreadyPurged = false;
  }

  if (!alreadyPurged) {
    try {
      const goals = await getGoals();
      const kept = goals.filter((g) => !isSeedGoalId(g.id));
      if (kept.length !== goals.length) {
        await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(kept));
        changed = true;
      }
      await AsyncStorage.setItem(SAMPLE_PURGED_KEY, '1');
    } catch {
      // non-fatal
    }
  }

  try {
    await refreshWidgetSnapshot();
  } catch {
    // non-fatal
  }

  return { purged: changed, hadReal: true };
}
