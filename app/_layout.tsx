import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import ToastHost from '@/components/ToastHost';
import BioSessionGuard from '@/components/BioSessionGuard';
import NotificationActions from '@/components/NotificationActions';
import { theme } from '@/constants/theme';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'onboarding',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.colors.paper }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.paper },
          }}
        >
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="login" />
          <Stack.Screen name="unlock" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="assistant" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="transactions" />
          <Stack.Screen name="explore" />
          <Stack.Screen name="import-sms" />
          <Stack.Screen name="paste-sms" />
          <Stack.Screen name="import-pdf" />
          <Stack.Screen name="budget-goals" />
        </Stack>
        <BioSessionGuard />
        <NotificationActions />
        <ToastHost />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
