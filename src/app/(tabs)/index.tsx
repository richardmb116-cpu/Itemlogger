import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo, useState, type ComponentProps } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ItemCard, ItemRow, ItemThumb } from '@/components/item-bits';
import { AppText, Chip, IconButton, SectionHeading, tap } from '@/components/ui';
import { OnPhoto, Radius, Spacing, useColors } from '@/constants/theme';
import { ordinal, upcomingBirthdays } from '@/lib/birthdays';
import { CATEGORIES, categoryInfo } from '@/lib/categories';
import { formatMoney } from '@/lib/format';
import { CATEGORY_PHOTOS, HOME_HERO_PHOTO } from '@/lib/photos';
import { explainBlockedNotifications } from '@/lib/reminder-alerts';
import { sortItems, useStore } from '@/lib/store';
import { sellPlan } from '@/lib/upgrade';
import { currencyFor } from '@/lib/tax';
import type { Category, ItemUse } from '@/lib/types';
import { useEnableReminders } from '@/lib/use-reminders';
import { currentValue } from '@/lib/valuation';
import { warrantyStatus } from '@/lib/warranty';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** Below this many items, browsing by category adds clutter rather than help. */
const COLLECTIONS_MIN = 12;

function greeting(now = new Date()): string {
  const h = now.getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export default function ItemsScreen() {
  const c = useColors();
  const { items, settings, updateSettings } = useStore();
  const enableReminders = useEnableReminders();
  const region = settings.taxRegion;
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [use, setUse] = useState<ItemUse | 'sold' | null>(null);

  const sorted = useMemo(() => sortItems(items), [items]);
  // Sold items are kept for records but drop out of totals, warranties and categories.
  const owned = useMemo(() => sorted.filter((i) => !i.sold), [sorted]);
  const soldCount = items.length - owned.length;
  const statuses = useMemo(() => new Map(owned.map((i) => [i.id, warrantyStatus(i)])), [owned]);
  const values = useMemo(() => new Map(owned.map((i) => [i.id, currentValue(i)?.amount ?? null])), [owned]);

  const expiring = owned
    .filter((i) => statuses.get(i.id)?.state === 'expiring')
    .sort((a, b) => (statuses.get(a.id)?.daysLeft ?? 0) - (statuses.get(b.id)?.daysLeft ?? 0));
  const covered = owned.filter((i) => {
    const s = statuses.get(i.id)?.state;
    return s === 'active' || s === 'expiring';
  }).length;
  const paid = owned.reduce((sum, i) => sum + (i.price ?? 0), 0);
  const worth = owned.reduce((sum, i) => sum + (values.get(i.id) ?? 0), 0);
  const workCount = owned.filter((i) => i.use === 'work').length;
  const birthdays = upcomingBirthdays(owned, 7);
  const readyToSell = owned
    .map((item) => ({ item, plan: sellPlan(item, region, settings.upgradeStyle) }))
    .filter(
      (r): r is { item: (typeof owned)[number]; plan: NonNullable<ReturnType<typeof sellPlan>> } =>
        !!r.plan && (r.plan.status === 'window' || r.plan.status === 'late'),
    );
  const usedCategories = CATEGORIES.filter((cat) => owned.some((i) => i.category === cat.id));

  const q = query.trim().toLowerCase();
  const visible = sorted.filter((item) => {
    if (category && item.category !== category) return false;
    if (use === 'sold') {
      if (!item.sold) return false;
    } else if (item.sold || (use && item.use !== use)) {
      return false;
    }
    if (!q) return true;
    return [item.name, item.model, item.store, item.serial, categoryInfo(item.category).label, item.notes]
      .join(' ')
      .toLowerCase()
      .includes(q);
  });

  const addItem = () => router.push('/item/edit');
  const showReminderPrompt = !settings.remindersEnabled && !settings.remindersPromptDismissed && covered > 0;
  const turnOnReminders = async () => {
    if (!(await enableReminders())) explainBlockedNotifications();
  };
  const open = (id: string) => router.push(`/item/${id}`);
  const browsing = !q;
  const today = new Date().toLocaleDateString(currencyFor(region).locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  if (items.length === 0) {
    return (
      <View style={[styles.flex, { backgroundColor: '#000' }]}>
        <Image source={HOME_HERO_PHOTO} style={StyleSheet.absoluteFill} contentFit="cover" />
        <LinearGradient colors={OnPhoto.scrim} locations={[0, 0.4, 0.95]} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={styles.emptyWrap}>
          <AppText variant="eyebrow" color={OnPhoto.textSecondary}>
            Your inventory
          </AppText>
          <AppText variant="display" color={OnPhoto.text}>
            Start with one{'\n'}thing you love.
          </AppText>
          <AppText color={OnPhoto.textSecondary} style={{ fontSize: 18, lineHeight: 25 }}>
            Snap the item and its receipt. Warranties, value and tax take care of themselves.
          </AppText>
          <Pressable accessibilityRole="button" onPress={addItem} style={styles.emptyButton}>
            <Ionicons name="camera" size={19} color="#0B0B0C" />
            <AppText variant="headline" color="#0B0B0C" style={{ fontWeight: '700' }}>
              Add your first item
            </AppText>
          </Pressable>
        </SafeAreaView>
      </View>
    );
  }

  const header = (
    <View>
      {/* Greeting */}
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <AppText variant="eyebrow" color={c.textSecondary}>
            {today}
          </AppText>
          <AppText variant="largeTitle" style={{ marginTop: 4 }}>
            {greeting()}
          </AppText>
        </View>
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
            placeholder="Search name, model, store, serial"
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
          {/* Hero: what everything is worth, over a photo */}
          <View style={styles.hero}>
            <Image source={HOME_HERO_PHOTO} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
            <LinearGradient
              colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.85)']}
              locations={[0, 0.4, 1]}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.heroTop}>
              <View style={styles.glassChip}>
                <Ionicons name="home" size={12} color={OnPhoto.text} />
                <AppText variant="eyebrow" color={OnPhoto.text} style={{ fontSize: 11 }}>
                  Worth today
                </AppText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Claim pack"
                onPress={() => {
                  tap();
                  router.push('/claim');
                }}
                style={({ pressed }) => [styles.glassChip, { opacity: pressed ? 0.7 : 1 }]}>
                <Ionicons name="document-text" size={12} color={OnPhoto.text} />
                <AppText variant="eyebrow" color={OnPhoto.text} style={{ fontSize: 11 }}>
                  Claim pack
                </AppText>
              </Pressable>
            </View>
            <View style={styles.heroBottom}>
              <AppText variant="hero" color={OnPhoto.text} style={{ fontVariant: ['tabular-nums'] }}>
                {formatMoney(worth, region, { cents: false })}
              </AppText>
              <AppText variant="subhead" color={OnPhoto.textSecondary}>
                {owned.length} item{owned.length === 1 ? '' : 's'} · paid {formatMoney(paid, region, { cents: false })}
              </AppText>
              <View style={styles.heroStats}>
                <HeroStat icon="shield-checkmark" value={covered} label="covered" />
                <HeroStat icon="time" value={expiring.length} label="expiring" />
                <HeroStat icon="briefcase" value={workCount} label="work" />
              </View>
            </View>
          </View>

          {showReminderPrompt ? (
            <View style={[styles.prompt, { backgroundColor: c.ink }]}>
              <View style={{ flex: 1, gap: 4 }}>
                <AppText variant="eyebrow" color={c.onInk} style={{ opacity: 0.6 }}>
                  Warranty reminders
                </AppText>
                <AppText variant="title3" color={c.onInk}>
                  Never miss a claim.
                </AppText>
                <AppText variant="footnote" color={c.onInk} style={{ opacity: 0.7 }}>
                  A nudge 30 days and 1 week before cover ends.
                </AppText>
                <View style={styles.promptActions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      tap();
                      void turnOnReminders();
                    }}
                    style={[styles.promptButton, { backgroundColor: c.onInk }]}>
                    <AppText variant="subhead" color={c.ink} style={{ fontWeight: '700' }}>
                      Turn on
                    </AppText>
                  </Pressable>
                  <AppText
                    variant="subhead"
                    color={c.onInk}
                    style={{ opacity: 0.7, fontWeight: '600' }}
                    onPress={() => updateSettings({ remindersPromptDismissed: true })}
                    suppressHighlighting>
                    Not now
                  </AppText>
                </View>
              </View>
              <Ionicons name="notifications" size={44} color={c.onInk} style={{ opacity: 0.18 }} />
            </View>
          ) : null}

          {/* Birthdays this week */}
          {birthdays.length > 0 && !category && !use ? (
            <View style={[styles.birthdays, { backgroundColor: c.card }]}>
              <View style={styles.birthdaysHead}>
                <Ionicons name="gift" size={16} color={c.ink} />
                <AppText variant="eyebrow" color={c.textSecondary}>
                  {birthdays[0].birthday.daysUntil === 0 ? 'Celebrating today' : 'Birthdays this week'}
                </AppText>
              </View>
              {birthdays.slice(0, 3).map(({ item, birthday }) => (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  onPress={() => open(item.id)}
                  style={({ pressed }) => [styles.birthdayRow, { opacity: pressed ? 0.6 : 1 }]}>
                  <ItemThumb item={item} size={48} radius={14} />
                  <View style={{ flex: 1 }}>
                    <AppText variant="headline" numberOfLines={2}>
                      {birthday.daysUntil === 0
                        ? `Happy ${ordinal(birthday.turning)} birthday, ${item.name}`
                        : `${item.name} turns ${birthday.turning}`}
                    </AppText>
                    <AppText variant="footnote" color={c.textSecondary}>
                      {birthday.daysUntil === 0
                        ? `Worth about ${formatMoney(values.get(item.id) ?? null, region)} today`
                        : birthday.daysUntil === 1
                          ? 'Tomorrow'
                          : `In ${birthday.daysUntil} days`}
                    </AppText>
                  </View>
                  <Ionicons name="chevron-forward" size={17} color={c.textTertiary} />
                </Pressable>
              ))}
            </View>
          ) : null}

          {/* Needs attention: warranties about to end, then things worth selling now */}
          {(expiring.length > 0 || readyToSell.length > 0) && !category && !use ? (
            <>
              <SectionHeading title="Needs attention" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shelf}>
                {expiring.map((item) => (
                  <ItemCard
                    key={`w-${item.id}`}
                    item={item}
                    detail={statuses.get(item.id)?.label ?? ''}
                    action="Review warranty"
                    onPress={() => open(item.id)}
                  />
                ))}
                {readyToSell.map(({ item, plan }) => (
                  <ItemCard
                    key={`s-${item.id}`}
                    item={item}
                    detail={`${plan.status === 'window' ? 'Good time to sell' : 'Past its best time'} · ~${formatMoney(plan.nowValue, region, { cents: false })}`}
                    action="See value"
                    onPress={() => router.push({ pathname: '/item/sell', params: { id: item.id } })}
                  />
                ))}
              </ScrollView>
            </>
          ) : null}

          {/* Categories as photo tiles, once there are enough items to browse */}
          {owned.length >= COLLECTIONS_MIN || category ? (
            <>
              <SectionHeading
                title="Collections"
                action={category ? 'Show all' : undefined}
                onAction={category ? () => setCategory(null) : undefined}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shelf}>
                {usedCategories.map((cat) => {
                  const count = owned.filter((i) => i.category === cat.id).length;
                  const selected = category === cat.id;
                  return (
                    <Pressable
                      key={cat.id}
                      accessibilityRole="button"
                      accessibilityLabel={`${cat.label}, ${count} items`}
                      accessibilityState={{ selected }}
                      onPress={() => {
                        tap();
                        setCategory(selected ? null : cat.id);
                      }}
                      style={({ pressed }) => [
                        styles.tile,
                        { borderColor: selected ? c.ink : 'transparent', transform: [{ scale: pressed ? 0.97 : 1 }] },
                      ]}>
                      <Image source={CATEGORY_PHOTOS[cat.id]} style={StyleSheet.absoluteFill} contentFit="cover" />
                      <LinearGradient
                        colors={OnPhoto.scrim}
                        locations={[0.3, 0.6, 1]}
                        style={StyleSheet.absoluteFill}
                      />
                      <View style={styles.tileText}>
                        <AppText variant="headline" color={OnPhoto.text} numberOfLines={1}>
                          {cat.label}
                        </AppText>
                        <AppText variant="caption" color={OnPhoto.textSecondary}>
                          {count} item{count === 1 ? '' : 's'}
                        </AppText>
                      </View>
                      {selected ? (
                        <View style={styles.tileCheck}>
                          <Ionicons name="checkmark" size={14} color="#0B0B0C" />
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </>
          ) : null}
        </>
      ) : null}

      <SectionHeading
        title={q ? 'Results' : use === 'sold' ? 'Sold' : category ? categoryInfo(category).label : 'Everything'}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip label="All" selected={use === null} onPress={() => setUse(null)} />
        <Chip label="Personal" selected={use === 'personal'} onPress={() => setUse('personal')} />
        <Chip label="Work" selected={use === 'work'} onPress={() => setUse('work')} />
        {soldCount > 0 ? (
          <Chip label={`Sold (${soldCount})`} selected={use === 'sold'} onPress={() => setUse('sold')} />
        ) : null}
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
            Nothing here yet.
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

function HeroStat({ icon, value, label }: { icon: IconName; value: number; label: string }) {
  return (
    <View style={styles.heroStat}>
      <Ionicons name={icon} size={13} color={OnPhoto.text} />
      <AppText variant="subhead" color={OnPhoto.text} style={{ fontWeight: '700', fontVariant: ['tabular-nums'] }}>
        {value}
      </AppText>
      <AppText variant="caption" color={OnPhoto.textSecondary} style={{ fontSize: 13 }}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 999,
  },
  searchInput: { flex: 1, fontSize: 17, height: 46 },
  hero: {
    marginHorizontal: Spacing.lg,
    height: 360,
    marginBottom: Spacing.xl,
    borderRadius: Radius.xxl,
    borderCurve: 'continuous',
    overflow: 'hidden',
    justifyContent: 'space-between',
    backgroundColor: '#222',
  },
  heroTop: { padding: Spacing.lg, flexDirection: 'row', justifyContent: 'space-between' },
  heroBottom: { padding: Spacing.xl, gap: 2 },
  heroStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: Spacing.lg },
  heroStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: OnPhoto.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: OnPhoto.glassBorder,
  },
  glassChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: OnPhoto.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: OnPhoto.glassBorder,
  },
  prompt: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xxl,
    padding: Spacing.xl,
    borderRadius: Radius.xxl,
    borderCurve: 'continuous',
  },
  promptActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, marginTop: Spacing.md },
  promptButton: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 999 },
  birthdays: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xxl,
    padding: Spacing.lg,
    gap: Spacing.md,
    borderRadius: Radius.xxl,
    borderCurve: 'continuous',
  },
  birthdaysHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  birthdayRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  shelf: { gap: Spacing.md, paddingHorizontal: Spacing.lg, marginBottom: Spacing.xxl },
  tile: {
    width: 150,
    height: 190,
    borderRadius: Radius.xl,
    borderCurve: 'continuous',
    overflow: 'hidden',
    justifyContent: 'flex-end',
    borderWidth: 2,
  },
  tileText: { padding: Spacing.md, gap: 1 },
  tileCheck: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: { gap: Spacing.sm, paddingHorizontal: Spacing.xl, marginBottom: Spacing.sm },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: Spacing.xl + 80 + Spacing.lg },
  emptyWrap: { flex: 1, justifyContent: 'flex-end', padding: Spacing.xl + 4, gap: Spacing.md, paddingBottom: 140 },
  emptyButton: {
    marginTop: Spacing.md,
    height: 58,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
});
