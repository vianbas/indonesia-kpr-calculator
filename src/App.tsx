import { ErrorBoundary } from '@sentry/react';
import './i18n';
import { AppLayout } from './ui/layouts/AppLayout';
import { CalculatorPage } from './ui/pages/CalculatorPage';
import { ErrorFallback } from './ui/components/common/ErrorFallback';
import { useShortLinkInit } from './hooks/useShortLinkInit';

function ShortLinkLoader() {
  const { urlState, loading, error } = useShortLinkInit();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-sm text-gray-500 animate-pulse">Loading shared scenario…</p>
      </div>
    );
  }

  return <CalculatorPage initialUrlState={error ? null : urlState} />;
}

export default function App() {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <AppLayout>
        <ShortLinkLoader />
      </AppLayout>
    </ErrorBoundary>
  );
}
