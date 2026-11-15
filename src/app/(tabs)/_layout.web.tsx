import { Ionicons } from '@expo/vector-icons';
import { Redirect, usePathname } from 'expo-router';
import { TabList, TabSlot, Tabs, TabTrigger, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useColors } from '@/constants/theme';
import { useStore } from '@/lib/store';

type IconName = keyof typeof Ionicons.glyphMap;

const TABS: { name: string; href: '/' | '/tax' | '/settings'; label: string; icon: IconName; iconOn: IconName }[] = [
  { name: 'index', href: '/', label: 'Items', icon: 'cube-outline', iconOn: 'cube' },
  { name: 'tax', href: '/tax', label: 'Tax', icon: 'document-text-outline', iconOn: 'document-text' },
  { name: 'settings', href: '/settings', label: 'Settings', icon: 'settings-outline', iconOn: 'settings' },
];

/**
 * Web (and the preview) gets a frosted tab bar floating at the bottom, like iOS's own, instead of the
 * default top pill that sat over the page title. Native builds keep the system tab bar (_layout.tsx).
 */
export default function TabsLayout() {
  const c = useColors();
  const { settings } = useStore();
  const pathname = usePathname();
  if (!settings.onboarded) return <Redirect href="/welcome" />;
  return (
    <Tabs style={{ flex: 1 }}>
      {/* The slot defaults to never shrinking, so screens grew to full height and nothing scrolled. */}
      <TabSlot style={styles.slot} />
      {/* TabList must be a direct child of Tabs so the router registers the triggers; it is the bar itself. */}
      <TabList
        style={[
          styles.bar,
          // Frosted glass on the web: mostly opaque, so it stays readable over photos and dark cards.
          { borderColor: c.separator, backgroundColor: `${c.background}E6`, backdropFilter: 'blur(24px) saturate(180%)' } as object,
        ]}>
        {TABS.map((t) => (
          <TabTrigger key={t.name} name={t.name} href={t.href} asChild>
            <TabButton label={t.label} icon={t.icon} iconOn={t.iconOn} active={pathname === t.href} />
          </TabTrigger>
        ))}
      </TabList>
    </Tabs>
  );
}

function TabButton({
  active,
  isFocused: slotFocused,
  label,
  icon,
  iconOn,
  ref,
  ...props
}: TabTriggerSlotProps & { label: string; icon: IconName; iconOn: IconName; active: boolean }) {
  const isFocused = active || !!slotFocused;
  const c = useColors();
  return (
    <Pressable
      {...props}
      // expo-router types this ref as the View component itself rather than its instance.
      ref={ref as React.Ref<never>}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={label}
      style={[styles.tab, isFocused && { backgroundColor: c.ink }]}>
      <Ionicons name={isFocused ? iconOn : icon} size={20} color={isFocused ? c.onInk : c.textSecondary} />
      <Text style={[styles.label, { color: isFocused ? c.onInk : c.textSecondary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slot: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minHeight: 0 },
  bar: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    flexDirection: 'row',
    padding: 6,
    gap: 4,
    borderRadius: 32,
    borderWidth: StyleSheet.hairlineWidth,
    boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 48,
    paddingHorizontal: 18,
    borderRadius: 24,
  },
  label: { fontSize: 14, fontWeight: '600', letterSpacing: -0.1 },
});
