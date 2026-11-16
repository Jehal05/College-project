# Design audit, Phase 8 (medical look): first pass

Written 16 Nov 2026 against `origin/main` at `1c46aa3` (Jehal's UI PRs #17 to #22 included). Read-only: no app file was changed. Simulated prototype, not a medical device.
Method: `grep` over `src/` of both apps (SEEN), and WCAG contrast computed with a small Python formula (SEEN, numbers below). **NOT DONE in this pass:** screenshots at 360/768/1366/1920, the per-screen background inventory, target-size and focus checks. Those need the built apps and are listed under "Still to do".

## Who works on what
From 16 Nov 2026 Puneet and Jehal both work on everything; there is no fixed split. Collisions are avoided with branches and by merging `main` first. Puneet's branch `Puneet` is 12 commits behind `main`.

## What is already good
- **No plain black anywhere in the palette.** Dark theme uses deep navy: page `#081321`, sidebar `#0D1B2A`, card `#12263A`, utility bar `#06111E`. (`patient-app/src/index.css`, `hospital-portal/src/index.css`)
- **A medical background already exists** from Jehal's work: `.ht-page` (portal: soft blue-white gradient and faint cross, used by the app shell in `App.jsx` and the login page) and `.ht-themed` (patient app: gradient plus a faint plus-sign pattern). Both are inline SVG and CSS, no image files.
- **Light is the default** in the patient app (`theme.js`), like a hospital website; dark is one tap away.
- **Contrast of the current palette is good** (table below).

## Findings

| # | Finding | Evidence (SEEN) | Severity | Effort |
|---|---|---|---|---|
| 1 | **Plain white `#FFFFFF` is the card and panel colour** in the patient app light theme: `--ht-sidebar: 255 255 255` and `--ht-card: 255 255 255`. | `patient-app/src/index.css` | Medium: breaks the "no plain white" requirement everywhere cards appear | Low (change two tokens) |
| 2 | **`bg-white` is hard-coded 59 times in the portal and 61 times in the patient app** (plus `bg-white/80` 3 times in the portal), so a token change alone will not remove it. Examples: portal `AlertCard`, `HospitalDetails`, `OwnCapacity`, `ErrorBoundary`, `ProtectedRoute`, `RankingTable`, `Checklist`; patient `ContactsNotified`, `ReportUpload`, `VoiceSymptoms`, `Switch`, `SkipLink`. | `grep -rn "bg-white" src` | Medium | Medium (replace with a card token such as `bg-ht-card`) |
| 3 | **The portal has no light-card token.** Its tokens (`--color-ht-bg`, `-sidebar`, `-card`, `-accent`, `-accent2`) are the dark values, but the cards on screen are `bg-white` in markup. | `hospital-portal/src/index.css` lines 6 to 10 | Medium | Medium |
| 4 | **One `bg-black` use** in the portal. `text-black`: 0. `text-white`: 44 (portal), 37 (patient): fine on dark or accent buttons, to be checked per use. | grep counts | Low | Low |
| 5 | **Only two background styles exist** (the cross pattern and the plus-sign pattern). No ECG line, clinical grid, anatomical outline or emergency pulse rings yet; every screen group gets the same look. | `.ht-page`, `.ht-themed` | Low to medium (design variety) | Medium |
| 6 | **The two apps use different token systems:** `--color-ht-*` hex values in the portal, `--ht-*` space-separated RGB in the patient app. | both `index.css` | Medium (consistency) | Medium |
| 7 | **Map icons** use hard-coded colours (9 matches of white/black in `mapIcons.js`), and `contract.js` has 2. Marker artwork is not themed. | grep | Low | Low |

## Contrast of the current palette (SEEN, WCAG formula)

| Pair | Ratio | AA (4.5 text, 3 large/icons) |
|---|---|---|
| Light: ink `#0F172A` on card `#FFFFFF` | 17.85 | pass |
| Light: muted `#475569` on card `#FFFFFF` | 7.58 | pass |
| Light: muted `#475569` on page `#F2F6FB` | 6.98 | pass |
| Light: accent `#06647D` on `#FFFFFF` | 6.72 | pass |
| Light: warning `#925A00` on `#FFFFFF` | 5.70 | pass |
| Light: emergency `#B91C1C` on `#FFFFFF` | 6.47 | pass |
| Dark: text `#F4F8FC` on page `#081321` | 17.49 | pass |
| Dark: muted `#A9BCCF` on card `#12263A` | 7.90 | pass |
| Dark: accent `#20C7E8` on card `#12263A` | 7.62 | pass |
| Dark: emergency text `#FF808A` on card `#12263A` | 6.38 | pass |
| Portal login bar: white on `#0D1B2A` | 17.39 | pass |

## Proposed tinted replacements (computed, not yet applied)
Replace plain white cards with a very light teal-white and keep the same text colours. The page gradient goes from `#EEF6F9` (top) to `#DCEBF2` (bottom); a mint tint `#E6F4EE` can mark healthy areas.

| Pair | Ratio | AA |
|---|---|---|
| Ink `#0B2133` on card `#F5FAFB` | 15.59 | pass |
| Muted `#44586B` on card `#F5FAFB` | 6.99 | pass |
| Muted `#44586B` on darkest page `#DCEBF2` | 6.03 | pass |
| Ink on darkest page `#DCEBF2` | 13.45 | pass |
| Accent `#06647D` on card | 6.38 | pass |
| Accent `#06647D` on darkest page | 5.50 | pass |
| Warning `#925A00` on card | 5.41 | pass |
| Emergency `#B91C1C` on card | 6.15 | pass |
| Ink on mint `#E6F4EE` | 14.49 | pass |
| Muted on mint | 6.50 | pass |
| Dark: ink `#EAF4F8` on `#0A1F2E` | 15.06 | pass |
| Dark: muted `#A9C2D1` on card `#10303F` | 7.47 | pass |
| Dark: accent `#3FD0E8` on card `#10303F` | 7.52 | pass |

Every proposed pair passes AA with room to spare. Text sits on solid tinted cards, not on the background pattern. Contrast of text directly over each background motif is **not measured yet**.

## Proposed background motifs by screen group (idea, to be approved on a preview sheet first)
Login and landing: ward gradient with a faint ECG line. Dashboard and queue: clinical grid. Emergency flow: calm blue-teal with soft pulse rings (static under reduced motion). Map: neutral teal frame. Analytics and reports: lab-paper grid. Patient home and twin: soft anatomical outline (the twin already has its own body model). Reminders, consent, contacts, profile: quiet medical-cross pattern (what exists today). Admin and audit: tinted surface with a very faint grid. All made from CSS and inline SVG, each under about 10 KB.

## Still to do (not done in this pass)
1. Screenshots at 360, 768, 1366 and 1920 for the main screens of both apps (needs the built apps and the mock server).
2. A per-screen table of the current background.
3. Target-size and focus checks, and an `axe` run.
4. Contrast of text directly over each background motif (lightest and darkest points).
5. A preview sheet of the palette and motifs for approval before anything is applied.
6. Decide the branch (suggested: a new branch from the latest `main`, for example `puneet-design`) and agree with Jehal who does which screens.
