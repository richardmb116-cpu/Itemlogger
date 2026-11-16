import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Alert, Platform, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Chip, Row, ScreenTitle, Section, Segmented } from '@/components/ui';
import { Spacing, useColors } from '@/constants/theme';
import { planReminders, REMINDER_HOUR, REMINDER_OPTIONS, reminderSummary } from '@/lib/reminder-plan';
import { explainBlockedNotifications } from '@/lib/reminder-alerts';
import { openSystemSettings, remindersSupported, requestPermission } from '@/lib/reminders';
import { useStore } from '@/lib/store';
import { coverageCheck } from '@/lib/claim-pack';
import { formatMoney, parsePrice } from '@/lib/format';
import { currencyFor } from '@/lib/tax';
import { useEnableReminders, useReminderPermission } from '@/lib/use-reminders';
import { useSync } from '@/lib/use-sync';

function confirm(title: string, message: string, action: string, onConfirm: () => void) {
  // The web preview can't show native dialogs, so it goes ahead straight away.
  if (Platform.OS === 'web') return onConfirm();
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: action, style: 'destructive', onPress: onConfirm },
  ]);
}

export default function SettingsScreen() {
  const c = useColors();
  const { settings, updateSettings, items, addSampleItems, deleteAllItems } = useStore();
  const { permission } = useReminderPermission();
  const syncState = useSync();
  const enableReminders = useEnableReminders();

  const ins = settings.insurance;
  const setInsurance = (patch: Partial<typeof ins>) => updateSettings({ insurance: { ...ins, ...patch } });
  const totalPaid = items.filter((i) => !i.sold).reduce((sum, i) => sum + (i.price ?? 0), 0);
  const coverage = coverageCheck(totalPaid, ins.sumInsured);
  const coverageNote =
    coverage.state === 'under'
      ? `Your items cost ${formatMoney(coverage.gap, settings.taxRegion, { cents: false })} more than this. You may be underinsured.`
      : coverage.state === 'ok'
        ? `Your items cost ${formatMoney(totalPaid, settings.taxRegion, { cents: false })}, within this cover.`
        : 'Shown on your claim pack. Add your contents sum insured to check you are covered.';
  const inputStyle = [styles.input, { color: c.text }];

  const dep = settings.depreciation;
  const setDep = (patch: Partial<typeof dep>) => updateSettings({ depreciation: { ...dep, ...patch } });

  const on = settings.remindersEnabled;
  const blocked = on && permission === 'denied';
  const scheduled = on && !blocked ? planReminders(items, settings.reminderDays).length : 0;

  const toggleBirthdays = async (value: boolean) => {
    if (!value) {
      updateSettings({ birthdaysEnabled: false });
      return;
    }
    updateSettings({ birthdaysEnabled: true });
    if (remindersSupported && (await requestPermission()) !== 'granted') explainBlockedNotifications();
  };

  const toggleReminders = async (value: boolean) => {
    if (!value) {
      updateSettings({ remindersEnabled: false });
      return;
    }
    const granted = await enableReminders();
    if (!granted) explainBlockedNotifications();
  };

  const toggleLead = (days: number) => {
    const current = settings.reminderDays;
    const next = current.includes(days) ? current.filter((d) => d !== days) : [...current, days];
    if (next.length > 0) updateSettings({ reminderDays: next });
  };

  const hour = REMINDER_HOUR > 12 ? `${REMINDER_HOUR - 12} pm` : `${REMINDER_HOUR} am`;
  const birthdayNote = settings.birthdaysEnabled ? ` Birthdays: a note at ${hour} on each purchase anniversary.` : '';
  const notificationFooter = !remindersSupported
    ? 'Reminders and birthday notes work in the iPhone app, not in the browser preview.'
    : blocked
      ? 'Notifications are turned off for Vestle in iOS Settings.'
      : (on
          ? `Reminders arrive at ${hour}. ${scheduled} coming up.`
          : 'Get a notification before a warranty runs out, while there is still time to claim.') + birthdayNote;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <ScreenTitle eyebrow="Vestle" title="Settings" />

        {syncState.configured ? <SyncSection state={syncState} /> : null}

        <Section
          title="Country"
          footer={
            settings.taxRegion === 'AU'
              ? `Sets currency, dates, tax year, depreciation rules and marketplaces across the app. Australian financial year (1 July – 30 June), amounts in AUD. ${
                  dep.showAdvanced
                    ? 'Diminishing value claims more in the early years; prime cost spreads it evenly. The low-value pool groups items under $1,000. Pick what your accountant uses.'
                    : 'Turn on accountant details to choose the depreciation method and see year-by-year schedules.'
                }`
              : `Sets currency, dates, tax year, depreciation rules and marketplaces across the app. US tax year (calendar year), amounts in USD. ${
                  dep.showAdvanced
                    ? 'Section 179 deducts the business share in the first year; MACRS spreads it over 5 or 7 years. Pick what your accountant uses.'
                    : 'Turn on accountant details to choose the depreciation method and see year-by-year schedules.'
                }`
          }>
          <View style={{ padding: Spacing.md }}>
            <Segmented
              value={settings.taxRegion}
              onChange={(taxRegion) => updateSettings({ taxRegion })}
              options={[
                { value: 'US', label: '🇺🇸  United States' },
                { value: 'AU', label: '🇦🇺  Australia' },
              ]}
            />
          </View>
          <Row label="Currency" value={currencyFor(settings.taxRegion).code} />
          <Row label="Accountant details" last={!dep.showAdvanced}>
            <Switch
              value={dep.showAdvanced}
              onValueChange={(showAdvanced) => setDep({ showAdvanced })}
              trackColor={{ true: c.green, false: c.fill }}
              accessibilityLabel="Accountant details"
            />
          </Row>
          {dep.showAdvanced ? (
            <>
              <View style={{ padding: Spacing.md, gap: Spacing.sm }}>
                <AppText variant="footnote" color={c.textSecondary}>
                  Depreciation method
                </AppText>
                {settings.taxRegion === 'AU' ? (
                  <Segmented
                    value={dep.auMethod}
                    onChange={(auMethod) => setDep({ auMethod })}
                    options={[
                      { value: 'diminishing', label: 'Diminishing value' },
                      { value: 'prime', label: 'Prime cost' },
                    ]}
                  />
                ) : (
                  <Segmented
                    value={dep.usMethod}
                    onChange={(usMethod) => setDep({ usMethod })}
                    options={[
                      { value: 'section179', label: 'Section 179' },
                      { value: 'macrs', label: 'MACRS' },
                    ]}
                  />
                )}
              </View>
              {settings.taxRegion === 'AU' ? (
                <Row label="Low-value pool" last>
                  <Switch
                    value={dep.auLowValuePool}
                    onValueChange={(auLowValuePool) => setDep({ auLowValuePool })}
                    trackColor={{ true: c.green, false: c.fill }}
                    accessibilityLabel="Low-value pool"
                  />
                </Row>
              ) : null}
            </>
          ) : null}
        </Section>

        <Section
          title="Upgrading"
          footer={
            settings.upgradeStyle === 'value'
              ? 'Sell timing counts only value lost and the risk of it failing. Best if you keep things until they’re worn.'
              : settings.upgradeStyle === 'latest'
                ? 'Falling behind newer models counts heavily, so you’ll be told to sell and upgrade sooner.'
                : 'Weighs value lost, failure risk and falling behind newer models evenly.'
          }>
          <View style={{ padding: Spacing.md, gap: Spacing.sm }}>
            <AppText variant="subhead">How much do you care about having the latest?</AppText>
            <Segmented
              value={settings.upgradeStyle}
              onChange={(upgradeStyle) => updateSettings({ upgradeStyle })}
              options={[
                { value: 'value', label: 'Full value' },
                { value: 'balanced', label: 'Balanced' },
                { value: 'latest', label: 'Stay current' },
              ]}
            />
          </View>
        </Section>

        <Section title="Notifications" footer={notificationFooter}>
          <Row label="Warranty reminders" icon="notifications-outline">
            <Switch
              value={on}
              onValueChange={toggleReminders}
              trackColor={{ true: c.green, false: c.fill }}
              accessibilityLabel="Warranty reminders"
            />
          </Row>
          {on ? (
            <>
              <View style={styles.leads}>
                {REMINDER_OPTIONS.map((o) => (
                  <Chip
                    key={o.days}
                    label={o.label}
                    selected={settings.reminderDays.includes(o.days)}
                    onPress={() => toggleLead(o.days)}
                  />
                ))}
              </View>
              {blocked ? (
                <Row
                  label="Allow notifications"
                  icon="warning-outline"
                  chevron
                  destructive
                  onPress={openSystemSettings}
                />
              ) : (
                <Row label="When" value={reminderSummary(settings.reminderDays)} />
              )}
            </>
          ) : null}
          <Row label="Celebrate birthdays" icon="gift-outline" last>
            <Switch
              value={settings.birthdaysEnabled}
              onValueChange={toggleBirthdays}
              trackColor={{ true: c.green, false: c.fill }}
              accessibilityLabel="Item birthdays"
            />
          </Row>
        </Section>

        <Section title="Insurance" footer={coverageNote}>
          <Row label="Insurer">
            <TextInput
              value={ins.insurer}
              onChangeText={(insurer) => setInsurance({ insurer })}
              placeholder={settings.taxRegion === 'US' ? 'e.g. State Farm' : 'e.g. NRMA'}
              placeholderTextColor={c.textTertiary}
              style={inputStyle}
              accessibilityLabel="Insurer"
            />
          </Row>
          <Row label="Policy number">
            <TextInput
              value={ins.policyNumber}
              onChangeText={(policyNumber) => setInsurance({ policyNumber })}
              placeholder="Optional"
              placeholderTextColor={c.textTertiary}
              autoCapitalize="characters"
              autoCorrect={false}
              style={inputStyle}
              accessibilityLabel="Policy number"
            />
          </Row>
          <Row label="Contents cover">
            <TextInput
              defaultValue={ins.sumInsured != null ? String(ins.sumInsured) : ''}
              onChangeText={(t) => setInsurance({ sumInsured: parsePrice(t) })}
              placeholder="Sum insured"
              placeholderTextColor={c.textTertiary}
              keyboardType="decimal-pad"
              style={inputStyle}
              accessibilityLabel="Contents sum insured"
            />
          </Row>
          <Row
            label="Create claim pack"
            icon="document-text-outline"
            chevron
            last
            onPress={() => router.push('/claim')}
          />
        </Section>

        <Section
          title="Data"
          footer={
            syncState.status === 'off' || syncState.status === 'signed-out'
              ? 'Everything is stored on this device only.'
              : 'Stored on this device and synced to your account.'
          }>
          <Row label="Items" value={String(items.length)} />
          <Row label="Add sample items" icon="sparkles-outline" onPress={addSampleItems} />
          <Row
            label="Delete all items"
            icon="trash-outline"
            destructive
            last
            onPress={() =>
              confirm(
                'Delete all items?',
                'This removes every item, photo and receipt from this phone.',
                'Delete all',
                deleteAllItems,
              )
            }
          />
        </Section>

        <Section title="About">
          <Row
            label="Show welcome again"
            icon="sparkles-outline"
            chevron
            onPress={() => {
              updateSettings({ onboarded: false });
              router.replace('/welcome');
            }}
          />
          <Row label="Version" value={Constants.expoConfig?.version ?? '1.0.0'} last />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  input: { flex: 1, fontSize: 17, paddingVertical: 0, textAlign: 'right', minWidth: 120 },
  leads: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
});

function SyncSection({ state }: { state: ReturnType<typeof useSync> }) {
  const { configured, status, email, lastSynced, error, sync, signOut } = state;
  const when = lastSynced ? lastSynced.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : null;
  if (!configured || status === 'signed-out') {
    return (
      <Section
        title="Sync"
        footer={
          configured
            ? 'Sign in to keep your items, photos and receipts on all your devices, backed up.'
            : 'This build has no sync server, so everything stays on this device. See the README to connect Supabase.'
        }>
        <Row
          label={configured ? 'Sign in to sync' : 'Sync isn’t set up'}
          icon={configured ? 'cloud-upload-outline' : 'cloud-offline-outline'}
          onPress={configured ? () => router.push('/account') : undefined}
          last
        />
      </Section>
    );
  }
  return (
    <Section
      title="Sync"
      footer={
        status === 'error'
          ? `Couldn’t sync: ${error}. Changes are kept on this device and will sync when it works again.`
          : 'Changes sync automatically, and the most recent edit wins.'
      }>
      <Row label="Signed in" value={email ?? ''} icon="person-circle-outline" />
      <Row
        label={status === 'syncing' ? 'Syncing…' : 'Sync now'}
        value={status === 'error' ? 'Not synced' : when ? `Synced ${when}` : undefined}
        icon="sync-outline"
        onPress={() => void sync()}
      />
      <Row
        label="Sign out"
        icon="log-out-outline"
        destructive
        last
        onPress={() =>
          confirm(
            'Sign out?',
            'Your items stay on this device. Sign in again any time to sync.',
            'Sign out',
            () => void signOut(),
          )
        }
      />
    </Section>
  );
}
