# Over Kredit Calculator — Design Spec

**Date:** 2026-07-20
**Status:** Approved (design), pending implementation plan
**Feature:** Standalone "Over Kredit" (KPR take-over via bank) calculator

## Problem

Indonesian buyers frequently purchase a house whose seller still has an active
KPR (mortgage). The "over kredit resmi via bank" path — buyer takes a new KPR
that pays off the seller's remaining principal, property title is transferred
(balik nama), and a new akad is signed — has costs and cash requirements that
surprise buyers. There is currently no tool in the calculator for this scenario.
The existing Refinancing calculator covers a related but distinct case (moving
_your own_ mortgage between banks), so this is a genuinely new feature.

## Scope

**In scope (v1):**
- Over kredit **resmi via bank** only.
- Compute buyer cash needed upfront, buyer's new installment, and a full
  process-cost breakdown (including BPHTB), plus the deal mechanics
  (money to seller / new principal).
- Same-bank vs different-bank toggle (affects old-bank early-settlement penalty).
- Appraisal value / LTV gap awareness (reuse existing LTV logic).

**Out of scope (v1) — YAGNI:**
- DSR / affordability check (skip in v1).
- Over kredit "di bawah tangan" (informal).
- Comparison vs a fresh new KPR.
- Tiered / floating rate (single fixed rate like the Refinancing panel).

## Architecture (mirrors the Refinancing pattern)

```
src/domain/calculators/overCredit.ts        ← pure calculator + types
src/domain/calculators/overCredit.test.ts   ← unit tests
src/application/store/overCreditTypes.ts     ← form state + defaults
src/ui/components/overcredit/
    OverCreditPanel.tsx                      ← disclosure wrapper panel
    OverCreditInputs.tsx                     ← input form
    OverCreditResultCard.tsx                 ← result display
    OverCreditPanel.test.tsx                 ← panel test
```

**Wiring:** register the panel in `src/ui/pages/CalculatorPage.tsx` and add a
nav entry in `src/ui/components/common/DecisionToolsNav.tsx`, following exactly
how Refinancing / FLPP / Buy-vs-Rent are wired.

**Reuse (do not reimplement):**
- `calculateAnnuityInstallment` from `src/domain/calculators/annuity.ts`
- `assessLtv` + `LtvIndicator` from `src/domain/calculators/ltv.ts` /
  `src/ui/components/results/LtvIndicator.tsx`
- currency/number utilities from `src/domain/utils/`
- i18n: add keys to `src/locales/en.json` and `src/locales/id.json`

## Inputs (`OverCreditFormState`, all strings like other panels)

| Field | Key | Default | Notes |
|---|---|---|---|
| Harga sepakat | `agreedPrice` | `''` | Agreed sale price buyer↔seller |
| Sisa pokok KPR penjual | `sellerRemainingPrincipal` | `''` | Paid off by the new bank |
| Nilai taksiran bank (opsional) | `appraisalValue` | `''` | If empty → treated as `agreedPrice` |
| DP pembeli (Rp) | `buyerDownPayment` | `''` | Buyer cash down payment |
| Bunga KPR baru (%) | `newAnnualRatePercent` | `''` | Single fixed rate (v1) |
| Tenor baru (bln) | `newTenorMonths` | `''` | New tenor in months |
| Over kredit di bank yang sama? | `isSameBank` | `true` | If false → old-bank penalty applies |
| Provisi bank baru (%) | `provisionFeePercent` | `'1'` | % of new loan |
| Biaya appraisal (Rp) | `appraisalFeeIDR` | `'0'` | |
| Notaris / AJB (Rp) | `notaryFeeIDR` | `'0'` | |
| BBN / balik nama (Rp) | `balikNamaFeeIDR` | `'0'` | Title transfer |
| Asuransi (Rp) | `insuranceIDR` | `'0'` | Jiwa + kebakaran |
| Penalti bank lama (%) | `oldBankPenaltyPercent` | `'0'` | % of seller remaining principal; only when `!isSameBank` |
| NPOPTKP (Rp) | `npoptkp` | `'60000000'` | For BPHTB; regional, editable |

## Calculation model (`overCredit.ts`)

Input (numbers, after parsing/validation) → `OverCreditResult`.

Let `appraisalEff = appraisalValue > 0 ? appraisalValue : agreedPrice`.

1. **Money received by seller (equity):**
   `sellerEquity = max(0, agreedPrice − sellerRemainingPrincipal)`
2. **Buyer's new loan principal:**
   `newLoanAmount = max(0, agreedPrice − buyerDownPayment)`
3. **New installment (reuse annuity):**
   `newMonthlyPayment = annuity(newLoanAmount, newAnnualRate, newTenorMonths)`
   `newTotalPayment  = round(newMonthlyPayment × newTenorMonths)`
   `newTotalInterest = max(0, newTotalPayment − newLoanAmount)`
4. **BPHTB (buyer tax):**
   `bphtb = 0.05 × max(0, agreedPrice − npoptkp)`
   (Base = agreed price; NJOP not modeled in v1.)
5. **Old-bank early-settlement penalty:**
   `oldBankPenalty = isSameBank ? 0 : sellerRemainingPrincipal × oldBankPenaltyPercent`
   (Presented as a cost line; note in UI that in practice this is often negotiated
   between buyer and seller.)
6. **Provision fee:** `provisionFee = newLoanAmount × provisionFeePercent`
7. **Total process cost:**
   `totalProcessCost = provisionFee + appraisalFeeIDR + notaryFeeIDR
                     + balikNamaFeeIDR + insuranceIDR + bphtb + oldBankPenalty`
8. **Buyer cash upfront (hero number):**
   `buyerCashUpfront = buyerDownPayment + totalProcessCost`
9. **Appraisal shortfall (informational, NOT auto-summed):**
   `appraisalShortfall = max(0, agreedPrice − appraisalEff)`
   Surfaced as a warning: "if the bank only finances the appraisal value,
   prepare an extra Rp X in cash."
10. **Effective LTV:** `effectiveLtv = newLoanAmount / appraisalEff` → feed
    `assessLtv` for the indicator.
11. **Total cost until paid off (summary):**
    `totalCostOfAcquisition = buyerCashUpfront + newTotalPayment`

All rupiah outputs rounded with the existing `roundMoney` helper.

### `OverCreditResult` shape (draft)

```ts
interface OverCreditResult {
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
  effectiveLtv: number;         // ratio 0..1+
  totalCostOfAcquisition: number;
  flags: OverCreditFlag[];      // see below
}
```

## Output (panel UI)

1. **Hero card (green):** Buyer cash upfront (`buyerCashUpfront`).
2. **New installment block:** `newMonthlyPayment` /mo + total interest + total payment.
3. **Process-cost breakdown table:** each component line
   (provisi, appraisal, notaris/AJB, BBN, asuransi, BPHTB, penalti bank lama).
4. **Deal mechanics block:** money received by seller (`sellerEquity`) +
   new loan principal (`newLoanAmount`), with a short explanation.
5. **`LtvIndicator`** from `effectiveLtv` vs `appraisalEff`.
6. **Warnings** (see flags).

## Error handling & flags (`OverCreditFlag`)

- **Incomplete input** → render empty/incomplete state (match other panels;
  no result computed until required fields present).
- `appraisalEff < agreedPrice` → `appraisal_shortfall` warning with the amount.
- `effectiveLtv` over the LTV guardrail → warning via `LtvIndicator`.
- `sellerRemainingPrincipal > agreedPrice` → `seller_negative_equity` flag
  (still computed; sellerEquity clamps to 0).
- `!isSameBank && oldBankPenaltyPercent === 0` → `penalty_maybe_applies` hint.

### Validation rules
- `agreedPrice > 0` required.
- `0 ≤ sellerRemainingPrincipal` (warn if `> agreedPrice`).
- `0 ≤ buyerDownPayment ≤ agreedPrice`.
- `newAnnualRatePercent ≥ 0`, `newTenorMonths > 0`.
- Percentage fields within sane bounds (0–100).

## Testing

**`overCredit.test.ts` (unit):**
- sellerEquity: normal, and negative-equity clamp to 0.
- newLoanAmount: DP=0, DP=agreedPrice (→0), mid.
- BPHTB: above/below NPOPTKP threshold.
- penalty: same-bank (0) vs different-bank (computed).
- provisionFee, totalProcessCost aggregation.
- buyerCashUpfront correctness.
- appraisalShortfall when appraisal < agreed (and 0 when appraisal ≥ agreed / empty).
- effectiveLtv value + flag when over guardrail.
- incomplete input → no/blank result.

**`OverCreditPanel.test.tsx` (panel):**
- renders inputs; filling required fields shows hero cash number + installment.
- appraisal < agreed shows the shortfall warning.
- toggle different-bank + penalty% shows a penalty line in the breakdown.

**Regression:** full Vitest suite stays green; `tsc -b --noEmit` clean.
i18n keys present in both `en.json` and `id.json`.

## Assumptions / notes

- BPHTB base uses the agreed price (transaction value); NJOP-based valuation is
  not modeled in v1. NPOPTKP default 60,000,000 is editable (varies by region).
- The old-bank penalty is shown as a cost line; the UI notes it is commonly
  negotiated between buyer and seller rather than always borne by the buyer.
- Single fixed rate only in v1 (matches the Refinancing panel); tiered/floating
  rates are a possible later enhancement.
