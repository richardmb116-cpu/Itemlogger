import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { Radius, Spacing, useColors, type Palette } from '@/constants/theme';
import { categoryInfo } from '@/lib/categories';
import { formatDate, formatMoney } from '@/lib/format';
import type { Item, TaxRegion } from '@/lib/types';
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
      <AppText variant="caption" color={col.fg}>
        {status.label}
      </AppText>
    </View>
  );
}

/** Item photo on a soft grey tile, or the category icon when there's no photo. */
export function ItemThumb({
  item,
  size = 56,
  radius = Radius.md,
  onTile,
}: {
  item: Item;
  size?: number;
  radius?: number;
  /** Set when the thumbnail sits on a grey tile, so it uses a contrasting background. */
  onTile?: boolean;
}) {
  const c = useColors();
  const cat = categoryInfo(item.category);
  return (
    <View style={[styles.thumb, { width: size, height: size, borderRadius: radius, borderCurve: 'continuous', backgroundColor: onTile ? c.raised : c.card }]}>
      {item.photoUri ? (
        <Image source={{ uri: item.photoUri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
      ) : (
        <Ionicons name={cat.icon} size={size * 0.42} color={c.textSecondary} />
      )}
    </View>
  );
}

/** List row: grey image tile on the left, name, price and status on the right. */
export function ItemRow({ item, region, onPress }: { item: Item; region: TaxRegion; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.name}
      onPress={onPress}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}>
      <ItemThumb item={item} size={84} radius={Radius.lg} />
      <View style={styles.rowMiddle}>
        <AppText variant="headline" numberOfLines={1}>
          {item.name}
        </AppText>
        <AppText variant="subhead" style={{ fontVariant: ['tabular-nums'], fontWeight: '500' }}>
          {formatMoney(item.price, region)}
        </AppText>
        <AppText variant="footnote" color={c.textSecondary} numberOfLines={1}>
          {[item.store, formatDate(item.purchaseDate, region)].filter(Boolean).join(' · ')}
        </AppText>
        <View style={styles.rowBadges}>
          <WarrantyPill item={item} />
          {item.use === 'work' ? (
            <View style={[styles.pill, { backgroundColor: c.card }]}>
              <Ionicons name="briefcase" size={11} color={c.textSecondary} />
              <AppText variant="caption" color={c.textSecondary}>
                Work
              </AppText>
            </View>
          ) : null}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={c.textTertiary} />
    </Pressable>
  );
}

/** Product-style card for horizontal shelves: big image tile, name, detail line, blue pill. */
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
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.name}
      onPress={onPress}
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.7 : 1 }]}>
      <ItemThumb item={item} size={156} radius={Radius.xl} />
      <AppText variant="subhead" style={{ fontWeight: '600', marginTop: Spacing.sm }} numberOfLines={1}>
        {item.name}
      </AppText>
      <AppText variant="footnote" color={c.textSecondary} numberOfLines={1}>
        {detail}
      </AppText>
      <View style={[styles.cardPill, { backgroundColor: c.accent }]}>
        <AppText variant="caption" color={c.onAccent} style={{ fontWeight: '600' }}>
          {action}
        </AppText>
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
    borderCurve: 'continuous',
    alignSelf: 'flex-start',
  },
  thumb: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, paddingVertical: Spacing.sm },
  rowMiddle: { flex: 1, gap: 2 },
  rowBadges: { flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  card: { width: 156, gap: 2 },
  cardPill: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 999, borderCurve: 'continuous', marginTop: 6 },
});
