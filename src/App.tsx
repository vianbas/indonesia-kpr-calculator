import { AppLayout } from './ui/layouts/AppLayout';
import { CalculatorPage } from './ui/pages/CalculatorPage';
import { ErrorBoundary } from './ui/components/common/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <AppLayout>
        <CalculatorPage />
      </AppLayout>
    </ErrorBoundary>
  );
}
