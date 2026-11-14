import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';

import { DateField } from '@/components/date-field';
import { HtmlPreview } from '@/components/html-preview';
import { ItemThumb } from '@/components/item-bits';
import { AppText, Chip, PrimaryButton, Row, Section, Segmented, tap } from '@/components/ui';
import { Radius, Spacing, useColors } from '@/constants/theme';
import { CATEGORIES } from '@/lib/categories';
import { canExportPdf, exportPdf, prepareImages } from '@/lib/claim-export';
import { buildClaimHtml, coverageCheck, paperFor, summarize, type ClaimOptions } from '@/lib/claim-pack';
import { todayISO } from '@/lib/dates';
import { formatMoney } from '@/lib/format';
import { sortItems, useStore } from '@/lib/store';
import type { Category } from '@/lib/types';

type Purpose = 'claim' | 'inventory';

export default function ClaimPackScreen() {
  const c = useColors();
  const { items, settings } = useStore();
  const region = settings.taxRegion;

  // Sold items are no longer yours to insure.
  const owned = useMemo(() => sortItems(items).filter((i) => !i.sold), [items]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(owned.map((i) => i.id)));
  const [purpose, setPurpose] = useState<Purpose>('inventory');
  const [lossDate, setLossDate] = useState(todayISO());
  const [description, setDescription] = useState('');
  const [includePhotos, setIncludePhotos] = useState(true);
  const [includeReceipts, setIncludeReceipts] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  const chosen = owned.filter((i) => selected.has(i.id));
  const summary = summarize(chosen);
  const coverage = coverageCheck(summarize(owned).paid, settings.insurance.sumInsured);
  const categories = CATEGORIES.filter((cat) => owned.some((i) => i.category === cat.id));

  const options: ClaimOptions = {
    includePhotos,
    includeReceipts,
    incident: purpose === 'claim' ? { date: lossDate, description } : null,
  };

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const selectCategory = (cat: Category) => setSelected(new Set(owned.filter((i) => i.category === cat).map((i) => i.id)));

  const create = async () => {
    if (chosen.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const images = await prepareImages(chosen, options);
      const html = buildClaimHtml(chosen, options, settings, images);
      if (!canExportPdf) {
        setPreviewHtml(html);
        return;
      }
      const name = `${purpose === 'claim' ? 'Insurance claim' : 'Contents inventory'} ${todayISO()}.pdf`;
      await exportPdf(html, paperFor(region), name);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the PDF. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen
        options={{
          title: 'Claim pack',
          headerLeft: () => (
            <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={10} style={{ paddingHorizontal: 6 }}>
              <AppText color={c.accent}>Close</AppText>
            </Pressable>
          ),
        }}
      />
      <ScrollView
        style={{ backgroundColor: c.background }}
        contentContainerStyle={{ paddingTop: Spacing.lg, paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive">
        {/* Summary */}
        <View style={[styles.card, { backgroundColor: c.card }]}>
          <AppText variant="footnote" color={c.textSecondary} style={{ fontWeight: '600' }}>
            {purpose === 'claim' ? 'INSURANCE CLAIM' : 'CONTENTS INVENTORY'}
          </AppText>
          <AppText style={styles.big}>
            {summary.count} item{summary.count === 1 ? '' : 's'}
          </AppText>
          <AppText variant="subhead" color={c.textSecondary}>
            Paid {formatMoney(summary.paid, region, { cents: false })} · worth about{' '}
            {formatMoney(summary.current, region, { cents: false })} today
          </AppText>
          <View style={styles.stats}>
            <Stat icon="receipt-outline" label="Receipts" value={`${summary.withReceipt} of ${summary.count}`} />
            <Stat icon="camera-outline" label="Photos" value={`${summary.withPhoto} of ${summary.count}`} />
            <Stat icon="barcode-outline" label="Serials" value={`${summary.withSerial} of ${summary.count}`} />
          </View>
        </View>

        {/* Cover check */}
        {coverage.state === 'under' ? (
          <Banner tone="warn" icon="warning">
            Your items cost {formatMoney(coverage.gap, region, { cents: false })} more than your contents cover of{' '}
            {formatMoney(settings.insurance.sumInsured, region, { cents: false })}. You may be underinsured.
          </Banner>
        ) : coverage.state === 'ok' ? (
          <Banner tone="ok" icon="shield-checkmark">
            Your items fit within your contents cover of {formatMoney(settings.insurance.sumInsured, region, { cents: false })}.
          </Banner>
        ) : (
          <Banner tone="info" icon="information-circle" onPress={() => router.push('/settings')}>
            Add your insurer, policy number and sum insured in Settings to put them on the cover page.
          </Banner>
        )}

        {summary.warnings.length > 0 ? (
          <Section title="Worth fixing first" footer="Insurers ask for proof of ownership and value. Tap an item to add what's missing.">
            {summary.warnings.map((w, i) => (
              <Row key={w} label={w} icon="alert-circle-outline" last={i === summary.warnings.length - 1} />
            ))}
          </Section>
        ) : null}

        <Section title="What it's for">
          <View style={{ padding: Spacing.md }}>
            <Segmented
              value={purpose}
              onChange={setPurpose}
              options={[
                { value: 'inventory', label: 'Full inventory' },
                { value: 'claim', label: 'A claim' },
              ]}
            />
          </View>
          {purpose === 'claim' ? (
            <>
              <Row label="Date of loss">
                <DateField value={lossDate} onChange={setLossDate} />
              </Row>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="What happened, e.g. break-in through the back door; police report number"
                placeholderTextColor={c.textTertiary}
                multiline
                style={[styles.description, { color: c.text }]}
                accessibilityLabel="What happened"
              />
            </>
          ) : null}
        </Section>

        <Section title="Include">
          <Row label="Item photos" icon="image-outline">
            <Switch value={includePhotos} onValueChange={setIncludePhotos} trackColor={{ true: c.green, false: c.fill }} />
          </Row>
          <Row label="Receipts" icon="receipt-outline" last>
            <Switch value={includeReceipts} onValueChange={setIncludeReceipts} trackColor={{ true: c.green, false: c.fill }} />
          </Row>
        </Section>

        <Section title={`Items (${chosen.length} of ${owned.length})`}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <Chip label="All" selected={chosen.length === owned.length} onPress={() => setSelected(new Set(owned.map((i) => i.id)))} />
            <Chip label="None" selected={chosen.length === 0} onPress={() => setSelected(new Set())} />
            {categories.map((cat) => (
              <Chip
                key={cat.id}
                label={cat.label.split(' ')[0]}
                selected={chosen.length > 0 && chosen.every((i) => i.category === cat.id) && chosen.length === owned.filter((i) => i.category === cat.id).length}
                onPress={() => selectCategory(cat.id)}
              />
            ))}
          </ScrollView>
          {owned.map((item, idx) => {
            const on = selected.has(item.id);
            return (
              <Pressable
                key={item.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={item.name}
                onPress={() => {
                  tap();
                  toggle(item.id);
                }}
                style={[styles.pickRow, idx < owned.length - 1 && { borderBottomColor: c.separator, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                <Ionicons name={on ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={on ? c.accent : c.textTertiary} />
                <ItemThumb item={item} size={40} onTile />
                <View style={{ flex: 1 }}>
                  <AppText numberOfLines={1}>{item.name}</AppText>
                  <AppText variant="footnote" color={c.textSecondary} numberOfLines={1}>
                    {[item.receiptUri ? 'Receipt' : 'No receipt', item.serial ? 'Serial' : 'No serial'].join(' · ')}
                  </AppText>
                </View>
                <AppText style={{ fontVariant: ['tabular-nums'] }}>{formatMoney(item.price, region)}</AppText>
              </Pressable>
            );
          })}
        </Section>

        <View style={styles.actions}>
          {busy ? (
            <View style={styles.busy}>
              <ActivityIndicator color={c.accent} />
              <AppText color={c.textSecondary}>Preparing photos and receipts…</AppText>
            </View>
          ) : (
            <PrimaryButton
              label={canExportPdf ? 'Create PDF' : 'Preview pack'}
              icon={canExportPdf ? 'document-text' : 'eye-outline'}
              onPress={create}
            />
          )}
          {chosen.length === 0 ? (
            <AppText variant="footnote" color={c.textSecondary} style={{ textAlign: 'center' }}>
              Choose at least one item.
            </AppText>
          ) : null}
          {error ? (
            <AppText variant="footnote" color={c.red} style={{ textAlign: 'center' }}>
              {error}
            </AppText>
          ) : null}
          {!canExportPdf ? (
            <AppText variant="footnote" color={c.textSecondary} style={{ textAlign: 'center' }}>
              Saving and sharing the PDF works in the iPhone app. Here you can preview it.
            </AppText>
          ) : null}
        </View>

        {previewHtml ? (
          <View style={{ paddingHorizontal: Spacing.lg }}>
            <HtmlPreview html={previewHtml} />
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Stat({ icon, label, value }: { icon: 'receipt-outline' | 'camera-outline' | 'barcode-outline'; label: string; value: string }) {
  const c = useColors();
  return (
    <View style={[styles.stat, { backgroundColor: c.raised }]}>
      <Ionicons name={icon} size={18} color={c.accent} />
      <AppText variant="subhead" style={{ fontWeight: '600', fontVariant: ['tabular-nums'] }}>
        {value}
      </AppText>
      <AppText variant="caption" color={c.textSecondary}>
        {label}
      </AppText>
    </View>
  );
}

function Banner({
  tone,
  icon,
  children,
  onPress,
}: {
  tone: 'warn' | 'ok' | 'info';
  icon: 'warning' | 'shield-checkmark' | 'information-circle';
  children: ReactNode;
  onPress?: () => void;
}) {
  const c = useColors();
  const colors = {
    warn: { bg: c.orangeSoft, fg: c.orange },
    ok: { bg: c.greenSoft, fg: c.green },
    info: { bg: c.accentSoft, fg: c.accent },
  }[tone];
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={[styles.banner, { backgroundColor: colors.bg }]}>
      <Ionicons name={icon} size={20} color={colors.fg} />
      <AppText variant="subhead" style={{ flex: 1 }}>
        {children}
      </AppText>
      {onPress ? <Ionicons name="chevron-forward" size={16} color={c.textTertiary} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md, borderRadius: Radius.xxl, borderCurve: 'continuous', padding: Spacing.xl, gap: 2 },
  big: { fontSize: 34, fontWeight: '700', letterSpacing: -0.8, marginTop: 2 },
  stats: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  stat: { flex: 1, borderRadius: Radius.lg, borderCurve: 'continuous', padding: Spacing.md, gap: 2 },
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
  description: { minHeight: 90, padding: Spacing.lg, paddingTop: Spacing.sm, fontSize: 17, textAlignVertical: 'top' },
  chips: { gap: Spacing.sm, padding: Spacing.md },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 10, paddingHorizontal: Spacing.lg },
  actions: { gap: Spacing.sm, paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl },
  busy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, height: 50 },
});
