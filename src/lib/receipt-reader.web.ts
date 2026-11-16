import { normalizeScan, receiptPrompt, type ReceiptScan } from './receipt';
import type { TaxRegion } from './types';

/**
 * Reads receipts with Claude, through the Claude page this preview runs in (its `sample`
 * capability, declared with images when the preview is published). The viewer is asked once
 * before the first photo is sent, and it uses their own Claude plan.
 */
export type ReceiptImage = { file: File; previewUri: string };

type SampleFn = {
  json: (input: string, options: { images: Blob; signal?: AbortSignal; modelTier?: string }) => Promise<unknown>;
  limits: () => Promise<{ images?: { maxInputBytes: number } }>;
};

async function sampler(): Promise<SampleFn | null> {
  const claude = (globalThis as { claude?: { use?: (name: string) => Promise<unknown> } }).claude;
  if (!claude?.use) return null;
  try {
    return (await claude.use('sample')) as SampleFn | null;
  } catch {
    return null;
  }
}

/** Whether this view can read receipts (inside the Claude page, with images allowed). */
export async function receiptReaderAvailable(): Promise<boolean> {
  const s = await sampler();
  if (!s) return false;
  const limits = await s.limits().catch(() => null);
  return !!limits?.images;
}

/** Ask for a photo: on iPhone this offers the camera or the photo library. */
export function pickReceipt(): Promise<ReceiptImage | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp,image/heic,image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      resolve(file ? { file, previewUri: URL.createObjectURL(file) } : null);
    };
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}

export async function readReceipt(image: ReceiptImage, region: TaxRegion, signal?: AbortSignal): Promise<ReceiptScan> {
  const s = await sampler();
  if (!s) throw { code: 'unavailable' };
  const raw = await s.json(receiptPrompt(region), { images: await jpegFor(image.file, 1600, 0.85), signal });
  return normalizeScan(raw);
}

/** A small copy of the receipt to keep with each item (browser storage is only a few MB). */
export async function storeReceipt(image: ReceiptImage): Promise<string> {
  const blob = await jpegFor(image.file, 1100, 0.6);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** Re-encode as JPEG no larger than `max` px on the long side (also turns iPhone HEIC into JPEG). */
async function jpegFor(file: File, max: number, quality: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? file), 'image/jpeg', quality));
}

/** Plain words for what went wrong. */
export function readerErrorMessage(e: unknown): string {
  const code = (e as { code?: string })?.code;
  switch (code) {
    case 'cancelled':
      return '';
    case 'not_granted':
    case 'sampling_disabled':
    case 'unavailable':
    case 'images_unavailable':
      return 'Reading receipts needs permission to use Claude on this page. You can allow it from the page’s Permissions menu.';
    case 'rate_limited':
      return 'Claude is busy or you’ve reached a usage limit. Try again in a little while.';
    case 'image_rejected':
      return 'That photo couldn’t be used. Try a JPEG or PNG under 20 MB.';
    case 'invalid_json':
    case 'empty_completion':
    case 'refused':
      return 'Couldn’t read that receipt. Try a sharper, flatter photo with the whole receipt in view.';
    default:
      return 'Something went wrong reading the receipt. Check your connection and try again.';
  }
}
