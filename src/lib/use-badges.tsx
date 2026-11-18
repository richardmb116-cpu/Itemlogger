import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { BADGES, qualifyingBadges, type Badge, type BadgeId } from './progress';
import { useStore } from './store';

type BadgeState = {
  /** Earned badges with when. */
  earned: Partial<Record<BadgeId, string>>;
  /** Record something the data can't show later (e.g. a receipt scan). */
  earn: (id: BadgeId) => void;
  /** Badges earned since the app opened that haven't been acknowledged yet, newest first. */
  fresh: Badge[];
  dismiss: () => void;
};

const BadgeContext = createContext<BadgeState | null>(null);
const SESSION_START = new Date().toISOString();

/** Watches the inventory and stamps badges as they're earned. Earned badges are kept for good. */
export function BadgeProvider({ children }: { children: ReactNode }) {
  const { items, settings, updateSettings } = useStore();
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const earned = settings.badges as Partial<Record<BadgeId, string>>;

  const qualifying = qualifyingBadges(items, {
    region: settings.taxRegion,
    style: settings.upgradeStyle,
    events: new Set(Object.keys(earned) as BadgeId[]),
    weeks: settings.activity,
  });
  const missing = [...qualifying].filter((id) => !earned[id]).sort();
  const missingKey = missing.join(',');

  useEffect(() => {
    if (!missingKey) return;
    const now = new Date().toISOString();
    updateSettings({ badges: { ...earned, ...Object.fromEntries(missingKey.split(',').map((id) => [id, now])) } });
    // Only re-run when the set of newly qualifying badges changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missingKey]);

  const earn = useCallback(
    (id: BadgeId) => {
      if (!settings.badges[id]) updateSettings({ badges: { ...settings.badges, [id]: new Date().toISOString() } });
    },
    [settings.badges, updateSettings],
  );

  const fresh = BADGES.filter((b) => (earned[b.id] ?? '') >= SESSION_START && !seen.has(b.id)).sort((a, b) =>
    (earned[b.id] ?? '').localeCompare(earned[a.id] ?? ''),
  );

  const value = useMemo<BadgeState>(
    () => ({
      earned,
      earn,
      fresh,
      dismiss: () => setSeen((prev) => new Set([...prev, ...fresh.map((b) => b.id)])),
    }),
    [earned, earn, fresh],
  );
  return <BadgeContext.Provider value={value}>{children}</BadgeContext.Provider>;
}

export function useBadges(): BadgeState {
  const ctx = useContext(BadgeContext);
  if (!ctx) throw new Error('useBadges must be used inside <BadgeProvider>');
  return ctx;
}
