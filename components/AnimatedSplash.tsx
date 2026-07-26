import React, { useEffect } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { theme } from '@/constants/theme';

type Props = {
  onDone: () => void;
};

/**
 * Custom branded splash after the native splash fades
 * (see SplashScreen.setOptions in app/_layout.tsx).
 * Docs: https://docs.expo.dev/versions/latest/sdk/splash-screen/
 */
export default function AnimatedSplash({ onDone }: Props) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.86);
  const titleY = useSharedValue(18);
  const titleOpacity = useSharedValue(0);
  const ring = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 420 });
    scale.value = withTiming(1, {
      duration: 700,
      easing: Easing.out(Easing.cubic),
    });
    titleOpacity.value = withDelay(280, withTiming(1, { duration: 400 }));
    titleY.value = withDelay(
      280,
      withTiming(0, { duration: 480, easing: Easing.out(Easing.cubic) }),
    );
    ring.value = withSequence(
      withTiming(1, { duration: 700 }),
      withTiming(0.55, { duration: 500 }),
    );

    const t = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 380 }, (finished) => {
        if (finished) runOnJS(onDone)();
      });
    }, 1600);

    return () => clearTimeout(t);
  }, [onDone, opacity, scale, titleOpacity, titleY, ring]);

  const rootStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: ring.value,
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));

  return (
    <Animated.View style={[styles.root, rootStyle]} pointerEvents="none">
      <View style={styles.glow} />
      <Animated.View style={[styles.logoWrap, logoStyle]}>
        <Image
          source={require('../assets/images/splash-icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>
      <Animated.View style={titleStyle}>
        <Text style={styles.brand}>Financial Copilot</Text>
        <Text style={styles.tag}>Your ledger companion</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    backgroundColor: theme.colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  glow: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: theme.colors.sage,
    opacity: 0.55,
  },
  logoWrap: {
    width: 168,
    height: 168,
    borderRadius: 40,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.line,
    ...theme.shadow.soft,
  },
  logo: { width: 120, height: 120 },
  brand: {
    fontSize: 26,
    fontWeight: '700',
    color: theme.colors.cedarDeep,
    textAlign: 'center',
  },
  tag: {
    marginTop: 6,
    fontSize: 14,
    color: theme.colors.muted,
    textAlign: 'center',
    fontWeight: '600',
  },
});
