import { useCallback, useEffect, useRef } from 'react';
import { encodeUrlState } from '../utils/urlState';
import type { ScenarioState } from '../application/store/scenarioTypes';
import type { ScenarioId } from '../application/store/scenarioTypes';

interface UseUrlSyncParams {
  scenarios: ScenarioState[];
  activeCount: 1 | 2 | 3;
  activeTab: ScenarioId;
}

interface UseUrlSyncResult {
  /** Call before a reset to prevent the post-reset state change from re-adding ?s=. */
  suppressNext: () => void;
}

/**
 * Syncs scenario state to the URL (?s=) after a 500ms debounce.
 * Skips the initial mount so a clean-URL load is not immediately overwritten.
 * Uses history.replaceState — never pushState.
 */
export function useUrlSync({ scenarios, activeCount, activeTab }: UseUrlSyncParams): UseUrlSyncResult {
  const isMountedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressRef = useRef(false);

  const suppressNext = useCallback(() => {
    suppressRef.current = true;
  }, []);

  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      return;
    }

    if (suppressRef.current) {
      suppressRef.current = false;
      return;
    }

    if (timerRef.current !== null) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      const forms = scenarios.slice(0, activeCount).map((s) => s.form);
      const encoded = encodeUrlState({ forms, activeCount, activeTab });
      const url = new URL(window.location.href);
      url.searchParams.set('s', encoded);
      history.replaceState(null, '', url.toString());
    }, 500);

    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, [scenarios, activeCount, activeTab]);

  return { suppressNext };
}
