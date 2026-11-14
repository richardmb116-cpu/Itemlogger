import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState, type ComponentProps } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ItemCard, ItemRow } from '@/components/item-bits';
import { AppText, Chip, IconButton, PrimaryButton, SectionHeading, tap } from '@/components/ui';
import { Radius, Spacing, useColors } from '@/constants/theme';
import { CATEGORIES, categoryInfo } from '@/lib/categories';
import { formatMoney } from '@/lib/format';
import { sortItems, useStore } from '@/lib/store';
import type { Category, ItemUse } from '@/lib/types';
import { warrantyStatus } from '@/lib/warranty';

export default function ItemsScreen() {
  const c = useColors();
  const { items, settings } = useStore();
  const region = settings.taxRegion;
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [use, setUse] = useState<ItemUse | null>(null);

  const sorted = useMemo(() => sortItems(items), [items]);
  const statuses = useMemo(() => new Map(items.map((i) => [i.id, warrantyStatus(i)])), [items]);

  const expiring = sorted
    .filter((i) => statuses.get(i.id)?.state === 'expiring')
    .sort((a, b) => (statuses.get(a.id)?.daysLeft ?? 0) - (statuses.get(b.id)?.daysLeft ?? 0));
  const covered = items.filter((i) => {
    const s = statuses.get(i.id)?.state;
    return s === 'active' || s === 'expiring';
  }).length;
  const total = items.reduce((sum, i) => sum + (i.price ?? 0), 0);
  const usedCategories = CATEGORIES.filter((cat) => items.some((i) => i.category === cat.id));

  const q = query.trim().toLowerCase();
  const visible = sorted.filter((item) => {
    if (category && item.category !== category) return false;
    if (use && item.use !== use) return false;
    if (!q) return true;
    return [item.name, item.store, item.serial, categoryInfo(item.category).label, item.notes]
      .join(' ')
      .toLowerCase()
      .includes(q);
  });

  const addItem = () => router.push('/item/edit');
  const open = (id: string) => router.push(`/item/${id}`);
  const browsing = !q;

  if (items.length === 0) {
    return (
      <SafeAreaView edges={['top']} style={[styles.flex, { backgroundColor: c.background }]}>
        <View style={styles.topBar}>
          <AppText variant="largeTitle">My Items</AppText>
        </View>
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: c.card }]}>
            <Ionicons name="shield-checkmark" size={48} color={c.accent} />
          </View>
          <AppText variant="title2" style={{ textAlign: 'center' }}>
            Your home, on record
          </AppText>
          <AppText color={c.textSecondary} style={{ textAlign: 'center', lineHeight: 23 }}>
            Snap an item and its receipt. We&apos;ll keep track of warranties, serial numbers and tax years for you.
          </AppText>
          <View style={{ alignSelf: 'stretch', marginTop: Spacing.md }}>
            <PrimaryButton label="Add your first item" icon="camera" onPress={addItem} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const header = (
    <View>
      <View style={styles.topBar}>
        <AppText variant="largeTitle" style={{ flex: 1 }}>
          My Items
        </AppText>
        <IconButton
          icon={searching ? 'close' : 'search'}
          label={searching ? 'Close search' : 'Search'}
          onPress={() => {
            setSearching((s) => !s);
            setQuery('');
          }}
        />
        <IconButton icon="add" label="Add item" onPress={addItem} filled />
      </View>

      {searching ? (
        <View style={[styles.search, { backgroundColor: c.card }]}>
          <Ionicons name="search" size={18} color={c.textSecondary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search name, store, serial"
            placeholderTextColor={c.textSecondary}
            style={[styles.searchInput, { color: c.text }]}
            autoFocus
            clearButtonMode="while-editing"
            returnKeyType="search"
            autoCorrect={false}
          />
        </View>
      ) : null}

      {browsing ? (
        <>
          {/* Hero banner */}
          <View style={[styles.hero, { backgroundColor: c.card }]}>
            <AppText variant="footnote" color={c.textSecondary} style={{ fontWeight: '600' }}>
              HOME INVENTORY
            </AppText>
            <AppText style={styles.heroValue}>{formatMoney(total, region, { cents: false })}</AppText>
            <AppText variant="subhead" color={c.textSecondary}>
              Total value of {items.length} item{items.length === 1 ? '' : 's'}
            </AppText>
            <View style={styles.heroStats}>
              <HeroStat icon="shield-checkmark" color={c.green} value={covered} label="Covered" />
              <HeroStat icon="time" color={c.orange} value={expiring.length} label="Expiring" />
              <HeroStat icon="briefcase" color={c.accent} value={items.filter((i) => i.use === 'work').length} label="Work" />
            </View>
          </View>

          {/* Browse by category */}
          <SectionHeading title="Browse by category" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
            <CategoryBubble icon="apps" label="All" selected={category === null} onPress={() => setCategory(null)} />
            {usedCategories.map((cat) => (
              <CategoryBubble
                key={cat.id}
                icon={cat.icon}
                label={cat.label.split(' ')[0]}
                selected={category === cat.id}
                onPress={() => setCategory(category === cat.id ? null : cat.id)}
              />
            ))}
          </ScrollView>

          {/* Expiring shelf */}
          {expiring.length > 0 && !category && !use ? (
            <>
              <SectionHeading title="Expiring soon" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shelf}>
                {expiring.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    detail={statuses.get(item.id)?.label ?? ''}
                    action="Review"
                    onPress={() => open(item.id)}
                  />
                ))}
              </ScrollView>
            </>
          ) : null}
        </>
      ) : null}

      <SectionHeading title={q ? 'Results' : category ? categoryInfo(category).label : 'All items'} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip label="All" selected={use === null} onPress={() => setUse(null)} />
        <Chip label="Personal" selected={use === 'personal'} onPress={() => setUse('personal')} />
        <Chip label="Work" selected={use === 'work'} onPress={() => setUse('work')} />
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={[styles.flex, { backgroundColor: c.background }]}>
      <FlatList
        data={visible}
        keyExtractor={(i) => i.id}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 120 }}
        ListHeaderComponent={header}
        ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: c.separator }]} />}
        ListEmptyComponent={
          <AppText color={c.textSecondary} style={{ textAlign: 'center', marginTop: Spacing.xxl }}>
            No items match.
          </AppText>
        }
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: Spacing.xl }}>
            <ItemRow item={item} region={region} onPress={() => open(item.id)} />
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function HeroStat({
  icon,
  color,
  value,
  label,
}: {
  icon: 'shield-checkmark' | 'time' | 'briefcase';
  color: string;
  value: number;
  label: string;
}) {
  const c = useColors();
  return (
    <View style={[styles.heroStat, { backgroundColor: c.raised }]}>
      <Ionicons name={icon} size={18} color={color} />
      <AppText variant="title3" style={{ fontVariant: ['tabular-nums'] }}>
        {value}
      </AppText>
      <AppText variant="caption" color={c.textSecondary} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

function CategoryBubble({
  icon,
  label,
  selected,
  onPress,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} category`}
      accessibilityState={{ selected }}
      onPress={() => {
        tap();
        onPress();
      }}
      style={styles.bubbleWrap}>
      <View
        style={[
          styles.bubble,
          { backgroundColor: selected ? c.accentSoft : c.card, borderColor: selected ? c.accent : 'transparent' },
        ]}>
        <Ionicons name={icon} size={26} color={selected ? c.accent : c.text} />
      </View>
      <AppText variant="caption" color={selected ? c.accent : c.text} numberOfLines={1}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 999,
  },
  searchInput: { flex: 1, fontSize: 17, height: 40 },
  hero: { marginHorizontal: Spacing.xl, marginBottom: Spacing.xxl, borderRadius: Radius.xxl, padding: Spacing.xl, gap: 2 },
  heroValue: { fontSize: 40, fontWeight: '700', letterSpacing: -1, fontVariant: ['tabular-nums'], marginTop: 2 },
  heroStats: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  heroStat: { flex: 1, borderRadius: Radius.lg, padding: Spacing.md, gap: 2 },
  categories: { gap: Spacing.lg, paddingHorizontal: Spacing.xl, marginBottom: Spacing.xxl },
  bubbleWrap: { alignItems: 'center', gap: 6, width: 68 },
  bubble: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  shelf: { gap: Spacing.lg, paddingHorizontal: Spacing.xl, marginBottom: Spacing.xxl },
  chips: { gap: Spacing.sm, paddingHorizontal: Spacing.xl, marginBottom: Spacing.sm },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: Spacing.xl + 84 + Spacing.lg },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl, gap: Spacing.md, paddingBottom: 140 },
  emptyIcon: { width: 104, height: 104, borderRadius: 52, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
});
