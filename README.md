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
| Scenario comparison | Up to 3 scenarios side-by-side |
| Shareable URL | Full calculator state encoded in the URL `?s=` parameter |
| PDF export | Lazy-loaded; generates a detailed amortization + summary PDF |
| Early repayment | Extra monthly payment, lump-sum prepayment, or both |

---

## Calculation Assumptions

- **Rates are estimates.** Interest rates entered in the calculator are user-supplied. Actual bank rates vary by product, borrower profile, and negotiation.
- **Floating rates can change.** After the fixed period, the floating rate is assumed constant for the remainder of the tenor unless you model tiers explicitly. Real KPR floating rates are repriced periodically by the bank.
- **Fees are user-provided or estimated.** Provision, appraisal, notary, BPHTB, PPN, and insurance amounts depend on the property, bank, and notary. The defaults are representative but not official.
- **Affordability output is guidance, not approval.** The DSR limit and stress-test results are indicative. Banks apply their own credit-scoring criteria, income verification, and internal risk policies.
- **Stress test scope.** The +1–+3% stress scenarios simulate a uniform rate shift applied from the opening balance of the first floating period for the remaining tenor. They do not regenerate a full per-tier schedule.
- **Decimal precision.** All monetary arithmetic uses `Decimal.js` (banker's rounding) to avoid floating-point drift.

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
