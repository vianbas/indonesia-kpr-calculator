/**
 * URL auto-sync was removed (Option A).
 * The ?s= parameter is now written only by the explicit Share flow (ShareReportModal).
 * This stub is kept so callers compile without modification.
 */
export function useUrlSync(_params: unknown): { suppressNext: () => void } {
  return { suppressNext: () => {} };
}
