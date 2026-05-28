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

export function useShortLinkInit(): ShortLinkInit {
  const match = SHORT_PATH_RE.exec(window.location.pathname);
  const shortId = match?.[1] ?? null;

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
