import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { StoreProvider } from '@/lib/store';

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
        <Stack screenOptions={{ headerTintColor: c.accent, contentStyle: { backgroundColor: c.background } }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Items' }} />
          <Stack.Screen
            name="item/[id]"
            options={{ title: '', headerTransparent: true, headerBackButtonDisplayMode: 'minimal' }}
          />
          <Stack.Screen name="item/edit" options={{ presentation: 'modal', title: 'New item' }} />
        </Stack>
      </ThemeProvider>
    </StoreProvider>
  );
}
