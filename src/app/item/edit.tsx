import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { DateField } from '@/components/date-field';
import { AppText, Chip, Row, Section, Segmented, tap } from '@/components/ui';
import { Radius, Spacing, useColors } from '@/constants/theme';
import { CATEGORIES } from '@/lib/categories';
import { suggestedLife } from '@/lib/depreciation';
import { todayISO } from '@/lib/dates';
import { parsePrice } from '@/lib/format';
import { deleteImage, persistImage, pickImage } from '@/lib/images';
import { newId, useStore } from '@/lib/store';
import { currencyFor, taxYearFor } from '@/lib/tax';
import type { Category, Condition, Item, ItemUse } from '@/lib/types';
import { CONDITIONS } from '@/lib/valuation';

const WARRANTY_OPTIONS: { months: number | null; label: string }[] = [
  { months: null, label: 'None' },
  { months: 6, label: '6 mo' },
  { months: 12, label: '1 yr' },
  { months: 24, label: '2 yr' },
  { months: 36, label: '3 yr' },
  { months: 60, label: '5 yr' },
];

export default function EditItemScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const c = useColors();
  const { getItem, saveItem, settings } = useStore();
  const existing = id ? getItem(id) : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [model, setModel] = useState(existing?.model ?? '');
  const [category, setCategory] = useState<Category>(existing?.category ?? 'electronics');
  const [price, setPrice] = useState(existing?.price != null ? String(existing.price) : '');
  const [purchaseDate, setPurchaseDate] = useState(existing?.purchaseDate ?? todayISO());
  const [store, setStore] = useState(existing?.store ?? '');
  const [serial, setSerial] = useState(existing?.serial ?? '');
  const [warrantyMonths, setWarrantyMonths] = useState<number | null>(existing ? existing.warrantyMonths : 12);
  const [use, setUse] = useState<ItemUse>(existing?.use ?? 'personal');
  const [workPercent, setWorkPercent] = useState(String(existing?.workPercent ?? 100));
  const [lifeYears, setLifeYears] = useState(existing?.effectiveLifeYears != null ? String(existing.effectiveLifeYears) : '');
  const [condition, setCondition] = useState<Condition>(existing?.condition ?? 'like-new');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [photoUri, setPhotoUri] = useState<string | null>(existing?.photoUri ?? null);
  const [receiptUri, setReceiptUri] = useState<string | null>(existing?.receiptUri ?? null);

  const canSave = name.trim().length > 0;
  const suggested = suggestedLife({ name, model, category });
  const region = settings.taxRegion;
  const isCustomWarranty = warrantyMonths != null && !WARRANTY_OPTIONS.some((o) => o.months === warrantyMonths);

  const save = () => {
    if (!canSave) return;
    const now = new Date().toISOString();
    const finalPhoto = photoUri ? persistImage(photoUri) : null;
    const finalReceipt = receiptUri ? persistImage(receiptUri) : null;
    // Clean up images that were replaced or removed.
    if (existing?.photoUri && existing.photoUri !== finalPhoto) deleteImage(existing.photoUri);
    if (existing?.receiptUri && existing.receiptUri !== finalReceipt) deleteImage(existing.receiptUri);

    const item: Item = {
      id: existing?.id ?? newId(),
      name: name.trim(),
      model: model.trim(),
      category,
      price: parsePrice(price),
      purchaseDate,
      store: store.trim(),
      serial: serial.trim(),
      warrantyMonths,
      use,
      workPercent: clampPercent(workPercent),
      effectiveLifeYears: parseLife(lifeYears),
      condition,
      checkedPrice: existing?.checkedPrice ?? null,
      sold: existing?.sold ?? null,
      notes: notes.trim(),
      photoUri: finalPhoto,
      receiptUri: finalReceipt,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    saveItem(item);
    router.back();
  };

  const choose = async (kind: 'photo' | 'receipt') => {
    const current = kind === 'photo' ? photoUri : receiptUri;
    const result = await pickImage({ title: kind === 'photo' ? 'Item photo' : 'Receipt', canRemove: !!current });
    if (result === null) return;
    const set = kind === 'photo' ? setPhotoUri : setReceiptUri;
    set(result === 'remove' ? null : result);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen
        options={{
          title: existing ? 'Edit item' : 'New item',
          headerLeft: () => (
            <HeaderText label="Cancel" onPress={() => router.back()} color={c.textSecondary} />
          ),
          headerRight: () => (
            <HeaderText label="Save" bold onPress={save} color={canSave ? c.ink : c.textTertiary} disabled={!canSave} />
          ),
        }}
      />
      <ScrollView
        style={{ backgroundColor: c.background }}
        contentContainerStyle={{ paddingTop: Spacing.lg, paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive">
        <View style={styles.photoRow}>
          <PhotoSlot label="Item photo" icon="camera" uri={photoUri} onPress={() => choose('photo')} />
          <PhotoSlot label="Receipt" icon="receipt" uri={receiptUri} onPress={() => choose('receipt')} />
        </View>

        <Section>
          <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Samsung fridge" autoFocus={!existing} />
          <Field
            label="Model"
            value={model}
            onChangeText={setModel}
            placeholder="Make and model, for price checks"
            autoCorrect={false}
          />
          <Field
            label="Price"
            value={price}
            onChangeText={setPrice}
            placeholder={currencyFor(region).code === 'AUD' ? 'A$0.00' : '$0.00'}
            keyboardType="decimal-pad"
          />
          <Row label="Purchased">
            <DateField value={purchaseDate} onChange={setPurchaseDate} />
          </Row>
          <Field label="Store" value={store} onChangeText={setStore} placeholder="Where you bought it" />
          <Field
            label="Serial no."
            value={serial}
            onChangeText={setSerial}
            placeholder="Optional"
            autoCapitalize="characters"
            autoCorrect={false}
            last
          />
        </Section>

        <Section title="Category">
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => {
              const selected = cat.id === category;
              return (
                <Pressable
                  key={cat.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    tap();
                    setCategory(cat.id);
                  }}
                  style={[
                    styles.categoryTile,
                    { backgroundColor: selected ? c.raised : c.fill, borderColor: selected ? c.ink : 'transparent' },
                  ]}>
                  <Ionicons name={cat.icon} size={22} color={selected ? c.ink : c.textSecondary} />
                  <AppText variant="caption" color={selected ? c.ink : c.textSecondary} numberOfLines={1} style={{ fontWeight: selected ? '700' : '500' }}>
                    {cat.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </Section>

        <Section title="Condition" footer="Used to estimate what it would sell for second-hand.">
          <View style={{ padding: Spacing.md }}>
            <Segmented
              value={condition}
              onChange={setCondition}
              options={CONDITIONS.map((o) => ({ value: o.id, label: o.label }))}
            />
          </View>
        </Section>

        <Section title="Warranty" footer="Check the box or the maker's website. You can change this later.">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.warrantyChips}>
            {WARRANTY_OPTIONS.map((o) => (
              <Chip
                key={o.label}
                label={o.label}
                selected={warrantyMonths === o.months}
                onPress={() => setWarrantyMonths(o.months)}
              />
            ))}
            {isCustomWarranty ? <Chip label={`${warrantyMonths} mo`} selected onPress={() => {}} /> : null}
          </ScrollView>
        </Section>

        <Section
          title="Used for"
          footer={
            use === 'work'
              ? `Counts toward ${taxYearFor(purchaseDate, region).label}. Only the work share is claimed.${
                  region === 'AU' && settings.depreciation.showAdvanced
                    ? " Leave effective life blank to use the suggestion, or check the ATO's effective life table."
                    : ''
                }`
              : `Counts toward ${taxYearFor(purchaseDate, region).label}. Work items appear in your tax summary.`
          }>
          <View style={{ padding: Spacing.md }}>
            <Segmented
              value={use}
              onChange={setUse}
              options={[
                { value: 'personal', label: 'Personal' },
                { value: 'work', label: 'Work' },
              ]}
            />
          </View>
          {use === 'work' ? (
            <>
              <Row label="Work use">
                <View style={styles.percentRow}>
                  <TextInput
                    value={workPercent}
                    onChangeText={setWorkPercent}
                    keyboardType="number-pad"
                    maxLength={3}
                    style={[styles.percentInput, { color: c.text, backgroundColor: c.raised }]}
                    accessibilityLabel="Work use percent"
                  />
                  <AppText color={c.textSecondary}>%</AppText>
                </View>
              </Row>
              <View style={styles.percentChips}>
                {[100, 80, 50, 20].map((p) => (
                  <Chip key={p} label={`${p}%`} selected={clampPercent(workPercent) === p} onPress={() => setWorkPercent(String(p))} />
                ))}
              </View>
              {region === 'AU' && settings.depreciation.showAdvanced ? (
                <Field
                  label="Effective life"
                  value={lifeYears}
                  onChangeText={setLifeYears}
                  placeholder={`${suggested.years} yrs (${suggested.basis.toLowerCase()})`}
                  keyboardType="decimal-pad"
                  last
                />
              ) : null}
            </>
          ) : null}
        </Section>

        <Section title="Notes">
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Model number, where it's kept, anything useful"
            placeholderTextColor={c.textTertiary}
            multiline
            style={[styles.notes, { color: c.text }]}
          />
        </Section>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function HeaderText({
  label,
  onPress,
  color,
  bold,
  disabled,
}: {
  label: string;
  onPress: () => void;
  color: string;
  bold?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled} hitSlop={10} style={{ paddingHorizontal: 6 }}>
      <AppText color={color} style={{ fontWeight: bold ? '600' : '400' }}>
        {label}
      </AppText>
    </Pressable>
  );
}

function Field({
  label,
  last,
  ...input
}: { label: string; last?: boolean } & ComponentProps<typeof TextInput>) {
  const c = useColors();
  return (
    <Row label={label} last={last}>
      <TextInput
        placeholderTextColor={c.textTertiary}
        style={[styles.fieldInput, { color: c.text, textAlign: 'right' }]}
        {...input}
      />
    </Row>
  );
}

function PhotoSlot({
  label,
  icon,
  uri,
  onPress,
}: {
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  uri: string | null;
  onPress: () => void;
}) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={uri ? `Change ${label.toLowerCase()}` : `Add ${label.toLowerCase()}`}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [styles.slot, { backgroundColor: c.card, opacity: pressed ? 0.8 : 1 }]}>
      {uri ? (
        <>
          <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
          <View style={styles.slotBadge}>
            <AppText variant="caption" color="#fff">
              {label}
            </AppText>
          </View>
        </>
      ) : (
        <>
          <View style={[styles.slotIcon, { backgroundColor: c.raised }]}>
            <Ionicons name={icon} size={24} color={c.ink} />
          </View>
          <AppText variant="subhead" style={{ fontWeight: '600' }}>
            {label}
          </AppText>
          <AppText variant="caption" color={c.textSecondary}>
            Tap to add
          </AppText>
        </>
      )}
    </Pressable>
  );
}

function clampPercent(text: string): number {
  const n = Number.parseInt(text, 10);
  return Number.isFinite(n) ? Math.min(100, Math.max(1, n)) : 100;
}

function parseLife(text: string): number | null {
  const n = Number.parseFloat(text);
  return Number.isFinite(n) && n > 0 ? Math.min(50, n) : null;
}

const styles = StyleSheet.create({
  percentRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  percentChips: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  percentInput: { width: 52, height: 32, borderRadius: 8, textAlign: 'center', fontSize: 16 },
  photoRow: { flexDirection: 'row', gap: Spacing.md, paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl },
  slot: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: Radius.xxl,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    overflow: 'hidden',
  },
  slotIcon: { width: 52, height: 52, borderRadius: 26, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  slotBadge: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderCurve: 'continuous',
  },
  fieldInput: { flex: 1, fontSize: 17, paddingVertical: 0, minWidth: 120 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: Spacing.sm, gap: Spacing.sm },
  categoryTile: {
    width: '31.5%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: Spacing.md,
    paddingHorizontal: 4,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    borderWidth: 1.5,
  },
  warrantyChips: { gap: Spacing.sm, padding: Spacing.md },
  notes: { minHeight: 90, padding: Spacing.lg, paddingTop: Spacing.md, fontSize: 17, textAlignVertical: 'top' },
});
