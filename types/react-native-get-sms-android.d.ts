declare module 'react-native-get-sms-android' {
  export interface SmsFilter {
    box?: 'inbox' | 'sent' | 'draft';
    read?: 0 | 1;
    _id?: string;
    address?: string;
    body?: string;
  }

  export interface SmsMessage {
    _id: string;
    address: string;
    body: string;
    date: string;
    read: number;
    status: number;
    type: number;
  }

  export function list(
    filter: string,
    fail: (error: string) => void,
    success: (count: number, smsList: string) => void
  ): void;
}