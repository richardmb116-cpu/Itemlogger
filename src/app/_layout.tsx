import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { StoreProvider } from '@/lib/store';
import { useReminderSync } from '@/lib/use-reminders';

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
    colors: { ...base.colors, primary: c.accent, background: c.background, card: c.card, text: c.text },
  };

  return (
    <StoreProvider>
      <ThemeProvider value={theme}>
        <StatusBar style="auto" />
        <ReminderSync />
        <Stack
          screenOptions={{
            headerTintColor: c.accent,
            headerStyle: { backgroundColor: c.background },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: c.background },
          }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Items' }} />
          <Stack.Screen
            name="item/[id]"
            options={{ title: '', headerShadowVisible: false, headerBackButtonDisplayMode: 'minimal' }}
          />
          <Stack.Screen name="item/edit" options={{ presentation: 'modal', title: 'New item' }} />
          <Stack.Screen name="item/sell" options={{ presentation: 'modal', title: 'Sell' }} />
        </Stack>
      </ThemeProvider>
    </StoreProvider>
  );
}
