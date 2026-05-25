import { describe, it, expect } from 'vitest';
import { getRowHighlights } from '../utils/highlightLogic';

describe('getRowHighlights', () => {

  // ─── 1 active value ─────────────────────────────────────────────────────────

  it('single value → all none', () => {
    expect(getRowHighlights([500])).toEqual(['none']);
  });

  // ─── 2 distinct values ───────────────────────────────────────────────────────

  it('2 distinct, lowerIsBetter true: lower index gets best', () => {
    expect(getRowHighlights([100, 200], true)).toEqual(['best', 'worst']);
  });

  it('2 distinct, lowerIsBetter true: reversed order', () => {
    expect(getRowHighlights([200, 100], true)).toEqual(['worst', 'best']);
  });

  // ─── 3 distinct values ───────────────────────────────────────────────────────

  it('3 distinct values: correct best / mid / worst', () => {
    expect(getRowHighlights([100, 150, 200], true)).toEqual(['best', 'mid', 'worst']);
  });

  it('3 distinct values: permutation [worst, best, mid]', () => {
    expect(getRowHighlights([200, 100, 150], true)).toEqual(['worst', 'best', 'mid']);
  });

  // ─── All same ────────────────────────────────────────────────────────────────

  it('all same (2 scenarios) → all none', () => {
    expect(getRowHighlights([100, 100])).toEqual(['none', 'none']);
  });

  it('all same (3 scenarios) → all none', () => {
    expect(getRowHighlights([100, 100, 100])).toEqual(['none', 'none', 'none']);
  });

  // ─── Tied values ─────────────────────────────────────────────────────────────

  it('two tied at lowest → both best, remaining worst', () => {
    expect(getRowHighlights([100, 100, 200], true)).toEqual(['best', 'best', 'worst']);
  });

  it('two tied at highest → both worst, remaining best', () => {
    expect(getRowHighlights([100, 200, 200], true)).toEqual(['best', 'worst', 'worst']);
  });

  // ─── null slots ──────────────────────────────────────────────────────────────

  it('null slot → excluded from comparison, receives none', () => {
    expect(getRowHighlights([100, null, 200], true)).toEqual(['best', 'none', 'worst']);
  });

  it('all nulls → all none', () => {
    expect(getRowHighlights([null, null])).toEqual(['none', 'none']);
  });

  it('one non-null and one null → only one comparable value, all none', () => {
    expect(getRowHighlights([100, null])).toEqual(['none', 'none']);
  });

  it('null at start of 3-scenario row → remaining two compared normally', () => {
    expect(getRowHighlights([null, 100, 200], true)).toEqual(['none', 'best', 'worst']);
  });

  it('null does not corrupt min/max — two remaining tied values → all none', () => {
    expect(getRowHighlights([null, 100, 100], true)).toEqual(['none', 'none', 'none']);
  });

  // ─── highlightEnabled: false ─────────────────────────────────────────────────

  it('highlightEnabled false → all none regardless of distinct values', () => {
    expect(getRowHighlights([100, 200, 300], true, false)).toEqual(['none', 'none', 'none']);
  });

  it('highlightEnabled false → all none even with clear winner', () => {
    expect(getRowHighlights([1, 999], true, false)).toEqual(['none', 'none']);
  });

  // ─── lowerIsBetter: false ────────────────────────────────────────────────────

  it('lowerIsBetter false → highest value gets best', () => {
    expect(getRowHighlights([100, 200], false)).toEqual(['worst', 'best']);
  });

  it('lowerIsBetter false, 3 values: highest best / mid / lowest worst', () => {
    expect(getRowHighlights([100, 150, 200], false)).toEqual(['worst', 'mid', 'best']);
  });

  it('lowerIsBetter false, two tied at highest → both best', () => {
    expect(getRowHighlights([100, 200, 200], false)).toEqual(['worst', 'best', 'best']);
  });

  it('lowerIsBetter false, two tied at lowest → both worst', () => {
    expect(getRowHighlights([100, 100, 200], false)).toEqual(['worst', 'worst', 'best']);
  });

});
