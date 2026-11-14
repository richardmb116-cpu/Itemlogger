import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import type { ComponentProps, ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type StyleProp, type TextProps, type ViewStyle } from 'react-native';

import { OnPhoto, Radius, Spacing, Type, useColors } from '@/constants/theme';

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

/** Big, confident page title with an optional eyebrow line above it. */
export function ScreenTitle({
  title,
  subtitle,
  eyebrow,
  right,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  right?: ReactNode;
}) {
  const c = useColors();
  return (
    <View style={styles.titleRow}>
      <View style={{ flex: 1 }}>
        {eyebrow ? (
          <AppText variant="eyebrow" color={c.textSecondary} style={{ marginBottom: 4 }}>
            {eyebrow}
          </AppText>
        ) : null}
        <AppText variant="largeTitle">{title}</AppText>
        {subtitle ? (
          <AppText variant="subhead" color={c.textSecondary} style={{ marginTop: 4 }}>
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
        { backgroundColor: filled ? c.ink : c.card, transform: [{ scale: pressed ? 0.94 : 1 }] },
      ]}>
      <Ionicons name={icon} size={21} color={filled ? c.onInk : c.ink} />
    </Pressable>
  );
}

/** Round frosted-glass button for use on top of photography. */
export function GlassButton({ icon, onPress, label }: { icon: IconName; onPress: () => void; label: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        tap();
        onPress();
      }}
      hitSlop={8}
      style={({ pressed }) => [styles.glass, { transform: [{ scale: pressed ? 0.94 : 1 }] }]}>
      <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
      <Ionicons name={icon} size={20} color={OnPhoto.text} />
    </Pressable>
  );
}

/** Inset grouped section, like iOS Settings, with a spaced capital label. */
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
    <View style={[{ marginBottom: Spacing.xxl - 4 }, style]}>
      {title ? (
        <AppText variant="eyebrow" color={c.textSecondary} style={styles.sectionTitle}>
          {title}
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
      {icon ? (
        <View style={[styles.rowIcon, { backgroundColor: destructive ? c.redSoft : c.raised }]}>
          <Ionicons name={icon} size={17} color={destructive ? c.red : c.ink} />
        </View>
      ) : null}
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
          {chevron ? <Ionicons name="chevron-forward" size={17} color={c.textTertiary} /> : null}
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
            <AppText variant="subhead" style={{ fontWeight: selected ? '700' : '500' }} color={selected ? c.text : c.textSecondary}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Outlined pill; solid ink when selected. */
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
        selected ? { backgroundColor: c.ink, borderColor: c.ink } : { backgroundColor: 'transparent', borderColor: c.separator },
      ]}>
      <AppText variant="subhead" color={selected ? c.onInk : c.text} style={{ fontWeight: '600' }}>
        {label}
      </AppText>
    </Pressable>
  );
}

/** Compact pill button. */
export function PillButton({
  label,
  onPress,
  size = 'sm',
  secondary,
}: {
  label: string;
  onPress: () => void;
  size?: 'sm' | 'lg';
  /** Quiet grey pill for the less important of two actions. */
  secondary?: boolean;
}) {
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
        { backgroundColor: secondary ? c.card : c.ink, transform: [{ scale: pressed ? 0.97 : 1 }] },
      ]}>
      <AppText
        variant={size === 'lg' ? 'headline' : 'caption'}
        color={secondary ? c.ink : c.onInk}
        style={{ fontWeight: '700' }}>
        {label}
      </AppText>
    </Pressable>
  );
}

/** Bold section heading with an optional link on the right. */
export function SectionHeading({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const c = useColors();
  return (
    <View style={styles.heading}>
      <AppText variant="title2">{title}</AppText>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={8} style={styles.headingAction}>
          <AppText variant="subhead" color={c.textSecondary} style={{ fontWeight: '600' }}>
            {action}
          </AppText>
          <Ionicons name="arrow-forward" size={15} color={c.textSecondary} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function PrimaryButton({
  label,
  icon,
  onPress,
  secondary,
}: {
  label: string;
  icon?: IconName;
  onPress: () => void;
  /** Grey surface with ink text, for the less important of two actions. */
  secondary?: boolean;
}) {
  const c = useColors();
  const fg = secondary ? c.ink : c.onInk;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.primary,
        { backgroundColor: secondary ? c.card : c.ink, transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}>
      {icon ? <Ionicons name={icon} size={19} color={fg} /> : null}
      <AppText variant="headline" color={fg} style={{ fontWeight: '700' }}>
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
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glass: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: OnPhoto.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: OnPhoto.glassBorder,
  },
  sectionTitle: { marginHorizontal: Spacing.xl + Spacing.sm, marginBottom: Spacing.sm },
  sectionFooter: { marginHorizontal: Spacing.xl + Spacing.sm, marginTop: Spacing.sm, lineHeight: 18 },
  sectionBody: { marginHorizontal: Spacing.lg, borderRadius: Radius.xl, borderCurve: 'continuous', overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingLeft: Spacing.lg, minHeight: 52 },
  rowIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  rowInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: Spacing.lg,
    paddingVertical: 13,
    gap: Spacing.md,
    minHeight: 52,
  },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1, justifyContent: 'flex-end' },
  segmented: { flexDirection: 'row', borderRadius: 12, borderCurve: 'continuous', padding: 3 },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 9, borderCurve: 'continuous' },
  segmentSelected: {
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  pillSm: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, alignSelf: 'flex-start' },
  pillLg: { paddingHorizontal: 26, height: 50, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  heading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  headingAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    height: 56,
    borderRadius: 999,
    paddingHorizontal: Spacing.xl,
  },
});
