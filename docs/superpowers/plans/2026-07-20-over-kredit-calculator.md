# Over Kredit Calculator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a standalone "Over Kredit" (KPR take-over via bank) calculator panel that tells a buyer their upfront cash, new installment, and full process-cost breakdown.

**Architecture:** A pure domain calculator (`overCredit.ts`) mirroring the Refinancing pattern, a string-based form-state type, three presentational components (Panel → Inputs + ResultCard) wired into `CalculatorPage`, with i18n in EN + ID. Reuses `calculateAnnuityInstallment` and the LTV guardrail constant; LTV is computed in the calculator and displayed inline (the existing `LtvIndicator` component is coupled to the main mortgage form and is deliberately NOT reused).

**Tech Stack:** React 19, TypeScript, Vite, Tailwind, i18next, Vitest + Testing Library, decimal.js (via `roundMoney`).

## Global Constraints

- Node/npm: system npm (`/opt/homebrew/bin/npm`) in this environment — the CLAUDE.md path `/Users/esrahana/...` no longer exists. Run tests with `npx vitest run --run`.
- All money math goes through `roundMoney` from `src/domain/utils/math.ts` (nearest IDR).
- Annual rates are decimals inside the domain layer (`0.08` = 8%); the form stores percent strings and divides by 100 at the boundary.
- Every user-facing string is an i18n key present in BOTH `src/locales/en.json` and `src/locales/id.json`.
- No Co-Authored-By lines in commits.
- Do not touch `master` directly; work stays on the current feature branch.
- `tsc -b --noEmit` must stay clean; the full Vitest suite must stay green (baseline 486 passing; note the 13 `localStorage`/jsdom failures in this worktree are a pre-existing environment issue, not caused by this work — confirm the count does not grow).

---

### Task 1: Over Kredit domain calculator

**Files:**
- Create: `src/domain/calculators/overCredit.ts`
- Test: `src/domain/__tests__/overCredit.test.ts`

**Interfaces:**
- Consumes: `calculateAnnuityInstallment(principal, annualRate, remainingMonths)` from `src/domain/calculators/annuity.ts`; `roundMoney` from `src/domain/utils/math.ts`.
- Produces: `calculateOverCredit(input: OverCreditInput): OverCreditResult`, plus exported types `OverCreditInput`, `OverCreditResult`, `OverCreditFlag`.

- [ ] **Step 1: Write the failing tests**

Create `src/domain/__tests__/overCredit.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { calculateOverCredit } from '../calculators/overCredit';
import type { OverCreditInput } from '../calculators/overCredit';

function makeInput(overrides: Partial<OverCreditInput> = {}): OverCreditInput {
  return {
    agreedPrice: 800_000_000,
    sellerRemainingPrincipal: 500_000_000,
    appraisalValue: 0, // 0 → treated as agreedPrice
    buyerDownPayment: 200_000_000,
    newAnnualRate: 0.09,
    newTenorMonths: 180,
    isSameBank: true,
    provisionFeePercent: 0.01,
    appraisalFeeIDR: 3_000_000,
    notaryFeeIDR: 5_000_000,
    balikNamaFeeIDR: 4_000_000,
    insuranceIDR: 6_000_000,
    oldBankPenaltyPercent: 0,
    npoptkp: 60_000_000,
    ...overrides,
  };
}

describe('calculateOverCredit', () => {
  it('seller equity = agreed price minus seller remaining principal', () => {
    const r = calculateOverCredit(makeInput());
    expect(r.sellerEquity).toBe(300_000_000); // 800M - 500M
  });

  it('clamps seller equity to 0 and flags negative equity when principal exceeds price', () => {
    const r = calculateOverCredit(makeInput({ sellerRemainingPrincipal: 900_000_000 }));
    expect(r.sellerEquity).toBe(0);
    expect(r.flags).toContain('seller_negative_equity');
  });

  it('new loan amount = agreed price minus buyer down payment', () => {
    const r = calculateOverCredit(makeInput());
    expect(r.newLoanAmount).toBe(600_000_000); // 800M - 200M
  });

  it('new loan amount clamps to 0 when down payment covers the whole price', () => {
    const r = calculateOverCredit(makeInput({ buyerDownPayment: 800_000_000 }));
    expect(r.newLoanAmount).toBe(0);
    expect(r.newMonthlyPayment).toBe(0);
  });

  it('computes BPHTB as 5% of (agreed price - NPOPTKP)', () => {
    const r = calculateOverCredit(makeInput());
    // 5% of (800M - 60M) = 5% of 740M = 37M
    expect(r.bphtb).toBe(37_000_000);
  });

  it('BPHTB is 0 when agreed price is at or below NPOPTKP', () => {
    const r = calculateOverCredit(makeInput({ agreedPrice: 50_000_000, buyerDownPayment: 0, sellerRemainingPrincipal: 0 }));
    expect(r.bphtb).toBe(0);
  });

  it('applies no old-bank penalty when same bank', () => {
    const r = calculateOverCredit(makeInput({ isSameBank: true, oldBankPenaltyPercent: 0.02 }));
    expect(r.oldBankPenalty).toBe(0);
  });

  it('applies old-bank penalty on seller remaining principal when different bank', () => {
    const r = calculateOverCredit(makeInput({ isSameBank: false, oldBankPenaltyPercent: 0.02 }));
    expect(r.oldBankPenalty).toBe(10_000_000); // 2% of 500M
  });

  it('flags penalty_maybe_applies when different bank but penalty percent is 0', () => {
    const r = calculateOverCredit(makeInput({ isSameBank: false, oldBankPenaltyPercent: 0 }));
    expect(r.flags).toContain('penalty_maybe_applies');
    expect(r.oldBankPenalty).toBe(0);
  });

  it('total process cost sums provision, fixed fees, BPHTB and penalty', () => {
    const r = calculateOverCredit(makeInput());
    // provision 1% of 600M = 6M; +appraisal 3M +notary 5M +balikNama 4M +insurance 6M +bphtb 37M +penalty 0
    expect(r.provisionFee).toBe(6_000_000);
    expect(r.totalProcessCost).toBe(61_000_000);
  });

  it('buyer cash upfront = down payment + total process cost', () => {
    const r = calculateOverCredit(makeInput());
    // 200M DP + 61M process = 261M
    expect(r.buyerCashUpfront).toBe(261_000_000);
  });

  it('reports appraisal shortfall and flags it when appraisal < agreed price', () => {
    const r = calculateOverCredit(makeInput({ appraisalValue: 700_000_000 }));
    expect(r.appraisalShortfall).toBe(100_000_000); // 800M - 700M
    expect(r.flags).toContain('appraisal_shortfall');
  });

  it('has zero appraisal shortfall when appraisal >= agreed price or left empty', () => {
    const r = calculateOverCredit(makeInput({ appraisalValue: 0 }));
    expect(r.appraisalShortfall).toBe(0);
    expect(r.flags).not.toContain('appraisal_shortfall');
  });

  it('computes effective LTV against appraisal and flags when over the 0.85 guardrail', () => {
    // newLoan 600M / appraisal 800M = 0.75 → within guardrail
    const within = calculateOverCredit(makeInput());
    expect(within.effectiveLtv).toBeCloseTo(0.75, 5);
    expect(within.flags).not.toContain('ltv_over_guardrail');
    // Small DP → high LTV: newLoan 760M / 800M = 0.95 → over guardrail
    const over = calculateOverCredit(makeInput({ buyerDownPayment: 40_000_000 }));
    expect(over.effectiveLtv).toBeCloseTo(0.95, 5);
    expect(over.flags).toContain('ltv_over_guardrail');
  });

  it('total cost of acquisition = cash upfront + total of all installments', () => {
    const r = calculateOverCredit(makeInput());
    expect(r.totalCostOfAcquisition).toBe(r.buyerCashUpfront + r.newTotalPayment);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/domain/__tests__/overCredit.test.ts`
Expected: FAIL — cannot resolve `../calculators/overCredit`.

- [ ] **Step 3: Write the calculator**

Create `src/domain/calculators/overCredit.ts`:

```ts
import { calculateAnnuityInstallment } from './annuity';
import { roundMoney } from '../utils/math';

export type OverCreditFlag =
  | 'appraisal_shortfall'
  | 'ltv_over_guardrail'
  | 'seller_negative_equity'
  | 'penalty_maybe_applies';

export interface OverCreditInput {
  agreedPrice: number;
  sellerRemainingPrincipal: number;
  /** Bank appraisal value; 0 → treated as agreedPrice. */
  appraisalValue: number;
  buyerDownPayment: number;
  /** Decimal, 0.09 = 9%. */
  newAnnualRate: number;
  newTenorMonths: number;
  isSameBank: boolean;
  /** Decimal, 0.01 = 1%. */
  provisionFeePercent: number;
  appraisalFeeIDR: number;
  notaryFeeIDR: number;
  balikNamaFeeIDR: number;
  insuranceIDR: number;
  /** Decimal; applied only when !isSameBank. */
  oldBankPenaltyPercent: number;
  npoptkp: number;
}

export interface OverCreditResult {
  sellerEquity: number;
  newLoanAmount: number;
  newMonthlyPayment: number;
  newTotalPayment: number;
  newTotalInterest: number;
  provisionFee: number;
  bphtb: number;
  oldBankPenalty: number;
  totalProcessCost: number;
  buyerCashUpfront: number;
  appraisalShortfall: number;
  /** Loan ÷ appraisal value (decimal). */
  effectiveLtv: number;
  totalCostOfAcquisition: number;
  flags: OverCreditFlag[];
}

/** Reference first-home LTV cap (matches LTV_CAPS_CONVENTIONAL.first in ltv.ts). */
const LTV_GUARDRAIL = 0.85;

/** BPHTB rate: 5% of the tax base above NPOPTKP. */
const BPHTB_RATE = 0.05;

export function calculateOverCredit(input: OverCreditInput): OverCreditResult {
  const {
    agreedPrice,
    sellerRemainingPrincipal,
    appraisalValue,
    buyerDownPayment,
    newAnnualRate,
    newTenorMonths,
    isSameBank,
    provisionFeePercent,
    appraisalFeeIDR,
    notaryFeeIDR,
    balikNamaFeeIDR,
    insuranceIDR,
    oldBankPenaltyPercent,
    npoptkp,
  } = input;

  const appraisalEff = appraisalValue > 0 ? appraisalValue : agreedPrice;

  const sellerEquity = roundMoney(Math.max(0, agreedPrice - sellerRemainingPrincipal));
  const newLoanAmount = roundMoney(Math.max(0, agreedPrice - buyerDownPayment));

  const newMonthlyPayment = calculateAnnuityInstallment(newLoanAmount, newAnnualRate, newTenorMonths);
  const newTotalPayment = roundMoney(newMonthlyPayment * newTenorMonths);
  const newTotalInterest = roundMoney(Math.max(0, newTotalPayment - newLoanAmount));

  const provisionFee = roundMoney(newLoanAmount * provisionFeePercent);
  const bphtb = roundMoney(BPHTB_RATE * Math.max(0, agreedPrice - npoptkp));
  const oldBankPenalty = isSameBank
    ? 0
    : roundMoney(sellerRemainingPrincipal * oldBankPenaltyPercent);

  const totalProcessCost = roundMoney(
    provisionFee + appraisalFeeIDR + notaryFeeIDR + balikNamaFeeIDR + insuranceIDR + bphtb + oldBankPenalty,
  );

  const buyerCashUpfront = roundMoney(buyerDownPayment + totalProcessCost);
  const appraisalShortfall = roundMoney(Math.max(0, agreedPrice - appraisalEff));
  const effectiveLtv = appraisalEff > 0 ? newLoanAmount / appraisalEff : 0;
  const totalCostOfAcquisition = roundMoney(buyerCashUpfront + newTotalPayment);

  const flags: OverCreditFlag[] = [];
  if (appraisalShortfall > 0) flags.push('appraisal_shortfall');
  if (effectiveLtv > LTV_GUARDRAIL) flags.push('ltv_over_guardrail');
  if (sellerRemainingPrincipal > agreedPrice) flags.push('seller_negative_equity');
  if (!isSameBank && oldBankPenaltyPercent === 0) flags.push('penalty_maybe_applies');

  return {
    sellerEquity,
    newLoanAmount,
    newMonthlyPayment,
    newTotalPayment,
    newTotalInterest,
    provisionFee,
    bphtb,
    oldBankPenalty,
    totalProcessCost,
    buyerCashUpfront,
    appraisalShortfall,
    effectiveLtv,
    totalCostOfAcquisition,
    flags,
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/domain/__tests__/overCredit.test.ts`
Expected: PASS (all cases green).

- [ ] **Step 5: Commit**

```bash
git add src/domain/calculators/overCredit.ts src/domain/__tests__/overCredit.test.ts
git commit -m "feat(overcredit): add over kredit domain calculator"
```

---

### Task 2: Form-state type + i18n keys

**Files:**
- Create: `src/application/store/overCreditTypes.ts`
- Modify: `src/locales/en.json`
- Modify: `src/locales/id.json`

**Interfaces:**
- Produces: `OverCreditFormState` (all string fields except `isSameBank: boolean`) and `DEFAULT_OVER_CREDIT`. i18n namespace `overCredit.*` and `toolsNav.overCredit` in both locales.

- [ ] **Step 1: Create the form-state type**

Create `src/application/store/overCreditTypes.ts`:

```ts
export interface OverCreditFormState {
  agreedPrice: string;
  sellerRemainingPrincipal: string;
  appraisalValue: string;
  buyerDownPayment: string;
  newAnnualRatePercent: string;
  newTenorMonths: string;
  isSameBank: boolean;
  provisionFeePercent: string;
  appraisalFeeIDR: string;
  notaryFeeIDR: string;
  balikNamaFeeIDR: string;
  insuranceIDR: string;
  oldBankPenaltyPercent: string;
  npoptkp: string;
}

export const DEFAULT_OVER_CREDIT: OverCreditFormState = {
  agreedPrice: '',
  sellerRemainingPrincipal: '',
  appraisalValue: '',
  buyerDownPayment: '',
  newAnnualRatePercent: '',
  newTenorMonths: '',
  isSameBank: true,
  provisionFeePercent: '1',
  appraisalFeeIDR: '0',
  notaryFeeIDR: '0',
  balikNamaFeeIDR: '0',
  insuranceIDR: '0',
  oldBankPenaltyPercent: '0',
  npoptkp: '60000000',
};
```

- [ ] **Step 2: Add the English i18n block**

In `src/locales/en.json`, add a new top-level `"overCredit"` object (place it right after the closing brace of the `"refinancing"` block). Also add `"overCredit": "Over Kredit"` inside the existing `"toolsNav"` object (next to `"refinancing": "Refinancing"`).

```json
  "overCredit": {
    "title": "Over Kredit (Take-Over) Calculator",
    "promptFill": "Enter the agreed price, seller's remaining principal, and your new loan terms to see the analysis.",
    "dealSection": "The Deal",
    "agreedPrice": "Agreed Price",
    "agreedPriceHint": "Sale price agreed with the seller",
    "sellerRemaining": "Seller's Remaining Principal",
    "sellerRemainingHint": "Outstanding KPR the bank will pay off",
    "appraisalValue": "Bank Appraisal Value (optional)",
    "appraisalValueHint": "If blank, assumed equal to the agreed price",
    "buyerDp": "Your Down Payment",
    "buyerDpHint": "Cash you pay toward the price",
    "newLoanSection": "Your New KPR",
    "newRate": "New Interest Rate",
    "newRateHint": "Rate offered for the new loan",
    "newTenor": "New Tenor",
    "newTenorHint": "Tenor for the new loan",
    "sameBankLabel": "Take over at the same bank",
    "sameBankHint": "Different bank may charge the old bank's early-settlement penalty",
    "costSection": "Process Costs",
    "provision": "Provision Fee",
    "provisionHint": "Of the new loan (usually 1%)",
    "appraisalFee": "Appraisal Fee",
    "appraisalFeeHint": "Property valuation fee",
    "notary": "Notary / AJB",
    "notaryHint": "Deed and notary fees",
    "balikNama": "Title Transfer (BBN)",
    "balikNamaHint": "Certificate name-change cost",
    "insurance": "Insurance",
    "insuranceHint": "Life + fire insurance",
    "oldPenalty": "Old Bank Penalty",
    "oldPenaltyHint": "Of seller's remaining principal (different bank only)",
    "npoptkp": "NPOPTKP (BPHTB relief)",
    "npoptkpHint": "Non-taxable threshold, varies by region",
    "resultTitle": "Over Kredit Analysis",
    "cashUpfront": "Cash You Need Upfront",
    "cashUpfrontSub": "Down payment + all process costs",
    "newInstallment": "New Installment",
    "perMonth": "/month",
    "totalInterest": "Total Interest",
    "totalPayment": "Total Payment",
    "costBreakdown": "Process Cost Breakdown",
    "sellerEquity": "Money Received by Seller",
    "sellerEquitySub": "Agreed price − seller's remaining principal",
    "newLoanAmount": "Your New Loan Principal",
    "newLoanAmountSub": "Agreed price − your down payment",
    "ltvLabel": "Effective LTV",
    "totalCostAcquisition": "Total Cost Until Paid Off",
    "totalCostAcquisitionSub": "Cash upfront + all installments",
    "warnAppraisalShortfall": "If the bank only finances the appraisal value, prepare an extra {{amount}} in cash.",
    "warnLtvOver": "Loan-to-value is above the ~85% reference cap — expect a larger down payment requirement.",
    "warnNegativeEquity": "The seller's remaining principal exceeds the agreed price.",
    "warnPenaltyMaybe": "Different-bank take-over usually incurs the old bank's early-settlement penalty — set a percentage above.",
    "penaltyNote": "In practice the old-bank penalty is often negotiated between buyer and seller."
  },
```

- [ ] **Step 3: Add the Indonesian i18n block**

In `src/locales/id.json`, add the matching `"overCredit"` object (same placement, after `"refinancing"`) and `"overCredit": "Over Kredit"` inside `"toolsNav"`.

```json
  "overCredit": {
    "title": "Kalkulator Over Kredit",
    "promptFill": "Isi harga sepakat, sisa pokok KPR penjual, dan syarat KPR barumu untuk melihat analisis.",
    "dealSection": "Kesepakatan",
    "agreedPrice": "Harga Sepakat",
    "agreedPriceHint": "Harga jual yang disepakati dengan penjual",
    "sellerRemaining": "Sisa Pokok KPR Penjual",
    "sellerRemainingHint": "Sisa KPR yang akan dilunasi bank",
    "appraisalValue": "Nilai Taksiran Bank (opsional)",
    "appraisalValueHint": "Jika kosong, dianggap sama dengan harga sepakat",
    "buyerDp": "Uang Muka (DP) Kamu",
    "buyerDpHint": "Uang tunai yang kamu bayar dari harga",
    "newLoanSection": "KPR Baru Kamu",
    "newRate": "Bunga KPR Baru",
    "newRateHint": "Bunga yang ditawarkan untuk pinjaman baru",
    "newTenor": "Tenor Baru",
    "newTenorHint": "Tenor pinjaman baru",
    "sameBankLabel": "Over kredit di bank yang sama",
    "sameBankHint": "Beda bank bisa kena penalti pelunasan dipercepat bank lama",
    "costSection": "Biaya Proses",
    "provision": "Biaya Provisi",
    "provisionHint": "Dari pinjaman baru (biasanya 1%)",
    "appraisalFee": "Biaya Appraisal",
    "appraisalFeeHint": "Biaya taksiran properti",
    "notary": "Notaris / AJB",
    "notaryHint": "Biaya akta dan notaris",
    "balikNama": "Balik Nama (BBN)",
    "balikNamaHint": "Biaya ganti nama sertifikat",
    "insurance": "Asuransi",
    "insuranceHint": "Asuransi jiwa + kebakaran",
    "oldPenalty": "Penalti Bank Lama",
    "oldPenaltyHint": "Dari sisa pokok penjual (hanya jika beda bank)",
    "npoptkp": "NPOPTKP (pengurang BPHTB)",
    "npoptkpHint": "Ambang tidak kena pajak, beda tiap daerah",
    "resultTitle": "Analisis Over Kredit",
    "cashUpfront": "Tunai yang Harus Disiapkan",
    "cashUpfrontSub": "Uang muka + seluruh biaya proses",
    "newInstallment": "Cicilan Baru",
    "perMonth": "/bulan",
    "totalInterest": "Total Bunga",
    "totalPayment": "Total Bayar",
    "costBreakdown": "Rincian Biaya Proses",
    "sellerEquity": "Uang Diterima Penjual",
    "sellerEquitySub": "Harga sepakat − sisa pokok penjual",
    "newLoanAmount": "Pokok KPR Baru Kamu",
    "newLoanAmountSub": "Harga sepakat − uang muka kamu",
    "ltvLabel": "LTV Efektif",
    "totalCostAcquisition": "Total Biaya Sampai Lunas",
    "totalCostAcquisitionSub": "Tunai di depan + seluruh cicilan",
    "warnAppraisalShortfall": "Jika bank hanya membiayai nilai taksiran, siapkan tunai tambahan {{amount}}.",
    "warnLtvOver": "LTV di atas acuan ~85% — kemungkinan butuh uang muka lebih besar.",
    "warnNegativeEquity": "Sisa pokok KPR penjual melebihi harga sepakat.",
    "warnPenaltyMaybe": "Over kredit beda bank biasanya kena penalti pelunasan bank lama — isi persentasenya di atas.",
    "penaltyNote": "Dalam praktik, penalti bank lama sering dinegosiasikan antara pembeli dan penjual."
  },
```

- [ ] **Step 4: Verify types and JSON compile**

Run: `npx tsc -b --noEmit`
Expected: no output (clean). If either JSON has a trailing-comma or brace error, tsc's JSON import check will surface it — fix and re-run.

- [ ] **Step 5: Commit**

```bash
git add src/application/store/overCreditTypes.ts src/locales/en.json src/locales/id.json
git commit -m "feat(overcredit): add form-state type and i18n strings"
```

---

### Task 3: Panel UI (Panel + Inputs + ResultCard) with panel test

**Files:**
- Create: `src/ui/components/overcredit/OverCreditInputs.tsx`
- Create: `src/ui/components/overcredit/OverCreditResultCard.tsx`
- Create: `src/ui/components/overcredit/OverCreditPanel.tsx`
- Test: `src/ui/__tests__/OverCreditPanel.test.tsx`

**Interfaces:**
- Consumes: `OverCreditFormState`, `DEFAULT_OVER_CREDIT` (Task 2); `OverCreditResult`, `OverCreditFlag` (Task 1); `InputField` from `../common/InputField`; `ChevronIcon` from `../common/ChevronIcon`; `formatIDR`, `formatIDRCompact` from `../../../domain/utils/currency`.
- Produces: `OverCreditPanel` with props `{ form, onChange, result }` where `onChange` is the generic `<K extends keyof OverCreditFormState>(key: K, value: OverCreditFormState[K]) => void`.

- [ ] **Step 1: Write the failing panel test**

Create `src/ui/__tests__/OverCreditPanel.test.tsx`:

```tsx
// @vitest-environment jsdom
import { useState } from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import i18n from '../../i18n';
import { OverCreditPanel } from '../components/overcredit/OverCreditPanel';
import { DEFAULT_OVER_CREDIT, type OverCreditFormState } from '../../application/store/overCreditTypes';
import { calculateOverCredit } from '../../domain/calculators/overCredit';

function toResult(form: OverCreditFormState) {
  const agreedPrice = parseFloat(form.agreedPrice);
  const newTenor = parseInt(form.newTenorMonths);
  const newRate = parseFloat(form.newAnnualRatePercent) / 100;
  if (!(agreedPrice > 0) || !(newTenor > 0) || Number.isNaN(newRate)) return null;
  return calculateOverCredit({
    agreedPrice,
    sellerRemainingPrincipal: parseFloat(form.sellerRemainingPrincipal) || 0,
    appraisalValue: parseFloat(form.appraisalValue) || 0,
    buyerDownPayment: parseFloat(form.buyerDownPayment) || 0,
    newAnnualRate: newRate,
    newTenorMonths: newTenor,
    isSameBank: form.isSameBank,
    provisionFeePercent: (parseFloat(form.provisionFeePercent) || 0) / 100,
    appraisalFeeIDR: parseFloat(form.appraisalFeeIDR) || 0,
    notaryFeeIDR: parseFloat(form.notaryFeeIDR) || 0,
    balikNamaFeeIDR: parseFloat(form.balikNamaFeeIDR) || 0,
    insuranceIDR: parseFloat(form.insuranceIDR) || 0,
    oldBankPenaltyPercent: (parseFloat(form.oldBankPenaltyPercent) || 0) / 100,
    npoptkp: parseFloat(form.npoptkp) || 0,
  });
}

function Harness({ initial }: { initial?: Partial<OverCreditFormState> }) {
  const [form, setForm] = useState<OverCreditFormState>({ ...DEFAULT_OVER_CREDIT, ...initial });
  return (
    <OverCreditPanel
      form={form}
      onChange={(k, v) => setForm((p) => ({ ...p, [k]: v }))}
      result={toResult(form)}
    />
  );
}

function openPanel() {
  fireEvent.click(screen.getByRole('button', { name: /over kredit/i }));
}

beforeEach(async () => {
  await i18n.changeLanguage('en');
});
afterEach(cleanup);

describe('OverCreditPanel', () => {
  it('renders the title and, once open, the deal inputs', () => {
    render(<Harness />);
    openPanel();
    expect(screen.getByLabelText(/agreed price/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/seller's remaining principal/i)).toBeInTheDocument();
  });

  it('shows the empty state until required fields are filled', () => {
    render(<Harness />);
    openPanel();
    expect(screen.getByText(/enter the agreed price/i)).toBeInTheDocument();
  });

  it('shows the hero cash-upfront number and installment once filled', () => {
    render(
      <Harness
        initial={{ agreedPrice: '800000000', sellerRemainingPrincipal: '500000000', buyerDownPayment: '200000000', newAnnualRatePercent: '9', newTenorMonths: '180' }}
      />,
    );
    openPanel();
    expect(screen.getByText('Cash You Need Upfront')).toBeInTheDocument();
    expect(screen.getByText('New Installment')).toBeInTheDocument();
  });

  it('shows the appraisal-shortfall warning when appraisal is below the agreed price', () => {
    render(
      <Harness
        initial={{ agreedPrice: '800000000', appraisalValue: '700000000', buyerDownPayment: '200000000', newAnnualRatePercent: '9', newTenorMonths: '180' }}
      />,
    );
    openPanel();
    expect(screen.getByText(/prepare an extra/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/ui/__tests__/OverCreditPanel.test.tsx`
Expected: FAIL — cannot resolve `../components/overcredit/OverCreditPanel`.

- [ ] **Step 3: Create the Inputs component**

Create `src/ui/components/overcredit/OverCreditInputs.tsx`:

```tsx
import { useTranslation } from 'react-i18next';
import { InputField } from '../common/InputField';
import { formatIDR } from '../../../domain/utils/currency';
import type { OverCreditFormState } from '../../../application/store/overCreditTypes';

interface Props {
  form: OverCreditFormState;
  onChange: <K extends keyof OverCreditFormState>(key: K, value: OverCreditFormState[K]) => void;
}

export function OverCreditInputs({ form, onChange }: Props) {
  const { t } = useTranslation();
  const dp = parseFloat(form.buyerDownPayment) || 0;

  return (
    <div className="space-y-4">
      {/* The Deal */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          {t('overCredit.dealSection')}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InputField
            label={t('overCredit.agreedPrice')}
            value={form.agreedPrice}
            onChange={(v) => onChange('agreedPrice', v)}
            type="number"
            prefix="Rp"
            placeholder="0"
            min="0"
            step="10000000"
            hint={t('overCredit.agreedPriceHint')}
          />
          <InputField
            label={t('overCredit.sellerRemaining')}
            value={form.sellerRemainingPrincipal}
            onChange={(v) => onChange('sellerRemainingPrincipal', v)}
            type="number"
            prefix="Rp"
            placeholder="0"
            min="0"
            step="10000000"
            hint={t('overCredit.sellerRemainingHint')}
          />
          <InputField
            label={t('overCredit.appraisalValue')}
            value={form.appraisalValue}
            onChange={(v) => onChange('appraisalValue', v)}
            type="number"
            prefix="Rp"
            placeholder="0"
            min="0"
            step="10000000"
            hint={t('overCredit.appraisalValueHint')}
          />
          <InputField
            label={t('overCredit.buyerDp')}
            value={form.buyerDownPayment}
            onChange={(v) => onChange('buyerDownPayment', v)}
            type="number"
            prefix="Rp"
            placeholder="0"
            min="0"
            step="10000000"
            hint={dp > 0 ? formatIDR(dp) : t('overCredit.buyerDpHint')}
          />
        </div>
      </div>

      {/* Your New KPR */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          {t('overCredit.newLoanSection')}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InputField
            label={t('overCredit.newRate')}
            value={form.newAnnualRatePercent}
            onChange={(v) => onChange('newAnnualRatePercent', v)}
            type="number"
            suffix="%"
            placeholder="0"
            min="0"
            max="30"
            step="0.25"
            hint={t('overCredit.newRateHint')}
          />
          <InputField
            label={t('overCredit.newTenor')}
            value={form.newTenorMonths}
            onChange={(v) => onChange('newTenorMonths', v)}
            type="number"
            suffix={t('form.tenorMonths').toLowerCase()}
            placeholder="0"
            min="1"
            step="1"
            hint={t('overCredit.newTenorHint')}
          />
        </div>
        <label className="mt-3 flex items-start gap-2 text-xs text-gray-600">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={form.isSameBank}
            onChange={(e) => onChange('isSameBank', e.target.checked)}
          />
          <span>
            <span className="font-medium text-gray-700">{t('overCredit.sameBankLabel')}</span>
            <span className="block text-gray-400">{t('overCredit.sameBankHint')}</span>
          </span>
        </label>
      </div>

      {/* Process Costs */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          {t('overCredit.costSection')}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <InputField
            label={t('overCredit.provision')}
            value={form.provisionFeePercent}
            onChange={(v) => onChange('provisionFeePercent', v)}
            type="number"
            suffix="%"
            placeholder="1"
            min="0"
            max="10"
            step="0.25"
            hint={t('overCredit.provisionHint')}
          />
          <InputField
            label={t('overCredit.appraisalFee')}
            value={form.appraisalFeeIDR}
            onChange={(v) => onChange('appraisalFeeIDR', v)}
            type="number"
            prefix="Rp"
            placeholder="0"
            min="0"
            step="500000"
            hint={t('overCredit.appraisalFeeHint')}
          />
          <InputField
            label={t('overCredit.notary')}
            value={form.notaryFeeIDR}
            onChange={(v) => onChange('notaryFeeIDR', v)}
            type="number"
            prefix="Rp"
            placeholder="0"
            min="0"
            step="500000"
            hint={t('overCredit.notaryHint')}
          />
          <InputField
            label={t('overCredit.balikNama')}
            value={form.balikNamaFeeIDR}
            onChange={(v) => onChange('balikNamaFeeIDR', v)}
            type="number"
            prefix="Rp"
            placeholder="0"
            min="0"
            step="500000"
            hint={t('overCredit.balikNamaHint')}
          />
          <InputField
            label={t('overCredit.insurance')}
            value={form.insuranceIDR}
            onChange={(v) => onChange('insuranceIDR', v)}
            type="number"
            prefix="Rp"
            placeholder="0"
            min="0"
            step="500000"
            hint={t('overCredit.insuranceHint')}
          />
          {!form.isSameBank && (
            <InputField
              label={t('overCredit.oldPenalty')}
              value={form.oldBankPenaltyPercent}
              onChange={(v) => onChange('oldBankPenaltyPercent', v)}
              type="number"
              suffix="%"
              placeholder="0"
              min="0"
              max="10"
              step="0.25"
              hint={t('overCredit.oldPenaltyHint')}
            />
          )}
          <InputField
            label={t('overCredit.npoptkp')}
            value={form.npoptkp}
            onChange={(v) => onChange('npoptkp', v)}
            type="number"
            prefix="Rp"
            placeholder="60000000"
            min="0"
            step="10000000"
            hint={t('overCredit.npoptkpHint')}
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create the ResultCard component**

Create `src/ui/components/overcredit/OverCreditResultCard.tsx`:

```tsx
import { useTranslation } from 'react-i18next';
import { formatIDR, formatIDRCompact } from '../../../domain/utils/currency';
import type { OverCreditResult } from '../../../domain/calculators/overCredit';

interface Props {
  result: OverCreditResult;
}

function MetricRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-start justify-between gap-2 py-2 border-b border-gray-100 last:border-b-0">
      <div>
        <p className="text-xs font-medium text-gray-600">{label}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
      <p className="text-sm font-semibold text-right tabular-nums text-gray-900">{value}</p>
    </div>
  );
}

export function OverCreditResultCard({ result }: Props) {
  const { t } = useTranslation();
  const ltvPct = (result.effectiveLtv * 100).toFixed(0);
  const ltvOver = result.flags.includes('ltv_over_guardrail');

  return (
    <div className="space-y-4">
      {/* Hero: cash upfront */}
      <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-4 text-center">
        <p className="text-xs font-medium text-green-700 uppercase tracking-wide">
          {t('overCredit.cashUpfront')}
        </p>
        <p className="mt-1 text-2xl font-bold text-green-800 tabular-nums">
          {formatIDR(result.buyerCashUpfront)}
        </p>
        <p className="text-xs text-green-600">{t('overCredit.cashUpfrontSub')}</p>
      </div>

      {/* Warnings */}
      {result.flags.includes('appraisal_shortfall') && (
        <p className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
          {t('overCredit.warnAppraisalShortfall', { amount: formatIDR(result.appraisalShortfall) })}
        </p>
      )}
      {ltvOver && (
        <p className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
          {t('overCredit.warnLtvOver')}
        </p>
      )}
      {result.flags.includes('seller_negative_equity') && (
        <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
          {t('overCredit.warnNegativeEquity')}
        </p>
      )}
      {result.flags.includes('penalty_maybe_applies') && (
        <p className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
          {t('overCredit.warnPenaltyMaybe')}
        </p>
      )}

      {/* New installment */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <p className="text-sm font-semibold text-gray-700">{t('overCredit.resultTitle')}</p>
        </div>
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs text-gray-500 mb-0.5">{t('overCredit.newInstallment')}</p>
          <p className="text-lg font-bold text-gray-800 tabular-nums">
            {formatIDRCompact(result.newMonthlyPayment)}
          </p>
          <p className="text-xs text-gray-400">{t('overCredit.perMonth')}</p>
        </div>
        <div className="px-4">
          <MetricRow label={t('overCredit.newLoanAmount')} value={formatIDR(result.newLoanAmount)} sub={t('overCredit.newLoanAmountSub')} />
          <MetricRow label={t('overCredit.sellerEquity')} value={formatIDR(result.sellerEquity)} sub={t('overCredit.sellerEquitySub')} />
          <MetricRow label={t('overCredit.totalInterest')} value={formatIDR(result.newTotalInterest)} />
          <MetricRow label={t('overCredit.totalPayment')} value={formatIDR(result.newTotalPayment)} />
          <MetricRow
            label={t('overCredit.ltvLabel')}
            value={`${ltvPct}%`}
            sub={ltvOver ? t('overCredit.warnLtvOver') : undefined}
          />
          <MetricRow label={t('overCredit.totalCostAcquisition')} value={formatIDR(result.totalCostOfAcquisition)} sub={t('overCredit.totalCostAcquisitionSub')} />
        </div>
      </div>

      {/* Cost breakdown */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <p className="text-sm font-semibold text-gray-700">{t('overCredit.costBreakdown')}</p>
        </div>
        <div className="px-4">
          <MetricRow label={t('overCredit.provision')} value={formatIDR(result.provisionFee)} />
          <MetricRow label={t('overCredit.npoptkp')} value={`BPHTB ${formatIDR(result.bphtb)}`} />
          <MetricRow label={t('overCredit.oldPenalty')} value={formatIDR(result.oldBankPenalty)} sub={t('overCredit.penaltyNote')} />
          <MetricRow label={t('overCredit.costSection')} value={formatIDR(result.totalProcessCost)} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create the Panel component**

Create `src/ui/components/overcredit/OverCreditPanel.tsx`:

```tsx
import { useState, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { OverCreditInputs } from './OverCreditInputs';
import { OverCreditResultCard } from './OverCreditResultCard';
import { ChevronIcon } from '../common/ChevronIcon';
import type { OverCreditFormState } from '../../../application/store/overCreditTypes';
import type { OverCreditResult } from '../../../domain/calculators/overCredit';

interface Props {
  form: OverCreditFormState;
  onChange: <K extends keyof OverCreditFormState>(key: K, value: OverCreditFormState[K]) => void;
  result: OverCreditResult | null;
}

export function OverCreditPanel({ form, onChange, result }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <button
        id={`${panelId}-btn`}
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-semibold text-gray-700"
        data-jump-toggle
        aria-expanded={open}
        aria-controls={panelId}
      >
        <span>{t('overCredit.title')}</span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className="bg-white" id={panelId} role="region" aria-labelledby={`${panelId}-btn`}>
          <div className="p-4 border-b border-gray-100">
            <OverCreditInputs form={form} onChange={onChange} />
          </div>

          <div className="p-4">
            {result ? (
              <OverCreditResultCard result={result} />
            ) : (
              <p className="text-sm text-center text-gray-400 py-4">{t('overCredit.promptFill')}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Run the panel test to verify it passes**

Run: `npx vitest run src/ui/__tests__/OverCreditPanel.test.tsx`
Expected: PASS (all four cases green).

- [ ] **Step 7: Type-check**

Run: `npx tsc -b --noEmit`
Expected: no output.

- [ ] **Step 8: Commit**

```bash
git add src/ui/components/overcredit/ src/ui/__tests__/OverCreditPanel.test.tsx
git commit -m "feat(overcredit): add panel, inputs, and result card"
```

---

### Task 4: Wire the panel into the page + full regression

**Files:**
- Modify: `src/ui/pages/CalculatorPage.tsx`

**Interfaces:**
- Consumes: `OverCreditPanel` (Task 3), `calculateOverCredit` (Task 1), `DEFAULT_OVER_CREDIT` + `OverCreditFormState` (Task 2).

- [ ] **Step 1: Add imports**

In `src/ui/pages/CalculatorPage.tsx`, alongside the existing Refinancing imports (search for `RefinancingPanel` import near the top), add:

```tsx
import { OverCreditPanel } from '../components/overcredit/OverCreditPanel';
import { calculateOverCredit } from '../../domain/calculators/overCredit';
import { DEFAULT_OVER_CREDIT } from '../../application/store/overCreditTypes';
import type { OverCreditFormState } from '../../application/store/overCreditTypes';
```

- [ ] **Step 2: Add state, change handler, and memoized result**

Find the block that starts with the comment `// ── Refinancing state ─` and, right after the `handleRefinancingChange` function, add:

```tsx
  // ── Over Kredit state ─────────────────────────────────────────────────────
  const [overCreditForm, setOverCreditForm] =
    useState<OverCreditFormState>(DEFAULT_OVER_CREDIT);

  function handleOverCreditChange<K extends keyof OverCreditFormState>(
    key: K,
    value: OverCreditFormState[K],
  ) {
    setOverCreditForm((prev) => ({ ...prev, [key]: value }));
  }
```

Then, near the `refinancingResult = useMemo(...)` block, add below it:

```tsx
  const overCreditResult = useMemo(() => {
    const agreedPrice = parseFloat(overCreditForm.agreedPrice);
    const newTenor = parseInt(overCreditForm.newTenorMonths);
    const newRate = parseFloat(overCreditForm.newAnnualRatePercent) / 100;
    if (!(agreedPrice > 0) || !(newTenor > 0) || Number.isNaN(newRate)) return null;
    return calculateOverCredit({
      agreedPrice,
      sellerRemainingPrincipal: parseFloat(overCreditForm.sellerRemainingPrincipal) || 0,
      appraisalValue: parseFloat(overCreditForm.appraisalValue) || 0,
      buyerDownPayment: parseFloat(overCreditForm.buyerDownPayment) || 0,
      newAnnualRate: newRate,
      newTenorMonths: newTenor,
      isSameBank: overCreditForm.isSameBank,
      provisionFeePercent: (parseFloat(overCreditForm.provisionFeePercent) || 0) / 100,
      appraisalFeeIDR: parseFloat(overCreditForm.appraisalFeeIDR) || 0,
      notaryFeeIDR: parseFloat(overCreditForm.notaryFeeIDR) || 0,
      balikNamaFeeIDR: parseFloat(overCreditForm.balikNamaFeeIDR) || 0,
      insuranceIDR: parseFloat(overCreditForm.insuranceIDR) || 0,
      oldBankPenaltyPercent: (parseFloat(overCreditForm.oldBankPenaltyPercent) || 0) / 100,
      npoptkp: parseFloat(overCreditForm.npoptkp) || 0,
    });
  }, [overCreditForm]);
```

- [ ] **Step 3: Add the nav chip entry**

Find the `sections` array that contains `{ id: 'section-refinancing', label: t('toolsNav.refinancing') }` and add, right after that entry:

```tsx
    { id: 'section-over-credit', label: t('toolsNav.overCredit') },
```

- [ ] **Step 4: Render the panel**

Find the JSX block with the comment `{/* Refinancing — right after affordability */}` (the `<div ref={refinancingRef} id="section-refinancing" ...>` block). Immediately after its closing `)}`, insert:

```tsx
      {/* Over Kredit — take-over via bank */}
      {calculated.length >= 1 && (
        <div id="section-over-credit" className="scroll-mt-16">
          <OverCreditPanel
            form={overCreditForm}
            onChange={handleOverCreditChange}
            result={overCreditResult}
          />
        </div>
      )}
```

- [ ] **Step 5: Type-check**

Run: `npx tsc -b --noEmit`
Expected: no output.

- [ ] **Step 6: Run the full test suite**

Run: `npx vitest run --run`
Expected: the new `overCredit.test.ts` and `OverCreditPanel.test.tsx` pass; total passing count rises by their case count vs. the Task 0 baseline; no NEW failures beyond the pre-existing `localStorage`/jsdom ones in `draftStorage.test.ts` and `calculatorFlow.test.tsx` (documented in Global Constraints). If `calculatorFlow.test.tsx > auto-calculates the default form` times out, re-run once.

- [ ] **Step 7: Commit**

```bash
git add src/ui/pages/CalculatorPage.tsx
git commit -m "feat(overcredit): wire over kredit panel into calculator page"
```

---

## Self-Review

**Spec coverage:**
- Over kredit resmi via bank only → Task 1 calculator models exactly this. ✓
- Buyer cash upfront → `buyerCashUpfront` (Task 1) + hero card (Task 3). ✓
- Buyer new installment → annuity reuse (Task 1) + installment block (Task 3). ✓
- Process-cost breakdown incl. BPHTB → `provisionFee`/`bphtb`/`oldBankPenalty`/`totalProcessCost` (Task 1) + breakdown card (Task 3). ✓
- Same-bank vs different-bank toggle + penalty → `isSameBank` + `oldBankPenalty` + `penalty_maybe_applies` (Task 1) + checkbox (Task 3). ✓
- Appraisal / LTV gap awareness → `appraisalShortfall` + `effectiveLtv` + flags (Task 1) + warnings/LTV row (Task 3). ✓
- Deal mechanics (money to seller / new principal) → `sellerEquity` + `newLoanAmount` (Task 1) + rows (Task 3). ✓
- Empty/incomplete state → `overCreditResult` returns null; panel shows prompt (Tasks 3–4). ✓
- i18n EN + ID → Task 2. ✓
- Tests (unit + panel) + regression → Tasks 1, 3, 4. ✓
- YAGNI (no DSR, no informal mode, single fixed rate) → honored; none added. ✓

**Spec deviation (intentional):** the spec listed reusing the `LtvIndicator` component; it is coupled to `MortgageFormState`, so the plan reuses the LTV guardrail *logic* (constant + computed `effectiveLtv`) and renders LTV inline instead. Same user-facing outcome, cleaner boundary.

**Placeholder scan:** no TBD/TODO; every code step contains full code; every test step contains real assertions. ✓

**Type consistency:** `calculateOverCredit`, `OverCreditInput`, `OverCreditResult`, `OverCreditFlag`, `OverCreditFormState`, `DEFAULT_OVER_CREDIT`, and the generic `onChange` signature are used identically across Tasks 1–4. The `useMemo` mapping in Task 4 matches the field names in `OverCreditInput` (Task 1) and `OverCreditFormState` (Task 2). ✓
