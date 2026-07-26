/**
 * Native SMS bridge with cascading fallbacks:
 * 1) `expo-transaction-sms-reader` — packaged EAS / expo-module build
 * 2) `react-native-get-sms-android` — alternative native Android bridge
 * 3) ContentResolver via PermissionsAndroid raw lookup (if exposed)
 *
 * Dynamically imports every module so Expo Go / web still boot
 * when the native module is absent from the binary.
 */

import { Platform, PermissionsAndroid } from 'react-native';

export type NativeSmsRow = {
  raw?: {
    id?: string | number;
    _id?: string | number;
    address?: string;
    body?: string;
    date?: string | number;
    timestamp?: number;
  };
  transaction?: {
    sender?: string;
  } | null;
};

export type NativeSmsReader = {
  ensurePermissionsAsync: () => Promise<string>;
  getRecentMessages: (options?: {
    limit?: number;
    sinceTimestamp?: number;
    onlyTransactions?: boolean;
    senderAllowlist?: string[];
    minConfidence?: number;
  }) => Promise<NativeSmsRow[]>;
  openAppSettings: () => Promise<void>;
  sourceName: string;
};

let cached: NativeSmsReader | null | undefined;

function normalizeDate(dateVal: string | number | undefined | null): number {
  if (!dateVal) return Date.now();
  const n = typeof dateVal === 'string' ? Number(dateVal.replace(/\D/g, '').slice(0, 13)) : Number(dateVal);
  if (!n || !Number.isFinite(n)) return Date.now();
  return n < 1e12 ? n * 1000 : n;
}

/**
 * Build an SMS reader using react-native-get-sms-android as a fallback
 * when expo-transaction-sms-reader is not bundled.
 */
async function buildGetSmsAndroidReader(): Promise<NativeSmsReader | null> {
  if (Platform.OS !== 'android') return null;
  try {
    const SmsAndroidModule = await import('react-native-get-sms-android');
    const SmsAndroid = (SmsAndroidModule as { default?: unknown }).default || SmsAndroidModule;
    if (!SmsAndroid || typeof (SmsAndroid as { list?: unknown }).list !== 'function') return null;

    const listSms = (filterJson: string): Promise<Array<Record<string, unknown>>> =>
      new Promise((resolve, reject) => {
        try {
          (SmsAndroid as {
            list: (
              f: string,
              fail: (e: string) => void,
              ok: (count: number, list: string) => void,
            ) => void;
          }).list(
            filterJson,
            (err) => reject(new Error(String(err || 'SmsAndroid.list failed'))),
            (_count, smsListStr) => {
              try {
                const parsed = JSON.parse(smsListStr || '[]');
                resolve(Array.isArray(parsed) ? parsed : []);
              } catch (parseErr) {
                reject(parseErr);
              }
            },
          );
        } catch (syncErr) {
          reject(syncErr);
        }
      });

    return {
      sourceName: 'react-native-get-sms-android',
      ensurePermissionsAsync: async () => {
        const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS);
        if (granted) return 'granted';
        const res = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_SMS, {
          title: 'SMS permission',
          message:
            'Financial Copilot needs SMS access to detect mobile money and bank transactions.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
          buttonNeutral: 'Ask later',
        });
        return res === PermissionsAndroid.RESULTS.GRANTED ? 'granted' : 'denied';
      },
      getRecentMessages: async (options) => {
        const limit = Math.min(options?.limit ?? 300, 500);
        const since = options?.sinceTimestamp ?? Date.now() - 90 * 24 * 60 * 60 * 1000;
        const allowlistRaw = options?.senderAllowlist ?? [];
        const allowlist = allowlistRaw.map((s) => s.toLowerCase().replace(/[^a-z0-9]/g, ''));

        const filter = JSON.stringify({
          box: 'inbox',
          maxCount: limit,
          indexFrom: 0,
        });

        const rawList = await listSms(filter);
        const sinceMs = normalizeDate(since);

        const mapped: NativeSmsRow[] = [];
        for (const item of rawList) {
          const address =
            typeof (item as { address?: unknown }).address === 'string'
              ? ((item as { address: string }).address as string)
              : '';
          const body =
            typeof (item as { body?: unknown }).body === 'string'
              ? ((item as { body: string }).body as string)
              : '';
          const dateRaw = (item as { date?: unknown }).date as string | number | undefined;
          const timestamp = normalizeDate(dateRaw);
          if (timestamp < sinceMs) continue;

          if (allowlist.length) {
            const addrClean = address.toLowerCase().replace(/[^a-z0-9]/g, '');
            const bodyLower = body.toLowerCase();
            const matches = allowlist.some(
              (kw) => addrClean.includes(kw) || bodyLower.includes(kw.toLowerCase()),
            );
            if (!matches) continue;
          }

          const rawId = (item as { _id?: unknown })._id;
          const fallbackId = (item as { date?: unknown }).date;
          let normalizedId: string | number | undefined;
          if (typeof rawId === 'string' || typeof rawId === 'number') {
            normalizedId = rawId;
          } else if (typeof fallbackId === 'string' || typeof fallbackId === 'number') {
            normalizedId = fallbackId;
          }
          mapped.push({
            raw: {
              _id: normalizedId,
              id: String(normalizedId ?? ''),
              address,
              body,
              date: String(timestamp),
              timestamp,
            },
            transaction: address
              ? {
                  sender: address,
                }
              : null,
          });
        }

        mapped.sort((a, b) => {
          const at = a.raw?.timestamp ?? 0;
          const bt = b.raw?.timestamp ?? 0;
          return bt - at;
        });
        return mapped.slice(0, limit);
      },
      openAppSettings: async () => {
        const { Linking } = await import('react-native');
        await Linking.openSettings();
      },
    };
  } catch {
    return null;
  }
}

/**
 * Returns the native SMS reader when any module is linked into this binary.
 * Always null in Expo Go / web / iOS / builds without any SMS package.
 */
export async function getNativeSmsReader(): Promise<NativeSmsReader | null> {
  if (cached !== undefined) return cached;

  if (Platform.OS !== 'android') {
    cached = null;
    return null;
  }

  try {
    const mod = await import('expo-transaction-sms-reader');
    if (mod && typeof mod.ensurePermissionsAsync === 'function') {
      cached = {
        sourceName: 'expo-transaction-sms-reader',
        ensurePermissionsAsync: mod.ensurePermissionsAsync,
        getRecentMessages: mod.getRecentMessages,
        openAppSettings: mod.openAppSettings,
      };
      return cached;
    }
  } catch {
    // fall through to fallback
  }

  const fallback = await buildGetSmsAndroidReader();
  if (fallback) {
    cached = fallback;
    return cached;
  }

  cached = null;
  return null;
}

export function getSmsReaderSourceName(): string {
  return cached?.sourceName ?? 'unavailable';
}
