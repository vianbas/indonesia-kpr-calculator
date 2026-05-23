import { z } from 'zod';
import type { MortgageInput, ValidationError, ValidationResult, FloatingTier } from '../models/mortgage.types';

// ─── Zod shape schemas ───────────────────────────────────────────────────────

const FloatingTierSchema = z.object({
  id: z.string().min(1, 'Tier ID is required'),
  fromMonth: z.number().int().min(1, 'fromMonth must be ≥ 1'),
  toMonth: z.number().int().min(1, 'toMonth must be ≥ 1'),
  annualRate: z.number().min(0, 'Rate cannot be negative').max(1, 'Rate must be ≤ 1 (100%)'),
});

const FixedPeriodSchema = z.object({
  annualRate: z.number().min(0, 'Rate cannot be negative').max(1, 'Rate must be ≤ 1 (100%)'),
  durationMonths: z.number().int().min(1, 'Fixed duration must be ≥ 1 month'),
});

const MortgageInputSchema = z.object({
  principalAmount: z
    .number()
    .positive('Principal must be a positive number')
    .max(100_000_000_000, 'Principal exceeds maximum of Rp 100 Billion'),
  tenorMonths: z
    .number()
    .int('Tenor must be a whole number of months')
    .min(1, 'Tenor must be at least 1 month')
    .max(360, 'Tenor cannot exceed 360 months (30 years)'),
  paymentMethod: z.enum(['annuity', 'flat']),
  fixedPeriod: FixedPeriodSchema.nullable(),
  floatingBaseRate: z
    .number()
    .min(0, 'Rate cannot be negative')
    .max(1, 'Rate must be ≤ 1 (100%)')
    .nullable(),
  floatingTiers: z.array(FloatingTierSchema),
  startDate: z.date(),
  includeAdminFee: z.boolean(),
  adminFeeAmount: z.number().min(0, 'Admin fee cannot be negative'),
});

// ─── Public validator ─────────────────────────────────────────────────────────

export function validateMortgageInput(input: MortgageInput): ValidationResult {
  const errors: ValidationError[] = [];

  // 1. Shape & range validation via Zod
  const parsed = MortgageInputSchema.safeParse(input);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.push({
        field: issue.path.join('.') || 'root',
        message: issue.message,
      });
    }
    // Don't proceed with business rules — the shape is broken
    return { valid: false, errors };
  }

  const { tenorMonths, fixedPeriod, floatingBaseRate, floatingTiers } = input;

  // 2. Fixed period must be strictly shorter than the full tenor
  if (fixedPeriod !== null && fixedPeriod.durationMonths >= tenorMonths) {
    errors.push({
      field: 'fixedPeriod.durationMonths',
      message: `Fixed period (${fixedPeriod.durationMonths} months) must be less than the total tenor (${tenorMonths} months).`,
    });
  }

  // 3. Every month in the schedule must have a rate assigned
  const fixedEnd = fixedPeriod?.durationMonths ?? 0;
  const floatingStart = fixedEnd + 1;
  const hasFloatingPeriod = floatingStart <= tenorMonths;

  if (hasFloatingPeriod && floatingTiers.length === 0 && floatingBaseRate === null) {
    errors.push({
      field: 'floatingBaseRate',
      message:
        'A floating rate or at least one tiered rate is required to cover months after the fixed period.',
    });
  }

  if (!fixedPeriod && floatingTiers.length === 0 && floatingBaseRate === null) {
    errors.push({
      field: 'floatingBaseRate',
      message: 'An interest rate is required. Provide a floating base rate or at least one tier.',
    });
  }

  // 4. Tier-specific business rules
  if (floatingTiers.length > 0) {
    const tierErrors = validateFloatingTiers(floatingTiers, floatingStart, tenorMonths);
    errors.push(...tierErrors);
  }

  return { valid: errors.length === 0, errors };
}

// ─── Tier validation helpers ──────────────────────────────────────────────────

function validateFloatingTiers(
  tiers: FloatingTier[],
  expectedStart: number,
  tenorMonths: number,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const sorted = [...tiers].sort((a, b) => a.fromMonth - b.fromMonth);

  // Each tier must have fromMonth ≤ toMonth
  for (let i = 0; i < sorted.length; i++) {
    const tier = sorted[i];
    if (tier.fromMonth > tier.toMonth) {
      errors.push({
        field: `floatingTiers[${i}]`,
        message: `Tier ${i + 1}: fromMonth (${tier.fromMonth}) must not exceed toMonth (${tier.toMonth}).`,
      });
    }
  }
  // If there are invalid from/to pairs, further checks would produce misleading errors
  if (errors.length > 0) return errors;

  // First tier must begin exactly where the fixed period ends (or month 1)
  if (sorted[0].fromMonth !== expectedStart) {
    errors.push({
      field: 'floatingTiers[0].fromMonth',
      message: `First tier must start at month ${expectedStart}, but starts at month ${sorted[0].fromMonth}.`,
    });
  }

  // Last tier must close exactly at the loan end
  const last = sorted[sorted.length - 1];
  if (last.toMonth !== tenorMonths) {
    errors.push({
      field: `floatingTiers[${sorted.length - 1}].toMonth`,
      message: `Last tier must end at month ${tenorMonths} (loan end), but ends at month ${last.toMonth}.`,
    });
  }

  // Consecutive tiers must be contiguous — no gaps, no overlaps
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const expectedFrom = prev.toMonth + 1;

    if (curr.fromMonth > expectedFrom) {
      errors.push({
        field: `floatingTiers[${i}].fromMonth`,
        message: `Gap detected between tiers ${i} and ${i + 1}: months ${expectedFrom}–${curr.fromMonth - 1} are not covered.`,
      });
    } else if (curr.fromMonth < expectedFrom) {
      errors.push({
        field: `floatingTiers[${i}].fromMonth`,
        message: `Overlap detected: tier ${i} ends at month ${prev.toMonth}, but tier ${i + 1} starts at month ${curr.fromMonth}.`,
      });
    }
  }

  return errors;
}
