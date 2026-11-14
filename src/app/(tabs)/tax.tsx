import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ItemThumb } from '@/components/item-bits';
import { AppText, Chip, Row, ScreenTitle, Section, Segmented } from '@/components/ui';
import { Radius, Spacing, useColors } from '@/constants/theme';
import { todayISO } from '@/lib/dates';
import { formatDate, formatMoney } from '@/lib/format';
import { sortItems, useStore } from '@/lib/store';
import { taxYearByEnd, taxYearFor } from '@/lib/tax';
import type { TaxRegion } from '@/lib/types';

export default function TaxScreen() {
  const c = useColors();
  const { items, settings, updateSettings } = useStore();
  const region = settings.taxRegion;
  const currentYear = taxYearFor(todayISO(), region).endYear;

  // Tax years that have purchases, plus the current one, newest first.
  const years = useMemo(() => {
    const set = new Set<number>([currentYear]);
    items.forEach((i) => set.add(taxYearFor(i.purchaseDate, region).endYear));
    return [...set].sort((a, b) => b - a);
  }, [items, region, currentYear]);

  const [picked, setPicked] = useState<number | null>(null);
  const endYear = picked != null && years.includes(picked) ? picked : currentYear;
  const year = taxYearByEnd(endYear, region);

  const inYear = sortItems(items).filter((i) => taxYearFor(i.purchaseDate, region).endYear === endYear);
  const work = inYear.filter((i) => i.use === 'work');
  const personal = inYear.filter((i) => i.use === 'personal');
  const sum = (list: typeof items) => list.reduce((s, i) => s + (i.price ?? 0), 0);

  const changeRegion = (r: TaxRegion) => {
    setPicked(null);
    updateSettings({ taxRegion: r });
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <ScreenTitle title="Tax" subtitle={`${formatDate(year.start, region)} – ${formatDate(year.end, region)}`} />

        <View style={{ paddingHorizontal: Spacing.lg, marginBottom: Spacing.md }}>
          <Segmented
            value={region}
            onChange={changeRegion}
            options={[
              { value: 'AU', label: '🇦🇺  Australia' },
              { value: 'US', label: '🇺🇸  United States' },
            ]}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.years}>
          {years.map((y) => (
            <Chip key={y} label={taxYearByEnd(y, region).label} selected={y === endYear} onPress={() => setPicked(y)} />
          ))}
        </ScrollView>

        <View style={styles.cards}>
          <View style={[styles.bigCard, { backgroundColor: c.accent }]}>
            <View style={styles.cardLabel}>
              <Ionicons name="briefcase" size={16} color={c.onAccent} />
              <AppText variant="subhead" color={c.onAccent} style={{ fontWeight: '600' }}>
                Work purchases
              </AppText>
            </View>
            <AppText variant="largeTitle" color={c.onAccent} style={{ fontVariant: ['tabular-nums'] }}>
              {formatMoney(sum(work), region, { cents: false })}
            </AppText>
            <AppText variant="footnote" color={c.onAccent} style={{ opacity: 0.85 }}>
              {work.length} item{work.length === 1 ? '' : 's'} in {year.label}
            </AppText>
          </View>
          <View style={[styles.smallCard, { backgroundColor: c.card }]}>
            <AppText variant="footnote" color={c.textSecondary} style={{ fontWeight: '600' }}>
              Personal
            </AppText>
            <AppText variant="title2" style={{ fontVariant: ['tabular-nums'] }}>
              {formatMoney(sum(personal), region, { cents: false })}
            </AppText>
            <AppText variant="footnote" color={c.textSecondary}>
              {personal.length} item{personal.length === 1 ? '' : 's'}
            </AppText>
          </View>
        </View>

        <Section
          title="Work items"
          footer={
            region === 'AU'
              ? 'Australia: the financial year runs 1 July to 30 June. Work items over $300 are usually depreciated over time rather than claimed at once.'
              : 'United States: the tax year is the calendar year, 1 January to 31 December.'
          }>
          {work.length === 0 ? (
            <Row label="No work purchases this year" last />
          ) : (
            work.map((item, idx) => (
              <Row
                key={item.id}
                label=""
                last={idx === work.length - 1}
                onPress={() => router.push(`/item/${item.id}`)}
                chevron>
                <View style={styles.workRow}>
                  <ItemThumb item={item} size={40} onTile />
                  <View style={{ flex: 1 }}>
                    <AppText numberOfLines={1}>{item.name}</AppText>
                    <AppText variant="footnote" color={c.textSecondary}>
                      {formatDate(item.purchaseDate, region)}
                    </AppText>
                  </View>
                  <AppText style={{ fontVariant: ['tabular-nums'] }}>{formatMoney(item.price, region)}</AppText>
                </View>
              </Row>
            ))
          )}
        </Section>

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
  bigCard: { flex: 1.4, borderRadius: Radius.lg, padding: Spacing.lg, gap: 4 },
  smallCard: { flex: 1, borderRadius: Radius.lg, padding: Spacing.lg, gap: 4, justifyContent: 'flex-end' },
  cardLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  workRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  disclaimer: { textAlign: 'center', paddingHorizontal: Spacing.xxl },
});
