import Constants from 'expo-constants';
import { Alert, Platform, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chip, Row, ScreenTitle, Section, Segmented } from '@/components/ui';
import { Spacing, useColors } from '@/constants/theme';
import { planReminders, REMINDER_HOUR, REMINDER_OPTIONS, reminderSummary } from '@/lib/reminder-plan';
import { explainBlockedNotifications } from '@/lib/reminder-alerts';
import { openSystemSettings, remindersSupported } from '@/lib/reminders';
import { useStore } from '@/lib/store';
import { currencyFor } from '@/lib/tax';
import { useEnableReminders, useReminderPermission } from '@/lib/use-reminders';

function confirm(title: string, message: string, action: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${title}\n\n${message}`)) onConfirm();
    return;
  }
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
  leads: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
});
