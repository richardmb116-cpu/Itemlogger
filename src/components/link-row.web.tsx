import type { ComponentProps } from 'react';

import { Row } from '@/components/ui';

/** Browser version: a real link, since pop-up windows opened from script are often blocked. */
export function LinkRow({ url, ...row }: { url: string } & Omit<ComponentProps<typeof Row>, 'onPress' | 'chevron'>) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
      <Row {...row} chevron />
    </a>
  );
}
