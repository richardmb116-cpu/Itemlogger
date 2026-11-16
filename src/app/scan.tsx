import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { AppText, PrimaryButton, Row, Section, tap } from '@/components/ui';
import { Radius, Spacing, useColors } from '@/constants/theme';
import { categoryInfo } from '@/lib/categories';
import { formatDate, formatMoney, parsePrice } from '@/lib/format';
import { defaultSelection, itemsFromScan, totalCheck, type ReceiptLine, type ReceiptScan } from '@/lib/receipt';
import {
  pickReceipt,
  readReceipt,
  readerErrorMessage,
  receiptReaderAvailable,
  storeReceipt,
  type ReceiptImage,
} from '@/lib/receipt-reader';
import { newId, useStore } from '@/lib/store';

type Stage = 'start' | 'reading' | 'review';

/** Scan one receipt, then tick which of its products to add as items. */
export default function ScanScreen() {
  const c = useColors();
  const { settings, saveItem } = useStore();
  const region = settings.taxRegion;
  const [available, setAvailable] = useState<boolean | null>(null);
  const [stage, setStage] = useState<Stage>('start');
  const [image, setImage] = useState<ReceiptImage | null>(null);
  const [scan, setScan] = useState<ReceiptScan | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    let live = true;
    void receiptReaderAvailable().then((ok) => live && setAvailable(ok));
    return () => {
      live = false;
      abort.current?.abort();
    };
  }, []);

  const start = async () => {
    setError(null);
    const picked = await pickReceipt();
    if (!picked) return;
    setImage(picked);
    setStage('reading');
    const ctl = new AbortController();
    abort.current = ctl;
    try {
      const result = await readReceipt(picked, region, ctl.signal);
      if (result.lines.length === 0) {
        setError('No products found. Try a sharper photo with the whole receipt in view.');
        setStage('start');
        return;
      }
      setScan(result);
      setSelected(defaultSelection(result));
      setStage('review');
    } catch (e) {
      const message = readerErrorMessage(e);
      const code = (e as { code?: string })?.code ?? (e instanceof Error ? e.message : 'unknown');
      if (message) setError(`${message}\n(${code})`);
      setStage('start');
    }
  };

  const updateLine = (key: string, patch: Partial<ReceiptLine>) =>
    setScan((s) => (s ? { ...s, lines: s.lines.map((l) => (l.key === key ? { ...l, ...patch } : l)) } : s));

  const toggle = (key: string) => {
    tap();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const add = async () => {
    if (!scan || !image || selected.size === 0) return;
    setSaving(true);
    const receiptUri = await storeReceipt(image).catch(() => null);
    const items = itemsFromScan(scan, selected, { receiptUri, newId });
    // Save in receipt order, so the first line ends up at the top of the list.
    [...items].reverse().forEach(saveItem);
    router.dismissTo('/');
  };

  if (stage === 'reading') {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        {image ? <Image source={{ uri: image.previewUri }} style={styles.preview} contentFit="cover" /> : null}
        <ActivityIndicator color={c.ink} />
        <AppText variant="headline">Reading your receipt…</AppText>
        <AppText variant="subhead" color={c.textSecondary} style={{ textAlign: 'center' }}>
          This usually takes 10–30 seconds.
        </AppText>
        <View style={{ alignSelf: 'stretch', paddingHorizontal: Spacing.lg, marginTop: Spacing.lg }}>
          <PrimaryButton label="Stop" secondary onPress={() => abort.current?.abort()} />
        </View>
      </View>
    );
  }

  if (stage === 'review' && scan) {
    const worth = scan.lines.filter((l) => l.durable);
    const rest = scan.lines.filter((l) => !l.durable);
    const check = totalCheck(scan);
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Stack.Screen options={{ title: 'Choose what to add' }} />
        <ScrollView
          style={{ backgroundColor: c.background }}
          contentContainerStyle={{ paddingTop: Spacing.lg, paddingBottom: 140 }}
          keyboardShouldPersistTaps="handled">
          <Section footer={scan.date ? undefined : 'No date on the receipt, so today’s date is used. You can change it on each item.'}>
            <Row label="Store">
              <TextInput
                value={scan.store}
                onChangeText={(store) => setScan({ ...scan, store })}
                placeholder="Store"
                placeholderTextColor={c.textTertiary}
                style={[styles.input, { color: c.text }]}
                accessibilityLabel="Store"
              />
            </Row>
            <Row label="Purchased" value={scan.date ? formatDate(scan.date, region) : 'Today'} last />
          </Section>

          {worth.length > 0 ? (
            <Section title={`Found ${worth.length} item${worth.length === 1 ? '' : 's'}`}>
              {worth.map((l, i) => (
                <LineRow key={l.key} line={l} on={selected.has(l.key)} last={i === worth.length - 1} onToggle={toggle} onChange={updateLine} region={region} />
              ))}
            </Section>
          ) : null}

          {rest.length > 0 ? (
            <Section
              title="Probably not worth tracking"
              footer="Groceries, supplies, fees and the like. Tick any you do want to keep track of.">
              {rest.map((l, i) => (
                <LineRow key={l.key} line={l} on={selected.has(l.key)} last={i === rest.length - 1} onToggle={toggle} onChange={updateLine} region={region} />
              ))}
            </Section>
          ) : null}

          <AppText variant="footnote" color={c.textSecondary} style={styles.note}>
            {check === 'missing-lines'
              ? `These add up to well under the receipt total of ${formatMoney(scan.total, region)}, so some lines may have been missed. Add those by hand.`
              : 'Prices are before tax. Each item gets this receipt photo, and you can add a photo, serial number and warranty to each one later.'}
          </AppText>
        </ScrollView>
        <View style={[styles.footer, { backgroundColor: c.background, borderTopColor: c.separator }]}>
          {saving ? (
            <ActivityIndicator color={c.ink} />
          ) : (
            <PrimaryButton
              label={selected.size === 0 ? 'Tick the items to add' : `Add ${selected.size} item${selected.size === 1 ? '' : 's'}`}
              icon="add"
              onPress={() => void add()}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={styles.start}>
      <View style={[styles.badge, { backgroundColor: c.ink }]}>
        <Ionicons name="receipt-outline" size={34} color={c.onInk} />
      </View>
      <AppText variant="largeTitle" style={{ textAlign: 'center' }}>
        Scan a receipt
      </AppText>
      <AppText variant="body" color={c.textSecondary} style={{ textAlign: 'center', lineHeight: 23 }}>
        Snap or choose a photo of a receipt. Every product on it is listed separately, and you tick the ones to add.
      </AppText>
      {error ? (
        <AppText variant="subhead" color={c.red} style={{ textAlign: 'center' }}>
          {error}
        </AppText>
      ) : null}
      <View style={{ alignSelf: 'stretch', gap: Spacing.sm, marginTop: Spacing.lg }}>
        {available === null ? (
          <ActivityIndicator color={c.ink} />
        ) : available ? (
          <PrimaryButton label="Take or choose a photo" icon="camera" onPress={() => void start()} />
        ) : (
          <AppText variant="subhead" color={c.textSecondary} style={{ textAlign: 'center' }}>
            {readerErrorMessage({ code: 'unavailable' })}
          </AppText>
        )}
        <PrimaryButton label="Add one item by hand" secondary onPress={() => router.replace('/item/edit')} />
      </View>
      {available ? (
        <AppText variant="footnote" color={c.textTertiary} style={{ textAlign: 'center', marginTop: Spacing.md }}>
          Claude reads the photo. You’ll be asked to allow it the first time.
        </AppText>
      ) : null}
    </ScrollView>
  );
}

function LineRow({
  line,
  on,
  last,
  region,
  onToggle,
  onChange,
}: {
  line: ReceiptLine;
  on: boolean;
  last: boolean;
  region: 'AU' | 'US';
  onToggle: (key: string) => void;
  onChange: (key: string, patch: Partial<ReceiptLine>) => void;
}) {
  const c = useColors();
  const [price, setPrice] = useState(line.price != null ? line.price.toFixed(2) : '');
  return (
    <View style={[styles.line, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.separator }]}>
      <Pressable
        onPress={() => onToggle(line.key)}
        hitSlop={10}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: on }}
        accessibilityLabel={line.name}
        style={[styles.check, { borderColor: on ? c.ink : c.textTertiary, backgroundColor: on ? c.ink : 'transparent' }]}>
        {on ? <Ionicons name="checkmark" size={15} color={c.onInk} /> : null}
      </Pressable>
      <View style={{ flex: 1, gap: 2, opacity: on ? 1 : 0.55 }}>
        <TextInput
          value={line.name}
          onChangeText={(name) => onChange(line.key, { name })}
          style={[styles.name, { color: c.text }]}
          accessibilityLabel="Item name"
        />
        <AppText variant="caption" color={c.textSecondary} numberOfLines={1}>
          {[categoryInfo(line.category).label, line.model].filter(Boolean).join(' · ')}
        </AppText>
      </View>
      <TextInput
        value={price}
        onChangeText={(t) => {
          setPrice(t);
          onChange(line.key, { price: parsePrice(t) });
        }}
        placeholder={region === 'AU' ? 'A$' : '$'}
        placeholderTextColor={c.textTertiary}
        keyboardType="decimal-pad"
        style={[styles.price, { color: c.text, opacity: on ? 1 : 0.55 }]}
        accessibilityLabel={`Price of ${line.name}`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  start: { padding: Spacing.xl, paddingTop: Spacing.xxl * 2, alignItems: 'center', gap: Spacing.md },
  badge: { width: 76, height: 76, borderRadius: 24, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, padding: Spacing.xl },
  preview: { width: 150, height: 200, borderRadius: Radius.lg, marginBottom: Spacing.lg, opacity: 0.9 },
  input: { flex: 1, textAlign: 'right', fontSize: 17, paddingVertical: 4 },
  line: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 12, paddingHorizontal: Spacing.lg },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 16, fontWeight: '600', paddingVertical: 0 },
  price: { width: 84, textAlign: 'right', fontSize: 16, fontVariant: ['tabular-nums'], paddingVertical: 4 },
  note: { paddingHorizontal: Spacing.xl, lineHeight: 18 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: Spacing.lg, paddingBottom: Spacing.xl, borderTopWidth: StyleSheet.hairlineWidth },
});
