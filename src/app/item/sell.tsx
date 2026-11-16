import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native';

import { ItemThumb } from '@/components/item-bits';
import { LinkRow } from '@/components/link-row';
import { SellAdvice } from '@/components/sell-advice';
import { AppText, PrimaryButton, Row, Section } from '@/components/ui';
import { Radius, Spacing, useColors } from '@/constants/theme';
import { todayISO } from '@/lib/dates';
import { formatMoney, parsePrice } from '@/lib/format';
import { buildListing, listingText } from '@/lib/listing';
import { marketLinks, searchQuery, type MarketLink } from '@/lib/market-links';
import { useStore } from '@/lib/store';
import { profileFor, type Evidence } from '@/lib/lifecycle';
import { repairAdvice, sellPlan } from '@/lib/upgrade';
import {
  checkedAgo,
  conditionInfo,
  currentValue,
  formatAge,
  roundPrice,
  suggestedAskingPrice,
  valueItem,
  warrantyBonusAt,
  type CurrentValue,
} from '@/lib/valuation';

const EVIDENCE_FOOTER: Record<Evidence, string> = {
  measured: 'Based on measured resale prices.',
  rule: 'Based on an industry rule of thumb.',
  inferred: 'Estimated from similar items.',
};

const LINK_ICONS: Record<MarketLink['id'], 'pricetags-outline' | 'storefront-outline' | 'search-outline'> = {
  ebay: 'pricetags-outline',
  facebook: 'storefront-outline',
  gumtree: 'search-outline',
};

/** Start a little above what similar ones sold for, or at the top of the estimated range. */
function startingAsk(cv: CurrentValue | null): string {
  if (!cv) return '';
  if (cv.source === 'checked') return String(roundPrice(cv.amount * 1.1));
  return cv.valuation ? String(suggestedAskingPrice(cv.valuation)) : '';
}

export default function SellScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors();
  const { getItem, saveItem, settings } = useStore();
  const item = getItem(id);
  const region = settings.taxRegion;

  const valuation = useMemo(() => (item ? valueItem(item) : null), [item]);
  const current = useMemo(() => (item ? currentValue(item) : null), [item]);
  const [asking, setAsking] = useState(() => startingAsk(current));
  const [myPrice, setMyPrice] = useState(item?.checkedPrice ? String(item.checkedPrice.amount) : '');
  const askingPrice = parsePrice(asking);

  const generated = useMemo(() => (item ? buildListing(item, askingPrice, region) : null), [item, askingPrice, region]);
  const [title, setTitle] = useState(generated?.title ?? '');
  // The listing follows the asking price until the user edits the text themselves.
  const [editedBody, setEditedBody] = useState<string | null>(null);
  const body = editedBody ?? generated?.body ?? '';
  const [bodyHeight, setBodyHeight] = useState(160);

  const [repair, setRepair] = useState('');
  const [showWorking, setShowWorking] = useState(false);
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
  const profile = profileFor(item);
  const plan = sellPlan(item, region, settings.upgradeStyle);
  const repairQuote = parsePrice(repair);
  const repairVerdict = repairQuote != null && item.price ? repairAdvice(item, repairQuote) : null;
  const links = marketLinks(item, region);
  const myPriceValue = parsePrice(myPrice);

  const saveMyPrice = () => {
    if (myPriceValue == null) return;
    const updated = { ...item, checkedPrice: { amount: myPriceValue, checkedAt: todayISO() }, updatedAt: new Date().toISOString() };
    saveItem(updated);
    setAsking(startingAsk(currentValue(updated)));
    setNotice('Saved. Your price now replaces our estimate.');
  };

  const removeMyPrice = () => {
    const updated = { ...item, checkedPrice: null, updatedAt: new Date().toISOString() };
    saveItem(updated);
    setMyPrice('');
    setAsking(startingAsk(currentValue(updated)));
  };

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
              <AppText color={c.ink} style={{ fontWeight: '600' }}>Close</AppText>
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

        {/* Current value: your checked price, or our estimate */}
        {current ? (
          <View style={[styles.valueCard, { backgroundColor: c.card }]}>
            <AppText variant="footnote" color={c.textSecondary} style={{ fontWeight: '600' }}>
              {current.source === 'checked' ? 'YOUR CHECKED PRICE' : 'ESTIMATED RESALE VALUE'}
            </AppText>
            <AppText style={styles.bigValue}>{formatMoney(current.amount, region)}</AppText>
            {current.source === 'checked' ? (
              <AppText variant="subhead" color={current.stale ? c.orange : c.textSecondary}>
                From real listings, checked {checkedAgo(current.ageDays ?? 0)}
                {current.stale ? '. Worth checking again.' : ''}
              </AppText>
            ) : valuation ? (
              <AppText variant="subhead" color={c.textSecondary}>
                Likely {formatMoney(valuation.low, region)} – {formatMoney(valuation.high, region)}
              </AppText>
            ) : null}
            <View style={styles.valueStats}>
              {item.price != null ? (
                <ValueStat
                  icon="trending-down"
                  color={c.red}
                  label="Lost since purchase"
                  value={`${formatMoney(Math.max(0, item.price - current.amount), region)} (${Math.round(
                    (Math.max(0, item.price - current.amount) / item.price) * 100,
                  )}%)`}
                />
              ) : null}
              {current.source === 'checked' && valuation ? (
                <ValueStat icon="calculator-outline" color={c.accent} label="Our estimate" value={formatMoney(valuation.estimate, region)} />
              ) : valuation ? (
                <ValueStat
                  icon="hourglass-outline"
                  color={c.orange}
                  label="If you wait a year"
                  value={`about ${formatMoney(valuation.inAYear, region)}`}
                />
              ) : null}
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

        {plan ? <SellAdvice plan={plan} item={item} region={region} /> : null}

        {item.price ? (
          <Section
            title="Got a repair quote?"
            footer={
              repairVerdict
                ? repairVerdict.reason
                : 'Repairs are usually worth it under about half the cost of a new one, less as it ages.'
            }>
            <Row label="Repair cost" last={!repairVerdict}>
              <TextInput
                value={repair}
                onChangeText={setRepair}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={c.textTertiary}
                style={[styles.input, { color: c.text, textAlign: 'right' }]}
                accessibilityLabel="Repair quote"
              />
            </Row>
            {repairVerdict ? (
              <Row
                label={repairVerdict.repair ? 'Repair it' : 'Replace it'}
                icon={repairVerdict.repair ? 'construct-outline' : 'swap-horizontal-outline'}
                value={
                  repairVerdict.threshold > 0
                    ? `Worth it under ${formatMoney(repairVerdict.threshold, region, { cents: false })}`
                    : undefined
                }
                last
              />
            ) : null}
          </Section>
        ) : null}

        {/* Free price checks: open real listings, then type in what you see */}
        <Section
          title="Check real prices"
          footer={`Searching for "${searchQuery(item)}".${
            item.model ? '' : ' Add the make and model in Edit for closer matches.'
          } eBay's sold filter shows what it actually sold for.`}>
          {links.map((l, i) => (
            <LinkRow key={l.id} url={l.url} label={l.label} icon={LINK_ICONS[l.id]} last={i === links.length - 1} />
          ))}
        </Section>

        <Section title="Your price" footer="What similar ones sold for. It replaces our estimate everywhere in the app.">
          <Row label="Sells for about">
            <TextInput
              value={myPrice}
              onChangeText={setMyPrice}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={c.textTertiary}
              style={[styles.input, { color: c.text, textAlign: 'right' }]}
              accessibilityLabel="Your checked price"
            />
          </Row>
          <Row
            label={item.checkedPrice ? 'Update my price' : 'Use my price'}
            icon="checkmark-circle-outline"
            last={!item.checkedPrice}
            onPress={myPriceValue != null ? saveMyPrice : undefined}
          />
          {item.checkedPrice ? (
            <Row label="Go back to the estimate" icon="refresh-outline" destructive last onPress={removeMyPrice} />
          ) : null}
        </Section>

        {valuation && current?.source !== 'checked' ? (
          <Section footer={showWorking ? `${profile.note}. ${EVIDENCE_FOOTER[profile.evidence]} Not live listings.` : undefined}>
            <Row
              label="How the estimate is worked out"
              icon="calculator-outline"
              value={showWorking ? 'Hide' : undefined}
              chevron={!showWorking}
              last={!showWorking}
              onPress={() => setShowWorking((v) => !v)}
            />
            {showWorking ? (
              <>
                <Row label="Resale curve" value={profile.label} />
                <Row label="Age" value={formatAge(valuation.ageYears)} />
                <Row label="Condition" value={conditionInfo(item.condition).label} />
                <Row
                  label="Warranty"
                  value={
                    valuation.warrantyBonus
                      ? `Still covered (+${Math.round(warrantyBonusAt(item, valuation.ageYears) * 100)}%)`
                      : profile.warrantyTransferable
                        ? 'Not covered'
                        : 'Doesn’t pass to a buyer'
                  }
                  last
                />
              </>
            ) : null}
          </Section>
        ) : null}

        <Section
          title="Asking price"
          footer={
            current?.source === 'checked'
              ? 'Starts about 10% above your checked price, to leave room to haggle.'
              : current
                ? 'Starts at the top of the likely range, to leave room to haggle.'
                : undefined
          }>
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
            onChangeText={setEditedBody}
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
          {/* The iPhone share sheet already has Copy; the browser may not have a share sheet. */}
          {Platform.OS === 'web' ? <PrimaryButton label="Copy text" icon="copy-outline" onPress={copy} secondary /> : null}
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
  icon: 'trending-down' | 'hourglass-outline' | 'calculator-outline';
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
