import type { MortgageFormState } from '../../application/store/formTypes';
import type { MortgageSummary } from '../../domain/models/amortization.types';

/**
 * One calculated scenario shaped for CSV export. Intentionally identical in
 * spirit to the PDF export item so call sites can pass the same data.
 */
export interface ScenarioForCsv {
  label: string;
  form: MortgageFormState;
  summary: MortgageSummary;
}
