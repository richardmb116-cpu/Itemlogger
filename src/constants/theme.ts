import { useColorScheme } from 'react-native';

/**
 * Apple Store-style palette: white pages, soft grey (#F5F5F7) tiles, Apple blue accent.
 * Dark mode mirrors it with black pages and elevated grey tiles.
 */
export const Colors = {
  light: {
    accent: '#0071E3',
    accentSoft: '#E8F1FD',
    onAccent: '#FFFFFF',
    background: '#FFFFFF',
    card: '#F5F5F7',
    cardPressed: '#E8E8ED',
    raised: '#FFFFFF',
    text: '#1D1D1F',
    textSecondary: '#6E6E73',
    textTertiary: '#A1A1A6',
    separator: '#D2D2D7',
    fill: '#EBEBF0',
    green: '#248A3D',
    greenSoft: '#E3F5E7',
    orange: '#C25E00',
    orangeSoft: '#FFF0DC',
    red: '#D70015',
    redSoft: '#FFE5E7',
    grey: '#6E6E73',
    greySoft: '#EBEBF0',
  },
  dark: {
    accent: '#2997FF',
    accentSoft: '#0B2847',
    onAccent: '#FFFFFF',
    background: '#000000',
    card: '#1C1C1E',
    cardPressed: '#2C2C2E',
    raised: '#3A3A3C',
    text: '#F5F5F7',
    textSecondary: '#A1A1A6',
    textTertiary: '#6E6E73',
    separator: '#38383A',
    fill: '#2C2C2E',
    green: '#30D158',
    greenSoft: '#0F2E17',
    orange: '#FF9F0A',
    orangeSoft: '#33240A',
    red: '#FF6961',
    redSoft: '#3A1414',
    grey: '#A1A1A6',
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
  xxl: 28,
} as const;

/** iOS Dynamic Type default sizes. */
export const Type = {
  largeTitle: { fontSize: 34, fontWeight: '700', letterSpacing: -0.4 },
  title2: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  title3: { fontSize: 20, fontWeight: '600' },
  headline: { fontSize: 17, fontWeight: '600' },
  body: { fontSize: 17, fontWeight: '400' },
  callout: { fontSize: 16, fontWeight: '400' },
  subhead: { fontSize: 15, fontWeight: '400' },
  footnote: { fontSize: 13, fontWeight: '400' },
  caption: { fontSize: 12, fontWeight: '500' },
} as const;
