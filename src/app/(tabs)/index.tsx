import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo, useState, type ComponentProps } from 'react';
import { Pressable, ScrollView, SectionList, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ItemCard, ItemRow, ItemThumb } from '@/components/item-bits';
import { ProgressRing } from '@/components/progress-ring';
import { AppText, Chip, IconButton, SectionHeading, tap } from '@/components/ui';
import { OnPhoto, Radius, Spacing, useColors } from '@/constants/theme';
import { ordinal, upcomingBirthdays } from '@/lib/birthdays';
import { CATEGORIES, categoryInfo } from '@/lib/categories';
import { categoryCounts, filterItems, groupByCategory, type UseFilter } from '@/lib/item-filter';
import { formatMoney } from '@/lib/format';
import { HOME_HERO_PHOTO } from '@/lib/photos';
import { CHECK_LABEL, pointsLabel, protection } from '@/lib/progress';
import { explainBlockedNotifications } from '@/lib/reminder-alerts';
import { sortRecent, useStore } from '@/lib/store';
import { sellPlan } from '@/lib/upgrade';
import { currencyFor } from '@/lib/tax';
import type { Category } from '@/lib/types';
import { useEnableReminders } from '@/lib/use-reminders';
import { currentValue } from '@/lib/valuation';
import { warrantyStatus } from '@/lib/warranty';

type IconName = ComponentProps<typeof Ionicons>['name'];

function greeting(now = new Date()): string {
  const h = now.getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export default function ItemsScreen() {
  const c = useColors();
  const { items, settings, updateSettings } = useStore();
  const enableReminders = useEnableReminders();
  const region = settings.taxRegion;
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [use, setUse] = useState<UseFilter>(null);
  const [collapsed, setCollapsed] = useState<Set<Category>>(new Set());
  const grouped = settings.groupByCategory;

  const sorted = useMemo(() => sortRecent(items), [items]);
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
  const sellStatuses = new Map(readyToSell.map((r) => [r.item.id, r.plan.status]));
  const prot = protection(items);
  const nextStep = prot.steps[0];
  const q = query.trim();
  const visible = filterItems(sorted, { query, category, use });
  // Category chips count what the other filters leave, so the numbers match what a tap shows.
  const counts = categoryCounts(filterItems(sorted, { query, category: null, use }));
  const usedCategories = CATEGORIES.filter((cat) => counts.has(cat.id) || cat.id === category);
  const sections = (grouped ? groupByCategory(visible) : [{ category: null, label: '', items: visible }]).map((g) => ({
    key: g.category ?? 'all',
    category: g.category,
    label: g.label,
    count: g.items.length,
    worth: g.items.reduce((s, i) => s + (values.get(i.id) ?? 0), 0),
    data: g.category && collapsed.has(g.category) ? [] : g.items,
  }));
  const toggleSection = (cat: Category) => {
    tap();
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  // Adding starts with a receipt scan; adding by hand is one tap away on that screen.
  const addItem = () => router.push('/scan');
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
        <IconButton icon="add" label="Add item" onPress={addItem} filled />
      </View>

      <View style={[styles.search, { backgroundColor: c.card }]}>
        <Ionicons name="search" size={18} color={c.textSecondary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search name, brand, store, serial"
          placeholderTextColor={c.textSecondary}
          style={[styles.searchInput, { color: c.text }]}
          clearButtonMode="while-editing"
          returnKeyType="search"
          autoCorrect={false}
          accessibilityLabel="Search items"
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={18} color={c.textTertiary} />
          </Pressable>
        ) : null}
      </View>

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

          {/* Protection: how claim-ready everything is, and the best next step */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Protection score ${prot.score}. See your progress`}
            onPress={() => {
              tap();
              router.push('/progress');
            }}
            style={({ pressed }) => [styles.protect, { backgroundColor: c.card, opacity: pressed ? 0.85 : 1 }]}>
            <ProgressRing score={prot.score} size={64} stroke={7} />
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="eyebrow" color={c.textSecondary}>
                Protection
              </AppText>
              <AppText variant="headline">
                {prot.score >= 100 ? 'Everything is claim-ready' : `${prot.score}% claim-ready`}
              </AppText>
              <AppText variant="footnote" color={c.textSecondary} numberOfLines={1}>
                {nextStep
                  ? `Next: ${CHECK_LABEL[nextStep.check].add.toLowerCase()} · ${nextStep.name} ${pointsLabel(nextStep.points)}`
                  : 'Badges, money and next steps'}
              </AppText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={c.textTertiary} />
          </Pressable>

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

        </>
      ) : null}

      <SectionHeading
        title={q ? `${visible.length} result${visible.length === 1 ? '' : 's'}` : use === 'sold' ? 'Sold' : 'Everything'}
        action={grouped ? 'Show as list' : 'Group by category'}
        onAction={() => updateSettings({ groupByCategory: !grouped })}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip label="All" selected={use === null} onPress={() => setUse(null)} />
        <Chip label="Personal" selected={use === 'personal'} onPress={() => setUse(use === 'personal' ? null : 'personal')} />
        <Chip label="Work" selected={use === 'work'} onPress={() => setUse(use === 'work' ? null : 'work')} />
        {soldCount > 0 ? (
          <Chip label={`Sold (${soldCount})`} selected={use === 'sold'} onPress={() => setUse(use === 'sold' ? null : 'sold')} />
        ) : null}
      </ScrollView>
      {usedCategories.length > 1 || category ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.chips, { marginBottom: Spacing.md }]}>
          {usedCategories.map((cat) => (
            <Chip
              key={cat.id}
              label={`${cat.label} ${counts.get(cat.id) ?? 0}`}
              selected={category === cat.id}
              onPress={() => setCategory(category === cat.id ? null : cat.id)}
            />
          ))}
        </ScrollView>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={[styles.flex, { backgroundColor: c.background }]}>
      <SectionList
        sections={sections}
        keyExtractor={(i) => i.id}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        ListHeaderComponent={header}
        ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: c.separator }]} />}
        ListEmptyComponent={
          <AppText color={c.textSecondary} style={{ textAlign: 'center', marginTop: Spacing.xxl }}>
            {q || category || use ? 'Nothing matches. Try another search or filter.' : 'Nothing here yet.'}
          </AppText>
        }
        renderSectionHeader={({ section }) =>
          section.category ? (
            <Pressable
              onPress={() => toggleSection(section.category!)}
              accessibilityRole="button"
              accessibilityState={{ expanded: !collapsed.has(section.category) }}
              accessibilityLabel={`${section.label}, ${section.count} items`}
              style={[styles.groupHead, { borderBottomColor: c.separator }]}>
              <View style={[styles.groupIcon, { backgroundColor: c.card }]}>
                <Ionicons name={categoryInfo(section.category).icon} size={16} color={c.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="headline">{section.label}</AppText>
                <AppText variant="caption" color={c.textSecondary}>
                  {section.count} item{section.count === 1 ? '' : 's'}
                  {section.worth > 0 ? ` · worth ${formatMoney(section.worth, region, { cents: false })}` : ''}
                </AppText>
              </View>
              <Ionicons
                name={collapsed.has(section.category) ? 'chevron-forward' : 'chevron-down'}
                size={18}
                color={c.textTertiary}
              />
            </Pressable>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: Spacing.xl }}>
            <ItemRow item={item} region={region} sellStatus={sellStatuses.get(item.id)} onPress={() => open(item.id)} />
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
  searchInput: { flex: 1, fontSize: 17, height: 46, outlineWidth: 0 },
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
  chips: { gap: Spacing.sm, paddingHorizontal: Spacing.xl, marginBottom: Spacing.sm },
  protect: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xxl,
    padding: Spacing.md,
    paddingRight: Spacing.lg,
    borderRadius: Radius.xl,
    borderCurve: 'continuous',
  },
  groupHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
    paddingBottom: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  groupIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
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
