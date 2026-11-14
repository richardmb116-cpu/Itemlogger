import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ItemThumb } from '@/components/item-bits';
import { AppText, Chip, PrimaryButton, Row, ScreenTitle, Section } from '@/components/ui';
import { Radius, Spacing, useColors } from '@/constants/theme';
import { todayISO } from '@/lib/dates';
import { deductionFor, depreciationSchedule, type Schedule } from '@/lib/depreciation';
import { formatDate, formatMoney } from '@/lib/format';
import { sortItems, useStore } from '@/lib/store';
import { taxYearByEnd, taxYearFor } from '@/lib/tax';
import type { Item } from '@/lib/types';

export default function TaxScreen() {
  const c = useColors();
  const { items, settings } = useStore();
  const region = settings.taxRegion;
  const currentYear = taxYearFor(todayISO(), region).endYear;

  // Depreciation schedules for work items. A sold item stops depreciating in the year it's sold.
  const schedules = useMemo(() => {
    const map = new Map<string, Schedule>();
    for (const item of items) {
      if (item.use !== 'work') continue;
      const s = depreciationSchedule(item, region, settings.depreciation);
      if (item.sold) {
        const soldYear = taxYearFor(item.sold.date, region).endYear;
        s.years = s.years.filter((y) => y.endYear <= soldYear);
      }
      map.set(item.id, s);
    }
    return map;
  }, [items, region, settings.depreciation]);

  // Years with purchases or deductions, up to this one, newest first.
  const years = useMemo(() => {
    const set = new Set<number>([currentYear]);
    items.forEach((i) => set.add(taxYearFor(i.purchaseDate, region).endYear));
    schedules.forEach((s) => s.years.forEach((y) => y.endYear <= currentYear && y.deduction > 0 && set.add(y.endYear)));
    return [...set].sort((a, b) => b - a);
  }, [items, schedules, region, currentYear]);

  const [picked, setPicked] = useState<number | null>(null);
  const endYear = picked != null && years.includes(picked) ? picked : currentYear;
  const year = taxYearByEnd(endYear, region);

  const sorted = sortItems(items);
  const claims = sorted
    .map((item) => ({ item, schedule: schedules.get(item.id), amount: 0 }))
    .filter((r): r is { item: Item; schedule: Schedule; amount: number } => !!r.schedule?.eligible)
    .map((r) => ({ ...r, amount: deductionFor(r.schedule, endYear) }))
    .filter((r) => r.amount > 0);
  const totalDeductions = claims.reduce((s, r) => s + r.amount, 0);
  const notClaimable = sorted.filter(
    (i) => i.use === 'work' && taxYearFor(i.purchaseDate, region).endYear === endYear && !schedules.get(i.id)?.eligible,
  );
  const boughtForWork = sorted.filter((i) => i.use === 'work' && taxYearFor(i.purchaseDate, region).endYear === endYear);
  const workSpend = boughtForWork.reduce((s, i) => s + (i.price ?? 0), 0);
  const future = endYear > currentYear;
  const advanced = settings.depreciation.showAdvanced;


  const simpleNote =
    region === 'AU'
      ? 'Australia: 1 July to 30 June. Estimates using common ATO methods, for the work share only. Your accountant confirms the final figures.'
      : "United States: calendar year. For business or self-employed use; employees generally can't deduct work purchases. Your accountant confirms the final figures.";
  const methodNote =
    region === 'AU'
      ? `Australia: 1 July to 30 June. Items $300 or less are claimed straight away; others are spread over their effective life using ${
          settings.depreciation.auMethod === 'prime' ? 'prime cost' : 'diminishing value'
        }${settings.depreciation.auLowValuePool ? ', with items under $1,000 in a low-value pool' : ''}. Only the work share is claimed.`
      : `United States: calendar year. Using ${
          settings.depreciation.usMethod === 'section179' ? 'Section 179 (full deduction in the first year)' : 'MACRS'
        }. For business or self-employed use; employees generally can't deduct work purchases.`;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <ScreenTitle
          eyebrow={`${formatDate(year.start, region)} – ${formatDate(year.end, region)}`}
          title="Tax"
          subtitle="Work purchases and what they're worth back to you."
        />


        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.years}>
          {years.map((y) => (
            <Chip key={y} label={taxYearByEnd(y, region).label} selected={y === endYear} onPress={() => setPicked(y)} />
          ))}
        </ScrollView>

        <View style={styles.cards}>
          <View style={[styles.bigCard, { backgroundColor: c.ink }]}>
            <View style={styles.cardLabel}>
              <Ionicons name="receipt" size={16} color={c.onInk} />
              <AppText variant="subhead" color={c.onInk} style={{ fontWeight: '600' }}>
                Estimated deductions{future ? ' (projected)' : ''}
              </AppText>
            </View>
            <AppText variant="largeTitle" color={c.onInk} style={{ fontVariant: ['tabular-nums'] }}>
              {formatMoney(totalDeductions, region, { cents: false })}
            </AppText>
            <AppText variant="footnote" color={c.onInk} style={{ opacity: 0.85 }}>
              {claims.length} item{claims.length === 1 ? '' : 's'} in {year.label}
            </AppText>
          </View>
          <View style={[styles.smallCard, { backgroundColor: c.card }]}>
            <AppText variant="footnote" color={c.textSecondary} style={{ fontWeight: '600' }}>
              Bought for work
            </AppText>
            <AppText variant="title2" style={{ fontVariant: ['tabular-nums'] }}>
              {formatMoney(workSpend, region, { cents: false })}
            </AppText>
            <AppText variant="footnote" color={c.textSecondary}>
              {boughtForWork.length} item{boughtForWork.length === 1 ? '' : 's'}
            </AppText>
          </View>
        </View>

        <Section title={`Deductions in ${year.label}`} footer={advanced ? methodNote : simpleNote}>
          {claims.length === 0 ? (
            <Row label="Nothing to claim this year" last />
          ) : (
            claims.map(({ item, schedule, amount }, idx) => (
              <Row
                key={item.id}
                label=""
                last={idx === claims.length - 1}
                onPress={() => router.push(`/item/${item.id}`)}
                chevron>
                <View style={styles.claimRow}>
                  <ItemThumb item={item} size={40} onTile />
                  <View style={{ flex: 1 }}>
                    <AppText numberOfLines={1}>{item.name}</AppText>
                    <AppText variant="footnote" color={c.textSecondary} numberOfLines={1}>
                      {advanced ? `${schedule.method} · ` : ''}
                      {item.workPercent}% work{item.receiptUri ? '' : ' · no receipt'}
                    </AppText>
                  </View>
                  <AppText style={{ fontVariant: ['tabular-nums'], fontWeight: '600' }}>
                    {formatMoney(amount, region, { cents: true })}
                  </AppText>
                </View>
              </Row>
            ))
          )}
        </Section>

        {notClaimable.length > 0 ? (
          <Section title="Work items not claimed">
            {notClaimable.map((item, idx) => (
              <Row
                key={item.id}
                label={item.name}
                value={schedules.get(item.id)?.note?.split('.')[0] ?? ''}
                last={idx === notClaimable.length - 1}
                onPress={() => router.push(`/item/${item.id}`)}
                chevron
              />
            ))}
          </Section>
        ) : null}

        <View style={styles.export}>
          <PrimaryButton
            label="Send to my accountant"
            icon="paper-plane"
            onPress={() => router.push({ pathname: '/accountant', params: { year: String(endYear) } })}
          />
          <AppText variant="footnote" color={c.textSecondary} style={{ textAlign: 'center' }}>
            A PDF with receipts, or a spreadsheet, of the work items for this year.
          </AppText>
        </View>

        {advanced ? (
          <Section>
            <Row label="Depreciation method" icon="options-outline" chevron last onPress={() => router.push('/settings')} />
          </Section>
        ) : null}

        <AppText variant="footnote" color={c.textTertiary} style={styles.disclaimer}>
          A record-keeping aid, not tax advice. Check with your accountant before claiming.
        </AppText>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  years: { gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  cards: { flexDirection: 'row', gap: Spacing.md, paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl },
  bigCard: { flex: 1.4, borderRadius: Radius.lg, borderCurve: 'continuous', padding: Spacing.lg, gap: 4 },
  smallCard: { flex: 1, borderRadius: Radius.lg, borderCurve: 'continuous', padding: Spacing.lg, gap: 4, justifyContent: 'flex-end' },
  cardLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  claimRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  export: { gap: Spacing.sm, paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl },
  disclaimer: { textAlign: 'center', paddingHorizontal: Spacing.xxl },
});
