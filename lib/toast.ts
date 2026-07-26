/**
 * Compatibility shim — prefer `notificationService` from `@/lib/notificationStore`.
 */

import { notificationService } from '@/lib/notificationStore';

export type ToastTone = 'success' | 'error' | 'info' | 'warning';

export const toast = {
  success: (message: string, title = 'Success') => notificationService.success(message, title),
  error: (message: string, title = 'Something went wrong') =>
    notificationService.error(message, title),
  info: (message: string, title = 'Heads up') => notificationService.info(message, title),
  warning: (message: string, title = 'Heads up') => notificationService.warning(message, title),
};

/** @deprecated use NotificationStack + notificationService */
export type ToastPayload = {
  id: string;
  tone: ToastTone;
  title: string;
  message: string;
};

/** @deprecated */
export function subscribeToast(_listener: (toast: ToastPayload) => void): () => void {
  return () => undefined;
}
