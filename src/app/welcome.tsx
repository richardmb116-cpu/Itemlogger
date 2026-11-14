import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, tap } from '@/components/ui';
import { OnPhoto, Spacing } from '@/constants/theme';
import { WELCOME_PHOTOS } from '@/lib/photos';
import { useStore } from '@/lib/store';
import type { TaxRegion } from '@/lib/types';

const PAGES = [
  {
    photo: WELCOME_PHOTOS.home,
    eyebrow: 'Keep Track',
    title: 'Track your\nkeeps.',
    body: 'Everything you own, with its warranty, receipt and value, kept beautifully in one place.',
  },
  {
    photo: WELCOME_PHOTOS.warranty,
    eyebrow: 'Warranties',
    title: 'Never miss\na warranty.',
    body: 'A reminder before cover runs out, while there is still time to claim.',
  },
  {
    photo: WELCOME_PHOTOS.insurance,
    eyebrow: 'Insurance',
    title: 'Ready for\nthe worst day.',
    body: 'One tap builds a claim pack with photos, receipts and serial numbers.',
  },
  {
    photo: WELCOME_PHOTOS.sell,
    eyebrow: 'Resale',
    title: 'Know what\nit’s worth.',
    body: 'See today’s value, check real sold prices and post a listing in seconds.',
  },
  {
    photo: WELCOME_PHOTOS.tax,
    eyebrow: 'Tax time',
    title: 'Receipts,\nsorted.',
    body: 'Tag work purchases and hand your accountant everything in one file.',
  },
] as const;

const COUNTRIES: { id: TaxRegion; flag: string; name: string; detail: string }[] = [
  { id: 'US', flag: '🇺🇸', name: 'United States', detail: 'USD · calendar tax year' },
  { id: 'AU', flag: '🇦🇺', name: 'Australia', detail: 'AUD · July to June tax year' },
];

export default function WelcomeScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { settings, updateSettings, addSampleItems, items } = useStore();
  const scroller = useRef<ScrollViewInstance>(null);
  const [page, setPage] = useState(0);
  const [region, setRegion] = useState<TaxRegion>(settings.taxRegion);
  const last = PAGES.length; // the setup page comes after the photo pages

  const goTo = (i: number) => {
    scroller.current?.scrollTo({ x: i * width, animated: true });
    setPage(i);
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== page) setPage(i);
  };

  const finish = (start: 'add' | 'explore' | 'empty') => {
    tap();
    updateSettings({ onboarded: true, taxRegion: region });
    if (start === 'explore' && items.length === 0) addSampleItems(region);
    router.replace('/');
    if (start === 'add') setTimeout(() => router.push('/item/edit'), 50);
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        onScroll={onScroll}
        scrollEventThrottle={64}
        bounces={false}>
        {PAGES.map((p, i) => (
          <View key={p.eyebrow} style={[styles.page, { width }]}>
            <Image source={p.photo} style={StyleSheet.absoluteFill} contentFit="cover" transition={400} priority="high" />
            <LinearGradient
              colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.92)']}
              locations={[0, 0.22, 0.48, 0.85]}
              style={StyleSheet.absoluteFill}
            />
            {page === i ? (
              <Animated.View
                entering={FadeInDown.duration(600)}
                style={[styles.copy, { paddingBottom: insets.bottom + 132 }]}>
                <AppText variant="eyebrow" color={OnPhoto.textSecondary}>
                  {p.eyebrow}
                </AppText>
                <AppText variant="display" color={OnPhoto.text} style={styles.title}>
                  {p.title}
                </AppText>
                <AppText variant="body" color={OnPhoto.textSecondary} style={styles.body}>
                  {p.body}
                </AppText>
              </Animated.View>
            ) : null}
          </View>
        ))}

        {/* Setup: choose a country and how to start */}
        <View style={[styles.page, { width }]}>
          <Image source={WELCOME_PHOTOS.home} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={24} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.62)' }]} />
          {page === last ? (
            <Animated.View entering={FadeInDown.duration(600)} style={[styles.setup, { paddingTop: insets.top + 72, paddingBottom: insets.bottom + 24 }]}>
              <View style={{ gap: Spacing.sm }}>
                <AppText variant="eyebrow" color={OnPhoto.textSecondary}>
                  Set up
                </AppText>
                <AppText variant="display" color={OnPhoto.text} style={styles.title}>
                  Where do you{'\n'}file taxes?
                </AppText>
                <AppText color={OnPhoto.textSecondary} style={styles.body}>
                  Sets your currency, dates, tax year and marketplaces. You can change it later in Settings.
                </AppText>
              </View>

              <View style={{ gap: Spacing.md }}>
                {COUNTRIES.map((ct) => {
                  const selected = ct.id === region;
                  return (
                    <Pressable
                      key={ct.id}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      onPress={() => {
                        tap();
                        setRegion(ct.id);
                      }}
                      style={[styles.country, selected && styles.countrySelected]}>
                      <AppText style={{ fontSize: 30 }}>{ct.flag}</AppText>
                      <View style={{ flex: 1 }}>
                        <AppText variant="headline" color={selected ? '#0B0B0C' : OnPhoto.text}>
                          {ct.name}
                        </AppText>
                        <AppText variant="footnote" color={selected ? '#55555A' : OnPhoto.textSecondary}>
                          {ct.detail}
                        </AppText>
                      </View>
                      <Ionicons
                        name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                        size={24}
                        color={selected ? '#0B0B0C' : OnPhoto.textSecondary}
                      />
                    </Pressable>
                  );
                })}
              </View>

              <View style={{ gap: Spacing.md }}>
                <Pressable accessibilityRole="button" onPress={() => finish('add')} style={styles.whiteButton}>
                  <Ionicons name="camera" size={19} color="#0B0B0C" />
                  <AppText variant="headline" color="#0B0B0C" style={{ fontWeight: '700' }}>
                    Add my first item
                  </AppText>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={() => finish('explore')} style={styles.glassButton}>
                  <AppText variant="headline" color={OnPhoto.text} style={{ fontWeight: '700' }}>
                    Explore with examples
                  </AppText>
                </Pressable>
              </View>
            </Animated.View>
          ) : null}
        </View>
      </ScrollView>

      {/* Fixed controls over the photo pages */}
      {page < last ? (
        <>
          <Pressable
            accessibilityRole="button"
            onPress={() => goTo(last)}
            hitSlop={12}
            style={[styles.skip, { top: insets.top + Spacing.md }]}>
            <AppText variant="subhead" color={OnPhoto.text} style={{ fontWeight: '600' }}>
              Skip
            </AppText>
          </Pressable>
          <View style={[styles.controls, { paddingBottom: insets.bottom + Spacing.xl }]}>
            <View style={styles.dots} accessibilityLabel={`Page ${page + 1} of ${PAGES.length}`}>
              {PAGES.map((p, i) => (
                <View key={p.eyebrow} style={[styles.dot, i === page && styles.dotActive]} />
              ))}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={page === last - 1 ? 'Get started' : 'Next'}
              onPress={() => {
                tap();
                goTo(page + 1);
              }}
              style={({ pressed }) => [styles.next, { transform: [{ scale: pressed ? 0.96 : 1 }] }]}>
              <AppText variant="headline" color="#0B0B0C" style={{ fontWeight: '700' }}>
                {page === last - 1 ? 'Get started' : 'Next'}
              </AppText>
              <Ionicons name="arrow-forward" size={18} color="#0B0B0C" />
            </Pressable>
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  page: { flex: 1, height: '100%', overflow: 'hidden' },
  copy: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: Spacing.xl + 4, gap: Spacing.md },
  title: { fontSize: 46, lineHeight: 48 },
  body: { fontSize: 18, lineHeight: 25, maxWidth: 360 },
  setup: { flex: 1, justifyContent: 'space-between', paddingHorizontal: Spacing.xl + 4, gap: Spacing.xl },
  country: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: 22,
    borderCurve: 'continuous',
    backgroundColor: OnPhoto.glass,
    borderWidth: 1,
    borderColor: OnPhoto.glassBorder,
  },
  countrySelected: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
  whiteButton: {
    height: 58,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  glassButton: {
    height: 58,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: OnPhoto.glass,
    borderWidth: 1,
    borderColor: OnPhoto.glassBorder,
  },
  skip: {
    position: 'absolute',
    right: Spacing.xl,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: OnPhoto.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: OnPhoto.glassBorder,
  },
  controls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl + 4,
  },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotActive: { width: 26, backgroundColor: '#FFFFFF' },
  next: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 54,
    paddingHorizontal: 26,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
});
