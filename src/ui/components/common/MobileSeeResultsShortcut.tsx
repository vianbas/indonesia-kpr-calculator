interface Props {
  /** The active scenario has a computed summary. */
  hasSummary: boolean;
  /** The active scenario has validation errors the user can jump to. */
  hasErrors: boolean;
  /** Scroll to results (or to the first error when hasErrors). */
  onClick: () => void;
  /** Pre-translated button label. */
  label: string;
  /** Pre-translated accessible label. */
  ariaLabel: string;
}

const ArrowDownIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
    <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
  </svg>
);

/**
 * Sticky bottom shortcut, shown on small screens only, that jumps from the long
 * input form down to the calculated results (or to the first error). Hidden on
 * desktop (`sm:hidden`) where the results sit beside the form. Respects the
 * mobile safe-area inset so it clears the home indicator.
 */
export function MobileSeeResultsShortcut({ hasSummary, hasErrors, onClick, label, ariaLabel }: Props) {
  // Nothing actionable to jump to yet.
  if (!hasSummary && !hasErrors) return null;

  return (
    <div
      className="sm:hidden fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pointer-events-none"
    >
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-colors hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
      >
        {label}
        <ArrowDownIcon />
      </button>
    </div>
  );
}
