declare module 'react-native-get-sms-android' {
  interface SmsFilter {
    box?: 'inbox' | 'sent' | 'draft';
    bodyRegex?: string;
    indexFrom?: number;
    maxCount?: number;
  }

  interface SmsAndroid {
    list(
      filter: string,
      fail: (error: string) => void,
      success: (count: number, smsList: string) => void
    ): void;
  }

  const SmsAndroid: SmsAndroid;
  export default SmsAndroid;
}