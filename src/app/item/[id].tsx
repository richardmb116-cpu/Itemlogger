import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { warrantyColors } from '@/components/item-bits';
import { AppText, PillButton, Row, Section } from '@/components/ui';
import { Radius, Spacing, useColors } from '@/constants/theme';
import { categoryInfo } from '@/lib/categories';
import { formatDate, formatMoney } from '@/lib/format';
import { toISODate } from '@/lib/dates';
import { planReminders } from '@/lib/reminder-plan';
import { useStore } from '@/lib/store';
import { taxYearFor } from '@/lib/tax';
import { checkedAgo, currentValue } from '@/lib/valuation';
import { warrantyLengthLabel, warrantyStatus } from '@/lib/warranty';

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { getItem, deleteItem, saveItem, settings } = useStore();
  const [viewer, setViewer] = useState<string | null>(null);
  const item = getItem(id);

  if (!item) {
    return (
      <View style={[styles.missing, { backgroundColor: c.background }]}>
        <AppText color={c.textSecondary}>This item no longer exists.</AppText>
      </View>
    );
  }

  const region = settings.taxRegion;
  const cat = categoryInfo(item.category);
  const status = warrantyStatus(item);
  const col = warrantyColors(status.state, c);
  const taxYear = taxYearFor(item.purchaseDate, region);
  const nextReminder = settings.remindersEnabled ? planReminders([item], settings.reminderDays)[0] : undefined;
  const edit = () => router.push({ pathname: '/item/edit', params: { id: item.id } });
  const sell = () => router.push({ pathname: '/item/sell', params: { id: item.id } });
  const value = item.sold ? null : currentValue(item);
  // Share of the purchase price it has lost, when the price paid is known.
  const lostShare = value && item.price ? Math.max(0, item.price - value.amount) / item.price : null;
  const undoSold = () => saveItem({ ...item, sold: null, updatedAt: new Date().toISOString() });

  const confirmDelete = () => {
    const doDelete = () => {
      deleteItem(item.id);
      router.back();
    };
    // The web preview can't show native dialogs, so it deletes straight away.
    if (Platform.OS === 'web') return doDelete();
    Alert.alert(`Delete ${item.name}?`, 'Its photos and receipt will be removed from this phone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: doDelete },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <Stack.Screen options={{ title: '' }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}>
        {/* Product image on a soft grey tile */}
        <Pressable
          disabled={!item.photoUri}
          onPress={() => setViewer(item.photoUri)}
          accessibilityLabel="View photo"
          style={[styles.hero, { backgroundColor: c.card }]}>
          {item.photoUri ? (
            <Image source={{ uri: item.photoUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <Ionicons name={cat.icon} size={96} color={c.textSecondary} />
          )}
        </Pressable>

        <View style={styles.headline}>
          <AppText style={styles.title}>{item.name}</AppText>
          <AppText variant="subhead" color={c.textSecondary}>
            {cat.label}
            {item.store ? ` · Bought at ${item.store}` : ''}
          </AppText>
        </View>

        {/* Outlined info pills, like the storage picker */}
        <View style={styles.pills}>
          <InfoPill icon="calendar-outline" label={formatDate(item.purchaseDate, region)} />
          <InfoPill icon="document-text-outline" label={taxYear.label} />
          <InfoPill icon={item.use === 'work' ? 'briefcase-outline' : 'home-outline'} label={item.use === 'work' ? 'Work' : 'Personal'} />
        </View>

        {item.sold ? (
          <View style={[styles.soldBanner, { backgroundColor: c.greenSoft }]}>
            <Ionicons name="bag-check" size={20} color={c.green} />
            <AppText variant="subhead" style={{ flex: 1, fontWeight: '600' }}>
              Sold{item.sold.price != null ? ` for ${formatMoney(item.sold.price, region)}` : ''} on {formatDate(item.sold.date, region)}
            </AppText>
            <AppText variant="subhead" color={c.accent} onPress={undoSold} suppressHighlighting>
              Undo
            </AppText>
          </View>
        ) : null}

        {/* Resale value */}
        {value ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="See resale estimate"
            onPress={sell}
            style={({ pressed }) => [styles.warrantyCard, { backgroundColor: c.card, opacity: pressed ? 0.8 : 1 }]}>
            <View style={styles.warrantyTop}>
              <View style={[styles.warrantyIcon, { backgroundColor: c.accentSoft }]}>
                <Ionicons name="pricetag" size={20} color={c.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="headline">Worth about {formatMoney(value.amount, region)}</AppText>
                <AppText variant="footnote" color={value.stale ? c.orange : c.textSecondary}>
                  {value.source === 'checked'
                    ? `Your price from real listings, checked ${checkedAgo(value.ageDays ?? 0)}${value.stale ? '. Check again?' : ''}`
                    : `${lostShare != null ? `Down ${Math.round(lostShare * 100)}% since you bought it · ` : ''}estimate, likely ${formatMoney(
                        value.valuation!.low,
                        region,
                      )}–${formatMoney(value.valuation!.high, region)}`}
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={c.textTertiary} />
            </View>
            {lostShare != null ? (
              <View style={[styles.track, { backgroundColor: c.raised }]}>
                <View style={[styles.trackFill, { width: `${Math.round((1 - lostShare) * 100)}%`, backgroundColor: c.accent }]} />
              </View>
            ) : null}
          </Pressable>
        ) : null}

        {/* Warranty */}
        <View style={[styles.warrantyCard, { backgroundColor: c.card }]}>
          <View style={styles.warrantyTop}>
            <View style={[styles.warrantyIcon, { backgroundColor: col.bg }]}>
              <Ionicons name={col.icon} size={22} color={col.fg} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="headline">{status.label}</AppText>
              <AppText variant="footnote" color={c.textSecondary}>
                {status.expires
                  ? `${warrantyLengthLabel(item.warrantyMonths)} warranty · ${status.state === 'expired' ? 'ended' : 'ends'} ${formatDate(status.expires, region)}`
                  : 'Add a warranty length to get reminders.'}
              </AppText>
            </View>
          </View>
          {status.expires ? (
            <View style={[styles.track, { backgroundColor: c.raised }]}>
              <View style={[styles.trackFill, { width: `${Math.round(status.progress * 100)}%`, backgroundColor: col.fg }]} />
            </View>
          ) : null}
          {nextReminder ? (
            <View style={styles.reminderLine}>
              <Ionicons name="notifications" size={14} color={c.accent} />
              <AppText variant="footnote" color={c.textSecondary}>
                Next reminder {formatDate(toISODate(nextReminder.date), region)}
              </AppText>
            </View>
          ) : null}
        </View>

        <Section title="Details">
          <Row label="Purchased" value={formatDate(item.purchaseDate, region, 'long')} />
          <Row label="Model" value={item.model || '—'} />
          <Row label="Store" value={item.store || '—'} />
          <Row label="Serial number" value={item.serial || '—'} />
          <Row label="Category" value={cat.label} last />
        </Section>

        <Section title="Receipt">
          {item.receiptUri ? (
            <Pressable onPress={() => setViewer(item.receiptUri)} accessibilityRole="imagebutton" accessibilityLabel="View receipt">
              <Image source={{ uri: item.receiptUri }} style={styles.receipt} contentFit="cover" />
            </Pressable>
          ) : (
            <Row label="Add a receipt photo" icon="receipt-outline" chevron last onPress={edit} />
          )}
        </Section>

        {item.notes ? (
          <Section title="Notes">
            <AppText style={{ padding: Spacing.lg }}>{item.notes}</AppText>
          </Section>
        ) : null}

        <Section>
          <Row label="Delete item" icon="trash-outline" destructive last onPress={confirmDelete} />
        </Section>
      </ScrollView>

      {/* Price bar, like "Buy now" */}
      <View
        style={[
          styles.bottomBar,
          { backgroundColor: c.background, borderTopColor: c.separator, paddingBottom: Math.max(insets.bottom, Spacing.lg) },
        ]}>
        <View style={{ flex: 1 }}>
          <AppText variant="footnote" color={c.textSecondary}>
            {item.sold ? 'Sold for' : value ? `Worth about · paid ${formatMoney(item.price, region)}` : 'Paid'}
          </AppText>
          <AppText variant="title2" style={{ fontVariant: ['tabular-nums'] }}>
            {item.sold
              ? formatMoney(item.sold.price, region)
              : value
                ? formatMoney(value.amount, region)
                : formatMoney(item.price, region, { cents: true })}
          </AppText>
        </View>
        <PillButton label="Edit" size="lg" secondary onPress={edit} />
        {item.sold ? null : <PillButton label="Sell" size="lg" onPress={sell} />}
      </View>

      <Modal visible={!!viewer} transparent animationType="fade" onRequestClose={() => setViewer(null)}>
        <Pressable style={styles.viewer} onPress={() => setViewer(null)} accessibilityLabel="Close photo">
          {viewer ? <Image source={{ uri: viewer }} style={StyleSheet.absoluteFill} contentFit="contain" /> : null}
          <View style={[styles.viewerClose, { top: insets.top + 12 }]}>
            <Ionicons name="close" size={22} color="#fff" />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function InfoPill({ icon, label }: { icon: ComponentProps<typeof Ionicons>['name']; label: string }) {
  const c = useColors();
  return (
    <View style={[styles.pill, { borderColor: c.separator }]}>
      <Ionicons name={icon} size={14} color={c.textSecondary} />
      <AppText variant="footnote" style={{ fontWeight: '600' }}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.sm,
    height: 300,
    borderRadius: Radius.xxl,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  headline: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, paddingBottom: Spacing.md, gap: 4 },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, paddingHorizontal: Spacing.xl, marginBottom: Spacing.xl },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    borderCurve: 'continuous',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  warrantyCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.xl, borderRadius: Radius.xl, borderCurve: 'continuous', padding: Spacing.lg, gap: Spacing.md },
  warrantyTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  warrantyIcon: { width: 44, height: 44, borderRadius: 22, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  track: { height: 6, borderRadius: 3, borderCurve: 'continuous', overflow: 'hidden' },
  trackFill: { height: 6, borderRadius: 3, borderCurve: 'continuous' },
  soldBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
  },
  reminderLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  receipt: { height: 220, width: '100%' },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  viewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' },
  viewerClose: {
    position: 'absolute',
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
