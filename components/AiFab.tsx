import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tabBarClearance } from '@/constants/layout';
import { theme } from '@/constants/theme';
import { haptic } from '@/lib/haptics';

function promptsForPath(pathname: string): string[] {
  if (pathname.includes('goals')) {
    return [
      'Am I on track for my monthly goals?',
      'Which goal needs the most attention?',
      'Suggest how to stay under budget this week',
    ];
  }
  return [
    'How much did I spend recently?',
    'What is my current balance trend?',
    'Any unusual expenses I should review?',
  ];
}

/** Floating money AI — opens chat with context-aware suggested prompts. */
export default function AiFab() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  // Sit a bit above the floating tab dock so the money chat control feels reachable.
  const bottom = tabBarClearance(insets.bottom) + 18;

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom }]}>
      <TouchableOpacity
        style={styles.fab}
        onPress={async () => {
          await haptic('selection');
          const prompts = promptsForPath(pathname);
          router.push({
            pathname: '/assistant',
            params: { suggest: prompts.join('|') },
          } as never);
        }}
        accessibilityLabel="Ask AI about your finances"
        accessibilityRole="button"
        activeOpacity={0.9}
      >
        <MaterialCommunityIcons name="cash-multiple" size={26} color={theme.colors.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: 20,
    zIndex: 50,
    elevation: 12,
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: theme.colors.cedarDeep,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.sage,
    shadowColor: '#0F2A20',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 10,
  },
});
