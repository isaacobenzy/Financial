import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { getSession } from '@/lib/session';
import {
  isAppUnlocked,
  isBiometricUnlockEnabled,
} from '@/lib/biometrics';
import { theme } from '@/constants/theme';

export default function Index() {
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const session = await getSession();
      if (!session) {
        setTarget('/onboarding');
        return;
      }
      const bioOn = await isBiometricUnlockEnabled();
      const unlocked = await isAppUnlocked();
      if (bioOn && !unlocked) {
        setTarget('/unlock');
        return;
      }
      setTarget('/(tabs)');
    })();
  }, []);

  if (!target) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.paper }}>
        <ActivityIndicator color={theme.colors.cedar} />
      </View>
    );
  }

  return <Redirect href={target as never} />;
}
