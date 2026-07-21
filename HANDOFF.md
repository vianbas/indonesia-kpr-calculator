# KPR Calculator — Handoff Document

_Last updated: 2026-07-21. Current master: `c04ff9e`._

---

## ▶ Resume Here (2026-07-21)

**In progress: Over Kredit calculator (feature "B").** Design + implementation
plan are written and committed; **no feature code written yet**.

- **Branch:** `claude/kpr-project-status-0239c0` (git worktree, NOT master).
- **Spec (approved):** [`docs/superpowers/specs/2026-07-20-over-kredit-calculator-design.md`](docs/superpowers/specs/2026-07-20-over-kredit-calculator-design.md)
- **Plan (ready to execute):** [`docs/superpowers/plans/2026-07-20-over-kredit-calculator.md`](docs/superpowers/plans/2026-07-20-over-kredit-calculator.md) — 4 TDD tasks, full code, no placeholders.

**Next action:** execute the plan. Use `superpowers:subagent-driven-development`
(recommended) or `superpowers:executing-plans`. Then follow the mandatory
delivery workflow below (issue → branch `feat/...` → tsc → tests → merge).

**What the feature is:** standalone "over kredit resmi via bank" panel — buyer
cash upfront, new installment, full process-cost breakdown incl. BPHTB, same/
different-bank penalty toggle, appraisal/LTV gap warnings. Mirrors the
Refinancing panel pattern. v1 excludes DSR, informal ("di bawah tangan") mode,
and tiered rates (YAGNI — see spec).

### Environment notes for whoever resumes
- **tokensave** (token-saving MCP + global git hooks) was installed 2026-07-21.
  It activates in a **fresh Claude Code session**. A PreToolUse hook blocks Bash
  `grep` on indexed projects and points to `tokensave_search`; if that MCP tool
  isn't loaded, override per-call with `TOKENSAVE_DISABLE_GREP_HOOK=1`.
- In this worktree, `node` is Homebrew's (`/opt/homebrew/bin/node`), not the
  nvm path in the setup section below. Run tests with `npx vitest run --run`.
- **Test baseline caveat:** in this worktree 13 tests fail with
  `localStorage is undefined` (jsdom env), all in `draftStorage.test.ts` and
  `calculatorFlow.test.tsx` — a **pre-existing environment mismatch, not a
  code bug**. On the canonical nvm-v20 setup the suite is 486/486. Confirm the
  over-kredit work adds passing tests and introduces no NEW failures.

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

**In flight:** Over Kredit calculator — spec + plan ready, not yet coded.
See the **▶ Resume Here** section at the top of this file.

Ideas that haven't been done yet (not committed to any roadmap):
- Feature "A" from the take-over discussion: add an old-bank early-settlement
  **penalty field to the existing Refinancing panel** (currently its switching
  cost omits the old bank's penalty, so take-over-to-another-bank numbers read
  optimistic). Small change; deferred in favour of the standalone Over Kredit tool.
- Analytics / usage tracking
- Additional bank rate data
- Comparison export to image (screenshot)
- More i18n polish / missing translations
- Mobile app (React Native or PWA enhancements)
