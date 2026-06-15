# KPR Calculator — Handoff Document

_Last updated: 2026-06-15. Current master: `c04ff9e`._

---

## Links

| Resource | URL |
|---|---|
| Live app | https://kpr.vikoabastian.com |
| GitHub repo | https://github.com/vianbas/indonesia-kpr-calculator |
| API Worker | https://api.kpr.vikoabastian.com (Cloudflare Worker — short-link endpoint) |
| Cloudflare Pages dashboard | https://dash.cloudflare.com (deploys auto on master push) |

---

## Setup on a New Device

```bash
# 1. Clone
git clone https://github.com/vianbas/indonesia-kpr-calculator
cd indonesia-kpr-calculator

# 2. Install Node (use nvm, target v20)
nvm install 20
nvm use 20

# 3. Install dependencies
npm install

# 4. Run dev server
npm run dev

# 5. Run tests (expect 486 passing)
npm test -- --run
```

> **Important for Claude Code:** Always use the full binary path for npm, never `nvm use` inside Claude sessions.  
> Example: `/Users/<you>/.nvm/versions/node/v20.20.2/bin/npm`

---

## Current State (as of 2026-06-15)

- **Tests:** 486 passing, 0 failing (32 test files)
- **Branch:** `master` is clean and up to date
- **Deploy:** Auto-deploys to Cloudflare Pages on every master push
- **Feature queue:** **Empty** — all planned features have shipped

### Flaky test (pre-existing, not a bug)
`calculatorFlow.test.tsx > auto-calculates the default form` occasionally times out under load.  
Re-run once before treating as a real failure.

---

## Everything That's Built

| Issue | Feature |
|---|---|
| #41 | LTV guardrail (`assessLtv` + `LtvIndicator`) |
| #43 | Buy vs Rent breakeven panel |
| #45 | FLPP subsidized-mortgage checker |
| #47 | PWA — installable, offline-first service worker |
| #49 | Multi-lump-sum + extra-monthly prepayments |
| #52 | a11y pass — ARIA disclosure, table captions, scope |
| #54 | jsdom integration test (`calculatorFlow.test.tsx`) |
| #75 | Decision-tools nav auto-expand on jump |
| #77 | Bundle split — recharts into vendor-charts chunk |
| #79/#80 | Security headers + report-only CSP (`_headers`) |
| #82–#86 | Chart X-axis label fixes (vertical, non-overlapping) |
| #87 | Decision Summary v1 — verdict card (safe/watch/risky/incomplete) |
| #89 | Decision depth — suggestions, scroll CTA, PDF brief, comparison verdict row |
| #90 | Verdict in share text presets (all 6 formatters) |
| #91 | What-if sandbox — income lever (auto-seeded from flag suggestions) |
| #92 | DSR progress gauge + min recommended income callout |
| #93 | DP lever in sandbox + auto-seed from suggestions |
| #94 | UI polish — mobile stack layout, divider, badge colour transition |
| — | "Lihat Hasil" button hides when results visible (IntersectionObserver) |
| #95 | Rate-reset callout — amber banner for fixed→floating jump |
| #96 | Rate × tenor sensitivity grid — 7×4 annuity table |
| #97 | Prepayment impact chart — actual vs baseline balance overlay |
| #98 | Tenor optimizer — 3rd sandbox lever (extend tenor by N months) |

**Cancelled:** #50 biweekly payments — not applicable for Indonesian banks.

---

## Architecture Quick-Map

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

---

## Mandatory Workflow (every feature, no exceptions)

1. `gh issue create` → new branch `feat/issue-N-description`
2. Implement on branch
3. `tsc -b --noEmit` — must be clean
4. `npm test -- --run` — must be 486/486
5. `git checkout master && git merge feat/... --no-ff`
6. Re-run full tests on master
7. `git push origin master`

### Rules
- **No Co-Authored-By lines** in any commit message
- **No force-push / reset --hard** on master
- **Always create a GitHub issue** before writing code; link PR with `Closes #N`
- Feature branches: any git operation is fine
- Master: no push without running tests first

---

## Claude Code Rules (for this project)

When using Claude Code on the new device:

- Full CLAUDE.md is in the repo root — Claude reads it automatically
- Always specify the full Node binary path if Claude needs to run npm/npx
- CodeGraph MCP is configured — Claude uses it for structural navigation
- The mandatory 6-step delivery process is saved in Claude's memory:
  1. Plan (list all files/functions to touch)
  2. Mental dry run (trace the flow, find edge cases)
  3. Integration safety check (no breakage, no circular deps)
  4. Deliver code (no placeholders, no TODOs)
  5. Self-review (read every file written)
  6. Final checklist (all boxes must be checked)

---

## Next Features

**Queue is empty.** Decide what to build next and create a GitHub issue to start.

Ideas that haven't been done yet (not committed to any roadmap):
- Analytics / usage tracking
- Additional bank rate data
- Comparison export to image (screenshot)
- More i18n polish / missing translations
- Mobile app (React Native or PWA enhancements)
