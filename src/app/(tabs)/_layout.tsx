import { Redirect } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';

import { useColors } from '@/constants/theme';
import { useStore } from '@/lib/store';

export default function TabsLayout() {
  const c = useColors();
  const { settings } = useStore();
  if (!settings.onboarded) return <Redirect href="/welcome" />;
  return (
    <NativeTabs tintColor={c.ink}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Items</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'shippingbox', selected: 'shippingbox.fill' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="tax">
        <NativeTabs.Trigger.Label>Tax</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'doc.text', selected: 'doc.text.fill' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
