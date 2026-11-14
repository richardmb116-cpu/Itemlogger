import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Segmented } from '@/components/ui';
import { ValueChart } from '@/components/value-chart';
import { Radius, Spacing, useColors, type Palette } from '@/constants/theme';
import { daysBetween, parseISODate } from '@/lib/dates';
import { formatMoney, formatMonthYear } from '@/lib/format';
import type { Item, TaxRegion } from '@/lib/types';
import { sellStatusLabel, type SellPlan } from '@/lib/upgrade';

export function statusColor(plan: SellPlan, c: Palette): string {
  return plan.status === 'window' ? c.green : plan.status === 'late' ? c.orange : c.textSecondary;
}

/** Headline and one-line explanation for the recommendation. */
export function adviceCopy(plan: SellPlan, region: TaxRegion, today = new Date()): { headline: string; body: string } {
  const money = (n: number) => formatMoney(n, region, { cents: false });
  const monthsLeft = Math.max(1, Math.round(daysBetween(today, parseISODate(plan.windowEndDate)) / 30.44));
  switch (plan.status) {
    case 'early':
      return {
        headline: `Sell around ${formatMonthYear(plan.bestDate, region)}`,
        body: `That's when keeping it starts to cost more each year than owning it has so far. It should still fetch about ${money(plan.bestValue)} toward your next one.`,
      };
    case 'window':
      return {
        headline: `Sell in the next ${monthsLeft} month${monthsLeft === 1 ? '' : 's'}`,
        body: `It should fetch about ${money(plan.nowValue)} now. From here, each extra year costs more than an average year of owning it has.`,
      };
    case 'late':
      return {
        headline: 'Sell soon, or use it until it’s done',
        body: `Its value is falling fastest now. Keeping it another year will likely cost about ${money(plan.keepCostNextYear)} in value.`,
      };
    default:
      return {
        headline: 'Use it until it’s done',
        body: 'Most of its resale value goes early, so selling later won’t fund much of an upgrade. Get full use out of it.',
      };
  }
}

export function SellAdvice({ plan, item, region }: { plan: SellPlan; item: Item; region: TaxRegion }) {
  const c = useColors();
  const [mode, setMode] = useState<'value' | 'costs'>('value');
  const copy = adviceCopy(plan, region);
  const color = statusColor(plan, c);

  return (
    <View style={[styles.card, { backgroundColor: c.card }]}>
      <View style={styles.statusRow}>
        <View style={[styles.statusDot, { backgroundColor: color }]} />
        <AppText variant="eyebrow" color={color}>
          {sellStatusLabel(plan)}
        </AppText>
      </View>
      <AppText variant="title2">{copy.headline}</AppText>
      <AppText variant="subhead" color={c.textSecondary} style={{ lineHeight: 21 }}>
        {copy.body}
      </AppText>

      <View style={{ marginTop: Spacing.md }}>
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: 'value', label: 'Value over time' },
            { value: 'costs', label: 'The maths' },
          ]}
        />
      </View>
      <View style={[styles.chart, { backgroundColor: c.raised }]}>
        <ValueChart
          plan={plan}
          region={region}
          price={item.price ?? 0}
          warrantyYears={item.warrantyMonths ? item.warrantyMonths / 12 : null}
          mode={mode}
        />
      </View>
      {mode === 'costs' ? (
        <AppText variant="footnote" color={c.textSecondary} style={{ lineHeight: 18 }}>
          The black line is what owning it has cost per year so far. The blue line is what keeping it one more year
          would cost. While blue is under black, keeping it is good value. Where blue rises above black, every extra
          year costs more than a typical year did: that crossing is the best time to sell and upgrade.
        </AppText>
      ) : null}

      <View style={styles.facts}>
        <Fact label="Keeping it 1 more year" value={`−${formatMoney(plan.keepCostNextYear, region, { cents: false })}`} />
        <Fact label="Typical useful life" value={`~${plan.profile.lifeYears} yrs`} detail={plan.profile.lifeBasis} />
        <Fact
          label={plan.calibrated ? 'Tuned to your price' : plan.profile.brand ? 'Strong resale brand' : 'Resale curve'}
          value={plan.calibrated ? 'Yes' : (plan.profile.brand ?? 'Typical')}
        />
      </View>

      {plan.tip ? (
        <View style={[styles.tip, { backgroundColor: c.raised }]}>
          <Ionicons name="bulb-outline" size={18} color={c.ink} />
          <AppText variant="footnote" style={{ flex: 1, lineHeight: 18 }}>
            {plan.tip}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

function Fact({ label, value, detail }: { label: string; value: string; detail?: string }) {
  const c = useColors();
  return (
    <View style={[styles.fact, { backgroundColor: c.raised }]}>
      <AppText variant="headline" numberOfLines={1} style={{ fontVariant: ['tabular-nums'] }}>
        {value}
      </AppText>
      <AppText variant="caption" color={c.textSecondary} numberOfLines={2}>
        {detail ? `${label} · ${detail}` : label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xxl,
    padding: Spacing.xl,
    gap: Spacing.sm,
    borderRadius: Radius.xxl,
    borderCurve: 'continuous',
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  chart: { borderRadius: Radius.lg, borderCurve: 'continuous', paddingVertical: Spacing.sm, paddingRight: 4, marginTop: Spacing.sm },
  facts: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  fact: { flex: 1, padding: Spacing.md, gap: 2, borderRadius: Radius.lg, borderCurve: 'continuous' },
  tip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    marginTop: Spacing.xs,
  },
});
