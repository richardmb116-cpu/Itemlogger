import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Alert, Platform, useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { kvReady, onSaveFailure } from '@/lib/storage';
import { StoreProvider } from '@/lib/store';
import { useReminderSync } from '@/lib/use-reminders';
import { SyncProvider } from '@/lib/use-sync';
import { BadgeProvider } from '@/lib/use-badges';
import { BadgeToast } from '@/components/badge-toast';

function ReminderSync() {
  useReminderSync();
  return null;
}

/** Warn, rather than lose changes silently, when storage refuses a save. */
function SaveFailureAlert() {
  useEffect(
    () =>
      onSaveFailure((message) => {
        if (Platform.OS === 'web') globalThis.alert?.(message);
        else Alert.alert('Not saved', message);
      }),
    [],
  );
  return null;
}

export default function RootLayout() {
  const scheme = useColorScheme();
  // In the browser, saved data loads from IndexedDB before the app can read it.
  const [ready, setReady] = useState(Platform.OS !== 'web');
  useEffect(() => {
    if (!ready) void kvReady.then(() => setReady(true));
  }, [ready]);
  const dark = scheme === 'dark';
  const c = dark ? Colors.dark : Colors.light;
  const base = dark ? DarkTheme : DefaultTheme;
  const theme = {
    ...base,
    colors: { ...base.colors, primary: c.ink, background: c.background, card: c.card, text: c.text },
  };

  if (!ready) return null;

  return (
    <StoreProvider>
      <SyncProvider>
        <BadgeProvider>
          <ThemeProvider value={theme}>
            <StatusBar style="auto" />
            <ReminderSync />
            <SaveFailureAlert />
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
              <Stack.Screen name="scan" options={{ presentation: 'modal', title: '' }} />
              <Stack.Screen name="progress" options={{ presentation: 'modal', title: 'Your progress' }} />
            </Stack>
            <BadgeToast />
          </ThemeProvider>
        </BadgeProvider>
      </SyncProvider>
    </StoreProvider>
  );
}
