import type { Dispatch } from 'react';
import type { MortgageFormState, FormAction } from './formTypes';
import type { MortgageSummary, ValidationError } from '../../domain';

export type ScenarioId = 1 | 2 | 3;

export const SCENARIO_LABELS: Record<ScenarioId, string> = {
  1: 'Skenario 1',
  2: 'Skenario 2',
  3: 'Skenario 3',
};

export interface ScenarioState {
  id: ScenarioId;
  label: string;
  form: MortgageFormState;
  dispatch: Dispatch<FormAction>;
  summary: MortgageSummary | null;
  errors: ValidationError[];
  fieldErrors: Record<string, string>;
  isCalcError: boolean;
}

/** Narrowed ScenarioState where summary is guaranteed non-null. */
export type CalculatedScenario = Omit<ScenarioState, 'summary'> & {
  summary: MortgageSummary;
};
