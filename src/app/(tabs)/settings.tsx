import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Alert, Platform, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chip, Row, ScreenTitle, Section, Segmented } from '@/components/ui';
import { Spacing, useColors } from '@/constants/theme';
import { planReminders, REMINDER_HOUR, REMINDER_OPTIONS, reminderSummary } from '@/lib/reminder-plan';
import { explainBlockedNotifications } from '@/lib/reminder-alerts';
import { openSystemSettings, remindersSupported } from '@/lib/reminders';
import { useStore } from '@/lib/store';
import { coverageCheck } from '@/lib/claim-pack';
import { formatMoney, parsePrice } from '@/lib/format';
import { currencyFor } from '@/lib/tax';
import { useEnableReminders, useReminderPermission } from '@/lib/use-reminders';

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

  const on = settings.remindersEnabled;
  const blocked = on && permission === 'denied';
  const scheduled = on && !blocked ? planReminders(items, settings.reminderDays).length : 0;

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
  const reminderFooter = !remindersSupported
    ? 'Warranty reminders work in the iPhone app, not in the browser preview.'
    : blocked
      ? 'Notifications are turned off for Itemlogger in iOS Settings.'
      : on
        ? `Reminders arrive at ${hour}. ${scheduled} coming up.`
        : 'Get a notification before a warranty runs out, while there is still time to claim.';

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <ScreenTitle title="Settings" />

        <Section title="Warranty reminders" footer={reminderFooter}>
          <Row label="Remind me" icon="notifications-outline" last={!on}>
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
                <Row label="Allow notifications" icon="warning-outline" chevron destructive last onPress={openSystemSettings} />
              ) : (
                <Row label="When" value={reminderSummary(settings.reminderDays)} last />
              )}
            </>
          ) : null}
        </Section>

        <Section title="Insurance" footer={coverageNote}>
          <Row label="Insurer">
            <TextInput
              value={ins.insurer}
              onChangeText={(insurer) => setInsurance({ insurer })}
              placeholder="e.g. NRMA"
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
          <Row label="Create claim pack" icon="document-text-outline" chevron last onPress={() => router.push('/claim')} />
        </Section>

        <Section
          title="Tax region"
          footer={
            settings.taxRegion === 'AU'
              ? 'Australian financial year (1 July – 30 June), amounts in AUD.'
              : 'US tax year (calendar year), amounts in USD.'
          }>
          <View style={{ padding: Spacing.md }}>
            <Segmented
              value={settings.taxRegion}
              onChange={(taxRegion) => updateSettings({ taxRegion })}
              options={[
                { value: 'AU', label: 'Australia' },
                { value: 'US', label: 'United States' },
              ]}
            />
          </View>
          <Row label="Currency" value={currencyFor(settings.taxRegion).code} last />
        </Section>

        <Section title="Data" footer="Everything is stored on this iPhone only. Backup and sync are coming.">
          <Row label="Items" value={String(items.length)} />
          <Row label="Add sample items" icon="sparkles-outline" onPress={addSampleItems} />
          <Row
            label="Delete all items"
            icon="trash-outline"
            destructive
            last
            onPress={() =>
              confirm('Delete all items?', 'This removes every item, photo and receipt from this phone.', 'Delete all', deleteAllItems)
            }
          />
        </Section>

        <Section title="About">
          <Row label="Version" value={Constants.expoConfig?.version ?? '1.0.0'} last />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  input: { flex: 1, fontSize: 17, paddingVertical: 0, textAlign: 'right', minWidth: 120 },
  leads: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
});
