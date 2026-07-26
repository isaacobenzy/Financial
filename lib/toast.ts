export type ToastTone = 'success' | 'error' | 'info';

export type ToastPayload = {
  id: string;
  tone: ToastTone;
  title: string;
  message: string;
};

type Listener = (toast: ToastPayload) => void;

const listeners = new Set<Listener>();

function emit(tone: ToastTone, title: string, message: string) {
  const payload: ToastPayload = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    tone,
    title,
    message,
  };
  listeners.forEach((listener) => listener(payload));
}

export function subscribeToast(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const toast = {
  success: (message: string, title = 'Success') => emit('success', title, message),
  error: (message: string, title = 'Something went wrong') => emit('error', title, message),
  info: (message: string, title = 'Heads up') => emit('info', title, message),
};
