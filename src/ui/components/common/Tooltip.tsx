import { useState, useRef, useEffect, useId } from 'react';

interface Props {
  text: string;
}

/**
 * Inline ⓘ icon that toggles an explanatory popover on click/tap.
 * Tap-to-toggle is the primary interaction so it works on mobile browsers.
 * Positioning flips above/below based on available viewport space.
 */
export function Tooltip({ text }: Props) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const id = useId();

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      if (
        !btnRef.current?.contains(e.target as Node) &&
        !popoverRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Flip above when not enough space below
  const [flipUp, setFlipUp] = useState(false);
  useEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    setFlipUp(spaceBelow < 160);
  }, [open]);

  return (
    <span className="relative inline-flex items-center">
      <button
        ref={btnRef}
        type="button"
        aria-label="Informasi lebih lanjut"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full text-gray-400 hover:text-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-4 h-4"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div
          id={id}
          ref={popoverRef}
          role="tooltip"
          className={[
            'absolute left-1/2 -translate-x-1/2 z-50 w-64 rounded-lg bg-gray-900 px-3 py-2.5',
            'text-xs text-white shadow-lg',
            flipUp ? 'bottom-6' : 'top-6',
          ].join(' ')}
        >
          {/* Arrow */}
          <span
            aria-hidden="true"
            className={[
              'absolute left-1/2 -translate-x-1/2 border-4 border-transparent',
              flipUp
                ? 'top-full border-t-gray-900'
                : 'bottom-full border-b-gray-900',
            ].join(' ')}
          />
          {text}
        </div>
      )}
    </span>
  );
}
