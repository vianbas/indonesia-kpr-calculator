// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { saveDraft, loadDraft, clearDraft } from './draftStorage';
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
