import { ErrorBoundary } from '@sentry/react';
import { AppLayout } from './ui/layouts/AppLayout';
import { CalculatorPage } from './ui/pages/CalculatorPage';
import { ErrorFallback } from './ui/components/common/ErrorFallback';

export default function App() {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <AppLayout>
        <CalculatorPage />
      </AppLayout>
    </ErrorBoundary>
  );
}
