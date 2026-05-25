export type CellHighlight = 'best' | 'worst' | 'mid' | 'none';

/**
 * Computes a highlight result for every slot in a row, given the numeric
 * values across all scenarios.
 *
 * @param values         One entry per scenario column. Pass null for a slot
 *                       that has no calculable value — it is excluded from the
 *                       min/max comparison and always receives 'none'.
 * @param lowerIsBetter  true (default) → the lowest non-null value is 'best'.
 *                       false → the highest non-null value is 'best'.
 * @param highlightEnabled  When false every slot returns 'none' regardless of
 *                          values (used for rows where comparison is
 *                          meaningless, e.g. string/label rows).
 */
export function getRowHighlights(
  values: (number | null)[],
  lowerIsBetter = true,
  highlightEnabled = true,
): CellHighlight[] {
  if (!highlightEnabled) return values.map(() => 'none');

  const nonNull = values.filter((v): v is number => v !== null);
  if (nonNull.length < 2) return values.map(() => 'none');

  const min = Math.min(...nonNull);
  const max = Math.max(...nonNull);
  if (min === max) return values.map(() => 'none');

  const bestValue  = lowerIsBetter ? min : max;
  const worstValue = lowerIsBetter ? max : min;

  return values.map((v) => {
    if (v === null)       return 'none';
    if (v === bestValue)  return 'best';
    if (v === worstValue) return 'worst';
    return 'mid';
  });
}
