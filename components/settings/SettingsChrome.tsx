import React, { type ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import { haptics } from '@/lib/haptics';

/** Uppercase eyebrow above a grouped card — iOS / BetLive settings pattern. */
export function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

/** Navigation row with chevron — use for drill-in screens. */
export function SettingsNavRow({
  icon,
  label,
  description,
  onPress,
  danger,
  last,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  description?: string;
  onPress: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.row, last && styles.rowLast]}
      onPress={async () => {
        await haptics.select();
        onPress();
      }}
      activeOpacity={0.7}
    >
      <View style={[styles.iconWrap, danger && styles.iconDanger]}>
        <MaterialCommunityIcons
          name={icon}
          size={20}
          color={danger ? theme.colors.coral : theme.colors.cedar}
        />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.label, danger && { color: theme.colors.coral }]}>{label}</Text>
        {description ? <Text style={styles.desc}>{description}</Text> : null}
      </View>
      <MaterialCommunityIcons
        name="chevron-right"
        size={22}
        color={danger ? theme.colors.coral : theme.colors.muted}
      />
    </TouchableOpacity>
  );
}

/** Inline toggle row. */
export function SettingsToggleRow({
  icon,
  label,
  description,
  value,
  onValueChange,
  disabled,
  last,
}: {
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, last && styles.rowLast, disabled && { opacity: 0.5 }]}>
      {icon ? (
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name={icon} size={20} color={theme.colors.cedar} />
        </View>
      ) : null}
      <View style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        {description ? <Text style={styles.desc}>{description}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={async (v) => {
          await haptics.select();
          onValueChange(v);
        }}
        disabled={disabled}
        trackColor={{ false: theme.colors.line, true: theme.colors.mint }}
        thumbColor={theme.colors.white}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 20,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.muted,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.line,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.line,
    gap: 12,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconDanger: {
    backgroundColor: `${theme.colors.coral}18`,
  },
  copy: { flex: 1, minWidth: 0 },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.ink,
  },
  desc: {
    fontSize: 12,
    color: theme.colors.muted,
    marginTop: 2,
    lineHeight: 16,
  },
});
