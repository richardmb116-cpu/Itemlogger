import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { HtmlPreview } from '@/components/html-preview';
import { AppText, PrimaryButton, Row, Section } from '@/components/ui';
import { Radius, Spacing, useColors } from '@/constants/theme';
import { accountantHtml, accountantRows, toCsv } from '@/lib/accountant-export';
import { canExportPdf, exportPdf, prepareReceipts, shareTextFile } from '@/lib/claim-export';
import { paperFor } from '@/lib/claim-pack';
import { todayISO } from '@/lib/dates';
import { formatDate, formatMoney } from '@/lib/format';
import { useStore } from '@/lib/store';
import { taxYearByEnd, taxYearFor } from '@/lib/tax';

export default function AccountantScreen() {
  const params = useLocalSearchParams<{ year?: string }>();
  const c = useColors();
  const { items, settings } = useStore();
  const region = settings.taxRegion;
  const endYear = Number(params.year) || taxYearFor(todayISO(), region).endYear;
  const year = taxYearByEnd(endYear, region);

  const rows = useMemo(
    () => accountantRows(items, region, settings.depreciation, endYear),
    [items, region, settings.depreciation, endYear],
  );
  const total = rows.reduce((s, r) => s + r.deduction, 0);
  const missingReceipts = rows.filter((r) => !r.hasReceipt).length;
  const fileBase = `Work purchases ${year.label.replace(/\s+/g, ' ')}`;

  const [busy, setBusy] = useState<'pdf' | 'csv' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const sharePdf = async () => {
    setBusy('pdf');
    setError(null);
    try {
      const receipts = await prepareReceipts(rows.map((r) => r.item));
      const html = accountantHtml(rows, region, endYear, receipts);
      if (!canExportPdf) {
        setPreview(html);
        return;
      }
      await exportPdf(html, paperFor(region), `${fileBase}.pdf`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the PDF. Try again.');
    } finally {
      setBusy(null);
    }
  };

  const shareCsv = async () => {
    setBusy('csv');
    setError(null);
    try {
      await shareTextFile(`${fileBase}.csv`, toCsv(rows, region, endYear), 'text/csv', 'public.comma-separated-values-text');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the spreadsheet. Try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <Stack.Screen
        options={{
          title: 'For your accountant',
          headerLeft: () => (
            <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={10} style={{ paddingHorizontal: 6 }}>
              <AppText color={c.accent}>Close</AppText>
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={{ paddingTop: Spacing.lg, paddingBottom: 60 }}>
        <View style={[styles.card, { backgroundColor: c.card }]}>
          <AppText variant="footnote" color={c.textSecondary} style={{ fontWeight: '600' }}>
            {year.label.toUpperCase()}
          </AppText>
          <AppText style={styles.big}>{formatMoney(total, region, { cents: false })}</AppText>
          <AppText variant="subhead" color={c.textSecondary}>
            Estimated deductions from {rows.length} work item{rows.length === 1 ? '' : 's'}
          </AppText>
        </View>

        {missingReceipts > 0 ? (
          <View style={[styles.banner, { backgroundColor: c.orangeSoft }]}>
            <Ionicons name="receipt-outline" size={20} color={c.orange} />
            <AppText variant="subhead" style={{ flex: 1 }}>
              {missingReceipts} item{missingReceipts === 1 ? ' has' : 's have'} no receipt photo. Your accountant may ask
              for proof of purchase.
            </AppText>
          </View>
        ) : null}

        <Section
          title="What's included"
          footer="Each item's cost, purchase date, work use and an estimated deduction. Your accountant confirms the final figures.">
          {rows.length === 0 ? (
            <Row label="No work items for this year" last />
          ) : (
            rows.map((r, i) => (
              <Row
                key={r.item.id}
                label={r.item.name}
                value={formatMoney(r.deduction, region, { cents: true })}
                last={i === rows.length - 1}
                onPress={() => router.push(`/item/${r.item.id}`)}
                chevron
              />
            ))
          )}
        </Section>

        <View style={styles.actions}>
          {busy ? (
            <View style={styles.busy}>
              <ActivityIndicator color={c.accent} />
              <AppText color={c.textSecondary}>{busy === 'pdf' ? 'Preparing receipts…' : 'Preparing spreadsheet…'}</AppText>
            </View>
          ) : (
            <>
              <PrimaryButton
                label={canExportPdf ? 'Share PDF with receipts' : 'Preview PDF'}
                icon="document-text"
                onPress={sharePdf}
              />
              {canExportPdf ? (
                <PrimaryButton label="Share spreadsheet (CSV)" icon="grid-outline" onPress={shareCsv} secondary />
              ) : null}
            </>
          )}
          {error ? (
            <AppText variant="footnote" color={c.red} style={{ textAlign: 'center' }}>
              {error}
            </AppText>
          ) : null}
          <AppText variant="footnote" color={c.textSecondary} style={{ textAlign: 'center' }}>
            {canExportPdf
              ? `Covers ${formatDate(year.start, region)} to ${formatDate(year.end, region)}. Send it by email, AirDrop or your accountant's portal.`
              : 'Sharing the PDF and spreadsheet works in the iPhone app. Here you can preview the PDF.'}
          </AppText>
        </View>

        {preview ? (
          <View style={{ paddingHorizontal: Spacing.lg }}>
            <HtmlPreview html={preview} />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md, borderRadius: Radius.xxl, borderCurve: 'continuous', padding: Spacing.xl, gap: 2 },
  big: { fontSize: 40, fontWeight: '700', letterSpacing: -1, fontVariant: ['tabular-nums'], marginTop: 2 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
  },
  actions: { gap: Spacing.sm, paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl },
  busy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, height: 50 },
});
