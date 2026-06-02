import { useTranslation } from 'react-i18next';

export interface NavSection {
  /** DOM id of the section wrapper to scroll to. */
  id: string;
  /** Already-translated chip label. */
  label: string;
}

interface Props {
  sections: NavSection[];
}

/**
 * Contextual jump bar: a sticky row of chips that scrolls to a decision-tool
 * section. Purely a navigation aid — it scrolls (does not expand) the target,
 * which is enough since the panels render their own headers. Rendered only when
 * there are sections worth jumping between.
 */
export function DecisionToolsNav({ sections }: Props) {
  const { t } = useTranslation();

  // A single chip is not worth a nav bar.
  if (sections.length < 2) return null;

  function jumpTo(id: string) {
    const el = typeof document !== 'undefined' ? document.getElementById(id) : null;
    if (!el) return;
    // Expand the target panel first (if collapsed) so the user lands on its
    // content. Only panel headers carry [data-jump-toggle]; nested collapsibles
    // like the amortization table are deliberately left untouched.
    const toggle = el.querySelector('[data-jump-toggle][aria-expanded="false"]');
    if (toggle instanceof HTMLElement) toggle.click();
    el.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }

  return (
    <nav
      aria-label={t('toolsNav.aria')}
      className="sticky top-0 z-20 -mx-1 px-1 py-2 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/75 border-b border-gray-100"
    >
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {sections.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => jumpTo(s.id)}
            className="shrink-0 rounded-full px-3 py-1 text-xs font-medium bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors whitespace-nowrap"
          >
            {s.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
