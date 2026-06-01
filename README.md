# KPR Calculator — Simulasi Kredit Pemilikan Rumah

A client-side Indonesian mortgage (KPR) simulation tool built with React 18, TypeScript, Vite, and Tailwind CSS. Runs entirely in the browser — no backend, no account required.

---

## Features

| Feature | Description |
|---|---|
| Annuity & flat-rate simulation | Both payment methods supported; flat yields constant principal, annuity yields constant installment |
| Fixed / floating / tiered rates | Fixed period → single floating rate, or multi-tier floating schedule |
| **KPR Syariah / iB (v1.1.0)** | Murabahah (margin tetap) and Musyarakah Mutanaqishah (ujrah menurun) simulation |
| Upfront cost / cash-to-close | Down payment, provision, appraisal, notary, BPHTB, PPN, life & fire insurance |
| Affordability analysis | DSR calculation, net surplus, max affordable loan, min recommended income |
| Stress test | Rate-shock simulation (+0 – +3%) from the first floating period |
| Refinancing simulator | Break-even, net savings, monthly savings vs switching cost |
| **LTV guardrail** | Loan-to-value ratio vs BI-style caps (1st / 2nd / 3rd home, syariah +5%) with the minimum down payment to qualify per tier |
| **Buy vs Rent** | Net-worth breakeven — building home equity vs renting and investing the down payment plus the monthly difference |
| **FLPP subsidy** | Eligibility check (income / property-price caps, first home, tenor ≤ 20 yr) + the installment at the subsidized 5% fixed rate |
| Scenario comparison | Up to 3 scenarios side-by-side |
| Shareable URL | Full calculator state encoded in the URL `?s=` parameter (LZString-compressed) |
| PDF / CSV export | Lazy-loaded; a detailed amortization + summary PDF, or a CSV. CSV covers **all calculated scenarios** in two sections (scenario summary + amortization schedule), with mode-aware labels (Bunga / Margin / Ujrah) and a UTF-8 BOM for Excel |
| Mobile "See Results" | Sticky shortcut on small screens that jumps from the input form to the results (or to the first error) |
| Early repayment | Extra monthly payment, one or more scheduled lump-sum prepayments, or both |
| **Installable PWA** | Add to Home Screen + offline support via a service worker |

See **[docs/decision-tools.md](docs/decision-tools.md)** for how each decision tool works and its assumptions.

---

## Calculation Assumptions

- **Rates are estimates.** Interest rates entered in the calculator are user-supplied. Actual bank rates vary by product, borrower profile, and negotiation.
- **Floating rates can change.** After the fixed period, the floating rate is assumed constant for the remainder of the tenor unless you model tiers explicitly. Real KPR floating rates are repriced periodically by the bank.
- **Fees are user-provided or estimated.** Provision, appraisal, notary, BPHTB, PPN, and insurance amounts depend on the property, bank, and notary. The defaults are representative but not official.
- **Affordability output is guidance, not approval.** The DSR limit and stress-test results are indicative. Banks apply their own credit-scoring criteria, income verification, and internal risk policies.
- **Stress test scope.** The +1–+3% stress scenarios simulate a uniform rate shift applied from the opening balance of the first floating period for the remaining tenor. They do not regenerate a full per-tier schedule.
- **Decimal precision.** All monetary arithmetic uses `Decimal.js` (banker's rounding) to avoid floating-point drift.
- **LTV caps are reference defaults.** The 1st / 2nd / 3rd-home caps (85% / 80% / 75%, +5% for syariah) follow Bank Indonesia's historical macroprudential tiers but are **editable in the panel** — BI has at times relaxed LTV to 100%, and each bank sets its own limit. The output is guidance, not an approval.
- **Buy vs Rent is a net-worth projection.** The renter is assumed to invest the upfront cash plus any monthly difference at the entered return; the buyer's wealth is home equity (appreciating value − remaining balance). It **excludes** maintenance, property tax, and transaction costs at sale, so the breakeven is indicative.
- **FLPP eligibility is indicative, not an approval.** The subsidized rate (5% fixed for up to 20 years) is the scheme's fixed part, but the income and property-price caps are **reference defaults that vary by region and year** — confirm with a participating bank.

### KPR Syariah / iB — Assumptions and Limitations

> **Important:** The Syariah simulation is an **estimate only** and does not certify Sharia compliance. It does not replicate any specific bank's akad, product terms, or pricing methodology. Always confirm details, margins, and fees directly with your bank before signing any agreement.

**Murabahah**

- The bank purchases the property and resells it to the buyer at a fixed mark-up (margin).
- Formula: `totalMargin = financingAmount × annualMarginRate × (tenorMonths / 12)` — a simple flat calculation over the full tenor.
- Monthly installment = `totalSalePrice / tenorMonths` — equal every month (flat-equivalent).
- The margin rate entered is assumed constant for the full tenor; no repricing is modeled.
- Stress-test rate escalation is not applicable (margin is contractually fixed at akad signing).

**Musyarakah Mutanaqishah (MMQ)**

- Bank and buyer jointly own the property. The buyer progressively buys out the bank's share.
- The ujrah (rental-equivalent charge on the bank's share) is modeled using an annuity-equivalent formula: `installment = P × r(1+r)^n / ((1+r)^n − 1)` where `r = annualUjrahRate / 12`.
- Each month: `ujrah = balance × annualUjrahRate / 12`, `principal = installment − ujrah` — balance declines over time.
- `bankSharePercent` is recorded for display; it does not affect the payment schedule calculation (the annuity formula already models declining balance accurately).
- The ujrah rate is assumed constant; actual MMQ products may reprice periodically.

**General Syariah limitations**

- Admin fee, provision, appraisal, notary, BPHTB, PPN, and insurance behave identically to the conventional path — input them the same way.
- Early repayment (prepayment) is not modeled for the Syariah path. Actual penalty or waiver terms depend on the akad.
- URL state for Syariah scenarios is fully backward-compatible: URLs created before v1.1.0 decode as conventional.

---

## Local Development

**Prerequisites:** Node.js ≥ 20, npm ≥ 10.

```bash
# Install dependencies
npm install

# Start dev server (HMR on http://localhost:5173)
npm run dev

# Run all tests
npm test

# Watch mode
npm run test:watch

# Domain + application unit tests only
npm run test:unit

# UI component tests only
npm run test:ui

# Type check
npx tsc --noEmit

# Lint
npm run lint

# Production build (outputs to dist/)
npm run build

# Preview the production build locally
npm run preview
```

---

## Project Structure

```
src/
  domain/           Pure calculation logic — no React, no I/O
    calculators/    amortization, affordability, refinancing, annuity, flat
    models/         TypeScript types for domain objects
  application/      State management, form reducers, converters
    store/          Form state, scenario state, action types
    converters/     formToInput — form strings → typed MortgageInput
  ui/               React components and pages
    components/     Affordability, export, form, results panels
    pages/          CalculatorPage (single-page app)
  utils/            URL state encode/decode
  infrastructure/   PDF export service (lazy chunk)
  lib/              Sentry integration
```

---

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the complete guide covering:

- Environment variables (`VITE_SENTRY_DSN`, `VITE_APP_VERSION`)
- Docker deployment on a VPS
- Static hosting (Netlify / Vercel / Cloudflare Pages)
- SSL/TLS configuration (Caddy, Nginx, Cloudflare)
- Health check endpoint (`GET /health`)
- Rollback procedure
- Post-deployment smoke test checklist

---

## Disclaimer

This tool is for **educational and simulation purposes only**.

- Results are estimates based on user-entered inputs and simplified financial models.
- This calculator does not constitute financial advice, a credit offer, or any guarantee of loan approval.
- Always confirm interest rates, fees, and terms directly with your bank or financing institution.
- Notary fees, BPHTB, PPN, and insurance premiums should be verified with a licensed notary (PPAT) and your insurer.
- **Syariah / iB simulations are estimates and do not constitute a Sharia-compliant certification or an official akad offer.** Confirm all details with your bank.
- The developer accepts no liability for decisions made based on the output of this calculator.
