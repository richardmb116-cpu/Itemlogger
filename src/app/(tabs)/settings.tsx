import Constants from 'expo-constants';
import { Alert, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Row, ScreenTitle, Section, Segmented } from '@/components/ui';
import { Spacing, useColors } from '@/constants/theme';
import { useStore } from '@/lib/store';
import { currencyFor } from '@/lib/tax';

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

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <ScreenTitle title="Settings" />

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
