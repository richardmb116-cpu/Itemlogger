import type { ReceiptScan } from './receipt';
import type { TaxRegion } from './types';

/**
 * The installed app doesn't read receipts yet: that needs a small server holding a Claude API key
 * (a Supabase Edge Function fits). The browser preview reads them through the Claude page it runs in
 * (receipt-reader.web.ts).
 */
export type ReceiptImage = { previewUri: string };

export async function receiptReaderAvailable(): Promise<boolean> {
  return false;
}

export async function pickReceipt(): Promise<ReceiptImage | null> {
  return null;
}

export async function readReceipt(_image: ReceiptImage, _region: TaxRegion, _signal?: AbortSignal): Promise<ReceiptScan> {
  throw { code: 'unavailable' };
}

export async function storeReceipt(image: ReceiptImage): Promise<string> {
  return image.previewUri;
}

export function readerErrorMessage(_e?: unknown): string {
  return 'Receipt scanning works in the Claude preview for now. It’s coming to the installed app.';
}
