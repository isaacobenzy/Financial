import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestPermission } from '@/lib/permissions';
import { isExpoGo } from '@/lib/runtime';
import { getNativeSmsReader } from '@/lib/nativeSmsReader';
import { isFinancialSms } from '@/utils/smsParser';

export type SmsMessage = {
  id: string;
  address: string;
  body: string;
  date: string;
};

export type SmsImportMode =
  | 'native'
  | 'demo'
  | 'unavailable'
  | 'needs_dev_build'
  | 'expo_go'
  | 'native_missing'
  | 'permission_denied'
  | 'empty_inbox'
  | 'timeout'
  | 'scan_error';

const PREFER_REAL_KEY = 'sms_prefer_real_v1';
const SCAN_TIMEOUT_MS = 20_000;
const SCAN_RETRIES = 2;

export const DEMO_SMS: SmsMessage[] = [
  {
    id: 'sms-demo-momo-in',
    address: 'MTN MoMo',
    body: 'Payment received GHS 250.00 from John Doe. Current Balance: GHS 1,240.50',
    date: String(Date.now() - 86400000),
  },
  {
    id: 'sms-demo-gcb',
    address: 'GCB Bank',
    body: 'Debited GHS 45.00 at SUPERMARKET. Available bal: GHS 890.00',
    date: String(Date.now() - 172800000),
  },
  {
    id: 'sms-demo-voda',
    address: 'Vodafone Cash',
    body: 'You sent GHS 100.00 to 024XXXX123. Fee: GHS 1.00. Ref: TXN998877',
    date: String(Date.now() - 259200000),
  },
  {
    id: 'sms-demo-kfc',
    address: 'MTN MoMo',
    body: 'You have paid GHS 85.00 to KFC Accra. Current Balance: GHS 1,155.50',
    date: String(Date.now() - 320000000),
  },
  {
    id: 'sms-demo-promo',
    address: 'Promo GH',
    body: 'Win a free phone today! Dial *123#',
    date: String(Date.now() - 100000),
  },
];

export const GHANA_SENDER_ALLOWLIST = [
  'MTN',
  'MOMO',
  'MoMo',
  'VODAFONE',
  'Vodafone',
  'Vcash',
  'TELECEL',
  'Telecel',
  'AIRTEL',
  'Airtel',
  'TIGO',
  'Tigo',
  'GCB',
  'ECOBANK',
  'Ecobank',
  'STANBIC',
  'Stanbic',
  'ABSA',
  'Absa',
  'CAL',
  'CalBank',
  'FIDELITY',
  'Fidelity',
  'Access Bank',
  'ACCESS',
  'UBA',
  'Zenith',
  'ZENITH',
  'GTBank',
  'GT BANK',
  'SCB',
  'Standard Chartered',
  'FNB',
  'First Nat',
  'HFC',
  'Republic',
  'SIC',
  'Bank',
  'BANK',
  'Momo',
  'MobileMoney',
  'Mobile Money',
  'MOBILE MONEY',
  'Cash',
  'CASH',
  'ALERT',
  'Alert',
  'NOTICE',
  'Notice',
  'Payment',
  'PAYMENT',
  'Transfer',
  'TRANSFER',
  'Credit',
  'CREDIT',
  'Debit',
  'DEBIT',
  'Transaction',
  'TXN',
  'Balance',
  'BALANCE',
  'GHS',
  'Ghc',
  'GH¢',
  '₵',
];

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export async function markPreferRealSms(): Promise<void> {
  await AsyncStorage.setItem(PREFER_REAL_KEY, '1');
}

export async function prefersRealSms(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(PREFER_REAL_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function ensureSmsPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  return requestPermission('sms');
}

function filterFinancial(messages: SmsMessage[]): SmsMessage[] {
  return messages.filter((m) => isFinancialSms(m.address, m.body));
}

function expoGoResult(permissionGranted: boolean) {
  return {
    messages: [] as SmsMessage[],
    usingDemo: false,
    mode: 'expo_go' as const,
    permissionGranted,
    reason:
      'Expo Go cannot read the SMS inbox. Build a preview APK (pnpm build:android:preview) or use Paste SMS.',
  };
}

function nativeMissingResult(permissionGranted: boolean) {
  return {
    messages: [] as SmsMessage[],
    usingDemo: false,
    mode: 'native_missing' as const,
    permissionGranted,
    reason:
      'This install is missing the native SMS module. Rebuild the Android APK after installing expo-transaction-sms-reader, or use Paste SMS.',
  };
}

/**
 * Read inbox when a native SMS module is available.
 * Never silently substitutes demo data after the user grants permission.
 */
export async function fetchInboxSms(options?: {
  allowDemoFallback?: boolean;
  scanDays?: number;
}): Promise<{
  messages: SmsMessage[];
  usingDemo: boolean;
  mode: SmsImportMode;
  permissionGranted: boolean;
  reason?: string;
}> {
  const allowDemoFallback = options?.allowDemoFallback === true;

  if (Platform.OS !== 'android') {
    if (allowDemoFallback) {
      return {
        messages: filterFinancial(DEMO_SMS),
        usingDemo: true,
        mode: 'demo',
        permissionGranted: true,
      };
    }
    return {
      messages: [],
      usingDemo: false,
      mode: 'unavailable',
      permissionGranted: true,
      reason:
        'iOS cannot read the SMS inbox. Use Paste SMS instead — copy MoMo or bank alerts from the Messages app and paste them here.',
    };
  }

  const granted = await ensureSmsPermission();
  if (!granted) {
    return {
      messages: [],
      usingDemo: false,
      mode: 'permission_denied',
      permissionGranted: false,
      reason:
        'SMS permission was denied. Open system settings, grant READ_SMS, then come back and try again.',
    };
  }

  await markPreferRealSms();

  if (isExpoGo()) {
    if (allowDemoFallback) {
      return {
        messages: filterFinancial(DEMO_SMS),
        usingDemo: true,
        mode: 'demo',
        permissionGranted: true,
      };
    }
    return expoGoResult(true);
  }

  let smsReader: Awaited<ReturnType<typeof getNativeSmsReader>> = null;
  try {
    smsReader = await getNativeSmsReader();
    if (!smsReader) {
      return nativeMissingResult(true);
    }
  } catch (err) {
    return nativeMissingResult(true);
  }

  const scanDays = options?.scanDays ?? 90;

  const attemptScan = async (attempt: number): Promise<ReturnType<typeof fetchInboxSms>> => {
    const scan = (async () => {
      let status = 'granted';
      try {
        status = await smsReader!.ensurePermissionsAsync();
      } catch {
        // If native perm check fails, assume granted since we already passed PermissionsAndroid above
        status = 'granted';
      }

      if (status && status !== 'granted' && status !== 'undetermined') {
        // Treat anything other than explicitly denied as still trying (some bridges return empty strings)
        const deniedTitles = ['denied', 'blocked', 'rejected', 'restricted'];
        const lowered = String(status).toLowerCase();
        if (deniedTitles.some((t) => lowered.includes(t))) {
          return {
            messages: [] as SmsMessage[],
            usingDemo: false,
            mode: 'permission_denied' as const,
            permissionGranted: false,
            reason:
              'SMS permission is denied inside the native SMS bridge. Open system settings and grant SMS access, then use Paste SMS for immediate results.',
          };
        }
      }

      const since = Date.now() - scanDays * 24 * 60 * 60 * 1000;
      let rows: Awaited<ReturnType<NonNullable<typeof smsReader>['getRecentMessages']>> = [];
      try {
        rows = await smsReader!.getRecentMessages({
          limit: 400,
          sinceTimestamp: since,
          onlyTransactions: false,
          minConfidence: 0.05,
          senderAllowlist: GHANA_SENDER_ALLOWLIST,
        });
      } catch (readErr) {
        if (attempt < SCAN_RETRIES) {
          throw readErr;
        }
        return {
          messages: [] as SmsMessage[],
          usingDemo: false,
          mode: 'scan_error' as const,
          permissionGranted: true,
          reason: `Could not read the inbox (${readErr instanceof Error ? readErr.message : 'native error'}). Try Paste SMS instead.`,
        };
      }

      if (!Array.isArray(rows) || rows.length === 0) {
        return {
          messages: [] as SmsMessage[],
          usingDemo: false,
          mode: 'empty_inbox' as const,
          permissionGranted: true,
          reason:
            'Permission granted, but no SMS were returned by the system. If you know there are MoMa/bank texts, try Paste SMS as a reliable alternative.',
        };
      }

      const messages: SmsMessage[] = rows
        .map((row, index) => ({
          id: `inbox-${row.raw?.id ?? row.raw?._id ?? index}-${row.raw?.date ?? index}-${attempt}`,
          address: row.raw?.address || row.transaction?.sender || 'Unknown',
          body: row.raw?.body || '',
          date: String(row.raw?.date ?? row.raw?.timestamp ?? Date.now()),
        }))
        .filter((m) => m.body && m.body.trim().length > 3);

      const financial = filterFinancial(messages);

      return {
        messages: financial,
        usingDemo: false,
        mode: (financial.length ? 'native' : 'empty_inbox') as SmsImportMode,
        permissionGranted: true,
        reason: financial.length
          ? undefined
          : `Permission granted — scanned ${messages.length} SMS from the last ${scanDays} days but none matched Ghana MoMo or bank patterns. Try Paste SMS with a known MoMo alert.`,
      };
    })();

    try {
      return (await withTimeout(scan, SCAN_TIMEOUT_MS, `SMS inbox scan #${attempt + 1}`)) as Awaited<
        ReturnType<typeof fetchInboxSms>
      >;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (attempt < SCAN_RETRIES) {
        // brief pause before retry
        await new Promise((resolve) => setTimeout(resolve, 400));
        return attemptScan(attempt + 1);
      }
      if (message.includes('timed out')) {
        return {
          messages: [],
          usingDemo: false,
          mode: 'timeout',
          permissionGranted: true,
          reason:
            'SMS inbox scan timed out after several tries. Use Paste SMS instead — it works reliably on every device.',
        };
      }
      return {
        messages: [],
        usingDemo: false,
        mode: 'scan_error',
        permissionGranted: true,
        reason: `Could not read the SMS inbox (${message}). Try again or use Paste SMS.`,
      };
    }
  };

  const firstResult = await attemptScan(0);

  // If native scan ran but yielded 0 rows, try once without the allowlist filter
  // because some Android builds use numeric shortcodes that don't match our keywords.
  if (
    firstResult.mode === 'empty_inbox' &&
    firstResult.messages.length === 0 &&
    firstResult.permissionGranted
  ) {
    try {
      const since = Date.now() - scanDays * 24 * 60 * 60 * 1000;
      const broadRows = await smsReader!.getRecentMessages({
        limit: 600,
        sinceTimestamp: since,
        onlyTransactions: false,
        minConfidence: 0,
        senderAllowlist: [],
      });
      if (Array.isArray(broadRows) && broadRows.length > 0) {
        const broadMessages: SmsMessage[] = broadRows
          .slice(0, 500)
          .map((row, index) => ({
            id: `inbox-broad-${row.raw?.id ?? row.raw?._id ?? index}-${row.raw?.date ?? index}`,
            address: row.raw?.address || row.transaction?.sender || 'Unknown',
            body: row.raw?.body || '',
            date: String(row.raw?.date ?? row.raw?.timestamp ?? Date.now()),
          }))
          .filter((m) => m.body && m.body.trim().length > 3);
        const financial = filterFinancial(broadMessages);
        if (financial.length) {
          return {
            messages: financial,
            usingDemo: false,
            mode: 'native',
            permissionGranted: true,
          };
        }
      }
    } catch {
      // ignore — keep firstResult
    }
  }

  if (
    !firstResult.messages.length &&
    allowDemoFallback &&
    firstResult.permissionGranted &&
    firstResult.mode !== 'permission_denied'
  ) {
    return {
      messages: filterFinancial(DEMO_SMS),
      usingDemo: true,
      mode: 'demo',
      permissionGranted: true,
    };
  }

  return firstResult;
}

export async function openSmsSettingsIfBlocked(): Promise<void> {
  try {
    const smsReader = await getNativeSmsReader();
    if (smsReader) {
      await smsReader.openAppSettings();
      return;
    }
  } catch {
    // fall through
  }
  const { openAppSettings } = await import('@/lib/permissions');
  await openAppSettings();
}
