import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageToggle } from '../components/common/LanguageToggle';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-blue-700 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 bg-white/20 rounded-lg text-white font-bold text-lg shrink-0">
            K
          </div>
          <div className="flex-1">
            <h1 className="text-white font-bold text-lg leading-tight">KPR Calculator</h1>
            <p className="text-blue-200 text-xs leading-tight">
              {t('app.subtitle')}
            </p>
          </div>
          <a
            href="#faq"
            className="text-blue-200 hover:text-white text-xs font-medium transition-colors shrink-0"
          >
            {t('nav.faqLink')}
          </a>
          <LanguageToggle />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 text-center">
          <p className="text-xs text-gray-400">
            {t('app.footer')}
          </p>
        </div>
      </footer>
    </div>
  );
}
