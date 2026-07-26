import AsyncStorage from '@react-native-async-storage/async-storage';

const BALANCE_HIDDEN_KEY = 'balance_hidden_v1';

export async function isBalanceHidden(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(BALANCE_HIDDEN_KEY);
    return raw === '1';
  } catch {
    return false;
  }
}

export async function setBalanceHidden(hidden: boolean): Promise<void> {
  await AsyncStorage.setItem(BALANCE_HIDDEN_KEY, hidden ? '1' : '0');
}
