import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import type { Category } from './types';

type IconName = ComponentProps<typeof Ionicons>['name'];

export const CATEGORIES: { id: Category; label: string; icon: IconName }[] = [
  { id: 'electronics', label: 'Electronics', icon: 'laptop-outline' },
  { id: 'appliances', label: 'Appliances', icon: 'snow-outline' },
  { id: 'furniture', label: 'Furniture', icon: 'bed-outline' },
  { id: 'tools', label: 'Tools', icon: 'hammer-outline' },
  { id: 'kitchen', label: 'Kitchen', icon: 'restaurant-outline' },
  { id: 'jewellery', label: 'Jewellery', icon: 'diamond-outline' },
  { id: 'sports', label: 'Sports & outdoors', icon: 'bicycle-outline' },
  { id: 'clothing', label: 'Clothing', icon: 'shirt-outline' },
  { id: 'other', label: 'Other', icon: 'cube-outline' },
];

export function categoryInfo(id: Category) {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}
