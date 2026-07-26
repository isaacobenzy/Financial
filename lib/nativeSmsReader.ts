/**
 * Optional native SMS bridge.
 * We never import `expo-transaction-sms-reader` by name here — Metro fails the
 * whole app bundle when that package is missing. Wire the real module in a
 * development / EAS Android build by installing it and setting USE_NATIVE_SMS.
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

/** Always null until a native SMS module is explicitly wired for a dev build. */
export async function getNativeSmsReader(): Promise<NativeSmsReader | null> {
  return null;
}
