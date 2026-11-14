import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Segmented } from '@/components/ui';
import { ValueChart } from '@/components/value-chart';
import { Radius, Spacing, useColors, type Palette } from '@/constants/theme';
import { daysBetween, parseISODate } from '@/lib/dates';
import { formatMoney, formatMonthYear } from '@/lib/format';
import { resaleBrand, type Evidence } from '@/lib/lifecycle';
import { WORTH_SELLING_MIN } from '@/lib/selling';
import { useStore } from '@/lib/store';
import type { Item, TaxRegion, UpgradeStyle } from '@/lib/types';
import { sellStatusLabel, type SellPlan } from '@/lib/upgrade';

export function statusColor(plan: SellPlan, c: Palette): string {
  return plan.status === 'window' ? c.green : plan.status === 'late' ? c.orange : c.textSecondary;
}

const EVIDENCE_LABEL: Record<Evidence, string> = {
  measured: 'Measured prices',
  rule: 'Industry rule of thumb',
  inferred: 'Estimated',
};

/** Headline and one-line explanation for the recommendation. */
export function adviceCopy(plan: SellPlan, region: TaxRegion, today = new Date()): { headline: string; body: string } {
  const money = (n: number) => formatMoney(n, region, { cents: false });
  const month = (iso: string) => formatMonthYear(iso, region);
  const monthsLeft = Math.max(1, Math.round(daysBetween(today, parseISODate(plan.windowEndDate)) / 30.44));
  const early = plan.costYearEarly != null && plan.costYearEarly >= 5 ? plan.costYearEarly : null;
  const late = plan.costYearLate != null && plan.costYearLate >= 5 ? plan.costYearLate : null;
  switch (plan.status) {
    case 'early': {
      const timing =
        early && late
          ? ` Selling a year early would cost about ${money(early)}; a year late, about ${money(late)}.`
          : late
            ? ` Waiting a year too long would cost about ${money(late)}.`
            : '';
      return {
        headline: `Sell between ${month(plan.windowStartDate)} and ${month(plan.windowEndDate)}`,
        body: `Expect about ${money(plan.bestValue)}, or ${money(plan.bestNet)} in your pocket after ${plan.channel.fee ? 'fees and effort' : 'your time'}.${timing}`,
      };
    }
    case 'window':
      return {
        headline: `Good time to sell: the next ${monthsLeft} month${monthsLeft === 1 ? '' : 's'}`,
        body: `It should fetch about ${money(plan.nowValue)}, or ${money(plan.nowNet)} after ${plan.channel.fee ? 'fees and effort' : 'your time'}.${late ? ` Holding it a year past ${month(plan.windowEndDate)} costs about ${money(late)}.` : ''}`,
      };
    case 'late':
      return {
        headline: 'Sell soon, or use it until it’s done',
        body: `It’s past its best time to sell. Keeping it another year will likely cost about ${money(plan.keepCostNextYear)} in value and risk.`,
      };
    case 'market':
      return {
        headline: 'Hold: its price follows the market',
        body: 'Pieces like this aren’t priced by age. Sell when the market for them is strong, or when you simply want to, not on a schedule.',
      };
    case 'no-resale':
      return {
        headline: 'Use it until it’s done',
        body: 'There’s no real second-hand market for this, so it’s worth what it does for you. Donate or recycle it when you’re finished.',
      };
    default:
      return {
        headline: plan.bestNet < WORTH_SELLING_MIN ? 'Get full use out of it' : 'Keep it: it holds its value',
        body:
          plan.bestNet < WORTH_SELLING_MIN
            ? 'By the time you’d want to replace it, it would net too little to be worth the hassle of selling. Get full use out of it, then donate or trade it in.'
            : `No year stands out as the time to sell, so keep using it and sell whenever you’re ready to replace it. Around ${month(plan.bestDate)} it should still fetch about ${money(plan.bestValue)}.`,
      };
  }
}

const STYLE_OPTIONS: { value: UpgradeStyle; label: string }[] = [
  { value: 'value', label: 'Full value' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'latest', label: 'Stay current' },
];

export function SellAdvice({ plan, item, region }: { plan: SellPlan; item: Item; region: TaxRegion }) {
  const c = useColors();
  const { settings, updateSettings } = useStore();
  const [mode, setMode] = useState<'value' | 'costs'>('value');
  const copy = adviceCopy(plan, region);
  const color = statusColor(plan, c);
  const timed = plan.status === 'early' || plan.status === 'window' || plan.status === 'late' || plan.status === 'use-up';
  const brand = resaleBrand(item);

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

      {timed ? (
        <View style={{ marginTop: Spacing.md, gap: Spacing.xs }}>
          <AppText variant="caption" color={c.textSecondary}>
            How much do you care about having the latest?
          </AppText>
          <Segmented
            value={settings.upgradeStyle}
            onChange={(upgradeStyle) => updateSettings({ upgradeStyle })}
            options={STYLE_OPTIONS}
          />
        </View>
      ) : null}

      {timed ? (
        <View style={{ marginTop: Spacing.sm }}>
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: 'value', label: 'Value over time' },
              { value: 'costs', label: 'The maths' },
            ]}
          />
        </View>
      ) : null}
      <View style={[styles.chart, { backgroundColor: c.raised }]}>
        <ValueChart
          plan={plan}
          region={region}
          price={item.price ?? 0}
          warrantyYears={item.warrantyMonths ? item.warrantyMonths / 12 : null}
          mode={timed ? mode : 'value'}
        />
      </View>
      {timed && mode === 'costs' ? (
        <AppText variant="footnote" color={c.textSecondary} style={{ lineHeight: 18 }}>
          The black line is the average yearly cost of owning one if you sell at that age: the price, less what
          you’d get back after fees, plus the cost of falling behind newer models and the risk of it dying first.
          The blue line is what keeping it costs per year at each age. The lowest point of the black line is the best
          time to sell, and it’s where blue crosses black. The shaded band is every age within 5% of that best cost.
        </AppText>
      ) : null}

      <View style={styles.facts}>
        <Fact label="Keeping it 1 more year" value={`−${formatMoney(plan.keepCostNextYear, region, { cents: false })}`} />
        <Fact label="Useful life" value={`~${plan.profile.lifeYears} yrs`} detail={plan.profile.label} />
        <Fact
          label={plan.calibrated ? 'Tuned to your price' : brand ? 'Strong resale' : 'Based on'}
          value={plan.calibrated ? 'Yes' : (brand ?? EVIDENCE_LABEL[plan.profile.evidence])}
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
