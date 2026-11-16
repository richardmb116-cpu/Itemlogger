import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { StoreProvider } from '@/lib/store';
import { useReminderSync } from '@/lib/use-reminders';
import { SyncProvider } from '@/lib/use-sync';

function ReminderSync() {
  useReminderSync();
  return null;
}

export default function RootLayout() {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const c = dark ? Colors.dark : Colors.light;
  const base = dark ? DarkTheme : DefaultTheme;
  const theme = {
    ...base,
    colors: { ...base.colors, primary: c.ink, background: c.background, card: c.card, text: c.text },
  };

  return (
    <StoreProvider>
      <SyncProvider>
        <ThemeProvider value={theme}>
          <StatusBar style="auto" />
          <ReminderSync />
          <Stack
            screenOptions={{
              headerTintColor: c.ink,
              headerTitleStyle: { fontWeight: '700' },
              headerStyle: { backgroundColor: c.background },
              headerShadowVisible: false,
              contentStyle: { backgroundColor: c.background },
            }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Items' }} />
            <Stack.Screen name="welcome" options={{ headerShown: false, animation: 'fade', gestureEnabled: false }} />
            <Stack.Screen
              name="item/[id]"
              options={{ title: '', headerShadowVisible: false, headerBackButtonDisplayMode: 'minimal' }}
            />
            <Stack.Screen name="item/edit" options={{ presentation: 'modal', title: 'New item' }} />
            <Stack.Screen name="item/sell" options={{ presentation: 'modal', title: 'Sell' }} />
            <Stack.Screen name="claim" options={{ presentation: 'modal', title: 'Claim pack' }} />
            <Stack.Screen name="accountant" options={{ presentation: 'modal', title: 'For your accountant' }} />
            <Stack.Screen name="account" options={{ presentation: 'modal', title: 'Sync' }} />
          <Stack.Screen name="scan" options={{ presentation: 'modal', title: 'Scan receipt' }} />
          </Stack>
        </ThemeProvider>
      </SyncProvider>
    </StoreProvider>
  );
}
