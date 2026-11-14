import { useColorScheme } from 'react-native';

/**
 * iOS-style palette: grouped backgrounds, white cards, one accent.
 * Values follow Apple's system colours so the app feels native in light and dark mode.
 */
export const Colors = {
  light: {
    accent: '#0E8A6A',
    accentSoft: '#DDF3EC',
    onAccent: '#FFFFFF',
    background: '#F2F2F7',
    card: '#FFFFFF',
    cardPressed: '#E5E5EA',
    text: '#000000',
    textSecondary: '#6C6C70',
    textTertiary: '#A1A1A6',
    separator: '#C6C6C8',
    fill: '#E9E9EE',
    green: '#248A3D',
    greenSoft: '#E3F5E7',
    orange: '#C25E00',
    orangeSoft: '#FFF0DC',
    red: '#D70015',
    redSoft: '#FFE5E7',
    grey: '#6C6C70',
    greySoft: '#EDEDF0',
  },
  dark: {
    accent: '#34C79A',
    accentSoft: '#11372D',
    onAccent: '#00140E',
    background: '#000000',
    card: '#1C1C1E',
    cardPressed: '#2C2C2E',
    text: '#FFFFFF',
    textSecondary: '#AEAEB2',
    textTertiary: '#6C6C70',
    separator: '#38383A',
    fill: '#2C2C2E',
    green: '#30D158',
    greenSoft: '#0F2E17',
    orange: '#FF9F0A',
    orangeSoft: '#33240A',
    red: '#FF6961',
    redSoft: '#3A1414',
    grey: '#AEAEB2',
    greySoft: '#2C2C2E',
  },
} as const;

export type Palette = { [K in keyof typeof Colors.light]: string };

export function useColors(): Palette {
  return useColorScheme() === 'dark' ? Colors.dark : Colors.light;
}

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
} as const;

/** iOS Dynamic Type default sizes. */
export const Type = {
  largeTitle: { fontSize: 34, fontWeight: '700', letterSpacing: 0.4 },
  title2: { fontSize: 22, fontWeight: '700' },
  title3: { fontSize: 20, fontWeight: '600' },
  headline: { fontSize: 17, fontWeight: '600' },
  body: { fontSize: 17, fontWeight: '400' },
  callout: { fontSize: 16, fontWeight: '400' },
  subhead: { fontSize: 15, fontWeight: '400' },
  footnote: { fontSize: 13, fontWeight: '400' },
  caption: { fontSize: 12, fontWeight: '500' },
} as const;
