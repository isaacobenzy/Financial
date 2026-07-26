/**
 * In-app toast queue + notificationService (BetLive pattern).
 * Toast always fires matching haptic first.
 */

import { create } from 'zustand';
import { haptics } from '@/lib/haptics';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export type AppNotification = {
  id: string;
  type: NotificationType;
  message: string;
  title?: string;
  duration?: number;
  action?: {
    label: string;
    onPress: () => void;
  };
};

type NotificationStore = {
  notifications: AppNotification[];
  add: (notification: Omit<AppNotification, 'id'>) => string;
  remove: (id: string) => void;
  clear: () => void;
};

let notificationId = 0;

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],

  add: (notification) => {
    const id = `notification-${++notificationId}`;
    // Replace queue — one snappy toast at a time (original ToastHost feel)
    set({
      notifications: [{ ...notification, id }],
    });

    const duration = notification.duration ?? 0;
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      }, duration);
    }

    return id;
  },

  remove: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },

  clear: () => set({ notifications: [] }),
}));

export const notificationService = {
  success: (message: string, title = 'Done', duration = 2800) => {
    void haptics.success();
    return useNotificationStore.getState().add({
      type: 'success',
      message,
      title,
      duration,
    });
  },

  error: (message: string, title = "Couldn't finish that", duration = 5200) => {
    void haptics.error();
    return useNotificationStore.getState().add({
      type: 'error',
      message,
      title,
      duration,
    });
  },

  warning: (message: string, title = 'Heads up', duration = 3600) => {
    void haptics.warning();
    return useNotificationStore.getState().add({
      type: 'warning',
      message,
      title,
      duration,
    });
  },

  info: (message: string, title = 'Financial Copilot', duration = 3000) => {
    void haptics.buttonPress();
    return useNotificationStore.getState().add({
      type: 'info',
      message,
      title,
      duration,
    });
  },

  dismiss: (id: string) => {
    useNotificationStore.getState().remove(id);
  },

  clear: () => {
    useNotificationStore.getState().clear();
  },
};
