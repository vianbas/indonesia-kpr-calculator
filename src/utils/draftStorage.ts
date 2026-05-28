import { encodeUrlState, decodeUrlState } from './urlState';
import type { UrlState } from './urlState';

const DRAFT_KEY = 'kpr_draft';

export function saveDraft(state: UrlState): void {
  try {
    localStorage.setItem(DRAFT_KEY, encodeUrlState(state));
  } catch {
    // localStorage may be unavailable (private browsing, storage quota)
  }
}

export function loadDraft(): UrlState | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? decodeUrlState(raw) : null;
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}
