import { useMortgageCalculator } from '../../application/hooks/useMortgageCalculator';
import { LoanInputForm } from '../components/form/LoanInputForm';
import { SummaryCard } from '../components/results/SummaryCard';
import { InstallmentGroups } from '../components/results/InstallmentGroups';
import { AmortizationTable } from '../components/results/AmortizationTable';
import { ExportButton } from '../components/export/ExportButton';
import {
  FormIncompleteState,
  ValidationErrorState,
  CalculationErrorState,
} from '../components/results/EmptyState';

export function CalculatorPage() {
  const { form, dispatch, summary, errors, fieldErrors, isReady, isCalcError } =
    useMortgageCalculator();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(400px,480px)_1fr] gap-6 items-start">
      {/* ── Left: form ─────────────────────────────────────────────────────── */}
      <div>
        <LoanInputForm
          form={form}
          dispatch={dispatch}
          errors={errors}
          fieldErrors={fieldErrors}
        />
      </div>

      {/* ── Right: results ─────────────────────────────────────────────────── */}
      <div className="space-y-4 lg:sticky lg:top-6">
        <ResultsPanel
          form={form}
          summary={isReady ? summary : null}
          errors={errors}
          isCalcError={isCalcError}
        />
      </div>
    </div>
  );
}

// ─── Results panel ────────────────────────────────────────────────────────────

interface ResultsPanelProps {
  form: ReturnType<typeof useMortgageCalculator>['form'];
  summary: ReturnType<typeof useMortgageCalculator>['summary'];
  errors: ReturnType<typeof useMortgageCalculator>['errors'];
  isCalcError: boolean;
}

function ResultsPanel({ form, summary, errors, isCalcError }: ResultsPanelProps) {
  if (summary) {
    return (
      <>
        <div className="flex justify-end">
          <ExportButton form={form} summary={summary} />
        </div>
        <SummaryCard summary={summary} />
        {summary.installmentGroups.length > 1 && (
          <InstallmentGroups summary={summary} />
        )}
        <AmortizationTable schedule={summary.schedule} />
      </>
    );
  }

  // Engine threw unexpectedly (schema valid, but e.g. rate schedule gap)
  if (isCalcError) {
    return <CalculationErrorState />;
  }

  // Validation errors — guide user to fix them
  if (errors.length > 0) {
    return <ValidationErrorState errors={errors} />;
  }

  // No errors and no summary — form is still being filled in
  return <FormIncompleteState />;
}
