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
const SCAN_TIMEOUT_MS = 10_000;

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
      reason: 'iOS cannot read the SMS inbox. Use Paste SMS instead.',
    };
  }

  const granted = await ensureSmsPermission();
  if (!granted) {
    return {
      messages: [],
      usingDemo: false,
      mode: 'permission_denied',
      permissionGranted: false,
      reason: 'SMS permission was denied.',
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

  try {
    const smsReader = await getNativeSmsReader();
    if (!smsReader) {
      return nativeMissingResult(true);
    }

    const scan = (async () => {
      const status = await smsReader.ensurePermissionsAsync();
      if (status !== 'granted') {
        return {
          messages: [] as SmsMessage[],
          usingDemo: false,
          mode: 'permission_denied' as const,
          permissionGranted: false,
          reason: 'SMS permission was denied by the reader module.',
        };
      }

      const since = Date.now() - 60 * 24 * 60 * 60 * 1000;
      // Broad native fetch — app-side isFinancialSms is the source of truth for Ghana MoMo/banks
      const rows = await smsReader.getRecentMessages({
        limit: 200,
        sinceTimestamp: since,
        onlyTransactions: false,
        minConfidence: 0.2,
        senderAllowlist: [
          'MTN',
          'MoMo',
          'Vodafone',
          'Telecel',
          'Airtel',
          'GCB',
          'ECOBANK',
          'STANBIC',
          'ABSA',
          'CAL',
          'FIDELITY',
        ],
      });

      const messages: SmsMessage[] = rows.map((row, index) => ({
        id: `inbox-${row.raw?.id ?? row.raw?._id ?? index}-${row.raw?.date ?? index}`,
        address: row.raw?.address || row.transaction?.sender || 'Unknown',
        body: row.raw?.body || '',
        date: String(row.raw?.date ?? row.raw?.timestamp ?? Date.now()),
      }));

      const financial = filterFinancial(messages);
      return {
        messages: financial,
        usingDemo: false,
        mode: (financial.length ? 'native' : 'empty_inbox') as SmsImportMode,
        permissionGranted: true,
        reason: financial.length
          ? undefined
          : 'Permission granted, but no financial MoMo/bank SMS were found in the last 60 days.',
      };
    })();

    return await withTimeout(scan, SCAN_TIMEOUT_MS, 'SMS inbox scan');
  } catch (err) {
    if (allowDemoFallback) {
      return {
        messages: filterFinancial(DEMO_SMS),
        usingDemo: true,
        mode: 'demo',
        permissionGranted: true,
      };
    }
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('timed out')) {
      return {
        messages: [],
        usingDemo: false,
        mode: 'timeout',
        permissionGranted: true,
        reason: 'SMS inbox scan timed out. Try again or use Paste SMS.',
      };
    }
    return {
      messages: [],
      usingDemo: false,
      mode: 'scan_error',
      permissionGranted: true,
      reason: 'Could not read the SMS inbox. Try again or use Paste SMS.',
    };
  }
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
