import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** Where things live. Rooms make a home inventory easy to build (one room at a time) and to claim on. */
export const ROOMS: { id: string; label: string; icon: IconName }[] = [
  { id: 'living', label: 'Living room', icon: 'tv-outline' },
  { id: 'kitchen', label: 'Kitchen', icon: 'restaurant-outline' },
  { id: 'bedroom', label: 'Bedroom', icon: 'bed-outline' },
  { id: 'office', label: 'Office', icon: 'desktop-outline' },
  { id: 'bathroom', label: 'Bathroom', icon: 'water-outline' },
  { id: 'laundry', label: 'Laundry', icon: 'shirt-outline' },
  { id: 'garage', label: 'Garage', icon: 'car-outline' },
  { id: 'outdoor', label: 'Outdoors', icon: 'leaf-outline' },
  { id: 'kids', label: 'Kids’ room', icon: 'happy-outline' },
  { id: 'storage', label: 'Storage', icon: 'cube-outline' },
];

export function roomInfo(id: string | null | undefined) {
  return ROOMS.find((r) => r.id === id) ?? null;
}
