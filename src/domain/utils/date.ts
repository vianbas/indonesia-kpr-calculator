/**
 * Adds N calendar months to a date, clamping to the last day of the target month.
 * Example: Jan 31 + 1 month → Feb 28 (not Mar 3).
 */
export function addMonths(date: Date, months: number): Date {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-based
  const day = date.getDate();

  const rawTargetMonth = month + months;
  const targetYear = year + Math.floor(rawTargetMonth / 12);
  const targetMonth = ((rawTargetMonth % 12) + 12) % 12;

  // Last day of target month
  const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
  return new Date(targetYear, targetMonth, Math.min(day, lastDay));
}

/** Format a date as "DD MMMM YYYY" in Indonesian locale */
export function formatDateID(date: Date): string {
  return date.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
