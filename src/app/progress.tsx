import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ProgressRing } from '@/components/progress-ring';
import { AppText, Row, Section } from '@/components/ui';
import { Radius, Spacing, useColors } from '@/constants/theme';
import { formatDate, formatMoney } from '@/lib/format';
import { BADGES, CHECK_LABEL, money, pointsLabel, protection, ROOM_DONE_MIN, roomQuests } from '@/lib/progress';
import { roomInfo } from '@/lib/rooms';
import { streak } from '@/lib/streaks';
import { useStore } from '@/lib/store';
import { useBadges } from '@/lib/use-badges';

const STEPS_SHOWN = 8;

/** Protection score, next steps, real money, and badges. */
export default function ProgressScreen() {
  const c = useColors();
  const { items, settings } = useStore();
  const { earned } = useBadges();
  const region = settings.taxRegion;
  const p = protection(items);
  const m = money(items, region, settings.depreciation);
  const earnedCount = BADGES.filter((b) => earned[b.id]).length;
  const st = streak(settings.activity);
  const quests = roomQuests(items);
  const started = quests.filter((q) => q.count > 0);
  const notStarted = quests.filter((q) => q.count === 0);
  const sweep = (room: string) => router.push({ pathname: '/scan', params: { room } });
  const cash = (n: number) => formatMoney(n, region, { cents: false });

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={{ paddingBottom: 60 }}>
      <View style={styles.hero}>
        <ProgressRing score={p.score} size={150} stroke={14} />
        <AppText variant="title2" style={{ textAlign: 'center' }}>
          {p.score >= 100
            ? 'Fully protected'
            : p.score >= 70
              ? 'Well protected'
              : p.score >= 40
                ? 'Getting there'
                : 'Let’s protect your things'}
        </AppText>
        <AppText variant="subhead" color={c.textSecondary} style={{ textAlign: 'center', lineHeight: 21 }}>
          {p.complete} of {p.total} things have everything an insurer asks for: a photo, the receipt, what you paid and,
          for electronics, appliances, tools and bikes, the serial number. Valuable things count for more.
        </AppText>
      </View>

      {/* Weekly streak */}
      <View style={[styles.streak, { backgroundColor: c.ink }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
          <Ionicons name="flame" size={30} color={st.current > 0 ? '#FF8A3D' : c.onInk} style={{ opacity: st.current > 0 ? 1 : 0.4 }} />
          <View style={{ flex: 1 }}>
            <AppText variant="title2" color={c.onInk}>
              {st.current > 0 ? `${st.current}-week streak` : 'Start a streak'}
            </AppText>
            <AppText variant="footnote" color={c.onInk} style={{ opacity: 0.7 }}>
              {st.thisWeek
                ? 'Done for this week. See you next week.'
                : 'Add something or fill a gap this week to keep it going.'}
              {st.best > st.current ? ` Best: ${st.best} weeks.` : ''}
            </AppText>
          </View>
        </View>
        <View style={styles.dots} accessibilityLabel={`Last ${st.recent.length} weeks`}>
          {st.recent.map((on, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: on ? '#FF8A3D' : 'rgba(255,255,255,0.14)' },
                i === st.recent.length - 1 && !on && { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)' },
              ]}
            />
          ))}
        </View>
      </View>

      {/* Room quests */}
      <Section
        title="Room quests"
        footer={`Pick a room and scan or add everything in it. A room is complete with ${ROOM_DONE_MIN}+ things, all fully recorded.`}>
        {[...started, ...notStarted.slice(0, started.length ? 3 : 5)].map((q, i, list) => {
          const info = roomInfo(q.room)!;
          return (
            <Pressable
              key={q.room}
              accessibilityRole="button"
              accessibilityLabel={`${q.label}: ${q.count ? `${q.count} things, ${q.score}% recorded` : 'not started'}`}
              onPress={() => sweep(q.room)}
              style={({ pressed }) => [
                styles.step,
                { opacity: pressed ? 0.6 : 1 },
                i < list.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.separator },
              ]}>
              <View style={[styles.stepIcon, { backgroundColor: q.done ? c.green : c.background }]}>
                <Ionicons name={q.done ? 'checkmark' : info.icon} size={16} color={q.done ? '#fff' : c.ink} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <AppText variant="body">{q.label}</AppText>
                {q.count ? (
                  <View style={[styles.bar, { backgroundColor: c.fill }]}>
                    <View style={[styles.barFill, { width: `${q.score}%`, backgroundColor: q.done ? c.green : c.accent }]} />
                  </View>
                ) : (
                  <AppText variant="caption" color={c.textSecondary}>
                    Not started
                  </AppText>
                )}
              </View>
              <AppText variant="footnote" color={c.textSecondary} style={{ fontVariant: ['tabular-nums'] }}>
                {q.done ? 'Complete' : q.count ? `${q.count} · ${q.score}%` : 'Start'}
              </AppText>
              <Ionicons name="chevron-forward" size={16} color={c.textTertiary} />
            </Pressable>
          );
        })}
      </Section>

      {p.steps.length > 0 ? (
        <Section
          title="Next steps"
          footer={p.steps.length > STEPS_SHOWN ? `And ${p.steps.length - STEPS_SHOWN} more.` : undefined}>
          {p.steps.slice(0, STEPS_SHOWN).map((s, i, shown) => (
            <Pressable
              key={`${s.itemId}-${s.check}`}
              accessibilityRole="button"
              accessibilityLabel={`${CHECK_LABEL[s.check].add} for ${s.name}, ${pointsLabel(s.points)} points`}
              onPress={() => router.push({ pathname: '/item/edit', params: { id: s.itemId } })}
              style={({ pressed }) => [
                styles.step,
                { opacity: pressed ? 0.6 : 1 },
                i < shown.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.separator },
              ]}>
              <View style={[styles.stepIcon, { backgroundColor: c.background }]}>
                <Ionicons name={CHECK_LABEL[s.check].icon} size={16} color={c.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="body" numberOfLines={1}>
                  {CHECK_LABEL[s.check].add}
                </AppText>
                <AppText variant="caption" color={c.textSecondary} numberOfLines={1}>
                  {s.name}
                </AppText>
              </View>
              <AppText variant="headline" color={c.accent} style={{ fontVariant: ['tabular-nums'] }}>
                {pointsLabel(s.points)}
              </AppText>
              <Ionicons name="chevron-forward" size={16} color={c.textTertiary} />
            </Pressable>
          ))}
        </Section>
      ) : null}

      <Section
        title="Your money"
        footer="Sales you’ve recorded, this tax year’s estimated deductions on work items, and what your fully recorded things are worth today.">
        <Row
          label="Sold for"
          icon="bag-check-outline"
          value={m.soldCount ? `${cash(m.sold)} · ${m.soldCount} sale${m.soldCount === 1 ? '' : 's'}` : '—'}
        />
        <Row
          label="Tax deductions this year"
          icon="briefcase-outline"
          value={m.deductions > 0 ? cash(m.deductions) : '—'}
        />
        <Row label="Fully protected value" icon="shield-checkmark-outline" value={cash(m.protectedValue)} last />
      </Section>

      <AppText variant="eyebrow" color={c.textSecondary} style={styles.badgesTitle}>
        Badges · {earnedCount} of {BADGES.length}
      </AppText>
      <View style={styles.grid}>
        {BADGES.map((b) => {
          const when = earned[b.id];
          return (
            <View
              key={b.id}
              style={[styles.badge, { backgroundColor: c.card, opacity: when ? 1 : 0.55 }]}
              accessibilityLabel={`${b.title}. ${when ? 'Earned' : b.how}`}>
              <View style={[styles.badgeIcon, { backgroundColor: when ? c.ink : c.fill }]}>
                <Ionicons
                  name={(when ? b.icon : 'lock-closed') as 'trophy'}
                  size={20}
                  color={when ? c.onInk : c.textTertiary}
                />
              </View>
              <AppText variant="subhead" style={{ fontWeight: '700', textAlign: 'center' }} numberOfLines={2}>
                {b.title}
              </AppText>
              <AppText variant="caption" color={c.textSecondary} style={{ textAlign: 'center' }} numberOfLines={4}>
                {when ? formatDate(when.slice(0, 10), region) : b.how}
              </AppText>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  streak: { marginHorizontal: Spacing.lg, marginBottom: Spacing.xxl, padding: Spacing.lg, gap: Spacing.lg, borderRadius: Radius.xl, borderCurve: 'continuous' },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { flex: 1, height: 8, borderRadius: 4 },
  bar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  step: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 10, paddingHorizontal: Spacing.lg },
  stepIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  badgesTitle: { paddingHorizontal: Spacing.xl + 4, marginBottom: Spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, paddingHorizontal: Spacing.lg },
  badge: {
    width: '31.5%',
    alignItems: 'center',
    gap: 6,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
  },
  badgeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
});
