import * as WebBrowser from 'expo-web-browser';
import type { ComponentProps } from 'react';

import { Row } from '@/components/ui';

/** A list row that opens a website in an in-app Safari sheet. See link-row.web.tsx for the browser. */
export function LinkRow({ url, ...row }: { url: string } & Omit<ComponentProps<typeof Row>, 'onPress' | 'chevron'>) {
  return <Row {...row} chevron onPress={() => void WebBrowser.openBrowserAsync(url)} />;
}
