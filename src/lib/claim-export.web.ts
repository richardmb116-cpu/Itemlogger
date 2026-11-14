/** Browser preview: show the pack on screen; saving a PDF needs the iPhone app. */
import type { ClaimImages, ClaimOptions } from './claim-pack';
import { fileUriFor } from './photos';
import type { Item } from './types';

export const canExportPdf = false;

export async function prepareImages(items: Item[], options: ClaimOptions): Promise<ClaimImages> {
  const images: ClaimImages = {};
  for (const item of items) {
    images[item.id] = {
      photo: options.includePhotos && item.photoUri ? ((await fileUriFor(item.photoUri)) ?? undefined) : undefined,
      receipt: options.includeReceipts && item.receiptUri ? ((await fileUriFor(item.receiptUri)) ?? undefined) : undefined,
    };
  }
  return images;
}

export async function exportPdf(): Promise<void> {
  throw new Error('PDF export works in the iPhone app.');
}

export async function shareTextFile(): Promise<void> {
  throw new Error('Exporting files works in the iPhone app.');
}

export async function prepareReceipts(items: Item[]): Promise<Record<string, string | undefined>> {
  return Object.fromEntries(items.map((i) => [i.id, i.receiptUri ?? undefined]));
}
