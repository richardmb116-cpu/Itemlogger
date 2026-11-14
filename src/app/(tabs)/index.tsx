import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ItemRow } from '@/components/item-bits';
import { AppText, Chip, IconButton, PrimaryButton, ScreenTitle } from '@/components/ui';
import { Radius, Spacing, useColors } from '@/constants/theme';
import { categoryInfo } from '@/lib/categories';
import { formatMoney } from '@/lib/format';
import { sortItems, useStore } from '@/lib/store';
import { warrantyStatus } from '@/lib/warranty';

type Filter = 'all' | 'expiring' | 'work' | 'personal';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'expiring', label: 'Expiring soon' },
  { id: 'work', label: 'Work' },
  { id: 'personal', label: 'Personal' },
];

export default function ItemsScreen() {
  const c = useColors();
  const { items, settings } = useStore();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sortItems(items).filter((item) => {
      if (filter === 'work' && item.use !== 'work') return false;
      if (filter === 'personal' && item.use !== 'personal') return false;
      if (filter === 'expiring' && warrantyStatus(item).state !== 'expiring') return false;
      if (!q) return true;
      return [item.name, item.store, item.serial, categoryInfo(item.category).label, item.notes]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [items, query, filter]);

  const total = items.reduce((sum, i) => sum + (i.price ?? 0), 0);
  const expiringCount = items.filter((i) => warrantyStatus(i).state === 'expiring').length;
  const addItem = () => router.push('/item/edit');

  if (items.length === 0) {
    return (
      <SafeAreaView edges={['top']} style={[styles.flex, { backgroundColor: c.background }]}>
        <ScreenTitle title="Items" />
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: c.accentSoft }]}>
            <Ionicons name="shield-checkmark" size={44} color={c.accent} />
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

  return (
    <SafeAreaView edges={['top']} style={[styles.flex, { backgroundColor: c.background }]}>
      <FlatList
        data={visible}
        keyExtractor={(i) => i.id}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
        ListHeaderComponent={
          <View style={{ marginHorizontal: -Spacing.lg, marginBottom: Spacing.md }}>
            <ScreenTitle
              title="Items"
              subtitle={`${items.length} item${items.length === 1 ? '' : 's'} · ${formatMoney(total, settings.taxRegion, { cents: false })}`}
              right={<IconButton icon="add" label="Add item" onPress={addItem} filled />}
            />
            {expiringCount > 0 && filter !== 'expiring' ? (
              <View style={[styles.banner, { backgroundColor: c.orangeSoft }]}>
                <Ionicons name="time" size={20} color={c.orange} />
                <AppText variant="subhead" color={c.text} style={{ flex: 1 }}>
                  {expiringCount} warrant{expiringCount === 1 ? 'y ends' : 'ies end'} in the next 60 days.
                </AppText>
                <AppText variant="subhead" color={c.orange} style={{ fontWeight: '600' }} onPress={() => setFilter('expiring')}>
                  Review
                </AppText>
              </View>
            ) : null}
            <View style={[styles.search, { backgroundColor: c.fill }]}>
              <Ionicons name="search" size={18} color={c.textSecondary} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search name, store, serial"
                placeholderTextColor={c.textSecondary}
                style={[styles.searchInput, { color: c.text }]}
                clearButtonMode="while-editing"
                returnKeyType="search"
                autoCorrect={false}
              />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {FILTERS.map((f) => (
                <Chip key={f.id} label={f.label} selected={filter === f.id} onPress={() => setFilter(f.id)} />
              ))}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          <AppText color={c.textSecondary} style={{ textAlign: 'center', marginTop: Spacing.xxl }}>
            No items match.
          </AppText>
        }
        renderItem={({ item }) => (
          <ItemRow item={item} region={settings.taxRegion} onPress={() => router.push(`/item/${item.id}`)} />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  listContent: { paddingHorizontal: Spacing.lg, paddingBottom: 120 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    paddingHorizontal: 10,
    height: 38,
    borderRadius: 10,
  },
  searchInput: { flex: 1, fontSize: 17, height: 38 },
  chips: { gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl, gap: Spacing.md, paddingBottom: 140 },
  emptyIcon: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
});
