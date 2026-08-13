# KPR Calculator — Handoff Document

_Last updated: 2026-08-13._

---

## ▶ Start Here

**Nothing is in flight.** `master` is green and fully shipped — the Over Kredit
(take-over) calculator landed in PR #99, was renamed for Indonesian clarity in
PR #101, and the jsdom/localStorage test-environment bug was fixed in PR #107.

**Before you write any code**, read the two sections that changed most recently:

- [Mandatory Workflow](#mandatory-workflow-every-change-no-exceptions) — `master`
  is now a **protected branch**; direct pushes are rejected. Everything goes
  through a pull request.
- [Next Features](#next-features) — what is queued but unstarted.

### Environment notes
- **Node:** `.nvmrc` pins **22.22.3**, which is what CI runs. Newer Node also
  works locally: Node ≥26 exposes a global `localStorage` that shadowed jsdom's
  and broke 13 tests, and `src/test/setup.ts` now installs an in-memory Storage
  fallback when that happens (#106).
- **tokensave** (token-saving MCP + global git hooks) is installed. A PreToolUse
  hook blocks Bash `grep` on indexed projects and points to `tokensave_search`;
  if that MCP tool is not loaded, override per-call with
  `TOKENSAVE_DISABLE_GREP_HOOK=1`.

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

# 2. Install Node — .nvmrc pins the version CI uses
nvm install    # reads .nvmrc (22.22.3)
nvm use

# 3. Install dependencies
npm install

# 4. Run dev server
npm run dev

# 5. Run tests (expect 506 passing)
npx vitest run
```

> Newer Node versions work too — see the environment notes at the top.

---

## Current State (as of 2026-08-13)

- **Tests:** 506 passing, 0 failing (34 test files)
- **Branch:** `master` is clean, green, and **protected** — PR-only (see workflow below)
- **Deploy:** Auto-deploys to Cloudflare Pages on every master push
- **Feature queue:** two unstarted items — see [Next Features](#next-features)
- **Known debt:** `npm audit` reports 2 critical + 6 high, all in the dev
  toolchain (`vitest` 1.6.1 / `vite`) and fixable only by semver-major upgrades.
  The single production dependency flagged is `dompurify` (moderate).

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
| #99 | Over Kredit (take-over) calculator — upfront cash, new installment, process-cost breakdown (provision, BPHTB, notary, balik nama, insurance, old-bank penalty), effective LTV + warning flags |
| #100 | Take-over feature naming + panel subtitles for Indonesian clarity |
| #106 | jsdom `localStorage` fix — in-memory Storage fallback on Node ≥26 |

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
  overCredit.ts              ← over kredit (take-over): cash upfront, BPHTB, flags

src/application/
  hooks/useScenarios.ts      ← scenario state + dispatch
  converters/formToInput.ts  ← deriveAffordabilityInput, deriveLoanValuation
  store/overCreditTypes.ts   ← OverCreditFormState + DEFAULT_OVER_CREDIT

src/ui/
  pages/CalculatorPage.tsx   ← main page; ResultsPanel is a nested component here
  components/decision/       ← DecisionSummary (verdict card + DSR gauge + sandbox)
  components/overcredit/     ← OverCreditPanel, OverCreditInputs, OverCreditResultCard
  components/affordability/  ← AffordabilityPanel, MaxPropertyPanel
  components/scenarios/      ← ScenarioTabs, ScenarioComparisonTable/Panel
  components/charts/         ← ChartSection, BalanceLineChart, PaymentBarChart
  components/export/         ← ExportButton, CsvExportButton, ShareReportModal
  utils/shareText.ts         ← formatShareText (3 presets × single/multi)

src/infrastructure/pdf/      ← exportService, pdfRenderer, pdfTypes
src/locales/en.json, id.json ← all i18n strings
```

---

## Mandatory Workflow (every change, no exceptions)

`master` is protected. `git push origin master` is **rejected by GitHub**, for
the repo owner as well. Every change lands through a pull request.

1. `gh issue create` → branch `feat/issue-N-description` off `origin/master`
2. Implement on the branch
3. `npx tsc -b --noEmit` — must be clean
4. `npm run lint` — must be clean
5. `npx vitest run` — must be 506/506
6. `git push -u origin <branch>` → `gh pr create --base master` with `Closes #N` in the body
7. Wait for CI green, then `gh pr merge <N> --merge`

### Branch protection on `master`
- **Pull request required** — 0 approvals, so you can merge your own PR
- **Status check required:** `Type check · Lint · Test · Build`, strict (branch must be up to date)
- **`enforce_admins: true`** — the rules apply to the owner too
- Force-push and branch deletion blocked; PR conversations must be resolved

> Restricting *who* may merge to a named list of maintainers is an
> organisation-only GitHub feature. This repo belongs to a personal account, so
> the effective lock is "PR + green CI + admins bound".

### Rules
- **No Co-Authored-By lines** in any commit message
- **Always create a GitHub issue** before writing code; link the PR with `Closes #N`
- Feature branches: any git operation is fine
- Never try to work around branch protection (no force-push, no admin bypass)

---

## Claude Code Rules (for this project)

When using Claude Code on the new device:

- Full CLAUDE.md is in the repo root — Claude reads it automatically
- Plain `npm` / `npx` is fine; `.nvmrc` records the version CI uses
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

**Nothing in flight.** Queued but unstarted:

1. **Old-bank penalty field in the Refinancing panel.** `refinancing.ts` has no
   penalty input, so its switching cost omits the old bank's early-settlement
   penalty and take-over-to-another-bank numbers read optimistic. The standalone
   Over Kredit calculator already models this (`oldBankPenalty`); the Refinancing
   panel does not.
2. **Dev-toolchain security upgrade.** `npm audit`: 2 critical + 6 high, all in
   the dev toolchain — `vitest` 1.6.1 → 4.x and `vite` → 8.x are semver-major and
   likely to touch config and test setup, so keep this isolated in its own PR.
   `dompurify` (the only production dependency flagged, moderate) has a
   non-breaking fix.

Ideas without a committed roadmap:
- Analytics / usage tracking
- Additional bank rate data
- Comparison export to image (screenshot)
- More i18n polish / missing translations
- Mobile app (React Native or PWA enhancements)
