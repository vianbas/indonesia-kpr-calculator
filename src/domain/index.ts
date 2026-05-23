// Models
export type {
  PaymentMethod,
  FixedPeriod,
  FloatingTier,
  MortgageInput,
  ValidationError,
  ValidationResult,
} from './models/mortgage.types';

export type {
  RateEntry,
  RateSchedule,
  AmortizationRow,
  InstallmentGroup,
  MortgageSummary,
} from './models/amortization.types';

// Validators
export { validateMortgageInput } from './validators/mortgage.validator';

// Calculators
export { buildRateSchedule } from './calculators/rateSchedule';
export { calculateAnnuityInstallment, calculateAnnuityInterest } from './calculators/annuity';
export {
  calculateFlatMonthlyPrincipal,
  calculateFlatMonthlyInterest,
  calculateFlatInstallment,
} from './calculators/flat';
export {
  generateAmortizationSchedule,
  calculateMortgageSummary,
} from './calculators/amortization';

// Utilities
export { roundMoney, toMonthlyRateDecimal } from './utils/math';
export { addMonths, formatDateID } from './utils/date';
export { formatIDR, formatIDRCompact, formatNumber, formatPercent, formatTenor, monthToYear } from './utils/currency';
