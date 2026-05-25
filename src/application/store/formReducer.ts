import type { MortgageFormState, FormAction, TierFormRow } from './formTypes';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTenorTotal(state: MortgageFormState): number {
  const years = parseInt(state.tenorYears) || 0;
  const months = parseInt(state.tenorAdditionalMonths) || 0;
  return years * 12 + months;
}

function getFixedEnd(state: MortgageFormState): number {
  return state.hasFixedPeriod ? parseInt(state.fixedDurationMonths) || 0 : 0;
}

function newTier(toMonth: string, rate = ''): TierFormRow {
  return { id: crypto.randomUUID(), toMonth, rate };
}

// ─── Default state ────────────────────────────────────────────────────────────

/**
 * Returns a fresh default form state.
 * Called as a lazy initializer in useReducer so the date reflects the actual
 * mount time, not the module-import time (avoids stale date after overnight tabs).
 */
export function createDefaultFormState(): MortgageFormState {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return {
    propertyPrice: '500000000',
    downPaymentMode: 'percent',
    downPaymentValue: '20',
    tenorYears: '10',
    tenorAdditionalMonths: '0',
    paymentMethod: 'annuity',
    startDate: `${yyyy}-${mm}-${dd}`,
    calculationMethod: 'fixed_single_floating',
    hasFixedPeriod: true,
    fixedRate: '7.5',
    fixedDurationMonths: '24',
    floatingBaseRate: '11',
    tiers: [],
    includeAdminFee: false,
    adminFeeAmount: '0',
  };
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

export function formReducer(state: MortgageFormState, action: FormAction): MortgageFormState {
  switch (action.type) {
    // ── Loan basics ──────────────────────────────────────────────────────────
    case 'SET_PROPERTY_PRICE':
      return { ...state, propertyPrice: action.value };
    case 'SET_DOWN_PAYMENT_MODE':
      return { ...state, downPaymentMode: action.mode, downPaymentValue: '' };
    case 'SET_DOWN_PAYMENT_VALUE':
      return { ...state, downPaymentValue: action.value };
    case 'SET_TENOR_YEARS':
      return { ...state, tenorYears: action.value };
    case 'SET_TENOR_ADDITIONAL_MONTHS':
      return { ...state, tenorAdditionalMonths: action.value };
    case 'SET_PAYMENT_METHOD':
      return { ...state, paymentMethod: action.method };
    case 'SET_START_DATE':
      return { ...state, startDate: action.value };

    // ── Calculation method ───────────────────────────────────────────────────
    case 'SET_CALCULATION_METHOD': {
      const method = action.method;
      if (method === state.calculationMethod) return state;

      if (method === 'fixed_tiered_floating') {
        // Switching to tiered: auto-create first tier if none exist
        if (state.tiers.length === 0) {
          const tenorTotal = getTenorTotal(state);
          const tenorStr = tenorTotal > 0 ? String(tenorTotal) : '';
          return {
            ...state,
            calculationMethod: method,
            tiers: [newTier(tenorStr, state.floatingBaseRate)],
          };
        }
        return { ...state, calculationMethod: method };
      }

      // Switching to fixed_only or fixed_single_floating: clear tiers
      return { ...state, calculationMethod: method, tiers: [] };
    }

    // ── Fixed rate ───────────────────────────────────────────────────────────
    case 'SET_HAS_FIXED_PERIOD':
      return { ...state, hasFixedPeriod: action.value };
    case 'SET_FIXED_RATE':
      return { ...state, fixedRate: action.value };
    case 'SET_FIXED_DURATION_MONTHS':
      return { ...state, fixedDurationMonths: action.value };

    // ── Floating rate ────────────────────────────────────────────────────────
    case 'SET_FLOATING_BASE_RATE':
      return { ...state, floatingBaseRate: action.value };

    // ── Tier management ──────────────────────────────────────────────────────
    case 'ADD_TIER': {
      const tenorTotal = getTenorTotal(state);
      const tiers = state.tiers;

      if (tiers.length === 0) {
        return {
          ...state,
          tiers: [newTier(String(tenorTotal))],
        };
      }

      // Split the last tier at halfway to give user a reasonable starting point
      const lastTier = tiers[tiers.length - 1];
      const fixedEnd = getFixedEnd(state);
      const lastFrom =
        tiers.length === 1
          ? fixedEnd + 1
          : (parseInt(tiers[tiers.length - 2].toMonth) || 0) + 1;
      const lastTo = parseInt(lastTier.toMonth) || tenorTotal;
      const splitPoint = Math.max(lastFrom, Math.floor((lastFrom + lastTo) / 2));

      const updatedLast: TierFormRow = { ...lastTier, toMonth: String(splitPoint) };
      const added: TierFormRow = newTier(String(tenorTotal));

      return {
        ...state,
        tiers: [...tiers.slice(0, -1), updatedLast, added],
      };
    }

    case 'UPDATE_TIER': {
      return {
        ...state,
        tiers: state.tiers.map((t) =>
          t.id === action.id ? { ...t, [action.field]: action.value } : t,
        ),
      };
    }

    case 'REMOVE_TIER': {
      const remaining = state.tiers.filter((t) => t.id !== action.id);
      // Restore last tier's toMonth to tenorTotal after removal
      if (remaining.length > 0) {
        const tenorTotal = getTenorTotal(state);
        const last = remaining[remaining.length - 1];
        remaining[remaining.length - 1] = { ...last, toMonth: String(tenorTotal) };
      }
      return { ...state, tiers: remaining };
    }

    // ── Fees ──────────────────────────────────────────────────────────────────
    case 'SET_INCLUDE_ADMIN_FEE':
      return { ...state, includeAdminFee: action.value };
    case 'SET_ADMIN_FEE_AMOUNT':
      return { ...state, adminFeeAmount: action.value };

    // ── Scenario management ───────────────────────────────────────────────────
    case 'RESET_TO_DEFAULT':
      return createDefaultFormState();
    case 'LOAD_STATE':
      return action.state;
  }
}
