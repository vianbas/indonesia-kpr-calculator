# Rename Take-Over Features for Indonesian Clarity — Design

_Date: 2026-07-21_

## Problem

The app has two "take-over" flows whose names don't match how Indonesians search for them:

- **Over Kredit calculator** (buyer takes over a seller's house + remaining KPR) — currently titled "Kalkulator Over Kredit". Correct term, but not explicit about *what* is taken over.
- **Refinancing calculator** (owner moves their own KPR to another bank for a lower rate) — currently titled "Kalkulator Refinancing". Indonesians looking for this search "take over KPR" / "pindah KPR ke bank lain", not "refinancing", so they miss it.

The two concepts map cleanly onto everyday Indonesian usage:

- **Over Kredit** = take over *ke orang* (buy a house whose KPR is still running, from the seller).
- **Take Over KPR** = take over *ke bank* (move your own KPR to another bank) — this is exactly the phrasing banks use in their ads.

## Goal

Rename/clarify both features via **i18n text and a new subtitle line only**. No calculation logic, no new calculators, no input/output changes.

## Scope

**In scope**
- Change display strings (title, nav chip) and add a one-line subtitle under each panel title.
- EN + ID locales.
- Add subtitle rendering to the two panel headers.
- Update any tests that assert the old title/nav wording.

**Out of scope (YAGNI)**
- No change to `refinancing.ts` / `overCredit.ts` math.
- No old-bank early-settlement penalty added to Refinancing (discussed, deliberately deferred).
- No new panel, route, or nav section.

## Naming decisions

### Feature 1 — Over Kredit (buyer takes over from seller)
| Element | ID | EN |
|---|---|---|
| Panel title | **Over Kredit Rumah** | **Over Kredit (Home Take-Over)** |
| Subtitle | Ambil alih rumah + sisa KPR dari penjual | Take over a seller's house and remaining KPR |
| Nav chip | Over Kredit | Over Kredit |

### Feature 2 — Refinancing (owner moves own KPR to another bank)
| Element | ID | EN |
|---|---|---|
| Panel title | **Take Over KPR ke Bank Lain** | **Take Over KPR to Another Bank** |
| Subtitle | Pindahkan KPR-mu ke bank lain demi bunga lebih murah (refinancing) | Move your KPR to another bank for a lower rate (refinancing) |
| Nav chip | Take Over KPR | Take Over KPR |

The word "refinancing" stays inside the subtitle so users who know the technical term still recognize it.

## Design

### i18n changes (`src/locales/en.json`, `src/locales/id.json`)
- `overCredit.title` → new value (per table).
- `overCredit.subtitle` → **new key** (per table).
- `refinancing.title` → new value (per table).
- `refinancing.subtitle` → **new key** (per table).
- `toolsNav.refinancing` → "Take Over KPR" (both locales).
- `toolsNav.overCredit` → unchanged ("Over Kredit").

Internal i18n key names (`refinancing`, `overCredit`, `toolsNav.refinancing`) stay the same — only their string values change — to avoid touching every consumer.

### Panel header rendering (`OverCreditPanel.tsx`, `RefinancingPanel.tsx`)
Both currently render `<span>{t('…title')}</span>` inside the toggle button. Replace with a stacked block:

```
<span class="flex flex-col text-left">
  <span>{t('…title')}</span>
  <span class="text-xs font-normal text-gray-400">{t('…subtitle')}</span>
</span>
```

Chevron placement and the button's `data-jump-toggle` / aria attributes are unchanged. The change is symmetric across both panels.

### Tests
- `OverCreditPanel.test.tsx` opens the panel via `getByRole('button', { name: /over kredit/i })`; "Over Kredit Rumah" still matches — no change expected, but verify.
- Any Refinancing test (or integration test) asserting the literal "Refinancing" title or nav label must be updated to the new wording. Enumerate and fix during implementation.

## Verification
- `tsc -b --noEmit` clean.
- Full Vitest suite green (baseline: 505 passing on a healthy env; 13 pre-existing localStorage/jsdom failures in this worktree must not grow).
- Manual: both panels show the new title + subtitle; nav chip reads "Take Over KPR" for the refinancing section.

## Self-review notes
- No placeholders; every string is specified in both locales.
- Internally consistent: the only behavioral change is displayed text + one subtitle line per panel.
- Single-plan sized.
- Ambiguity resolved: subtitles carry the explanatory/searchable phrasing; titles stay short.
