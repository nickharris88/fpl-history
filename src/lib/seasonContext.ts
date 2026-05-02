// Shared selected-season memory across pages, scoped to the tab via sessionStorage.
// Falls back to the default if storage is unavailable (SSR, private mode).

import { useEffect, useState } from 'react';

const KEY = 'fpl-selected-season';
const DEFAULT_SEASON = '2024-25';

export function useSharedSeason(initial: string = DEFAULT_SEASON): [string, (s: string) => void] {
  const [season, setSeasonState] = useState(initial);

  // On mount, hydrate from sessionStorage if present.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = sessionStorage.getItem(KEY);
      if (stored) setSeasonState(stored);
    } catch {/* ignore */}
  }, []);

  const setSeason = (s: string) => {
    setSeasonState(s);
    if (typeof window !== 'undefined') {
      try { sessionStorage.setItem(KEY, s); } catch {/* ignore */}
    }
  };

  return [season, setSeason];
}
