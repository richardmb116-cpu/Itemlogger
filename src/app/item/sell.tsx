import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native';

import { ItemThumb } from '@/components/item-bits';
import { AppText, PrimaryButton, Row, Section } from '@/components/ui';
import { Radius, Spacing, useColors } from '@/constants/theme';
import { todayISO } from '@/lib/dates';
import { formatMoney, parsePrice } from '@/lib/format';
import { buildListing, listingText } from '@/lib/listing';
import { useStore } from '@/lib/store';
import { CURVES, conditionInfo, formatAge, suggestedAskingPrice, valueItem, WARRANTY_BONUS } from '@/lib/valuation';

export default function SellScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors();
  const { getItem, saveItem, settings } = useStore();
  const item = getItem(id);
  const region = settings.taxRegion;

  const valuation = useMemo(() => (item ? valueItem(item) : null), [item]);
  const [asking, setAsking] = useState(valuation ? String(suggestedAskingPrice(valuation)) : '');
  const askingPrice = parsePrice(asking);

  const generated = useMemo(() => (item ? buildListing(item, askingPrice, region) : null), [item, askingPrice, region]);
  const [title, setTitle] = useState(generated?.title ?? '');
  const [body, setBody] = useState(generated?.body ?? '');
  const [bodyEdited, setBodyEdited] = useState(false);
  const [bodyHeight, setBodyHeight] = useState(160);
  // Keep the listing in step with the asking price until the user edits the text themselves.
  useEffect(() => {
    if (generated && !bodyEdited) setBody(generated.body);
  }, [generated, bodyEdited]);

  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 2500);
    return () => clearTimeout(t);
  }, [notice]);

  const [markingSold, setMarkingSold] = useState(false);
  const [soldFor, setSoldFor] = useState(asking);

  if (!item) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <AppText color={c.textSecondary}>This item no longer exists.</AppText>
      </View>
    );
  }

  const text = listingText({ title, body });
  const curve = CURVES[item.category];

  const copy = async () => {
    try {
      await Clipboard.setStringAsync(text);
      setNotice('Listing copied. Paste it into Marketplace, Gumtree or eBay.');
    } catch {
      setNotice('Could not copy. Select the text above and copy it instead.');
    }
  };

  const share = async () => {
    try {
      await Share.share(
        Platform.OS === 'ios' && item.photoUri ? { message: text, url: item.photoUri } : { message: text, title },
      );
    } catch {
      await copy();
    }
  };

  const confirmSold = () => {
    saveItem({ ...item, sold: { price: parsePrice(soldFor), date: todayISO() }, updatedAt: new Date().toISOString() });
    router.back();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen
        options={{
          title: 'Sell',
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
        {/* What's being sold */}
        <View style={styles.summary}>
          <ItemThumb item={item} size={64} radius={Radius.lg} />
          <View style={{ flex: 1 }}>
            <AppText variant="headline" numberOfLines={1}>
              {item.name}
            </AppText>
            <AppText variant="footnote" color={c.textSecondary}>
              Paid {formatMoney(item.price, region)}
              {valuation ? ` · ${formatAge(valuation.ageYears)} old` : ''}
            </AppText>
          </View>
        </View>

        {/* Estimate */}
        {valuation ? (
          <View style={[styles.valueCard, { backgroundColor: c.card }]}>
            <AppText variant="footnote" color={c.textSecondary} style={{ fontWeight: '600' }}>
              ESTIMATED RESALE VALUE
            </AppText>
            <AppText style={styles.bigValue}>{formatMoney(valuation.estimate, region)}</AppText>
            <AppText variant="subhead" color={c.textSecondary}>
              Likely {formatMoney(valuation.low, region)} – {formatMoney(valuation.high, region)}
            </AppText>
            <View style={styles.valueStats}>
              <ValueStat
                icon="trending-down"
                color={c.red}
                label="Lost since purchase"
                value={`${formatMoney(valuation.lost, region)} (${Math.round(valuation.lostShare * 100)}%)`}
              />
              <ValueStat
                icon="hourglass-outline"
                color={c.orange}
                label="If you wait a year"
                value={`about ${formatMoney(valuation.inAYear, region)}`}
              />
            </View>
          </View>
        ) : (
          <Section>
            <Row
              label="Add the price you paid to get an estimate"
              icon="pricetag-outline"
              chevron
              last
              onPress={() => router.push({ pathname: '/item/edit', params: { id: item.id } })}
            />
          </Section>
        )}

        {valuation ? (
          <Section title="How it's worked out" footer={`${curve.note}. An estimate from typical resale prices, not a live market price.`}>
            <Row label="Age" value={formatAge(valuation.ageYears)} />
            <Row label="Condition" value={conditionInfo(item.condition).label} />
            <Row
              label="Warranty"
              value={valuation.warrantyBonus ? `Still covered (+${Math.round(WARRANTY_BONUS * 100)}%)` : 'Not covered'}
              last
            />
          </Section>
        ) : null}

        <Section title="Asking price" footer={valuation ? 'Starts at the top of the likely range, to leave room to haggle.' : undefined}>
          <Row label="Ask for" last>
            <TextInput
              value={asking}
              onChangeText={setAsking}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={c.textTertiary}
              style={[styles.input, { color: c.text, textAlign: 'right' }]}
              accessibilityLabel="Asking price"
            />
          </Row>
        </Section>

        <Section title="Listing" footer="Your serial number is left out on purpose. Share it with a buyer once they're serious.">
          <TextInput
            value={title}
            onChangeText={setTitle}
            style={[styles.titleInput, { color: c.text, borderBottomColor: c.separator }]}
            accessibilityLabel="Listing title"
          />
          <TextInput
            value={body}
            onChangeText={(t) => {
              setBody(t);
              setBodyEdited(true);
            }}
            multiline
            scrollEnabled={false}
            onContentSizeChange={(e) => {
              // Grow with the text. contentSize already includes padding; ignore tiny changes so it settles.
              const next = Math.max(160, Math.ceil(e.nativeEvent.contentSize.height));
              setBodyHeight((h) => (Math.abs(h - next) > 2 ? next : h));
            }}
            style={[styles.bodyInput, { color: c.text, height: bodyHeight }]}
            accessibilityLabel="Listing description"
          />
        </Section>

        <View style={styles.actions}>
          <PrimaryButton label="Share listing" icon="share-outline" onPress={share} />
          <PrimaryButton label="Copy text" icon="copy-outline" onPress={copy} secondary />
          {notice ? (
            <AppText variant="footnote" color={c.green} style={{ textAlign: 'center' }} accessibilityLiveRegion="polite">
              {notice}
            </AppText>
          ) : null}
        </View>

        <Section title="Already sold it?">
          {markingSold ? (
            <>
              <Row label="Sold for">
                <TextInput
                  value={soldFor}
                  onChangeText={setSoldFor}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={c.textTertiary}
                  style={[styles.input, { color: c.text, textAlign: 'right' }]}
                  autoFocus
                  accessibilityLabel="Sale price"
                />
              </Row>
              <Row label="Save sale" icon="checkmark-circle" last onPress={confirmSold} />
            </>
          ) : (
            <Row label="Mark as sold" icon="bag-check-outline" chevron last onPress={() => setMarkingSold(true)} />
          )}
        </Section>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ValueStat({
  icon,
  color,
  label,
  value,
}: {
  icon: 'trending-down' | 'hourglass-outline';
  color: string;
  label: string;
  value: string;
}) {
  const c = useColors();
  return (
    <View style={[styles.valueStat, { backgroundColor: c.raised }]}>
      <Ionicons name={icon} size={18} color={color} />
      <AppText variant="caption" color={c.textSecondary}>
        {label}
      </AppText>
      <AppText variant="subhead" style={{ fontWeight: '600', fontVariant: ['tabular-nums'] }}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  summary: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg },
  valueCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
    borderRadius: Radius.xxl,
    borderCurve: 'continuous',
    padding: Spacing.xl,
    gap: 2,
  },
  bigValue: { fontSize: 40, fontWeight: '700', letterSpacing: -1, fontVariant: ['tabular-nums'], marginTop: 2 },
  valueStats: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  valueStat: { flex: 1, borderRadius: Radius.lg, borderCurve: 'continuous', padding: Spacing.md, gap: 2 },
  input: { flex: 1, fontSize: 17, paddingVertical: 0, minWidth: 100 },
  titleInput: {
    fontSize: 17,
    fontWeight: '600',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  bodyInput: { minHeight: 160, fontSize: 16, lineHeight: 22, padding: Spacing.lg, textAlignVertical: 'top' },
  actions: { gap: Spacing.sm, paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl },
});
