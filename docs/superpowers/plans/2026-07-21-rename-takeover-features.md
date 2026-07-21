# Rename Take-Over Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the Over Kredit and Refinancing calculators to Indonesian-friendly names and add a one-line subtitle under each panel title — display text only, no logic changes.

**Architecture:** Change i18n string *values* (keys stay the same to avoid touching consumers), add two new `subtitle` keys, and update both panel headers to render `title` stacked over `subtitle`. Symmetric change across `OverCreditPanel` and `RefinancingPanel`.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind, i18next, Vitest + Testing Library.

## Global Constraints

- Node/npm: system npm at `/opt/homebrew/bin/npm`; run tests with `npx vitest run`.
- Every user-facing string is an i18n key present in BOTH `src/locales/en.json` and `src/locales/id.json`.
- No calculation/logic changes: do not touch `refinancing.ts` or `overCredit.ts`.
- Do NOT rename i18n *keys* (`refinancing`, `overCredit`, `toolsNav.refinancing`) — only their string values change.
- Do NOT touch `nextStepRefiTitle` (a separate "Simulasi Refinancing" CTA) — out of scope.
- No Co-Authored-By lines and no AI-attribution footers in commits/PRs.
- Work stays on branch `feat/rename-takeover-features`; issue #100.
- `tsc -b --noEmit` must stay clean. Full Vitest suite must not gain new failures (worktree baseline: 492 passing, 13 pre-existing localStorage/jsdom failures that must not grow).

---

### Task 1: i18n copy — new titles, subtitles, nav label

**Files:**
- Modify: `src/locales/en.json`
- Modify: `src/locales/id.json`

**Interfaces:**
- Produces: string values for `overCredit.title`, `refinancing.title`, `toolsNav.refinancing`; new keys `overCredit.subtitle` and `refinancing.subtitle` in both locales. Task 2 renders `overCredit.subtitle` and `refinancing.subtitle`.

- [ ] **Step 1: Update English strings**

In `src/locales/en.json`:

Change `overCredit.title` from `"Over Kredit (Take-Over) Calculator"` to:
```json
    "title": "Over Kredit (Home Take-Over)",
```
Immediately after that `title` line, add:
```json
    "subtitle": "Take over a seller's house and remaining KPR",
```

Change `refinancing.title` from `"Refinancing Calculator"` to:
```json
    "title": "Take Over KPR to Another Bank",
```
Immediately after that `title` line, add:
```json
    "subtitle": "Move your KPR to another bank for a lower rate (refinancing)",
```

Change `toolsNav.refinancing` from `"Refinancing"` to:
```json
    "refinancing": "Take Over KPR",
```

- [ ] **Step 2: Update Indonesian strings**

In `src/locales/id.json`:

Change `overCredit.title` from `"Kalkulator Over Kredit"` to:
```json
    "title": "Over Kredit Rumah",
```
Immediately after that `title` line, add:
```json
    "subtitle": "Ambil alih rumah + sisa KPR dari penjual",
```

Change `refinancing.title` from `"Kalkulator Refinancing"` to:
```json
    "title": "Take Over KPR ke Bank Lain",
```
Immediately after that `title` line, add:
```json
    "subtitle": "Pindahkan KPR-mu ke bank lain demi bunga lebih murah (refinancing)",
```

Change `toolsNav.refinancing` from `"Refinancing"` to:
```json
    "refinancing": "Take Over KPR",
```

- [ ] **Step 3: Validate JSON + type-check**

Run:
```bash
node -e "JSON.parse(require('fs').readFileSync('src/locales/en.json','utf8')); JSON.parse(require('fs').readFileSync('src/locales/id.json','utf8')); console.log('JSON valid')"
npx tsc -b --noEmit
```
Expected: `JSON valid` printed; tsc produces no output.

- [ ] **Step 4: Commit**

```bash
git add src/locales/en.json src/locales/id.json
git commit -m "i18n(takeover): rename over kredit & refinancing titles + add subtitles (#100)"
```

---

### Task 2: Render subtitle in both panel headers

**Files:**
- Modify: `src/ui/components/overcredit/OverCreditPanel.tsx`
- Modify: `src/ui/components/refinancing/RefinancingPanel.tsx`
- Test: `src/ui/__tests__/OverCreditPanel.test.tsx`

**Interfaces:**
- Consumes: `overCredit.subtitle`, `refinancing.subtitle` (Task 1).

- [ ] **Step 1: Add a failing subtitle assertion to the Over Kredit panel test**

In `src/ui/__tests__/OverCreditPanel.test.tsx`, add this test inside the `describe('OverCreditPanel', ...)` block (after the first test):

```tsx
  it('renders the subtitle in the panel header', () => {
    render(<Harness />);
    expect(screen.getByText(/take over a seller's house/i)).toBeInTheDocument();
  });
```

Note: the subtitle sits in the toggle button, so it renders even before the panel is opened.

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/ui/__tests__/OverCreditPanel.test.tsx`
Expected: FAIL — the subtitle text is not yet in the DOM.

- [ ] **Step 3: Render the subtitle in OverCreditPanel**

In `src/ui/components/overcredit/OverCreditPanel.tsx`, replace:
```tsx
        <span>{t('overCredit.title')}</span>
        <ChevronIcon open={open} />
```
with:
```tsx
        <span className="flex flex-col text-left">
          <span>{t('overCredit.title')}</span>
          <span className="text-xs font-normal text-gray-400">{t('overCredit.subtitle')}</span>
        </span>
        <ChevronIcon open={open} />
```

- [ ] **Step 4: Run the panel test to verify it passes**

Run: `npx vitest run src/ui/__tests__/OverCreditPanel.test.tsx`
Expected: PASS (all 5 cases green).

- [ ] **Step 5: Render the subtitle in RefinancingPanel**

In `src/ui/components/refinancing/RefinancingPanel.tsx`, replace:
```tsx
        <span>{t('refinancing.title')}</span>
        <ChevronIcon open={open} />
```
with:
```tsx
        <span className="flex flex-col text-left">
          <span>{t('refinancing.title')}</span>
          <span className="text-xs font-normal text-gray-400">{t('refinancing.subtitle')}</span>
        </span>
        <ChevronIcon open={open} />
```

- [ ] **Step 6: Type-check**

Run: `npx tsc -b --noEmit`
Expected: no output.

- [ ] **Step 7: Run the full test suite**

Run: `npx vitest run`
Expected: passing count rises by 1 (the new subtitle test) vs. Task 1 baseline; no NEW failures beyond the 13 pre-existing localStorage/jsdom ones in `draftStorage.test.ts` and `calculatorFlow.test.tsx`. If `calculatorFlow.test.tsx > auto-calculates the default form` times out, re-run once.

- [ ] **Step 8: Commit**

```bash
git add src/ui/components/overcredit/OverCreditPanel.tsx src/ui/components/refinancing/RefinancingPanel.tsx src/ui/__tests__/OverCreditPanel.test.tsx
git commit -m "feat(takeover): render subtitle under panel titles (#100)"
```

---

## Self-Review

**Spec coverage:**
- Over Kredit rename + subtitle (ID + EN) → Task 1. ✓
- Refinancing rename + subtitle + nav chip "Take Over KPR" (ID + EN) → Task 1. ✓
- Subtitle rendering in both panels → Task 2. ✓
- No math changes → honored; `refinancing.ts`/`overCredit.ts` untouched. ✓
- Tests updated as needed → only an additive subtitle test; no existing test asserts the changed strings (`DecisionToolsNav.test` uses literal props; `nextStepRefiTitle` untouched; `OverCreditPanel` opens via `/over kredit/i` which still matches "Over Kredit Rumah"). ✓

**Placeholder scan:** none — every step has exact strings/commands. ✓

**Type consistency:** `overCredit.subtitle` / `refinancing.subtitle` are created in Task 1 and consumed by the same names in Task 2. ✓

**Related-but-deferred (not in this plan):** the results-summary CTA `nextStepRefiTitle` ("Simulasi Refinancing") still uses the old wording. Left as-is per approved spec; can be revisited separately if the inconsistency bothers the user.
