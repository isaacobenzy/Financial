declare module 'expo-transaction-sms-reader' {
  export type SmsPermissionStatus = 'granted' | 'denied' | 'undetermined' | 'blocked';

  export type RawSmsMessage = {
    id?: string | number;
    _id?: string | number;
    address?: string;
    body?: string;
    date?: string | number;
    timestamp?: number;
  };

  export type ParsedTransaction = {
    type?: 'CREDIT' | 'DEBIT' | string;
    amount?: number;
    currency?: string;
    sender?: string;
    merchant?: string;
    confidence?: number;
    timestamp?: number;
    balance?: number;
  };

  export function ensurePermissionsAsync(): Promise<SmsPermissionStatus>;
  export function getPermissionStatusAsync(): Promise<SmsPermissionStatus>;
  export function requestPermissionsAsync(): Promise<SmsPermissionStatus>;
  export function openAppSettings(): Promise<void>;

  export function getRecentMessages(options?: {
    limit?: number;
    sinceTimestamp?: number;
    onlyTransactions?: boolean;
    senderAllowlist?: string[];
    minConfidence?: number;
  }): Promise<Array<{ raw: RawSmsMessage; transaction: ParsedTransaction | null }>>;
}
