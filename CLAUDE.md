# KPR Calculator — Claude Code Context

## Project

Indonesian KPR (mortgage) calculator. React 19 + TypeScript + Vite + Tailwind.
Live: **https://kpr.vikoabastian.com** | Repo: **https://github.com/vianbas/indonesia-kpr-calculator**
API worker: **https://api.kpr.vikoabastian.com** (Cloudflare Worker, short-link endpoint)

## Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, i18next (ID + EN)
- **Domain:** pure TS calculators in `src/domain/calculators/`
- **State:** per-scenario hooks (`useScenarios`) + lifted affordability form state
- **Tests:** Vitest 4 + Testing Library — currently **524 passing** (35 test files).
  The default environment is `node`. **A test that touches the DOM must declare
  `// @vitest-environment jsdom` on its first line** — Vitest 4 removed
  `environmentMatchGlobs`, so living under `src/ui/` no longer grants jsdom.
- **Deploy:** Cloudflare Pages (auto on master push)
- **Node:** `.nvmrc` pins **22.22.3** — that is what CI runs. Local dev on newer Node works too (see #106); use system npm at `/opt/homebrew/bin/npm` and run tests with `npx vitest run`.

## Workflow (MANDATORY)

`master` is a protected branch — **you cannot push to it**, not even as the repo
owner. Every change lands through a pull request.

1. `gh issue create` → new branch `feat/issue-N-description` off `origin/master`
2. Implement → `npx tsc -b --noEmit` → `npm run lint` → `npx vitest run` (524/524)
3. `git push -u origin <branch>` → `gh pr create --base master` with `Closes #N`
4. Wait for CI to pass, then `gh pr merge <N> --merge` (merge commit, matching repo history)
5. No Co-Authored-By lines in commits.
6. The flaky test `calculatorFlow.test.tsx > auto-calculates the default form` occasionally times out — re-run once before treating it as a real failure.

### Branch protection on `master` (why direct push fails)

- Pull request required (0 approvals — you can merge your own PR)
- Status check `Type check · Lint · Test · Build` must pass, branch must be up to date
- `enforce_admins` on — the rules bind the owner too
- Force-push and branch deletion blocked; PR conversations must be resolved

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
- Refinancing analysis + breakeven (incl. old-bank early-settlement penalty)
- Over Kredit (take-over) calculator — upfront cash, new installment, process-cost breakdown (provision, BPHTB, notary, balik nama, insurance, old-bank penalty), effective LTV + warning flags
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
#99 Over Kredit (take-over) calculator · #100 take-over naming/subtitles
#102/#104 CLAUDE.md stale-fact fixes · #106 jsdom localStorage on Node ≥26
#108 HANDOFF/workflow refresh · #110 refinancing old-bank penalty field
#112 non-breaking security fixes · #114 vitest 1→4 + vite 5→6 upgrade

**Cancelled:** #50 biweekly payments (not applicable for Indonesian banks)

## Next features (queued — not yet started)

- Storybook 8.6 → 9/10 migration. The last 3 `npm audit` findings (all moderate:
  `uuid`, `@storybook/addon-actions`, `@storybook/addon-essentials`) are only
  reachable through Storybook. npm's proposed "fix" is
  `@storybook/addon-essentials@7.0.6` — a **downgrade**, so it must not be
  applied. Storybook 9 dropped `addon-essentials` entirely, so this is a config
  migration, not a version bump. Dev-only tooling; nothing ships to users.

## Test run command

```bash
npx vitest run
```

Expected: **524 passing, 0 failing** (occasional flaky timeout in calculatorFlow.test.tsx is pre-existing, re-run once).
