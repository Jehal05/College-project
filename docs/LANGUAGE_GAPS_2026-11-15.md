# Language gaps: what stays English in Hindi and Gujarati (hospital portal)

Inventory only. **No code was changed for this list.** It is for Puneet to decide, item by item, what to translate and what to explain as "data".

Source: reading `hospital-portal/src` on branch `Puneet` (15 Nov 2026). Checked by reading the code and data files, **not** by clicking through every page in Hindi and Gujarati. Items marked "seen" were also seen on screen in the 14 Nov rehearsal (`hospital-portal/docs/DEMO_SCRIPT.md`).

How translation works today: screen text uses `t('key')` from `src/i18n/en.js`, `hi.js` and `gu.js`. Tests make sure the three files have the same keys. Anything that comes from a data file or from the backend is shown as it arrives, so it stays English.

## 1. Data files (shown as stored)

| What | Where | Example | Notes |
|---|---|---|---|
| Hospital names | `src/data/hospitals.json` (`name`) and the backend | "Navrangpura Heart & Stroke Centre (Sample)" | Backend names also come in English. "(Sample)" is on purpose. |
| Hospital addresses and phone | `hospitals.json` (`address`, `phone`) | | Addresses are place names. |
| Ambulance call signs and crew | `src/data/ambulances.json` (`call_sign`, `crew`) | "Bravo 2" | Crew names are people's names. |
| AED places | `src/data/aed.json` (`name`, `note`), 6 places | "Law Garden Community Hall (Sample)" | Place names. |
| Volunteer names | `src/data/responders.json` (`name`, `skill`), 6 entries | "Volunteer Asha (Sample)" | `skill` text is English. |
| Checklist items | `src/data/checklists.json`, 26 items in 5 emergency types (HEART 6, STROKE 6, DIABETIC 5, ASTHMA 5, UNKNOWN 4) | | Also has `_note` and `_review` blocks (the doctor review text). The checklist item text is medical wording: translate only after a doctor reviews the English. |
| On-call roster | `src/data/roster.json` (H1 to H5): `name`, `role`, `specialty` | "Dr. A. Shah (Sample)", "Duty physician" | Invented sample names; role and specialty words are English. |
| Sample history | `src/data/sample-history.json`, 7 cases | | Loaded by `src/services/historyStore.js`. |
| Mock alerts | `src/data/mock-alerts.json`, 3 alerts | symptoms "Chest pain", "Face drooping" | Used by `src/services/mockBackend.js` (mock mode). |

## 2. Words that come from the backend or the patient app

| What | Where it appears | Notes |
|---|---|---|
| Symptom words | Alert card and detail (`components/detail/SymptomList.jsx`, `AlertCard.jsx`); the English word list is `SYMPTOM_WORDS` in `src/services/adapters.js` | Seen: stays English. Medical wording, pending doctor review. |
| Event text on the timeline | `components/Timeline.jsx`, written by `AmbulanceProvider.jsx` ("Patient picked up (simulated)") and by the backend | Written into the case as data. The allow-list says "English in every language". |
| Names saved with notes and chat | `EmergencyProvider.jsx` ("Hospital staff"), `EmergencyDetail.jsx` ("Hospital desk") | Saved as data. |
| Notes and chat messages | `NotesPanel.jsx`, `ChatPanel.jsx` | Whatever the user types. |
| Take-over reason | Saved in English on purpose (`TakeOverBox.jsx`, `EN_LABELS`) | The timeline is written in English. |

## 3. Pages and parts on screen

| What | Where | Notes |
|---|---|---|
| Activity row text ("what was done") | `src/services/activity.js` builds `text` from English `STATE_LABELS` and `NOTE_KIND_LABELS` (for example `Note: ...`) and from `Ticked: <item>` / `Unticked: <item>` | Seen: the page title and filters are translated, the row text stays English. The keys `act.ticked`, `act.unticked` and `act.nk.handover`/`desk`/`note` already exist in `en.js`, `hi.js` and `gu.js` but no screen uses them yet, so wiring them in is a small change. |
| Ranking "Why" sentences | `src/i18n/phrases.js` `whyText()` | **Now translated** (15 Nov fix). The unit names inside it stay English. Hindi and Gujarati wording unreviewed. |
| Vital labels and units | HR, SpO₂, BP, mmHg, BPM | Allowed on purpose (`hardcodedAllow.json`): medical abbreviations. |
| Map credit line | `PatientMiniMap.jsx` | "OpenStreetMap" is a brand name. |
| Map tiles | OpenStreetMap | Labels in the map itself follow OpenStreetMap, not the portal. |

## 4. Already translated (for comparison)

Navigation, buttons, banners, alert card labels ("अभी यहाँ: ..." / "now at ..."), emergency type names, severity words, state names, countdown texts, tracking text, History dates, km and minute units, handover and analytics labels (seen in the 14 Nov rehearsal). **New on 15 Nov:** the "no suitable hospital", "last hospital" and take-over explanation lines, in English, Hindi and Gujarati. The Hindi and Gujarati wording is a draft for review (`TRANSLATION_REVIEW.md`).

## 5. Suggested split (a suggestion, not a decision)

- **Translate in the portal:** nothing in section 3 beyond the Activity row text (it is built from known states; it can use the same `stateText` helper).
- **Translate with a reviewer:** symptom words and checklist items, after the doctor review.
- **Say honestly in the demo:** hospital, unit, AED and volunteer names are sample data and stay English; notes, chat and event text are written by people or the backend.

## 6. Not checked

- Gujarati on every page after the last fixes was not looked at one by one.
- Backend event text was not enumerated: it can change whenever Daksh changes the backend.
