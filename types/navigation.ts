import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  MainTabs: undefined;
  Settings: undefined;
  Transactions: undefined;
  ImportSMS: undefined;
  ImportPDF: undefined;
  BudgetGoals: undefined;
};

export type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export type NavigationProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, keyof RootStackParamList>;
};