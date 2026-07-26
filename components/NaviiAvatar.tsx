import React, { useMemo, useState } from 'react';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getNaviiAvatarUrl, type NaviiMood } from '@/lib/navii';
import { theme } from '@/constants/theme';

type Props = {
  seed: string;
  size?: number;
  mood?: NaviiMood;
  style?: StyleProp<ViewStyle>;
};

export default function NaviiAvatar({ seed, size = 48, mood = 'happy', style }: Props) {
  const [failed, setFailed] = useState(false);
  const uri = useMemo(
    () =>
      getNaviiAvatarUrl(seed, {
        size: size * 2,
        mood,
        palette: 'mint',
        background: 'ring',
        tileBg: theme.colors.paper,
      }),
    [seed, size, mood],
  );

  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2 }, style]}>
      {failed ? (
        <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}>
          <MaterialCommunityIcons
            name="account"
            size={size * 0.5}
            color={theme.colors.cedar}
          />
        </View>
      ) : (
        <Image
          source={{ uri }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          onError={() => setFailed(true)}
          accessibilityLabel="User avatar"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    backgroundColor: theme.colors.sage,
    borderWidth: 2,
    borderColor: theme.colors.white,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.sage,
  },
});
