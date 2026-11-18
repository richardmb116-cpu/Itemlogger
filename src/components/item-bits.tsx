import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { OnPhoto, Radius, Spacing, useColors, type Palette } from '@/constants/theme';
import { ageOf } from '@/lib/birthdays';
import { formatDate, formatMoney } from '@/lib/format';
import { itemPhoto } from '@/lib/photos';
import type { Item, TaxRegion } from '@/lib/types';
import { returnStatus } from '@/lib/returns';
import type { SellStatus } from '@/lib/upgrade';
import { currentValue } from '@/lib/valuation';
import { warrantyStatus, type WarrantyState } from '@/lib/warranty';

export function warrantyColors(state: WarrantyState, c: Palette) {
  switch (state) {
    case 'active':
      return { fg: c.green, bg: c.greenSoft, icon: 'shield-checkmark' as const };
    case 'expiring':
      return { fg: c.orange, bg: c.orangeSoft, icon: 'time' as const };
    case 'expired':
      return { fg: c.red, bg: c.redSoft, icon: 'shield-outline' as const };
    default:
      return { fg: c.grey, bg: c.greySoft, icon: 'remove-circle-outline' as const };
  }
}

export function WarrantyPill({ item }: { item: Item }) {
  const c = useColors();
  const status = warrantyStatus(item);
  const col = warrantyColors(status.state, c);
  return (
    <View style={[styles.pill, { backgroundColor: col.bg }]}>
      <Ionicons name={col.icon} size={12} color={col.fg} />
      <AppText variant="caption" color={col.fg} style={{ fontWeight: '600' }}>
        {status.label}
      </AppText>
    </View>
  );
}

/** Shown in the last week of a store's return window. */
function ReturnPill({ item }: { item: Item }) {
  const c = useColors();
  const days = returnStatus(item).daysLeft ?? 0;
  return (
    <View style={[styles.pill, { backgroundColor: c.orangeSoft }]}>
      <Ionicons name="return-down-back" size={11} color={c.orange} />
      <AppText variant="caption" color={c.orange} style={{ fontWeight: '600' }}>
        {days === 0 ? 'Last day to return' : `Return: ${days}d left`}
      </AppText>
    </View>
  );
}

/** Shown on items in (or past) their best time to sell. */
function SellPill({ late }: { late: boolean }) {
  const c = useColors();
  const fg = late ? c.orange : c.green;
  return (
    <View style={[styles.pill, { backgroundColor: late ? c.orangeSoft : c.greenSoft }]}>
      <Ionicons name="pricetag" size={11} color={fg} />
      <AppText variant="caption" color={fg} style={{ fontWeight: '600' }}>
        {late ? 'Sell soon' : 'Good time to sell'}
      </AppText>
    </View>
  );
}

/** The item's photo, or a photo for its category, cropped to a rounded square. */
export function ItemThumb({
  item,
  size = 56,
  radius = Radius.md,
}: {
  item: Item;
  size?: number;
  radius?: number;
  /** Kept for older call sites; photos no longer need a contrasting tile. */
  onTile?: boolean;
}) {
  const c = useColors();
  const photo = itemPhoto(item);
  return (
    <View style={[styles.thumb, { width: size, height: size, borderRadius: radius, backgroundColor: c.card }]}>
      <Image source={photo.source} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
    </View>
  );
}

/** List row: photo on the left, name, price and status on the right. */
export function ItemRow({
  item,
  region,
  sellStatus,
  onPress,
}: {
  item: Item;
  region: TaxRegion;
  /** From the sell planner; only "window" and "late" show a pill. */
  sellStatus?: SellStatus;
  onPress: () => void;
}) {
  const c = useColors();
  const worth = item.sold ? null : (currentValue(item)?.amount ?? null);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.name}
      onPress={onPress}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}>
      <ItemThumb item={item} size={80} radius={Radius.lg} />
      <View style={styles.rowMiddle}>
        <AppText variant="headline" numberOfLines={1}>
          {item.name}
        </AppText>
        <AppText variant="subhead" color={c.textSecondary} numberOfLines={1}>
          {[item.sold ? formatDate(item.purchaseDate, region) : ageOf(item.purchaseDate).label, item.store]
            .filter(Boolean)
            .join(' · ')}
        </AppText>
        <View style={styles.rowBadges}>
          {returnStatus(item).state === 'closing' ? <ReturnPill item={item} /> : null}
          {sellStatus === 'window' || sellStatus === 'late' ? <SellPill late={sellStatus === 'late'} /> : null}
          {item.sold ? null : <WarrantyPill item={item} />}
          {item.use === 'work' ? (
            <View style={[styles.pill, { backgroundColor: c.card }]}>
              <Ionicons name="briefcase" size={11} color={c.textSecondary} />
              <AppText variant="caption" color={c.textSecondary} style={{ fontWeight: '600' }}>
                Work
              </AppText>
            </View>
          ) : null}
        </View>
      </View>
      <View style={styles.rowRight}>
        <AppText variant="headline" style={{ fontVariant: ['tabular-nums'] }}>
          {item.sold ? formatMoney(item.sold.price, region) : formatMoney(worth ?? item.price, region)}
        </AppText>
        <AppText variant="caption" color={c.textTertiary}>
          {item.sold ? 'sold' : worth != null ? 'worth today' : 'paid'}
        </AppText>
      </View>
    </Pressable>
  );
}

/** Tall photo card for horizontal shelves, with the text laid over a soft gradient. */
export function ItemCard({
  item,
  detail,
  action,
  onPress,
}: {
  item: Item;
  detail: string;
  action: string;
  onPress: () => void;
}) {
  const photo = itemPhoto(item);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${detail}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
      <Image source={photo.source} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
      <LinearGradient colors={OnPhoto.scrim} locations={[0.35, 0.6, 1]} style={StyleSheet.absoluteFill} />
      <View style={styles.cardText}>
        <AppText variant="headline" color={OnPhoto.text} numberOfLines={2}>
          {item.name}
        </AppText>
        <AppText variant="footnote" color={OnPhoto.textSecondary} numberOfLines={1}>
          {detail}
        </AppText>
        <View style={styles.cardPill}>
          <AppText variant="caption" color={OnPhoto.text} style={{ fontWeight: '700' }}>
            {action}
          </AppText>
          <Ionicons name="arrow-forward" size={12} color={OnPhoto.text} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  thumb: { overflow: 'hidden', borderCurve: 'continuous' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, paddingVertical: Spacing.md },
  rowMiddle: { flex: 1, gap: 3 },
  rowRight: { alignItems: 'flex-end', gap: 2 },
  rowBadges: { flexDirection: 'row', gap: 6, marginTop: 5, flexWrap: 'wrap' },
  card: {
    width: 200,
    height: 260,
    borderRadius: Radius.xl,
    borderCurve: 'continuous',
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  cardText: { padding: Spacing.lg, gap: 3 },
  cardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: Spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: OnPhoto.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: OnPhoto.glassBorder,
  },
});
