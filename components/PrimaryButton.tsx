import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import { haptics } from '@/lib/haptics';

type Props = {
  label: string;
  onPress: () => void | Promise<void>;
  variant?: 'primary' | 'secondary' | 'destructive';
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
};

/** Shared CTA with semantic haptics baked in. */
export default function PrimaryButton({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
  style,
  textStyle,
}: Props) {
  const handlePress = async () => {
    if (disabled || loading) return;
    if (variant === 'destructive') await haptics.destructiveAction();
    else if (variant === 'primary') await haptics.primaryAction();
    else await haptics.buttonPress();
    await onPress();
  };

  const bg =
    variant === 'destructive'
      ? theme.colors.coral
      : variant === 'secondary'
        ? theme.colors.sage
        : theme.colors.cedar;
  const color =
    variant === 'secondary' ? theme.colors.cedarDeep : theme.colors.white;

  return (
    <TouchableOpacity
      style={[styles.btn, { backgroundColor: bg, opacity: disabled || loading ? 0.55 : 1 }, style]}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <>
          {icon ? <MaterialCommunityIcons name={icon} size={18} color={color} /> : null}
          <Text style={[styles.label, { color }, textStyle]}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
  },
});
