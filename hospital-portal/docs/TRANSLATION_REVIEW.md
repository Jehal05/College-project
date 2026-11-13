# Translation review (Hindi and Gujarati)

**Status: pending native-speaker review.** Both translations are first drafts written by the team with AI help. No native speaker or doctor has checked them yet. Do not show them to a jury as final.

## What is translated
Only the screens' main labels: the top bar and menu, connection badge, the "connection lost" banner, the login page, the queue heading and filters, and the Activity page title. Everything else (alert details, buttons in the detail panel, checklists, reports, the mock "Simulate" buttons) stays English for now. A missing translation falls back to English, so nothing breaks.

## Rules we kept
- The word **Simulated** stays in English, everywhere.
- **Symptom words** (Chest pain, Sweating, ...) are never translated. They are sample content waiting for doctor review, and a wrong translation could change the meaning.
- Placeholders such as `{n}` and `{time}` are kept exactly. A unit test checks this.

## How to review
1. Run the portal, pick the language in the top bar (saved in the browser).
2. Check each row below. Mark it `ok` or write the better wording, with the reviewer's name and the date.
3. Edit `src/i18n/hi.js` or `src/i18n/gu.js`. `npm test` checks that the keys and placeholders still match English.

## Fonts
The page asks for Noto Sans (Devanagari, Gujarati), then Nirmala UI, Mangal and Shruti. The sandbox that built this did not have Noto installed, so the screenshots in `docs/i18n/` use a fallback font that still has the glyphs. **Please check on the laptop** that the real Noto or Nirmala UI font shows no empty boxes.

Screenshots: `docs/i18n/glyphs-hindi.png`, `docs/i18n/glyphs-gujarati.png`.

## Strings
| Key | English | Hindi | Gujarati | Hindi review | Gujarati review |
|---|---|---|---|---|---|
| `app.title` | HealthTwin AI · Hospital Portal | HealthTwin AI · अस्पताल पोर्टल | HealthTwin AI · હોસ્પિટલ પોર્ટલ | pending | pending |
| `app.simulated` | Simulated prototype | Simulated प्रोटोटाइप | Simulated પ્રોટોટાઇપ | pending | pending |
| `nav.dashboard` | Dashboard | डैशबोर्ड | ડેશબોર્ડ | pending | pending |
| `nav.map` | Map | नक्शा | નકશો | pending | pending |
| `nav.fleet` | Fleet | एम्बुलेंस बेड़ा | એમ્બ્યુલન્સ કાફલો | pending | pending |
| `nav.history` | History | इतिहास | ઇતિહાસ | pending | pending |
| `nav.activity` | Activity | गतिविधि | પ્રવૃત્તિ | pending | pending |
| `nav.analytics` | Analytics | विश्लेषण | વિશ્લેષણ | pending | pending |
| `nav.admin` | Admin | एडमिन | એડમિન | pending | pending |
| `nav.logout` | Log out | लॉग आउट | લૉગ આઉટ | pending | pending |
| `nav.language` | Language | भाषा | ભાષા | pending | pending |
| `nav.deskHospital` | Desk hospital | डेस्क अस्पताल | ડેસ્ક હોસ્પિટલ | pending | pending |
| `conn.live` | Live | लाइव | લાઇવ | pending | pending |
| `conn.reconnecting` | Reconnecting… | फिर से जुड़ रहा है… | ફરી જોડાઈ રહ્યું છે… | pending | pending |
| `conn.connecting` | Connecting… | जुड़ रहा है… | જોડાઈ રહ્યું છે… | pending | pending |
| `conn.mock` | Mock data | नकली डेटा | નકલી ડેટા | pending | pending |
| `offline.lost` | Connection lost at {time}. New alerts may be missing. | कनेक्शन {time} बजे टूट गया। नए अलर्ट छूट सकते हैं। | કનેક્શન {time} વાગ્યે તૂટી ગયું. નવા એલર્ટ ચૂકી જવાય શકે છે. | pending | pending |
| `offline.reload` | Reload | फिर से लोड करें | ફરી લોડ કરો | pending | pending |
| `offline.reloading` | Reloading… | लोड हो रहा है… | લોડ થઈ રહ્યું છે… | pending | pending |
| `offline.backLoading` | Reconnected. Reloading alerts… | फिर से जुड़ गया। अलर्ट लोड हो रहे हैं… | ફરી જોડાઈ ગયું. એલર્ટ લોડ થઈ રહ્યા છે… | pending | pending |
| `offline.backOne` | Reconnected. Reloaded {n} alert. | फिर से जुड़ गया। {n} अलर्ट लोड हुआ। | ફરી જોડાઈ ગયું. {n} એલર્ટ લોડ થયું. | pending | pending |
| `offline.back` | Reconnected. Reloaded {n} alerts. | फिर से जुड़ गया। {n} अलर्ट लोड हुए। | ફરી જોડાઈ ગયું. {n} એલર્ટ લોડ થયા. | pending | pending |
| `login.title` | Hospital Portal | अस्पताल पोर्टल | હોસ્પિટલ પોર્ટલ | pending | pending |
| `login.subtitle` | HealthTwin AI · staff login | HealthTwin AI · स्टाफ लॉगिन | HealthTwin AI · સ્ટાફ લૉગિન | pending | pending |
| `login.simulated` | Simulated prototype. No real hospital is contacted. | Simulated प्रोटोटाइप। किसी असली अस्पताल से संपर्क नहीं होता। | Simulated પ્રોટોટાઇપ. કોઈ સાચી હોસ્પિટલનો સંપર્ક થતો નથી. | pending | pending |
| `login.email` | Email | ईमेल | ઇમેઇલ | pending | pending |
| `login.username` | Username | यूज़रनेम | યુઝરનેમ | pending | pending |
| `login.password` | Password | पासवर्ड | પાસવર્ડ | pending | pending |
| `login.submit` | Log in | लॉग इन करें | લૉગ ઇન કરો | pending | pending |
| `login.busy` | Logging in… | लॉग इन हो रहा है… | લૉગ ઇન થઈ રહ્યું છે… | pending | pending |
| `dash.queue` | Alert queue | अलर्ट कतार | એલર્ટ કતાર | pending | pending |
| `dash.open` | ({n} open) | ({n} खुले) | ({n} ખુલ્લા) | pending | pending |
| `dash.unread` | {n} unread | {n} अपठित | {n} ન વાંચેલા | pending | pending |
| `dash.mine` | My hospital | मेरा अस्पताल | મારી હોસ્પિટલ | pending | pending |
| `dash.all` | All hospitals | सभी अस्पताल | બધી હોસ્પિટલ | pending | pending |
| `dash.loading` | Loading alerts… | अलर्ट लोड हो रहे हैं… | એલર્ટ લોડ થઈ રહ્યા છે… | pending | pending |
| `dash.simulatedEvent` | Simulated event. Not a medical diagnosis. | Simulated घटना। यह चिकित्सीय निदान नहीं है। | Simulated ઘટના. આ તબીબી નિદાન નથી. | pending | pending |
| `activity.title` | Staff activity log | स्टाफ गतिविधि लॉग | સ્ટાફ પ્રવૃત્તિ લૉગ | pending | pending |
