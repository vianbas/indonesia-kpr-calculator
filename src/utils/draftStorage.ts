import { encodeUrlState, decodeUrlState } from './urlState';
import type { UrlState } from './urlState';

const DRAFT_KEY = 'kpr_draft';
const DRAFT_TS_KEY = 'kpr_draft_saved_at';

/** Drafts older than this are considered stale and discarded on load. */
export const DRAFT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function saveDraft(state: UrlState): void {
  try {
    localStorage.setItem(DRAFT_KEY, encodeUrlState(state));
    localStorage.setItem(DRAFT_TS_KEY, String(Date.now()));
  } catch {
    // localStorage may be unavailable (private browsing, storage quota)
  }
}

export function loadDraft(): UrlState | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;

    // Discard drafts past their TTL. A missing timestamp means a legacy draft
    // saved before TTL tracking existed — keep it; its next save stamps it.
    const savedAt = Number(localStorage.getItem(DRAFT_TS_KEY));
    if (savedAt && Date.now() - savedAt > DRAFT_TTL_MS) {
      clearDraft();
      return null;
    }

    return decodeUrlState(raw);
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(DRAFT_TS_KEY);
  } catch {
    // ignore
  }
}
