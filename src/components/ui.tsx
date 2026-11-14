import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { ComponentProps, ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type StyleProp, type TextProps, type ViewStyle } from 'react-native';

import { Radius, Spacing, Type, useColors } from '@/constants/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

export function tap() {
  if (Platform.OS === 'ios') void Haptics.selectionAsync();
}

type TextVariant = keyof typeof Type;

export function AppText({
  variant = 'body',
  color,
  style,
  ...rest
}: TextProps & { variant?: TextVariant; color?: string }) {
  const c = useColors();
  return <Text {...rest} style={[Type[variant], { color: color ?? c.text }, style]} />;
}

/** Large iOS-style title shown at the top of each tab. */
export function ScreenTitle({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  const c = useColors();
  return (
    <View style={styles.titleRow}>
      <View style={{ flex: 1 }}>
        <AppText variant="largeTitle">{title}</AppText>
        {subtitle ? (
          <AppText variant="subhead" color={c.textSecondary} style={{ marginTop: 2 }}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right}
    </View>
  );
}

export function IconButton({
  icon,
  onPress,
  label,
  filled,
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  filled?: boolean;
}) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        tap();
        onPress();
      }}
      hitSlop={8}
      style={({ pressed }) => [
        styles.iconButton,
        { backgroundColor: filled ? c.accent : c.card, opacity: pressed ? 0.7 : 1 },
      ]}>
      <Ionicons name={icon} size={20} color={filled ? c.onAccent : c.text} />
    </Pressable>
  );
}

/** Inset grouped section, like iOS Settings. */
export function Section({
  title,
  footer,
  children,
  style,
}: {
  title?: string;
  footer?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  return (
    <View style={[{ marginBottom: Spacing.xl }, style]}>
      {title ? (
        <AppText variant="footnote" color={c.textSecondary} style={styles.sectionTitle}>
          {title.toUpperCase()}
        </AppText>
      ) : null}
      <View style={[styles.sectionBody, { backgroundColor: c.card }]}>{children}</View>
      {footer ? (
        <AppText variant="footnote" color={c.textSecondary} style={styles.sectionFooter}>
          {footer}
        </AppText>
      ) : null}
    </View>
  );
}

export function Row({
  label,
  value,
  icon,
  onPress,
  last,
  children,
  destructive,
  chevron,
}: {
  label: string;
  value?: string;
  icon?: IconName;
  onPress?: () => void;
  last?: boolean;
  children?: ReactNode;
  destructive?: boolean;
  chevron?: boolean;
}) {
  const c = useColors();
  const content = (pressed: boolean) => (
    <View style={[styles.row, { backgroundColor: pressed ? c.cardPressed : 'transparent' }]}>
      {icon ? <Ionicons name={icon} size={20} color={destructive ? c.red : c.accent} style={{ marginRight: Spacing.md }} /> : null}
      <View style={[styles.rowInner, !last && { borderBottomColor: c.separator, borderBottomWidth: StyleSheet.hairlineWidth }]}>
        {label ? (
          <AppText style={{ flexShrink: 0 }} color={destructive ? c.red : c.text}>
            {label}
          </AppText>
        ) : null}
        <View style={[styles.rowRight, !label && { flex: 1 }]}>
          {children ?? (
            <AppText color={c.textSecondary} numberOfLines={1} style={{ flexShrink: 1, textAlign: 'right' }} selectable>
              {value}
            </AppText>
          )}
          {chevron ? <Ionicons name="chevron-forward" size={18} color={c.textTertiary} /> : null}
        </View>
      </View>
    </View>
  );
  if (!onPress) return content(false);
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {({ pressed }) => content(pressed)}
    </Pressable>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const c = useColors();
  return (
    <View style={[styles.segmented, { backgroundColor: c.fill }]} accessibilityRole="tablist">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => {
              if (!selected) {
                tap();
                onChange(o.value);
              }
            }}
            style={[styles.segment, selected && [styles.segmentSelected, { backgroundColor: c.raised }]]}>
            <AppText variant="subhead" style={{ fontWeight: selected ? '600' : '500' }}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Outlined pill, filled blue when selected (like the storage picker in Apple's store). */
export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => {
        tap();
        onPress();
      }}
      style={[
        styles.chip,
        selected
          ? { backgroundColor: c.accent, borderColor: c.accent }
          : { backgroundColor: 'transparent', borderColor: c.separator },
      ]}>
      <AppText variant="subhead" color={selected ? c.onAccent : c.text} style={{ fontWeight: '600' }}>
        {label}
      </AppText>
    </Pressable>
  );
}

/** Small blue pill, like the "Buy" button. */
export function PillButton({ label, onPress, size = 'sm' }: { label: string; onPress: () => void; size?: 'sm' | 'lg' }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        tap();
        onPress();
      }}
      hitSlop={6}
      style={({ pressed }) => [
        size === 'lg' ? styles.pillLg : styles.pillSm,
        { backgroundColor: c.accent, opacity: pressed ? 0.8 : 1 },
      ]}>
      <AppText variant={size === 'lg' ? 'headline' : 'caption'} color={c.onAccent} style={{ fontWeight: '600' }}>
        {label}
      </AppText>
    </Pressable>
  );
}

/** Bold left-aligned section heading with an optional link on the right. */
export function SectionHeading({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const c = useColors();
  return (
    <View style={styles.heading}>
      <AppText variant="title2">{title}</AppText>
      {action && onAction ? (
        <AppText variant="subhead" color={c.accent} onPress={onAction} suppressHighlighting>
          {action}
        </AppText>
      ) : null}
    </View>
  );
}

export function PrimaryButton({ label, icon, onPress }: { label: string; icon?: IconName; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [styles.primary, { backgroundColor: c.accent, opacity: pressed ? 0.8 : 1 }]}>
      {icon ? <Ionicons name={icon} size={20} color={c.onAccent} /> : null}
      <AppText variant="headline" color={c.onAccent}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  sectionTitle: { marginHorizontal: Spacing.xl + Spacing.lg, marginBottom: 6 },
  sectionFooter: { marginHorizontal: Spacing.xl + Spacing.lg, marginTop: 6 },
  sectionBody: { marginHorizontal: Spacing.lg, borderRadius: Radius.lg, borderCurve: 'continuous', overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingLeft: Spacing.lg, minHeight: 46 },
  rowInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: Spacing.lg,
    paddingVertical: 11,
    gap: Spacing.md,
    minHeight: 46,
  },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1, justifyContent: 'flex-end' },
  segmented: { flexDirection: 'row', borderRadius: 9, borderCurve: 'continuous', padding: 2 },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 7, borderCurve: 'continuous' },
  segmentSelected: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderCurve: 'continuous', borderWidth: 1 },
  pillSm: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 999, borderCurve: 'continuous', alignSelf: 'flex-start' },
  pillLg: { paddingHorizontal: 24, height: 44, borderRadius: 999, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  heading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    height: 50,
    borderRadius: 999,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.xl,
  },
});
