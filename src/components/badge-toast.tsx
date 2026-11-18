import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FadeIn } from '@/components/fade-in';
import { AppText, tap } from '@/components/ui';
import { Radius, Spacing, useColors } from '@/constants/theme';
import { useBadges } from '@/lib/use-badges';

/** "Badge unlocked" banner, shown for a few seconds when something is earned. */
export function BadgeToast() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { fresh, dismiss } = useBadges();
  const badge = fresh[0];
  const key = fresh.map((b) => b.id).join(',');

  useEffect(() => {
    if (!key) return;
    const t = setTimeout(dismiss, 6000);
    return () => clearTimeout(t);
  }, [key, dismiss]);

  if (!badge) return null;
  const more = fresh.length - 1;
  return (
    <View
      pointerEvents="box-none"
      style={[StyleSheet.absoluteFill, { justifyContent: 'flex-start', paddingTop: insets.top + Spacing.sm }]}>
      <FadeIn duration={350}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Badge unlocked: ${badge.title}`}
          onPress={() => {
            tap();
            dismiss();
            router.push('/progress');
          }}
          style={[styles.toast, { backgroundColor: c.ink }]}>
          <View style={[styles.icon, { backgroundColor: c.accent }]}>
            <Ionicons name={badge.icon as 'trophy'} size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="eyebrow" color={c.onInk} style={{ opacity: 0.7 }}>
              Badge unlocked{more > 0 ? ` · +${more} more` : ''}
            </AppText>
            <AppText variant="headline" color={c.onInk}>
              {badge.title}
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={18} color={c.onInk} />
        </Pressable>
      </FadeIn>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginHorizontal: Spacing.lg,
    padding: Spacing.md,
    borderRadius: Radius.xl,
    borderCurve: 'continuous',
    boxShadow: '0 12px 30px rgba(0,0,0,0.25)',
  },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
