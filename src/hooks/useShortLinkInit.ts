import { useState, useEffect } from 'react';
import { decodeUrlState } from '../utils/urlState';
import { fetchShortLinkPayload } from '../utils/shortLinkApi';
import type { UrlState } from '../utils/urlState';

export interface ShortLinkInit {
  urlState: UrlState | null;
  loading: boolean;
  error: boolean;
}

const SHORT_PATH_RE = /^\/s\/([^/]+)$/;

function resolveShortId(): string | null {
  // Strip the Vite base path (e.g. /indonesia-kpr-calculator/) before matching
  // so the hook works both on GitHub Pages (with a sub-path) and on bare domains.
  const base = (import.meta.env.BASE_URL as string | undefined) ?? '/';
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const relativePath = window.location.pathname.startsWith(normalizedBase)
    ? window.location.pathname.slice(normalizedBase.length) || '/'
    : window.location.pathname;
  return SHORT_PATH_RE.exec(relativePath)?.[1] ?? null;
}

export function useShortLinkInit(): ShortLinkInit {
  const shortId = resolveShortId();

  const [state, setState] = useState<ShortLinkInit>({
    urlState: null,
    loading: shortId !== null,
    error: false,
  });

  useEffect(() => {
    if (!shortId) return;
    let cancelled = false;

    fetchShortLinkPayload(shortId).then((payload) => {
      if (cancelled) return;
      if (payload === null) {
        setState({ urlState: null, loading: false, error: true });
        return;
      }
      const urlState = decodeUrlState(payload);
      setState({ urlState, loading: false, error: urlState === null });
    });

    return () => {
      cancelled = true;
    };
  }, [shortId]);

  return state;
}
