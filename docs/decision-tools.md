# Decision Tools

The calculator ships several "decision tools" that sit below the main result and
help answer real KPR questions. Each is an **additive panel** that reads the
active scenario (and a few of its own inputs) — none of them change the core
amortization engine. This doc explains how each works and its assumptions.

> ⚠️ All tools produce **estimates / guidance**, not bank decisions. Caps and
> rates are configurable reference defaults, not official figures.

---

## LTV guardrail

**Source:** `src/domain/calculators/ltv.ts` · `src/ui/components/results/LtvIndicator.tsx`

Shows the loan-to-value ratio (`loan ÷ property value`) and whether the down
payment clears Bank Indonesia–style caps for three home-order tiers.

- **Reference caps (conventional):** 1st home 85%, 2nd 80%, 3rd+ 75%.
- **Syariah:** +5 percentage points of LTV (lower DP) on each tier.
- For every tier the panel shows ✓/✗ and the **minimum down payment** needed to
  satisfy that cap.

Derived from the form via `deriveLoanValuation` (property price + DP), **not** the
summary — `summary.downPayment` is only populated when the KPR-fees section is
enabled, so the form is the reliable source.

*Caveat:* BI has at times relaxed LTV to 100%; banks set their own limits. The
caps are editable.

---

## Buy vs Rent

**Source:** `src/domain/calculators/buyVsRent.ts` · `src/ui/components/buyvsrent/BuyVsRentPanel.tsx`

A **net-worth comparison** over a chosen horizon. Both parties start with the same
cash:

- **Buyer** spends the upfront cash (DP + admin fee) and pays the mortgage; their
  wealth = home equity (`appreciating value − remaining balance`).
- **Renter** invests that upfront cash and, each month, invests the difference
  between the installment and the rent (drawing the portfolio down when rent is
  dearer); their wealth = portfolio value.
- **Breakeven** = the first month the buyer's wealth overtakes the renter's.

**Inputs:** monthly rent, rent growth %/yr, property appreciation %/yr, investment
return %/yr, horizon (years). **Output:** breakeven month, buyer vs renter net
worth at the horizon, and a `buy` / `rent` / `close` verdict (within 5% = close).

*Caveat:* excludes maintenance, property tax, and sale/transaction costs.

---

## FLPP subsidy

**Source:** `src/domain/calculators/flpp.ts` · `src/ui/components/flpp/FlppPanel.tsx`

Checks eligibility for Indonesia's subsidized mortgage (FLPP) and shows the
installment at the subsidized rate.

- **Fixed scheme parts:** 5% p.a. for the full tenor, max tenor 20 years.
- **Eligibility checklist:** property price ≤ cap, monthly income ≤ cap, first
  home, tenor ≤ 20 yr — each shown ✓/✗.
- **Defaults (editable):** price cap Rp 185,000,000; income cap Rp 8,000,000.
- **Output:** subsidized installment + the monthly saving vs the active scenario.

*Caveat:* income/price caps vary by region and year; this is **not** an official
eligibility decision — confirm with a participating bank.

---

## Affordability + stress test

**Source:** `src/domain/calculators/affordability.ts` · `src/ui/components/affordability/`

DSR (debt-service ratio), net monthly surplus, maximum affordable loan, and a
**rate-stress test** (+0 / +1 / +2 / +3% applied from the first floating period)
with safe / watch / risky bands.

## Refinancing simulator

**Source:** `src/domain/calculators/refinancing.ts` · `src/ui/components/refinancing/`

Compares the current loan against a new offer: monthly savings, total interest
savings, switching cost, **break-even months**, and a worth-it / marginal /
not-worth-it recommendation.

---

## Sharing & persistence

Scenario state is encoded into the `?s=` URL parameter (LZString-compressed, with
a legacy base64 fallback) by `src/utils/urlState.ts`, and the same encoder backs
the localStorage draft (`src/utils/draftStorage.ts`). New form fields are added
with a strip-on-encode / restore-on-decode default so old URLs and drafts keep
working — e.g. a legacy single lump sum is migrated into the multi-lump list on
decode.
