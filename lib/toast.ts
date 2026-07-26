import { Alert } from 'react-native';

type ToastFn = (message: string) => void;

function show(title: string, message: string) {
  Alert.alert(title, message);
}

export const toast: {
  success: ToastFn;
  error: ToastFn;
  info: ToastFn;
} = {
  success: (message) => show('Success', message),
  error: (message) => show('Error', message),
  info: (message) => show('Info', message),
};
