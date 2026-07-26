/**
 * Optional native SMS bridge for Android development / EAS builds.
 * Dynamically imports `expo-transaction-sms-reader` so Expo Go / web still boot
 * when the native module is absent from the binary.
 */

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
};

let cached: NativeSmsReader | null | undefined;

/**
 * Returns the native SMS reader when the module is linked into this binary.
 * Always null in Expo Go / web / builds without the package.
 */
export async function getNativeSmsReader(): Promise<NativeSmsReader | null> {
  if (cached !== undefined) return cached;

  try {
    const mod = await import('expo-transaction-sms-reader');
    cached = {
      ensurePermissionsAsync: mod.ensurePermissionsAsync,
      getRecentMessages: mod.getRecentMessages,
      openAppSettings: mod.openAppSettings,
    };
    return cached;
  } catch {
    cached = null;
    return null;
  }
}
