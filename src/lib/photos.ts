import { Asset } from 'expo-asset';
import type { ImageSource } from 'expo-image';

import type { Category } from './types';

/**
 * Photography bundled with the app (Unsplash licence, free for commercial use; see README).
 * Category photos stand in for items without a photo of their own, so the app never looks empty.
 */
export const CATEGORY_PHOTOS: Record<Category, number> = {
  electronics: require('@/assets/photos/cat-electronics.jpg'),
  appliances: require('@/assets/photos/cat-appliances.jpg'),
  furniture: require('@/assets/photos/cat-furniture.jpg'),
  tools: require('@/assets/photos/cat-tools.jpg'),
  kitchen: require('@/assets/photos/cat-kitchen.jpg'),
  jewellery: require('@/assets/photos/cat-jewellery.jpg'),
  sports: require('@/assets/photos/cat-sports.jpg'),
  clothing: require('@/assets/photos/cat-clothing.jpg'),
  other: require('@/assets/photos/cat-other.jpg'),
};

export const WELCOME_PHOTOS = {
  home: require('@/assets/photos/welcome-home.jpg'),
  warranty: require('@/assets/photos/welcome-warranty.jpg'),
  insurance: require('@/assets/photos/welcome-insurance.jpg'),
  sell: require('@/assets/photos/welcome-sell.jpg'),
  tax: require('@/assets/photos/welcome-tax.jpg'),
} as const;

export const HOME_HERO_PHOTO: number = require('@/assets/photos/home-hero.jpg');

/** Photos used by the sample items, referenced as "bundled:<name>" in an item's photoUri. */
const BUNDLED: Record<string, number> = {
  laptop: require('@/assets/photos/sample-laptop.jpg'),
  headphones: require('@/assets/photos/sample-headphones.jpg'),
  sofa: require('@/assets/photos/sample-sofa.jpg'),
  coffee: require('@/assets/photos/cat-appliances.jpg'),
  drill: require('@/assets/photos/cat-tools.jpg'),
  chair: require('@/assets/photos/cat-furniture.jpg'),
};

const PREFIX = 'bundled:';

export function bundledUri(name: keyof typeof BUNDLED | string): string {
  return `${PREFIX}${name}`;
}

export function isBundled(uri: string | null | undefined): boolean {
  return !!uri && uri.startsWith(PREFIX);
}

/** Something expo-image can show for a stored photo URI. */
export function photoSource(uri: string): ImageSource | number {
  if (isBundled(uri)) return BUNDLED[uri.slice(PREFIX.length)] ?? CATEGORY_PHOTOS.other;
  return { uri };
}

/** The photo to show for an item: its own, or its category's. */
export function itemPhoto(item: { photoUri: string | null; category: Category }): {
  source: ImageSource | number;
  isOwn: boolean;
} {
  if (item.photoUri) return { source: photoSource(item.photoUri), isOwn: true };
  return { source: CATEGORY_PHOTOS[item.category], isOwn: false };
}

/** A real file URI for a stored photo, so it can be resized or embedded in a PDF. */
export async function fileUriFor(uri: string): Promise<string | null> {
  if (!isBundled(uri)) return uri;
  const mod = BUNDLED[uri.slice(PREFIX.length)];
  if (!mod) return null;
  const asset = Asset.fromModule(mod);
  await asset.downloadAsync();
  return asset.localUri ?? asset.uri;
}
