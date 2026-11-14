import { useColorScheme } from 'react-native';

/**
 * Vestle design language: "gallery white".
 * Monochrome first, like a premium showroom: pure white pages, warm-grey surfaces, ink-black
 * pill buttons, and photography doing the talking. One cobalt accent for links and selection.
 * Dark mode is the same idea inverted: black pages, graphite surfaces, white buttons.
 */
export const Colors = {
  light: {
    ink: '#0B0B0C',
    onInk: '#FFFFFF',
    accent: '#2B4EFF',
    accentSoft: '#ECEFFF',
    onAccent: '#FFFFFF',
    background: '#FFFFFF',
    card: '#F4F4F2',
    cardPressed: '#E9E9E6',
    raised: '#FFFFFF',
    text: '#0B0B0C',
    textSecondary: '#6B6B70',
    textTertiary: '#A3A3A8',
    separator: '#E2E2DF',
    fill: '#ECECE9',
    green: '#1F8A4C',
    greenSoft: '#E4F4EA',
    orange: '#B85A00',
    orangeSoft: '#FFF1E0',
    red: '#C8102E',
    redSoft: '#FDE8EB',
    grey: '#6B6B70',
    greySoft: '#ECECE9',
  },
  dark: {
    ink: '#FFFFFF',
    onInk: '#0B0B0C',
    accent: '#8197FF',
    accentSoft: '#1A2250',
    onAccent: '#0B0B0C',
    background: '#000000',
    card: '#151517',
    cardPressed: '#222225',
    raised: '#26262A',
    text: '#F5F5F7',
    textSecondary: '#9E9EA4',
    textTertiary: '#6A6A70',
    separator: '#2A2A2E',
    fill: '#222225',
    green: '#3DDC84',
    greenSoft: '#0E2A1A',
    orange: '#FFA53D',
    orangeSoft: '#33230C',
    red: '#FF6B7A',
    redSoft: '#3A1418',
    grey: '#9E9EA4',
    greySoft: '#222225',
  },
} as const;

export type Palette = { [K in keyof typeof Colors.light]: string };

export function useColors(): Palette {
  return useColorScheme() === 'dark' ? Colors.dark : Colors.light;
}

/** Text and controls laid over photography, the same in both themes. */
export const OnPhoto = {
  text: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.78)',
  glass: 'rgba(255,255,255,0.16)',
  glassBorder: 'rgba(255,255,255,0.28)',
  scrim: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.82)'] as const,
};

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
  lg: 18,
  xl: 24,
  xxl: 30,
} as const;

/** A confident type scale: heavy, tightly tracked display sizes; calm body text. */
export const Type = {
  display: { fontSize: 44, fontWeight: '800', letterSpacing: -1.6, lineHeight: 46 },
  hero: { fontSize: 52, fontWeight: '800', letterSpacing: -2, lineHeight: 56 },
  largeTitle: { fontSize: 36, fontWeight: '800', letterSpacing: -1.1 },
  title2: { fontSize: 24, fontWeight: '700', letterSpacing: -0.6 },
  title3: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  headline: { fontSize: 17, fontWeight: '600', letterSpacing: -0.2 },
  body: { fontSize: 17, fontWeight: '400', letterSpacing: -0.2 },
  callout: { fontSize: 16, fontWeight: '400' },
  subhead: { fontSize: 15, fontWeight: '400', letterSpacing: -0.1 },
  footnote: { fontSize: 13, fontWeight: '400' },
  caption: { fontSize: 12, fontWeight: '500' },
  eyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase' },
} as const;
