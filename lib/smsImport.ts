import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestPermission } from '@/lib/permissions';
import { isFinancialSms } from '@/utils/smsParser';

export type SmsMessage = {
  id: string;
  address: string;
  body: string;
  date: string;
};

export type SmsImportMode = 'native' | 'demo' | 'unavailable' | 'needs_dev_build';

const PREFER_REAL_KEY = 'sms_prefer_real_v1';

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
      mode: 'unavailable',
      permissionGranted: false,
      reason: 'SMS permission was denied.',
    };
  }

  await markPreferRealSms();

  try {
    const smsReader = await import('expo-transaction-sms-reader');
    const status = await smsReader.ensurePermissionsAsync();
    if (status !== 'granted') {
      return {
        messages: [],
        usingDemo: false,
        mode: 'unavailable',
        permissionGranted: false,
        reason: 'SMS permission was denied by the reader module.',
      };
    }

    const since = Date.now() - 60 * 24 * 60 * 60 * 1000;
    const rows = await smsReader.getRecentMessages({
      limit: 200,
      sinceTimestamp: since,
      onlyTransactions: true,
      minConfidence: 0.35,
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
      mode: 'native',
      permissionGranted: true,
      reason: financial.length
        ? undefined
        : 'Permission granted, but no financial MoMo/bank SMS were found in the last 60 days.',
    };
  } catch {
    // Expo Go / missing native module — do NOT inject demo unless explicitly asked
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
      mode: 'needs_dev_build',
      permissionGranted: true,
      reason:
        'SMS permission is on, but reading the inbox needs a development build (not Expo Go). Paste an SMS meanwhile, or run expo run:android.',
    };
  }
}

export async function openSmsSettingsIfBlocked(): Promise<void> {
  try {
    const smsReader = await import('expo-transaction-sms-reader');
    await smsReader.openAppSettings();
  } catch {
    const { openAppSettings } = await import('@/lib/permissions');
    await openAppSettings();
  }
}
