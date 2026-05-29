import { useReducer, useEffect, useState, useMemo, useCallback } from 'react';
import { useMortgageCalculator } from './useMortgageCalculator';
import { formReducer, createDefaultFormState } from '../store/formReducer';
import { formToMortgageInput } from '../converters/formToInput';
import { validateMortgageInput } from '../../domain/validators/mortgage.validator';
import {
  generateAmortizationSchedule,
  calculateMortgageSummary,
} from '../../domain/calculators/amortization';
import { saveDraft, loadDraft, clearDraft } from '../../utils/draftStorage';
import { DEFAULT_LABELS } from '../../utils/urlState';
import type { MortgageSummary, ValidationError } from '../../domain';
import type { MortgageFormState } from '../store/formTypes';
import type { ScenarioId, ScenarioState } from '../store/scenarioTypes';

// ─── Init options (used by URL state loading) ─────────────────────────────────

export interface UseScenariosOptions {
  initialForms?: readonly MortgageFormState[];
  initialActiveCount?: 1 | 2 | 3;
  initialActiveTab?: ScenarioId;
  initialLabels?: [string, string, string];
}

// ─── Internal types ───────────────────────────────────────────────────────────

interface CalcResult {
  summary: MortgageSummary | null;
  errors: ValidationError[];
  fieldErrors: Record<string, string>;
  isCalcError: boolean;
}

const emptyResult: CalcResult = {
  summary: null,
  errors: [],
  fieldErrors: {},
  isCalcError: false,
};

// ─── Pure calculation helper ──────────────────────────────────────────────────

function runCalc(form: MortgageFormState): CalcResult {
  const { input, conversionErrors } = formToMortgageInput(form);

  if (input === null) {
    return {
      summary: null,
      errors: conversionErrors,
      fieldErrors: toFieldMap(conversionErrors),
      isCalcError: false,
    };
  }

  const { valid, errors } = validateMortgageInput(input);
  if (!valid) {
    return { summary: null, errors, fieldErrors: toFieldMap(errors), isCalcError: false };
  }

  try {
    const schedule = generateAmortizationSchedule(input);
    return {
      summary: calculateMortgageSummary(input, schedule),
      errors: [],
      fieldErrors: {},
      isCalcError: false,
    };
  } catch {
    return { summary: null, errors: [], fieldErrors: {}, isCalcError: true };
  }
}

function toFieldMap(errors: ValidationError[]): Record<string, string> {
  const m: Record<string, string> = {};
  for (const e of errors) if (!m[e.field]) m[e.field] = e.message;
  return m;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface UseScenariosResult {
  scenarios: ScenarioState[];
  activeCount: 1 | 2 | 3;
  activeTab: ScenarioId;
  setActiveTab: (id: ScenarioId) => void;
  canAdd: boolean;
  addScenario: () => void;
  removeScenario: (id: ScenarioId) => void;
  resetAll: () => void;
  renameScenario: (id: ScenarioId, name: string) => void;
}

export function useScenarios(options: UseScenariosOptions = {}): UseScenariosResult {
  const { initialForms } = options;

  // Resolve initial state once at mount: URL/prop → localStorage draft → defaults
  const [init] = useState<UseScenariosOptions>(() => {
    if (initialForms) return options;
    const draft = loadDraft();
    if (draft) return {
      initialForms: draft.forms,
      initialActiveCount: draft.activeCount,
      initialActiveTab: draft.activeTab,
      initialLabels: draft.labels,
    };
    return options;
  });

  const [activeCount, setActiveCount] = useState<1 | 2 | 3>(init.initialActiveCount ?? 1);
  const [activeTab, setActiveTab] = useState<ScenarioId>(init.initialActiveTab ?? 1);
  const [labels, setLabels] = useState<[string, string, string]>(
    init.initialLabels ?? [...DEFAULT_LABELS],
  );

  // Scenario 1 — delegates to the existing hook, optionally pre-filled from URL / draft
  const calc1 = useMortgageCalculator(init.initialForms?.[0]);

  // Scenarios 2 and 3 — always mounted (rules of hooks: no conditional hook calls)
  const [form2, dispatch2] = useReducer(
    formReducer,
    undefined,
    () => init.initialForms?.[1] ?? createDefaultFormState(),
  );
  const [form3, dispatch3] = useReducer(
    formReducer,
    undefined,
    () => init.initialForms?.[2] ?? createDefaultFormState(),
  );

  const [r2, setR2] = useState<CalcResult>(emptyResult);
  const [r3, setR3] = useState<CalcResult>(emptyResult);

  // Debounced calculation for scenario 2 (only runs when active)
  useEffect(() => {
    if (activeCount < 2) return;
    const t = setTimeout(() => setR2(runCalc(form2)), 300);
    return () => clearTimeout(t);
  }, [form2, activeCount]);

  // Debounced calculation for scenario 3 (only runs when active)
  useEffect(() => {
    if (activeCount < 3) return;
    const t = setTimeout(() => setR3(runCalc(form3)), 300);
    return () => clearTimeout(t);
  }, [form3, activeCount]);

  const addScenario = useCallback(() => {
    if (activeCount === 1) {
      // Pre-fill scenario 2 from scenario 1
      dispatch2({ type: 'LOAD_STATE', state: calc1.form });
      setActiveCount(2);
      setActiveTab(2);
    } else if (activeCount === 2) {
      // Pre-fill scenario 3 from scenario 2
      dispatch3({ type: 'LOAD_STATE', state: form2 });
      setActiveCount(3);
      setActiveTab(3);
    }
  }, [activeCount, calc1.form, form2]);

  const removeScenario = useCallback(
    (id: ScenarioId) => {
      if (id === 3) {
        dispatch3({ type: 'RESET_TO_DEFAULT' });
        setR3(emptyResult);
        setActiveCount(2);
        setActiveTab((prev) => (prev === 3 ? 2 : prev));
      } else if (id === 2) {
        if (activeCount === 3) {
          // Shift scenario 3 content → slot 2.
          // Clear r2 immediately so the comparison panel doesn't briefly show
          // the old scenario 2 result against the new (scenario 3) form data.
          dispatch2({ type: 'LOAD_STATE', state: form3 });
          dispatch3({ type: 'RESET_TO_DEFAULT' });
          setR2(emptyResult);
          setR3(emptyResult);
          setActiveCount(2);
        } else {
          dispatch2({ type: 'RESET_TO_DEFAULT' });
          setR2(emptyResult);
          setActiveCount(1);
        }
        setActiveTab((prev) => (prev >= 2 ? 1 : prev) as ScenarioId);
      }
    },
    [activeCount, form3],
  );

  // Destructure calc1's stable fields so useMemo doesn't depend on the
  // whole calc1 object, which is a fresh reference on every render.
  const {
    form: form1,
    dispatch: dispatch1,
    summary: summary1,
    errors: errors1,
    fieldErrors: fieldErrors1,
    isCalcError: isCalcError1,
  } = calc1;

  const renameScenario = useCallback((id: ScenarioId, name: string) => {
    const trimmed = name.trim() || DEFAULT_LABELS[id - 1];
    setLabels((prev) => {
      const next = [...prev] as [string, string, string];
      next[id - 1] = trimmed;
      return next;
    });
  }, []);

  const resetAll = useCallback(() => {
    clearDraft();
    dispatch1({ type: 'RESET_TO_DEFAULT' });
    dispatch2({ type: 'RESET_TO_DEFAULT' });
    dispatch3({ type: 'RESET_TO_DEFAULT' });
    setR2(emptyResult);
    setR3(emptyResult);
    setActiveCount(1);
    setActiveTab(1);
    setLabels([...DEFAULT_LABELS]);
  }, [dispatch1, dispatch2, dispatch3]);

  // Debounced draft save — persists all active forms so the user never loses work
  useEffect(() => {
    const t = setTimeout(() => {
      saveDraft({
        forms: [form1, form2, form3].slice(0, activeCount),
        activeCount,
        activeTab,
        labels,
      });
    }, 1000);
    return () => clearTimeout(t);
  }, [form1, form2, form3, activeCount, activeTab, labels]);

  const scenarios = useMemo((): ScenarioState[] => {
    const s1: ScenarioState = {
      id: 1,
      label: labels[0],
      form: form1,
      dispatch: dispatch1,
      summary: summary1,
      errors: errors1,
      fieldErrors: fieldErrors1,
      isCalcError: isCalcError1,
    };

    const arr = [s1];

    if (activeCount >= 2) {
      arr.push({
        id: 2,
        label: labels[1],
        form: form2,
        dispatch: dispatch2,
        ...r2,
      });
    }

    if (activeCount === 3) {
      arr.push({
        id: 3,
        label: labels[2],
        form: form3,
        dispatch: dispatch3,
        ...r3,
      });
    }

    return arr;
  }, [
    activeCount, labels,
    form1, dispatch1, summary1, errors1, fieldErrors1, isCalcError1,
    form2, dispatch2, r2,
    form3, dispatch3, r3,
  ]);

  return {
    scenarios,
    activeCount,
    activeTab,
    setActiveTab,
    canAdd: activeCount < 3,
    addScenario,
    removeScenario,
    resetAll,
    renameScenario,
  };
}
