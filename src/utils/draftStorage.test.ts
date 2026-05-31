// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { saveDraft, loadDraft, clearDraft, DRAFT_TTL_MS } from './draftStorage';
import { encodeUrlState } from './urlState';
import type { UrlState } from './urlState';
import { createDefaultFormState } from '../application/store/formReducer';

function makeState(overrides: Partial<UrlState> = {}): UrlState {
  return {
    forms: [createDefaultFormState()],
    activeCount: 1,
    activeTab: 1,
    ...overrides,
  };
}

describe('draftStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loadDraft returns null when nothing is stored', () => {
    expect(loadDraft()).toBeNull();
  });

  it('saveDraft + loadDraft round-trips the state', () => {
    const state = makeState();
    saveDraft(state);
    const loaded = loadDraft();
    expect(loaded).not.toBeNull();
    expect(loaded!.activeCount).toBe(1);
    expect(loaded!.activeTab).toBe(1);
    expect(loaded!.forms).toHaveLength(1);
  });

  it('round-trips activeCount and activeTab', () => {
    const state = makeState({
      forms: [createDefaultFormState(), createDefaultFormState()],
      activeCount: 2,
      activeTab: 2,
    });
    saveDraft(state);
    const loaded = loadDraft();
    expect(loaded!.activeCount).toBe(2);
    expect(loaded!.activeTab).toBe(2);
    expect(loaded!.forms).toHaveLength(2);
  });

  it('clearDraft removes the stored value', () => {
    saveDraft(makeState());
    clearDraft();
    expect(loadDraft()).toBeNull();
  });

  it('saveDraft overwrites previous value', () => {
    saveDraft(makeState({ activeCount: 1 }));
    saveDraft(makeState({ forms: [createDefaultFormState(), createDefaultFormState()], activeCount: 2, activeTab: 2 }));
    const loaded = loadDraft();
    expect(loaded!.activeCount).toBe(2);
  });
});

describe('draftStorage — TTL expiry', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('discards a draft older than the TTL and clears storage', () => {
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    saveDraft(makeState());

    // Jump just past the 30-day window
    vi.setSystemTime(Date.now() + DRAFT_TTL_MS + 1);
    expect(loadDraft()).toBeNull();
    // Stale entries should be cleaned up, not left lingering
    expect(localStorage.getItem('kpr_draft')).toBeNull();
    expect(localStorage.getItem('kpr_draft_saved_at')).toBeNull();
  });

  it('keeps a draft saved exactly within the TTL window', () => {
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    saveDraft(makeState({ activeCount: 1 }));

    // One hour short of the TTL — still valid
    vi.setSystemTime(Date.now() + DRAFT_TTL_MS - 60 * 60 * 1000);
    expect(loadDraft()).not.toBeNull();
  });

  it('keeps a legacy draft that has no saved-at timestamp', () => {
    // Simulate a draft written before TTL tracking existed
    localStorage.setItem('kpr_draft', encodeUrlState(makeState()));
    expect(loadDraft()).not.toBeNull();
  });
});
