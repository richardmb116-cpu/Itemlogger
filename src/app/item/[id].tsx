import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { warrantyColors } from '@/components/item-bits';
import { AppText, Row, Section } from '@/components/ui';
import { Radius, Spacing, useColors } from '@/constants/theme';
import { categoryInfo } from '@/lib/categories';
import { formatDate, formatMoney } from '@/lib/format';
import { useStore } from '@/lib/store';
import { taxYearFor } from '@/lib/tax';
import { warrantyLengthLabel, warrantyStatus } from '@/lib/warranty';

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { getItem, deleteItem, settings } = useStore();
  const [viewer, setViewer] = useState<string | null>(null);
  const item = getItem(id);

  if (!item) {
    return (
      <View style={[styles.missing, { backgroundColor: c.background }]}>
        <Stack.Screen options={{ headerTransparent: false, title: 'Item' }} />
        <AppText color={c.textSecondary}>This item no longer exists.</AppText>
      </View>
    );
  }

  const region = settings.taxRegion;
  const cat = categoryInfo(item.category);
  const status = warrantyStatus(item);
  const col = warrantyColors(status.state, c);
  const taxYear = taxYearFor(item.purchaseDate, region);

  const confirmDelete = () => {
    const doDelete = () => {
      deleteItem(item.id);
      router.back();
    };
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.(`Delete ${item.name}?`)) doDelete();
      return;
    }
    Alert.alert(`Delete ${item.name}?`, 'Its photos and receipt will be removed from this phone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: doDelete },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/item/edit', params: { id: item.id } })}
              hitSlop={10}
              style={[styles.headerPill, { backgroundColor: c.card }]}>
              <AppText variant="headline" color={c.accent}>
                Edit
              </AppText>
            </Pressable>
          ),
        }}
      />
      <ScrollView contentInsetAdjustmentBehavior="never" contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <Pressable
          disabled={!item.photoUri}
          onPress={() => setViewer(item.photoUri)}
          style={[styles.hero, { backgroundColor: c.accentSoft, height: 260 + insets.top }]}>
          {item.photoUri ? (
            <Image source={{ uri: item.photoUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <Ionicons name={cat.icon} size={84} color={c.accent} style={{ marginTop: insets.top }} />
          )}
        </Pressable>

        <View style={styles.headline}>
          <AppText variant="footnote" color={c.textSecondary} style={{ fontWeight: '600' }}>
            {cat.label.toUpperCase()} · {item.use === 'work' ? 'WORK' : 'PERSONAL'}
          </AppText>
          <AppText variant="title2" style={{ fontSize: 28 }}>
            {item.name}
          </AppText>
          <AppText variant="title3" color={c.textSecondary} style={{ fontVariant: ['tabular-nums'] }}>
            {formatMoney(item.price, region, { cents: true })}
          </AppText>
        </View>

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
            <View style={[styles.track, { backgroundColor: c.fill }]}>
              <View style={[styles.trackFill, { width: `${Math.round(status.progress * 100)}%`, backgroundColor: col.fg }]} />
            </View>
          ) : null}
        </View>

        <Section title="Details">
          <Row label="Purchased" value={formatDate(item.purchaseDate, region, 'long')} />
          <Row label="Store" value={item.store || '—'} />
          <Row label="Serial number" value={item.serial || '—'} />
          <Row label="Tax year" value={taxYear.label} last />
        </Section>

        <Section title="Receipt">
          {item.receiptUri ? (
            <Pressable onPress={() => setViewer(item.receiptUri)} accessibilityRole="imagebutton" accessibilityLabel="View receipt">
              <Image source={{ uri: item.receiptUri }} style={styles.receipt} contentFit="cover" />
            </Pressable>
          ) : (
            <Row
              label="Add a receipt photo"
              icon="receipt-outline"
              chevron
              last
              onPress={() => router.push({ pathname: '/item/edit', params: { id: item.id } })}
            />
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

const styles = StyleSheet.create({
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999 },
  hero: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  headline: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, paddingBottom: Spacing.lg, gap: 4 },
  warrantyCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.xl, borderRadius: Radius.lg, padding: Spacing.lg, gap: Spacing.md },
  warrantyTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  warrantyIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  trackFill: { height: 6, borderRadius: 3 },
  receipt: { height: 220, width: '100%' },
  viewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' },
  viewerClose: {
    position: 'absolute',
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
