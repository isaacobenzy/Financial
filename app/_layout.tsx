import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import ToastHost from '@/components/ToastHost';
import BioSessionGuard from '@/components/BioSessionGuard';
import NotificationActions from '@/components/NotificationActions';
import AnimatedSplash from '@/components/AnimatedSplash';
import { theme } from '@/constants/theme';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'onboarding',
};

// Keep native splash until fonts + branded animation are ready
SplashScreen.preventAutoHideAsync();

// Fade the native splash (iOS / supported platforms)
try {
  SplashScreen.setOptions({
    duration: 900,
    fade: true,
  });
} catch {
  // older clients
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });
  const [showBrandSplash, setShowBrandSplash] = useState(true);
  const [nativeHidden, setNativeHidden] = useState(false);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (!loaded) return;
    SplashScreen.hideAsync()
      .catch(() => undefined)
      .finally(() => setNativeHidden(true));
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <View style={{ flex: 1 }}>
      <RootLayoutNav />
      {showBrandSplash && nativeHidden ? (
        <AnimatedSplash onDone={() => setShowBrandSplash(false)} />
      ) : null}
    </View>
  );
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
