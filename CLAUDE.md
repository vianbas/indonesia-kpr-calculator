# KPR Calculator — Claude Code Context

## Project

Indonesian KPR (mortgage) calculator. React 19 + TypeScript + Vite + Tailwind.
Live: **https://kpr.vikoabastian.com** | Repo: **https://github.com/vianbas/indonesia-kpr-calculator**
API worker: **https://api.kpr.vikoabastian.com** (Cloudflare Worker, short-link endpoint)

## Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, i18next (ID + EN)
- **Domain:** pure TS calculators in `src/domain/calculators/`
- **State:** per-scenario hooks (`useScenarios`) + lifted affordability form state
- **Tests:** Vitest + Testing Library — currently **486 passing** (32 test files)
- **Deploy:** Cloudflare Pages (auto on master push)
- **Node:** use `/Users/esrahana/.nvm/versions/node/v20.20.2/bin/npm` (never `nvm.sh`)

## Workflow (MANDATORY)

1. `gh issue create` → new branch `feat/...` → implement → `tsc -b --noEmit` → full test run
2. Push feature branch → `git checkout master && git merge feat/... --no-ff`
3. Re-run full tests on master → if 486/486 pass → `git push origin master`
4. No Co-Authored-By lines in commits.
5. No force-push / reset --hard on master.
6. The flaky test `calculatorFlow.test.tsx > auto-calculates the default form` occasionally times out — re-run once before treating it as a real failure.

## Architecture quick-map

```
src/domain/calculators/      ← pure functions, no React
  annuity.ts / flat.ts       ← installment math
  affordability.ts           ← DSR, surplus, stress test, minRecommendedIncome
  decisionSummary.ts         ← verdict, flags, suggestions, computeDecisionSummary
  ltv.ts                     ← LTV assessment
  buyVsRent.ts               ← net-worth comparison
  flpp.ts                    ← FLPP eligibility
  refinancing.ts             ← refinancing breakeven

src/application/
  hooks/useScenarios.ts      ← scenario state + dispatch
  converters/formToInput.ts  ← deriveAffordabilityInput, deriveLoanValuation

src/ui/
  pages/CalculatorPage.tsx   ← main page; ResultsPanel is a nested component here
  components/decision/       ← DecisionSummary (verdict card + DSR gauge + sandbox)
  components/affordability/  ← AffordabilityPanel, MaxPropertyPanel
  components/scenarios/      ← ScenarioTabs, ScenarioComparisonTable/Panel
  components/charts/         ← ChartSection, BalanceLineChart, PaymentBarChart
  components/export/         ← ExportButton, CsvExportButton, ShareReportModal
  utils/shareText.ts         ← formatShareText (3 presets × single/multi)

src/infrastructure/pdf/      ← exportService, pdfRenderer, pdfTypes
src/locales/en.json, id.json ← all i18n strings
```

## What's already built (do NOT rebuild)

- Annuity + flat + syariah (murabahah/MMQ) loan calculator
- Multi-scenario comparison (up to 3), tiered floating rates
- Affordability panel (DSR, surplus, stress test)
- LTV guardrail (`assessLtv` + `LtvIndicator`)
- Buy vs Rent breakeven panel
- FLPP subsidy checker panel
- Refinancing analysis + breakeven
- Multi-lump-sum + extra-monthly prepayments
- PDF + CSV export (lazy-loaded, split vendor chunk)
- Share links (short URL via Cloudflare Worker) + WhatsApp presets
- Bank rate picker
- Charts (balance line, payment bar, amortization)
- Decision Summary card:
  - Verdict (safe/watch/risky/incomplete) + colour-coded badge
  - DSR gauge (progress bar vs limit tick)
  - Flags with actionable suggestions (add_income, add_dp, reduce_loan, extend_fixed)
  - Min recommended income callout
  - What-if sandbox: income lever + DP lever, auto-seeded from suggestions
  - Verdict in share text presets (all 6 formatters)
  - Verdict row in multi-scenario comparison table
  - Decision section in PDF export
- PWA (installable, offline-first service worker)
- a11y pass (ARIA disclosure semantics, table captions, scope)
- Security headers + report-only CSP (_headers file)
- EN + ID i18n throughout
- "Lihat Hasil" button hides when results are visible (IntersectionObserver)

## Closed issues reference

#41 LTV · #43 Buy-vs-Rent · #45 FLPP · #47 PWA · #49 multi-lump-sum · #52 a11y
#54 integration test · #75 nav auto-expand · #77 bundle split · #79 CSP headers
#80 security headers · #82/#83/#84/#85/#86 chart X-axis fixes
#87 Decision Summary v1 · #89 decision depth (suggestions+PDF+comparison)
#90 share verdict · #91 what-if sandbox · #92 DSR gauge+min income
#93 DP lever+auto-seed · #94 UI polish
#95 rate-reset callout · #96 sensitivity grid · #97 prepayment chart · #98 tenor optimizer

**Cancelled:** #50 biweekly payments (not applicable for Indonesian banks)

## Next features (queued — not yet started)

_Queue is empty — no features pending as of 2026-06-08._

## Test run command

```bash
/Users/esrahana/.nvm/versions/node/v20.20.2/bin/npm test -- --run
```

Expected: **486 passing, 0 failing** (occasional flaky timeout in calculatorFlow.test.tsx is pre-existing, re-run once).
