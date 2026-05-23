import type { ReactNode } from 'react';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-blue-700 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 bg-white/20 rounded-lg text-white font-bold text-lg">
            K
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-tight">KPR Calculator</h1>
            <p className="text-blue-200 text-xs leading-tight">
              Simulasi Kredit Pemilikan Rumah — Fixed &amp; Floating
            </p>
          </div>
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
            Perhitungan bersifat simulasi. Angka aktual dapat berbeda berdasarkan kebijakan bank.
          </p>
        </div>
      </footer>
    </div>
  );
}
