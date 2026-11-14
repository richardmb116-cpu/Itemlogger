import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import type { ClaimImages, ClaimOptions } from './claim-pack';
import type { Item } from './types';

/** Web preview can render the pack but not save a PDF; the iPhone app can. */
export const canExportPdf = true;

const MAX_WIDTH = 1000;

/** Shrink a photo and turn it into a data URI, so the PDF stays a sensible size to email. */
async function embed(uri: string): Promise<string | undefined> {
  try {
    const rendered = await ImageManipulator.manipulate(uri).resize({ width: MAX_WIDTH }).renderAsync();
    const saved = await rendered.saveAsync({ base64: true, compress: 0.6, format: SaveFormat.JPEG });
    return saved.base64 ? `data:image/jpeg;base64,${saved.base64}` : undefined;
  } catch {
    return undefined; // A missing or unreadable photo shouldn't stop the whole pack.
  }
}

export async function prepareImages(items: Item[], options: ClaimOptions): Promise<ClaimImages> {
  const images: ClaimImages = {};
  for (const item of items) {
    const entry: ClaimImages[string] = {};
    if (options.includePhotos && item.photoUri) entry.photo = await embed(item.photoUri);
    if (options.includeReceipts && item.receiptUri) entry.receipt = await embed(item.receiptUri);
    images[item.id] = entry;
  }
  return images;
}

/** Render the HTML to a PDF with a readable file name and open the share sheet. */
export async function exportPdf(html: string, paper: { width: number; height: number }, fileName: string): Promise<void> {
  const { uri } = await Print.printToFileAsync({
    html,
    width: paper.width,
    height: paper.height,
    margins: { left: 40, right: 40, top: 44, bottom: 44 },
  });

  let shareUri = uri;
  try {
    const dir = new Directory(Paths.cache, 'claim-packs');
    if (!dir.exists) dir.create({ intermediates: true });
    const dest = new File(dir, fileName);
    if (dest.exists) dest.delete();
    new File(uri).move(dest);
    shareUri = dest.uri;
  } catch {
    // Keep the generated name if renaming fails.
  }

  await Sharing.shareAsync(shareUri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: fileName });
}
