import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ProgressRing } from '@/components/progress-ring';
import { AppText, Row, Section } from '@/components/ui';
import { Radius, Spacing, useColors } from '@/constants/theme';
import { formatDate, formatMoney } from '@/lib/format';
import { BADGES, CHECK_LABEL, money, pointsLabel, protection } from '@/lib/progress';
import { useStore } from '@/lib/store';
import { useBadges } from '@/lib/use-badges';

const STEPS_SHOWN = 8;

/** Protection score, next steps, real money, and badges. */
export default function ProgressScreen() {
  const c = useColors();
  const { items, settings } = useStore();
  const { earned } = useBadges();
  const region = settings.taxRegion;
  const p = protection(items);
  const m = money(items, region, settings.depreciation);
  const earnedCount = BADGES.filter((b) => earned[b.id]).length;
  const cash = (n: number) => formatMoney(n, region, { cents: false });

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={{ paddingBottom: 60 }}>
      <View style={styles.hero}>
        <ProgressRing score={p.score} size={150} stroke={14} />
        <AppText variant="title2" style={{ textAlign: 'center' }}>
          {p.score >= 100
            ? 'Fully protected'
            : p.score >= 70
              ? 'Well protected'
              : p.score >= 40
                ? 'Getting there'
                : 'Let’s protect your things'}
        </AppText>
        <AppText variant="subhead" color={c.textSecondary} style={{ textAlign: 'center', lineHeight: 21 }}>
          {p.complete} of {p.total} things have everything an insurer asks for: a photo, the receipt, what you paid and,
          for electronics, appliances, tools and bikes, the serial number. Valuable things count for more.
        </AppText>
      </View>

      {p.steps.length > 0 ? (
        <Section
          title="Next steps"
          footer={p.steps.length > STEPS_SHOWN ? `And ${p.steps.length - STEPS_SHOWN} more.` : undefined}>
          {p.steps.slice(0, STEPS_SHOWN).map((s, i, shown) => (
            <Pressable
              key={`${s.itemId}-${s.check}`}
              accessibilityRole="button"
              accessibilityLabel={`${CHECK_LABEL[s.check].add} for ${s.name}, ${pointsLabel(s.points)} points`}
              onPress={() => router.push({ pathname: '/item/edit', params: { id: s.itemId } })}
              style={({ pressed }) => [
                styles.step,
                { opacity: pressed ? 0.6 : 1 },
                i < shown.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.separator },
              ]}>
              <View style={[styles.stepIcon, { backgroundColor: c.background }]}>
                <Ionicons name={CHECK_LABEL[s.check].icon} size={16} color={c.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="body" numberOfLines={1}>
                  {CHECK_LABEL[s.check].add}
                </AppText>
                <AppText variant="caption" color={c.textSecondary} numberOfLines={1}>
                  {s.name}
                </AppText>
              </View>
              <AppText variant="headline" color={c.accent} style={{ fontVariant: ['tabular-nums'] }}>
                {pointsLabel(s.points)}
              </AppText>
              <Ionicons name="chevron-forward" size={16} color={c.textTertiary} />
            </Pressable>
          ))}
        </Section>
      ) : null}

      <Section
        title="Your money"
        footer="Sales you’ve recorded, this tax year’s estimated deductions on work items, and what your fully recorded things are worth today.">
        <Row
          label="Sold for"
          icon="bag-check-outline"
          value={m.soldCount ? `${cash(m.sold)} · ${m.soldCount} sale${m.soldCount === 1 ? '' : 's'}` : '—'}
        />
        <Row
          label="Tax deductions this year"
          icon="briefcase-outline"
          value={m.deductions > 0 ? cash(m.deductions) : '—'}
        />
        <Row label="Fully protected value" icon="shield-checkmark-outline" value={cash(m.protectedValue)} last />
      </Section>

      <AppText variant="eyebrow" color={c.textSecondary} style={styles.badgesTitle}>
        Badges · {earnedCount} of {BADGES.length}
      </AppText>
      <View style={styles.grid}>
        {BADGES.map((b) => {
          const when = earned[b.id];
          return (
            <View
              key={b.id}
              style={[styles.badge, { backgroundColor: c.card, opacity: when ? 1 : 0.55 }]}
              accessibilityLabel={`${b.title}. ${when ? 'Earned' : b.how}`}>
              <View style={[styles.badgeIcon, { backgroundColor: when ? c.ink : c.fill }]}>
                <Ionicons
                  name={(when ? b.icon : 'lock-closed') as 'trophy'}
                  size={20}
                  color={when ? c.onInk : c.textTertiary}
                />
              </View>
              <AppText variant="subhead" style={{ fontWeight: '700', textAlign: 'center' }} numberOfLines={2}>
                {b.title}
              </AppText>
              <AppText variant="caption" color={c.textSecondary} style={{ textAlign: 'center' }} numberOfLines={4}>
                {when ? formatDate(when.slice(0, 10), region) : b.how}
              </AppText>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  step: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 10, paddingHorizontal: Spacing.lg },
  stepIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  badgesTitle: { paddingHorizontal: Spacing.xl + 4, marginBottom: Spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, paddingHorizontal: Spacing.lg },
  badge: {
    width: '31.5%',
    alignItems: 'center',
    gap: 6,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
  },
  badgeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
});
