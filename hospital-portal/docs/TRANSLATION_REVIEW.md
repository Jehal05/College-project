# Translation review (Hindi and Gujarati)

**Status: pending native-speaker review.** Both translations are first drafts written by the team with AI help. No native speaker or doctor has checked them yet. Do not show them to a jury as final.

## What is translated
Only the screens' main labels: the top bar and menu, connection badge, the "connection lost" banner, the login page, the queue heading and filters, and the Activity page title. Since 2026-11-14 it also covers the alert card, the detail panel (patient facts, action buttons, state and escalation banners, countdown, timeline labels, section headings), the capacity strip and the dispatch dialog (see the second table). Checklists, reports, the readiness card, the ranking table, notes, chat and the mock "Simulate" buttons stay English for now. A missing translation falls back to English, so nothing breaks.

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

## Dashboard details (added 2026-11-14)

Status of every row below: **draft, needs native review** (Hindi and Gujarati) and a doctor check for the medical wording. Machine-assisted draft, not reviewed by anyone yet. "Cath lab", "Stroke unit" and "ICU" keep the English term in brackets.

Still English on purpose: symptom words, emergency type names (Heart attack, ...), severity names, vitals abbreviations (HR, SpO₂, BP), the readiness card, readiness warnings, the ranking table, notes and chat text, and error messages.

| Key | English | Hindi | Gujarati | Native review | Doctor review |
|---|---|---|---|---|---|
| `common.notShared` | Not shared | साझा नहीं किया गया | શેર કરેલ નથી | pending | pending |
| `card.patient` | Patient | मरीज़ | દર્દી | pending | pending |
| `card.notOpened` | Not opened yet | अभी खोला नहीं गया | હજી ખોલ્યું નથી | pending | pending |
| `card.new` | NEW | नया | નવું | pending | pending |
| `card.cancelled` | CANCELLED | रद्द | રદ | pending | pending |
| `card.locationNotShared` | Location not shared | स्थान साझा नहीं किया गया | સ્થળ શેર કરેલ નથી | pending | pending |
| `card.checkin` | Safety check-in alert. Simulated. | सुरक्षा चेक-इन अलर्ट। Simulated। | સલામતી ચેક-ઇન એલર્ટ. Simulated. | pending | pending |
| `state.EMERGENCY_DETECTED` | Early notice · patient has not confirmed the SOS yet | शुरुआती सूचना · मरीज़ ने अभी SOS की पुष्टि नहीं की | પ્રારંભિક સૂચના · દર્દીએ હજી SOS ની પુષ્ટિ કરી નથી | pending | pending |
| `state.SOS_SENT` | New alert · notification received, not acknowledged yet | नया अलर्ट · सूचना मिली, अभी स्वीकार नहीं किया गया | નવો એલર્ટ · સૂચના મળી, હજી સ્વીકાર્યો નથી | pending | pending |
| `state.ESCALATED` | Escalated to the next hospital · not acknowledged yet | अगले अस्पताल को भेजा गया · अभी स्वीकार नहीं किया गया | આગલી હોસ્પિટલને મોકલ્યો · હજી સ્વીકાર્યો નથી | pending | pending |
| `state.HOSPITAL_ACKNOWLEDGED` | Acknowledged · no ambulance dispatched yet | स्वीकार किया गया · अभी एम्बुलेंस नहीं भेजी गई | સ્વીકાર્યો · હજી એમ્બ્યુલન્સ મોકલી નથી | pending | pending |
| `state.AMBULANCE_DISPATCHED` | Ambulance dispatched (simulated) | एम्बुलेंस भेजी गई (simulated) | એમ્બ્યુલન્સ મોકલી (simulated) | pending | pending |
| `state.EN_ROUTE` | Ambulance en route (simulated) | एम्बुलेंस रास्ते में है (simulated) | એમ્બ્યુલન્સ રસ્તામાં છે (simulated) | pending | pending |
| `state.ARRIVED` | Arrived at hospital | अस्पताल पहुँच गई | હોસ્પિટલ પહોંચી | pending | pending |
| `state.HANDOVER_DONE` | Handed over | सौंप दिया गया | સોંપી દીધો | pending | pending |
| `state.CANCELLED` | Cancelled by patient | मरीज़ द्वारा रद्द | દર્દી દ્વારા રદ | pending | pending |
| `countdown.in` | Escalates in {n} s | {n} सेकंड में अगले अस्पताल को जाएगा | {n} સેકન્ડમાં આગલી હોસ્પિટલને જશે | pending | pending |
| `countdown.now` | Escalating to the next hospital… | अगले अस्पताल को भेजा जा रहा है… | આગલી હોસ્પિટલને મોકલાઈ રહ્યો છે… | pending | pending |
| `countdown.last` | Last hospital on the list · no further escalation | सूची का आखिरी अस्पताल · आगे नहीं भेजा जाएगा | યાદીની છેલ્લી હોસ્પિટલ · આગળ મોકલાશે નહીં | pending | pending |
| `detail.patientId` | Patient ID | मरीज़ आईडी | દર્દી ID | pending | pending |
| `detail.emergencyId` | Emergency ID | आपातकाल आईडी | કટોકટી ID | pending | pending |
| `detail.alertTime` | Alert time | अलर्ट का समय | એલર્ટનો સમય | pending | pending |
| `detail.location` | Location | स्थान | સ્થળ | pending | pending |
| `detail.actions` | Actions | कार्रवाई | કાર્યવાહી | pending | pending |
| `detail.lastUpdate` | Last update: | आखिरी अपडेट: | છેલ્લું અપડેટ: | pending | pending |
| `detail.by` | by | द्वारा | દ્વારા | pending | pending |
| `detail.at` | at | समय | સમયે | pending | pending |
| `banner.cancelledEarly` | The patient cancelled before the SOS was sent. Nothing is needed from the desk. | मरीज़ ने SOS भेजने से पहले रद्द कर दिया। डेस्क से किसी कार्रवाई की ज़रूरत नहीं। | દર્દીએ SOS મોકલતા પહેલાં રદ કર્યું. ડેસ્કે કંઈ કરવાની જરૂર નથી. | pending | pending |
| `banner.cancelled` | The patient cancelled this alert (false alarm). No ambulance may be dispatched. | मरीज़ ने यह अलर्ट रद्द कर दिया (झूठा अलार्म)। एम्बुलेंस नहीं भेजी जा सकती। | દર્દીએ આ એલર્ટ રદ કર્યો (ખોટું એલાર્મ). એમ્બ્યુલન્સ મોકલી શકાશે નહીં. | pending | pending |
| `banner.early` | Early notice (simulated). The patient has not confirmed the SOS yet and can still cancel. Acknowledge and Dispatch unlock when the SOS is sent. | शुरुआती सूचना (simulated)। मरीज़ ने अभी SOS की पुष्टि नहीं की है और अब भी रद्द कर सकता है। SOS भेजे जाने पर स्वीकार करें और एम्बुलेंस भेजें खुल जाएँगे। | પ્રારંભિક સૂચના (simulated). દર્દીએ હજી SOS ની પુષ્ટિ કરી નથી અને હજી રદ કરી શકે છે. SOS મોકલાય ત્યારે સ્વીકારો અને એમ્બ્યુલન્સ મોકલો ખુલશે. | pending | pending |
| `banner.escalated` | Escalated to the next hospital: {name}. No acknowledgement was given in time. It can still be acknowledged. | अगले अस्पताल को भेजा गया: {name}। समय पर स्वीकार नहीं किया गया। इसे अब भी स्वीकार किया जा सकता है। | આગલી હોસ્પિટલને મોકલ્યો: {name}. સમયસર સ્વીકાર થયો નહીં. હજી પણ સ્વીકારી શકાય છે. | pending | pending |
| `banner.nextOnList` | next on the list | सूची में अगला | યાદીમાં આગલી | pending | pending |
| `action.HOSPITAL_ACKNOWLEDGED` | Acknowledge | स्वीकार करें | સ્વીકારો | pending | pending |
| `action.AMBULANCE_DISPATCHED` | Dispatch | एम्बुलेंस भेजें | એમ્બ્યુલન્સ મોકલો | pending | pending |
| `action.EN_ROUTE` | En route | रास्ते में | રસ્તામાં | pending | pending |
| `action.ARRIVED` | Arrived | पहुँच गई | પહોંચી | pending | pending |
| `action.HANDOVER_DONE` | Handed over | सौंप दिया | સોંપી દીધો | pending | pending |
| `dispatch.title` | Dispatch an ambulance? | एम्बुलेंस भेजें? | એમ્બ્યુલન્સ મોકલવી? | pending | pending |
| `dispatch.emergency` | Emergency | आपातकाल | કટોકટી | pending | pending |
| `dispatch.patientWord` | patient | मरीज़ | દર્દી | pending | pending |
| `dispatch.simNote` | This is a simulated dispatch. No real ambulance is contacted. | यह एक simulated डिस्पैच है। किसी असली एम्बुलेंस से संपर्क नहीं किया जाता। | આ simulated ડિસ્પેચ છે. કોઈ વાસ્તવિક એમ્બ્યુલન્સનો સંપર્ક થતો નથી. | pending | pending |
| `dispatch.none` | No ambulance is available right now. Every unit is on another emergency. Dispatch is blocked until one is free. | अभी कोई एम्बुलेंस उपलब्ध नहीं है। हर यूनिट दूसरी आपात स्थिति में है। कोई खाली होने तक भेजना रुका है। | હાલ કોઈ એમ્બ્યુલન્સ ઉપલબ્ધ નથી. દરેક યુનિટ બીજી કટોકટીમાં છે. કોઈ ખાલી થાય ત્યાં સુધી મોકલવું અટકેલું છે. | pending | pending |
| `dispatch.choose` | Choose the unit to send (nearest first) | भेजने के लिए यूनिट चुनें (सबसे नज़दीक पहले) | મોકલવા માટે યુનિટ પસંદ કરો (સૌથી નજીક પહેલાં) | pending | pending |
| `dispatch.nearest` | Nearest | सबसे नज़दीक | સૌથી નજીક | pending | pending |
| `dispatch.crew` | Crew: | दल: | ક્રૂ: | pending | pending |
| `dispatch.no` | Not yet | अभी नहीं | હમણાં નહીં | pending | pending |
| `dispatch.yes` | Yes, dispatch | हाँ, भेजें | હા, મોકલો | pending | pending |
| `cap.aria` | Your hospital capacity | आपके अस्पताल की क्षमता | તમારી હોસ્પિટલની ક્ષમતા | pending | pending |
| `cap.yourHospital` | Your hospital | आपका अस्पताल | તમારી હોસ્પિટલ | pending | pending |
| `cap.beds` | Beds free | खाली बिस्तर | ખાલી પથારી | pending | pending |
| `cap.icu` | ICU free | खाली ICU | ખાલી ICU | pending | pending |
| `cap.cath` | Cath lab | कैथ लैब (Cath lab) | કેથ લેબ (Cath lab) | pending | pending |
| `cap.stroke` | Stroke unit | स्ट्रोक यूनिट (Stroke unit) | સ્ટ્રોક યુનિટ (Stroke unit) | pending | pending |
| `cap.ready` | Ready | तैयार | તૈયાર | pending | pending |
| `cap.notReady` | Not ready | तैयार नहीं | તૈયાર નથી | pending | pending |
| `cap.noCath` | No cath lab | कैथ लैब नहीं है | કેથ લેબ નથી | pending | pending |
| `cap.noStroke` | No stroke unit | स्ट्रोक यूनिट नहीं है | સ્ટ્રોક યુનિટ નથી | pending | pending |
| `cap.noIcu` | No ICU | ICU नहीं है | ICU નથી | pending | pending |
| `cap.notAccepting` | Marked not ready for new emergencies | नई आपात स्थितियों के लिए तैयार नहीं के रूप में चिह्नित | નવી કટોકટી માટે તૈયાર નથી તરીકે ચિહ્નિત | pending | pending |
| `cap.sample` | Sample figures, simulated. | नमूना आँकड़े, simulated. | નમૂના આંકડા, simulated. | pending | pending |
| `sec.patientLocation` | Patient location | मरीज़ का स्थान | દર્દીનું સ્થળ | pending | pending |
| `sec.team` | On-call team | ऑन-कॉल टीम | ઓન-કૉલ ટીમ | pending | pending |
| `sec.timeline` | Response timeline | प्रतिक्रिया समयरेखा | પ્રતિભાવ સમયરેખા | pending | pending |
| `sec.notes` | Handover and desk notes | हैंडओवर और डेस्क नोट्स | હેન્ડઓવર અને ડેસ્ક નોંધો | pending | pending |
| `sec.tracking` | Ambulance tracking | एम्बुलेंस ट्रैकिंग | એમ્બ્યુલન્સ ટ્રેકિંગ | pending | pending |
| `sec.chat` | Desk and crew chat | डेस्क और क्रू चैट | ડેસ્ક અને ક્રૂ ચેટ | pending | pending |
| `sec.nearby` | Nearby help | आस-पास की मदद | નજીકની મદદ | pending | pending |
| `sec.checklist` | Pre-arrival checklist | आगमन-पूर्व चेकलिस्ट | આગમન પહેલાંની ચેકલિસ્ટ | pending | pending |
| `sec.ranking` | Hospital ranking and fallback order | अस्पताल रैंकिंग और वैकल्पिक क्रम | હોસ્પિટલ રેન્કિંગ અને વૈકલ્પિક ક્રમ | pending | pending |
| `sec.vitals` | Vitals | वाइटल्स | વાઇટલ્સ | pending | pending |
| `sec.reported` | Reported symptoms | बताए गए लक्षण | જણાવેલાં લક્ષણો | pending | pending |
| `sec.reportedNote` | (sample content, pending doctor review) | (नमूना सामग्री, डॉक्टर की समीक्षा लंबित) | (નમૂના સામગ્રી, ડૉક્ટરની સમીક્ષા બાકી) | pending | pending |
| `sec.noneReported` | None reported (safety check-in) | कोई नहीं बताया गया (सुरक्षा चेक-इन) | કોઈ જણાવ્યું નથી (સલામતી ચેક-ઇન) | pending | pending |
| `vitals.heartRate` | Heart rate | हृदय गति | હૃદયના ધબકારા | pending | pending |
| `vitals.bp` | Blood pressure | रक्तचाप | બ્લડ પ્રેશર | pending | pending |
| `tl.timeSince` | Time since alert | अलर्ट के बाद का समय | એલર્ટ પછીનો સમય | pending | pending |
| `tl.total` | Total time | कुल समय | કુલ સમય | pending | pending |
| `tl.stopped` | (stopped) | (रुका हुआ) | (બંધ) | pending | pending |
| `tl.sinceAlert` | since alert | अलर्ट के बाद | એલર્ટ પછી | pending | pending |
| `tl.afterPrev` | after previous step | पिछले चरण के बाद | પાછલા પગલા પછી | pending | pending |
| `tl.by` | By | द्वारा | દ્વારા | pending | pending |
| `tl.notReached` | Not reached yet | अभी तक नहीं पहुँचा | હજી પહોંચ્યું નથી | pending | pending |
| `tl.localOnly` | Saved on this screen only | केवल इसी स्क्रीन पर सहेजा गया | ફક્ત આ સ્ક્રીન પર સાચવ્યું | pending | pending |
| `tl.SOS_SENT` | Alert sent | अलर्ट भेजा गया | એલર્ટ મોકલાયો | pending | pending |
| `tl.HOSPITAL_ACKNOWLEDGED` | Hospital acknowledged | अस्पताल ने स्वीकार किया | હોસ્પિટલે સ્વીકાર્યો | pending | pending |
| `tl.AMBULANCE_DISPATCHED` | Ambulance dispatched | एम्बुलेंस भेजी गई | એમ્બ્યુલન્સ મોકલી | pending | pending |
| `tl.EN_ROUTE` | Ambulance en route | एम्बुलेंस रास्ते में | એમ્બ્યુલન્સ રસ્તામાં | pending | pending |
| `tl.ARRIVED` | Arrived | पहुँच गई | પહોંચી | pending | pending |
| `tl.HANDOVER_DONE` | Handed over | सौंप दिया गया | સોંપી દીધો | pending | pending |
| `tl.CANCELLED` | Cancelled | रद्द | રદ | pending | pending |
| `tl.ESCALATED` | Escalated to next hospital | अगले अस्पताल को भेजा गया | આગલી હોસ્પિટલને મોકલ્યો | pending | pending |
| `tl.EMERGENCY_DETECTED` | Emergency detected | आपात स्थिति का पता चला | કટોકટી શોધાઈ | pending | pending |
