import { useTranslation } from 'react-i18next';

export function LanguageToggle() {
  const { i18n } = useTranslation();
  const current = i18n.language?.startsWith('en') ? 'en' : 'id';

  return (
    <div className="flex items-center rounded-full border border-white/30 overflow-hidden text-xs font-semibold">
      {(['id', 'en'] as const).map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => i18n.changeLanguage(lang)}
          className={[
            'px-2.5 py-1 transition-colors',
            current === lang
              ? 'bg-white text-blue-700'
              : 'text-white/70 hover:text-white hover:bg-white/10',
          ].join(' ')}
          aria-pressed={current === lang}
        >
          {lang.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
