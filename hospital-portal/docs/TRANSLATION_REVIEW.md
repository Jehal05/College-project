# Translation review (Hindi and Gujarati)

**Status: pending native-speaker review.** Both translations are first drafts written by the team with AI help. No native speaker or doctor has checked them yet. Do not show them to a jury as final.

## What is translated
Most screens now: the top bar and menu, login, the alert queue and cards, the detail panel (including the readiness card, nearby help, ranking table and timeline labels), the dispatch dialog, the tracking map, Map, Fleet, History, Activity (filters, dates and labels), Handover, Analytics, Presentation mode and the screen reader announcements. Still English on purpose: symptom words, hospital and unit names, checklist item texts, AED and responder sample data, backend event text and ranking "why" sentences. A missing translation falls back to English, so nothing breaks.

## Left in English on purpose
These are data or text that comes from the backend or from doctor-reviewed content, so the portal does not translate them:
- Hospital names, ambulance unit names and symptom words.
- Checklist item texts (they wait for doctor review). The sentence "Sample checklist. Pending medical review." is translated, because it says the content is not yet reviewed.
- AED places and community responder sample data.
- Event text written by the backend or the desk, for example "Patient picked up (simulated)" and "Taken over from … Reason: …".
- The "Why:" sentences in the hospital ranking.
- Ordinals such as 1st, 2nd.
- The short capacity codes CL, SU, ICU.

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

## Added after the review pack (2026-11-14)
These keys were not in the tables above when the review pack was sent. Please review only these if the first tables are already done. The table is generated from `src/i18n/*.js` (keys that are not in the tables above).

| Key | English | Hindi | Gujarati | Hindi review | Gujarati review |
|---|---|---|---|---|---|
| `card.nowAt` | now at {name} | अभी यहाँ: {name} | હાલ અહીં: {name} | pending | pending |
| `team.noRoster` | No on-call roster for this hospital. | इस अस्पताल के लिए ऑन-कॉल रोस्टर नहीं है। | આ હોસ્પિટલ માટે ઓન-કૉલ રોસ્ટર નથી. | pending | pending |
| `error.title` | Something went wrong on this screen | इस स्क्रीन पर कुछ गड़बड़ हो गई | આ સ્ક્રીન પર કંઈક ખોટું થયું | pending | pending |
| `error.body` | Your alerts are not lost. Reload the page to continue. | आपके अलर्ट खोए नहीं हैं। जारी रखने के लिए पेज दोबारा लोड करें। | તમારા એલર્ટ ગુમ થયા નથી. ચાલુ રાખવા માટે પેજ ફરી લોડ કરો. | pending | pending |
| `error.reload` | Reload | दोबारा लोड करें | ફરી લોડ કરો | pending | pending |
| `error.retry` | Try again | फिर कोशिश करें | ફરી પ્રયત્ન કરો | pending | pending |
| `login.expired` | Your session expired. Please log in again. | आपका सत्र समाप्त हो गया। कृपया फिर से लॉग इन करें। | તમારું સત્ર પૂરું થઈ ગયું. કૃપા કરીને ફરી લૉગ ઇન કરો. | pending | pending |
| `sound.on` | Sound on | आवाज़ चालू | અવાજ ચાલુ | pending | pending |
| `sound.off` | Sound off | आवाज़ बंद | અવાજ બંધ | pending | pending |
| `sound.tap` | Tap to enable sound | आवाज़ चालू करने के लिए टैप करें | અવાજ ચાલુ કરવા ટૅપ કરો | pending | pending |
| `sound.tapHelp` | The browser blocks sound until you click once on this page. | ब्राउज़र आवाज़ तब तक रोकता है जब तक आप इस पेज पर एक बार क्लिक नहीं करते। | બ્રાઉઝર તમે આ પેજ પર એક વાર ક્લિક ન કરો ત્યાં સુધી અવાજ રોકે છે. | pending | pending |
| `sound.test` | Test sound | आवाज़ जाँचें | અવાજ ચકાસો | pending | pending |
| `takeover.title` | This alert is held by {name} | यह अलर्ट {name} के पास है | આ એલર્ટ {name} પાસે છે | pending | pending |
| `takeover.body` | Take it over before you acknowledge or dispatch. Your reason is saved in the timeline. | स्वीकार करने या एम्बुलेंस भेजने से पहले इसे अपने हाथ में लें। आपका कारण टाइमलाइन में सहेजा जाएगा। | સ્વીકારતા કે એમ્બ્યુલન્સ મોકલતા પહેલાં તેને હાથમાં લો. તમારું કારણ ટાઇમલાઇનમાં સાચવાશે. | pending | pending |
| `takeover.reason` | Reason | कारण | કારણ | pending | pending |
| `takeover.choose` | Choose a reason | कारण चुनें | કારણ પસંદ કરો | pending | pending |
| `takeover.write` | Write the reason | कारण लिखें | કારણ લખો | pending | pending |
| `takeover.details` | Details (optional) | विवरण (वैकल्पिक) | વિગત (વૈકલ્પિક) | pending | pending |
| `takeover.r.demo` | Demo or training | डेमो या प्रशिक्षण | ડેમો અથવા તાલીમ | pending | pending |
| `takeover.r.cannot-respond` | The other hospital cannot respond | दूसरा अस्पताल जवाब नहीं दे सकता | બીજી હૉસ્પિટલ જવાબ આપી શકતી નથી | pending | pending |
| `takeover.r.nearer` | We are nearer to the patient | हम मरीज़ के ज़्यादा पास हैं | અમે દર્દીની વધુ નજીક છીએ | pending | pending |
| `takeover.r.other` | Other (write the reason) | अन्य (कारण लिखें) | અન્ય (કારણ લખો) | pending | pending |
| `takeover.button` | Take over this alert | यह अलर्ट अपने हाथ में लें | આ એલર્ટ હાથમાં લો | pending | pending |
| `takeover.busy` | Taking over… | ले रहे हैं… | હાથમાં લઈ રહ્યા છીએ… | pending | pending |
| `takeover.failed` | Could not take over: {msg} | अलर्ट हाथ में नहीं लिया जा सका: {msg} | એલર્ટ હાથમાં લઈ શકાયું નથી: {msg} | pending | pending |
| `takeover.locked` | Take over this alert first. | पहले इस अलर्ट को अपने हाथ में लें। | પહેલાં આ એલર્ટ હાથમાં લો. | pending | pending |
| `severity.missing` | Severity was not sent. Shown as URGENT. Check the patient. | गंभीरता नहीं भेजी गई। URGENT दिखाया गया है। मरीज़ की जाँच करें। | ગંભીરતા મોકલાઈ નથી. URGENT તરીકે બતાવ્યું છે. દર્દીને તપાસો. | pending | pending |
| `common.loading` | Loading… | लोड हो रहा है… | લોડ થઈ રહ્યું છે… | pending | pending |
| `common.cancel` | Cancel | रद्द करें | રદ કરો | pending | pending |
| `common.saving` | Saving… | सहेज रहे हैं… | સાચવી રહ્યા છીએ… | pending | pending |
| `common.none` | None | कोई नहीं | કોઈ નહીં | pending | pending |
| `nav.resetDemo` | Reset demo | डेमो रीसेट करें | ડેમો રીસેટ કરો | pending | pending |
| `nav.resetAsk` | Restore the starting data? | शुरुआती डेटा वापस लाएँ? | શરૂઆતનો ડેટા પાછો લાવીએ? | pending | pending |
| `nav.resetYes` | Yes, reset | हाँ, रीसेट करें | હા, રીસેટ કરો | pending | pending |
| `nav.resetNo` | No | नहीं | ના | pending | pending |
| `login.usernameHint` | The backend asks for a username, not an email. | बैकएंड ईमेल नहीं, यूज़रनेम माँगता है। | બેકએન્ડ ઇમેઇલ નહીં, યુઝરનેમ માંગે છે. | pending | pending |
| `login.demoAccounts` | Mock mode demo accounts: staff@demo or admin@demo, password demo123. Jehal's logins also work: staff@demo.test / demo1234 and staff1 / demo-password. | मॉक मोड के डेमो खाते: staff@demo या admin@demo, पासवर्ड demo123। जेहल के लॉगिन भी चलते हैं: staff@demo.test / demo1234 और staff1 / demo-password। | મૉક મોડના ડેમો ખાતા: staff@demo અથવા admin@demo, પાસવર્ડ demo123. જેહલના લૉગિન પણ ચાલે છે: staff@demo.test / demo1234 અને staff1 / demo-password. | pending | pending |
| `dash.updateBeds` | Update beds and ICU | बेड और ICU अपडेट करें | બેડ અને ICU અપડેટ કરો | pending | pending |
| `dash.hideBeds` | Hide beds and ICU | बेड और ICU छिपाएँ | બેડ અને ICU છુપાવો | pending | pending |
| `dash.simNew` | + Simulate new alert | + नया अलर्ट सिमुलेट करें | + નવું એલર્ટ સિમ્યુલેટ કરો | pending | pending |
| `dash.simEarly` | + Simulate early notice | + शुरुआती सूचना सिमुलेट करें | + શરૂઆતની સૂચના સિમ્યુલેટ કરો | pending | pending |
| `dash.emptyMine` | No active alerts for this hospital. | इस अस्पताल के लिए कोई सक्रिय अलर्ट नहीं। | આ હૉસ્પિટલ માટે કોઈ સક્રિય એલર્ટ નથી. | pending | pending |
| `dash.emptyAll` | No active alerts. | कोई सक्रिय अलर्ट नहीं। | કોઈ સક્રિય એલર્ટ નથી. | pending | pending |
| `dash.selectAlert` | Select an alert to see its details. | विवरण देखने के लिए कोई अलर्ट चुनें। | વિગત જોવા માટે એલર્ટ પસંદ કરો. | pending | pending |
| `dash.otherOne` | 1 alert at other hospitals | दूसरे अस्पतालों में 1 अलर्ट | બીજી હૉસ્પિટલોમાં 1 એલર્ટ | pending | pending |
| `dash.otherMany` | {n} alerts at other hospitals | दूसरे अस्पतालों में {n} अलर्ट | બીજી હૉસ્પિટલોમાં {n} એલર્ટ | pending | pending |
| `dash.showAll` | Show all hospitals | सभी अस्पताल दिखाएँ | બધી હૉસ્પિટલો બતાવો | pending | pending |
| `dash.scopeLabel` | Which alerts to show | कौन से अलर्ट दिखाएँ | કયા એલર્ટ બતાવવા | pending | pending |
| `dash.queueLabel` | Alert queue | अलर्ट कतार | એલર્ટ કતાર | pending | pending |
| `card.hr` | HR | हृदय गति | હૃદય ગતિ | pending | pending |
| `card.bp` | BP | रक्तचाप | બ્લડ પ્રેશર | pending | pending |
| `sev.EMERGENCY` | EMERGENCY | आपातकाल | કટોકટી | pending | pending |
| `sev.URGENT` | URGENT | तत्काल | તાત્કાલિક | pending | pending |
| `sev.WATCH` | WATCH | निगरानी | નજર રાખો | pending | pending |
| `sev.NONE` | NONE | कोई नहीं | કોઈ નહીં | pending | pending |
| `avail.beds` | Beds free | खाली बेड | ખાલી બેડ | pending | pending |
| `avail.icu` | ICU beds free | खाली ICU बेड | ખાલી ICU બેડ | pending | pending |
| `avail.cath` | Cath lab ready | कैथ लैब तैयार | કેથ લેબ તૈયાર | pending | pending |
| `avail.stroke` | Stroke unit ready | स्ट्रोक यूनिट तैयार | સ્ટ્રોક યુનિટ તૈયાર | pending | pending |
| `avail.notHere` |  (not available here) |  (यहाँ उपलब्ध नहीं) |  (અહીં ઉપલબ્ધ નથી) | pending | pending |
| `avail.noUnit` | This hospital does not have this unit | इस अस्पताल में यह यूनिट नहीं है | આ હૉસ્પિટલમાં આ યુનિટ નથી | pending | pending |
| `avail.save` | Save availability | उपलब्धता सहेजें | ઉપલબ્ધતા સાચવો | pending | pending |
| `avail.whole` | Enter a whole number, 0 or more | 0 या उससे ज़्यादा की पूरी संख्या लिखें | 0 કે તેથી વધુ પૂર્ણ સંખ્યા લખો | pending | pending |
| `avail.saved` | Saved at {time}. Rankings updated. | {time} पर सहेजा गया। रैंकिंग अपडेट हुई। | {time} વાગ્યે સાચવ્યું. રેન્કિંગ અપડેટ થયું. | pending | pending |
| `avail.notSaved` | Not saved: {msg} | सहेजा नहीं गया: {msg} | સાચવ્યું નથી: {msg} | pending | pending |
| `notes.empty` | No handover or desk notes yet. | अभी कोई हैंडओवर या डेस्क नोट नहीं। | હજી કોઈ હેન્ડઓવર કે ડેસ્ક નોંધ નથી. | pending | pending |
| `notes.listLabel` | Handover and desk notes | हैंडओवर और डेस्क नोट | હેન્ડઓવર અને ડેસ્ક નોંધ | pending | pending |
| `notes.localOnly` | (saved on this screen only) | (सिर्फ़ इस स्क्रीन पर सहेजा गया) | (ફક્ત આ સ્ક્રીન પર સાચવ્યું) | pending | pending |
| `notes.type` | Note type | नोट का प्रकार | નોંધનો પ્રકાર | pending | pending |
| `notes.kind.handover` | Handover note | हैंडओवर नोट | હેન્ડઓવર નોંધ | pending | pending |
| `notes.kind.desk` | Desk note | डेस्क नोट | ડેસ્ક નોંધ | pending | pending |
| `notes.text` | Note text | नोट का पाठ | નોંધનું લખાણ | pending | pending |
| `notes.phHandover` | For the next shift: what they must know (simulated case) | अगली शिफ़्ट के लिए: उन्हें क्या पता होना चाहिए (simulated case) | આગલી શિફ્ટ માટે: તેમને શું જાણવું જરૂરી છે (simulated case) | pending | pending |
| `notes.phDesk` | Working note for the desk | डेस्क के लिए कार्य-नोट | ડેસ્ક માટે કામચલાઉ નોંધ | pending | pending |
| `notes.over` |  ({n} over the limit of {max}) |  ({max} की सीमा से {n} ज़्यादा) |  ({max}ની મર્યાદાથી {n} વધુ) | pending | pending |
| `notes.add` | Add note | नोट जोड़ें | નોંધ ઉમેરો | pending | pending |
| `notes.closed` | This case is closed. No more notes can be added. | यह केस बंद है। और नोट नहीं जोड़े जा सकते। | આ કેસ બંધ છે. વધુ નોંધ ઉમેરી શકાશે નહીં. | pending | pending |
| `notes.saveFailed` | Could not save the note: {msg} | नोट सहेजा नहीं जा सका: {msg} | નોંધ સાચવી શકાઈ નથી: {msg} | pending | pending |
| `notes.localInfo` | Saved on this screen only: the backend has no notes endpoint yet. | सिर्फ़ इस स्क्रीन पर सहेजा गया: बैकएंड में अभी नोट्स एंडपॉइंट नहीं है। | ફક્ત આ સ્ક્રીન પર સાચવ્યું: બેકએન્ડમાં હજી નોંધનો એન્ડપૉઇન્ટ નથી. | pending | pending |
| `notes.errEmpty` | Write a note first. | पहले नोट लिखें। | પહેલાં નોંધ લખો. | pending | pending |
| `notes.errLong` | The note is {n} characters too long (limit {max}). | नोट {n} अक्षर ज़्यादा लंबा है (सीमा {max})। | નોંધ {n} અક્ષર વધુ લાંબી છે (મર્યાદા {max}). | pending | pending |
| `chat.badge` | Simulated chat | Simulated चैट | Simulated ચેટ | pending | pending |
| `chat.deskCrew` | Hospital desk ↔ ambulance crew | अस्पताल डेस्क ↔ एम्बुलेंस क्रू | હૉસ્પિટલ ડેસ્ક ↔ એમ્બ્યુલન્સ ક્રૂ | pending | pending |
| `chat.crewDesk` | Ambulance crew ↔ hospital desk | एम्बुलेंस क्रू ↔ अस्पताल डेस्क | એમ્બ્યુલન્સ ક્રૂ ↔ હૉસ્પિટલ ડેસ્ક | pending | pending |
| `chat.none` | No messages yet. | अभी कोई संदेश नहीं। | હજી કોઈ સંદેશ નથી. | pending | pending |
| `chat.crew` | Ambulance crew | एम्बुलेंस क्रू | એમ્બ્યુલન્સ ક્રૂ | pending | pending |
| `chat.desk` | Hospital desk | अस्पताल डेस्क | હૉસ્પિટલ ડેસ્ક | pending | pending |
| `chat.placeholder` | Type a message | संदेश लिखें | સંદેશ લખો | pending | pending |
| `chat.send` | Send | भेजें | મોકલો | pending | pending |
| `chat.openCrew` | Open the crew view in a new tab | क्रू व्यू नए टैब में खोलें | ક્રૂ વ્યૂ નવા ટૅબમાં ખોલો | pending | pending |
| `chat.mockReply` | Mock: crew replies | मॉक: क्रू जवाब देता है | મૉક: ક્રૂ જવાબ આપે છે | pending | pending |
| `chat.notSent` | Message not sent: {msg} | संदेश नहीं भेजा गया: {msg} | સંદેશ મોકલાયો નથી: {msg} | pending | pending |
| `fleet.title` | Ambulance fleet | एम्बुलेंस बेड़ा | એમ્બ્યુલન્સ કાફલો | pending | pending |
| `fleet.badge` | Simulated fleet. Sample crews. | Simulated बेड़ा। नमूना क्रू। | Simulated કાફલો. નમૂના ક્રૂ. | pending | pending |
| `fleet.summary` | {free} of {total} available | {total} में से {free} उपलब्ध | {total} માંથી {free} ઉપલબ્ધ | pending | pending |
| `fleet.unit` | Unit | यूनिट | યુનિટ | pending | pending |
| `fleet.crew` | Crew | क्रू | ક્રૂ | pending | pending |
| `fleet.base` | Base | बेस | બેઝ | pending | pending |
| `fleet.current` | Current emergency | मौजूदा आपातकाल | હાલની કટોકટી | pending | pending |
| `fleet.status` | Status | स्थिति | સ્થિતિ | pending | pending |
| `fleet.driver` | Driver | ड्राइवर | ડ્રાઇવર | pending | pending |
| `fleet.paramedic` | Paramedic | पैरामेडिक | પેરામેડિક | pending | pending |
| `fleet.eta` | ETA {time} (simulated) | अनुमानित समय {time} (simulated) | અંદાજિત સમય {time} (simulated) | pending | pending |
| `fleet.s.available` | Available | उपलब्ध | ઉપલબ્ધ | pending | pending |
| `fleet.s.dispatched` | Dispatched | भेजी गई | મોકલી | pending | pending |
| `fleet.s.en_route` | En route | रास्ते में | રસ્તામાં | pending | pending |
| `fleet.s.at_hospital` | At hospital | अस्पताल में | હૉસ્પિટલમાં | pending | pending |
| `fleet.none` | No ambulances loaded. | कोई एम्बुलेंस लोड नहीं हुई। | કોઈ એમ્બ્યુલન્સ લોડ થઈ નથી. | pending | pending |
| `fleet.trips` | Active trips ({n}) | चालू यात्राएँ ({n}) | ચાલુ ટ્રિપ ({n}) | pending | pending |
| `fleet.noTrips` | No ambulance is out. Dispatch one from the Dashboard. | कोई एम्बुलेंस बाहर नहीं है। डैशबोर्ड से एक भेजें। | કોઈ એમ્બ્યુલન્સ બહાર નથી. ડેશબોર્ડ પરથી મોકલો. | pending | pending |
| `crew.title` | Ambulance crew view | एम्बुलेंस क्रू व्यू | એમ્બ્યુલન્સ ક્રૂ વ્યૂ | pending | pending |
| `crew.emergency` | Emergency | आपातकाल | કટોકટી | pending | pending |
| `map.title` | Nearby hospitals | आस-पास के अस्पताल | નજીકની હૉસ્પિટલો | pending | pending |
| `map.badge` | Simulated ETA · assumed {kmh} km/h | Simulated अनुमानित समय · माना गया {kmh} किमी/घं | Simulated અંદાજિત સમય · ધારેલી ગતિ {kmh} કિમી/કલાક | pending | pending |
| `map.aed` | AED locations (sample) | AED स्थान (नमूना) | AED સ્થાનો (નમૂના) | pending | pending |
| `map.responders` | Community responders (sample) | सामुदायिक सहायक (नमूना) | સામુદાયિક મદદગાર (નમૂના) | pending | pending |
| `map.type` | Emergency type | आपातकाल का प्रकार | કટોકટીનો પ્રકાર | pending | pending |
| `map.allTypes` | All (no filter) | सभी (कोई फ़िल्टर नहीं) | બધા (ફિલ્ટર નહીં) | pending | pending |
| `map.loading` | Loading hospitals… | अस्पताल लोड हो रहे हैं… | હૉસ્પિટલો લોડ થઈ રહી છે… | pending | pending |
| `map.patientTip` | {label} (simulated) | {label} (simulated) | {label} (simulated) | pending | pending |
| `map.l.hospital` | Hospital | अस्पताल | હૉસ્પિટલ | pending | pending |
| `map.l.has` | Has needed capability | ज़रूरी सुविधा मौजूद | જરૂરી સુવિધા છે | pending | pending |
| `map.l.missing` | Missing a needed capability | ज़रूरी सुविधा नहीं है | જરૂરી સુવિધા નથી | pending | pending |
| `map.l.top` | Top ranked (yellow ring) | सबसे ऊपर (पीला घेरा) | સૌથી ઉપર (પીળું કૂંડાળું) | pending | pending |
| `map.l.patient` | Patient (demo location) | मरीज़ (डेमो स्थान) | દર્દી (ડેમો સ્થાન) | pending | pending |
| `map.l.abbr` | CL = Cath Lab · SU = Stroke Unit | CL = कैथ लैब · SU = स्ट्रोक यूनिट | CL = કેથ લેબ · SU = સ્ટ્રોક યુનિટ | pending | pending |
| `map.l.aed` | AED (sample) | AED (नमूना) | AED (નમૂના) | pending | pending |
| `map.l.resp` | Community responder (sample) | सामुदायिक सहायक (नमूना) | સામુદાયિક મદદગાર (નમૂના) | pending | pending |
| `map.nearAed` | Nearest AED to the patient | मरीज़ के सबसे पास का AED | દર્દીની સૌથી નજીકનું AED | pending | pending |
| `map.aedAway` | {km} km away · about {min} min on foot (simulated) | {km} किमी दूर · पैदल लगभग {min} मिनट (simulated) | {km} કિમી દૂર · ચાલીને લગભગ {min} મિનિટ (simulated) | pending | pending |
| `map.sampleData` | Sample data. {note} | नमूना डेटा। {note} | નમૂના ડેટા. {note} | pending | pending |
| `map.rankFor` | Ranking for: {type} | रैंकिंग: {type} | રેન્કિંગ: {type} | pending | pending |
| `map.byDistance` | All hospitals by distance | दूरी के अनुसार सभी अस्पताल | અંતર પ્રમાણે બધી હૉસ્પિટલો | pending | pending |
| `map.byDistanceNote` | Distance only, not a recommendation. Choose an emergency type to see the ranking. | सिर्फ़ दूरी, सिफ़ारिश नहीं। रैंकिंग देखने के लिए आपातकाल का प्रकार चुनें। | ફક્ત અંતર, ભલામણ નહીં. રેન્કિંગ જોવા કટોકટીનો પ્રકાર પસંદ કરો. | pending | pending |
| `an.title` | Analytics | विश्लेषण | વિશ્લેષણ | pending | pending |
| `an.badge` | Simulated cases | Simulated केस | Simulated કેસ | pending | pending |
| `an.source` | Worked out from the stored timeline of {n} cases{extra}. All values are simulated. | {n} केस की सहेजी टाइमलाइन से निकाला गया{extra}। सभी मान simulated हैं। | {n} કેસની સાચવેલી ટાઇમલાઇનમાંથી કાઢ્યું{extra}. બધા મૂલ્યો simulated છે. | pending | pending |
| `an.sourceOne` | Worked out from the stored timeline of {n} case{extra}. All values are simulated. | {n} केस की सहेजी टाइमलाइन से निकाला गया{extra}। सभी मान simulated हैं। | {n} કેસની સાચવેલી ટાઇમલાઇનમાંથી કાઢ્યું{extra}. બધા મૂલ્યો simulated છે. | pending | pending |
| `an.samples` | , including {n} sample past cases made up for the demo | , जिनमें {n} नमूना पुराने केस डेमो के लिए बनाए गए हैं | , જેમાં {n} નમૂના જૂના કેસ ડેમો માટે બનાવેલા છે | pending | pending |
| `an.emerg` | Emergencies | आपातकाल | કટોકટીઓ | pending | pending |
| `an.stillOpen` | {n} still open | {n} अभी खुले | {n} હજી ખુલ્લા | pending | pending |
| `an.handed` | Handed over | सौंपे गए | સોંપાયા | pending | pending |
| `an.cancelled` | Cancelled (false alarm) | रद्द (झूठा अलार्म) | રદ (ખોટો એલાર્મ) | pending | pending |
| `an.escalated` | Escalated to next hospital | अगले अस्पताल को भेजे गए | આગલી હૉસ્પિટલને મોકલ્યા | pending | pending |
| `an.timesOne` | 1 time in total | कुल 1 बार | કુલ 1 વાર | pending | pending |
| `an.timesMany` | {n} times in total | कुल {n} बार | કુલ {n} વાર | pending | pending |
| `an.byType` | Emergencies by type | प्रकार के अनुसार आपातकाल | પ્રકાર પ્રમાણે કટોકટીઓ | pending | pending |
| `an.bySeverity` | Emergencies by severity | गंभीरता के अनुसार आपातकाल | ગંભીરતા પ્રમાણે કટોકટીઓ | pending | pending |
| `an.byState` | Emergencies by state | स्थिति के अनुसार आपातकाल | સ્થિતિ પ્રમાણે કટોકટીઓ | pending | pending |
| `an.axisNum` | Number of emergencies | आपातकालों की संख्या | કટોકટીઓની સંખ્યા | pending | pending |
| `an.ambUse` | Ambulance use | एम्बुलेंस का उपयोग | એમ્બ્યુલન્સનો ઉપયોગ | pending | pending |
| `an.axisTrips` | Trips per unit | प्रति यूनिट यात्राएँ | યુનિટ દીઠ ટ્રિપ | pending | pending |
| `an.noAmb` | Not enough data yet. No ambulance has been sent. | अभी पर्याप्त डेटा नहीं है। कोई एम्बुलेंस नहीं भेजी गई। | હજી પૂરતો ડેટા નથી. કોઈ એમ્બ્યુલન્સ મોકલાઈ નથી. | pending | pending |
| `an.stepsTitle` | Average time for each step | हर चरण का औसत समय | દરેક પગલાનો સરેરાશ સમય | pending | pending |
| `an.stepsAxis` | Average time (shorter is faster) | औसत समय (कम यानी तेज़) | સરેરાશ સમય (ઓછો એટલે ઝડપી) | pending | pending |
| `an.noSteps` | Not enough data yet. No emergency has reached these steps. | अभी पर्याप्त डेटा नहीं है। कोई आपातकाल इन चरणों तक नहीं पहुँचा। | હજી પૂરતો ડેટા નથી. કોઈ કટોકટી આ પગલાં સુધી પહોંચી નથી. | pending | pending |
| `an.noData` | No data | डेटा नहीं | ડેટા નથી | pending | pending |
| `an.bracket` | The number in brackets is how many cases the average is based on. | कोष्ठक की संख्या बताती है कि औसत कितने केस पर आधारित है। | કૌંસની સંખ્યા બતાવે છે કે સરેરાશ કેટલા કેસ પર આધારિત છે. | pending | pending |
| `an.avgTotal` | Average total time from alert to the end: {time} ({n} cases). | अलर्ट से अंत तक का औसत कुल समय: {time} ({n} केस)। | એલર્ટથી અંત સુધીનો સરેરાશ કુલ સમય: {time} ({n} કેસ). | pending | pending |
| `an.step.alert_to_ack` | Alert to acknowledged | अलर्ट से स्वीकार तक | એલર્ટથી સ્વીકાર સુધી | pending | pending |
| `an.step.ack_to_dispatch` | Acknowledged to dispatched | स्वीकार से रवानगी तक | સ્વીકારથી રવાના સુધી | pending | pending |
| `an.step.dispatch_to_arrival` | Dispatched to arrived | रवानगी से पहुँचने तक | રવાનાથી પહોંચ સુધી | pending | pending |
| `an.step.arrival_to_handover` | Arrived to handed over | पहुँचने से सौंपने तक | પહોંચથી સોંપણી સુધી | pending | pending |
| `act.count` | {n} of {total} entries | {total} में से {n} प्रविष्टियाँ | {total} માંથી {n} નોંધ | pending | pending |
| `act.kind` | Kind | प्रकार | પ્રકાર | pending | pending |
| `act.who` | Who | कौन | કોણ | pending | pending |
| `act.search` | Search (case ID, person, words) | खोजें (केस ID, व्यक्ति, शब्द) | શોધો (કેસ ID, વ્યક્તિ, શબ્દ) | pending | pending |
| `act.empty` | No activity matches these filters. | इन फ़िल्टर से कोई गतिविधि नहीं मिली। | આ ફિલ્ટરથી કોઈ પ્રવૃત્તિ મળી નથી. | pending | pending |
| `act.listLabel` | Activity, newest first | गतिविधि, नवीनतम पहले | પ્રવૃત્તિ, નવીનતમ પહેલા | pending | pending |
| `act.system` | System | सिस्टम | સિસ્ટમ | pending | pending |
| `act.localOnly` | saved on this screen only | सिर्फ़ इस स्क्रीन पर सहेजा गया | ફક્ત આ સ્ક્રીન પર સાચવ્યું | pending | pending |
| `act.k.all` | All kinds | सभी प्रकार | બધા પ્રકાર | pending | pending |
| `act.k.state` | Status changes | स्थिति में बदलाव | સ્થિતિમાં ફેરફાર | pending | pending |
| `act.k.note` | Notes | नोट | નોંધ | pending | pending |
| `act.k.checklist` | Checklist ticks | चेकलिस्ट टिक | ચેકલિસ્ટ ટિક | pending | pending |
| `act.w.all` | Everyone | सभी | બધા | pending | pending |
| `act.w.staff` | Hospital staff | अस्पताल स्टाफ़ | હૉસ્પિટલ સ્ટાફ | pending | pending |
| `act.w.patient` | Patient app | मरीज़ ऐप | દર્દી ઍપ | pending | pending |
| `act.w.ambulance` | Ambulance | एम्बुलेंस | એમ્બ્યુલન્સ | pending | pending |
| `act.w.system` | System | सिस्टम | સિસ્ટમ | pending | pending |
| `hist.title` | Case history | केस इतिहास | કેસ ઇતિહાસ | pending | pending |
| `hist.badge` | Simulated cases · sample patients | Simulated केस · नमूना मरीज़ | Simulated કેસ · નમૂના દર્દી | pending | pending |
| `hist.count` | {n} of {total} cases | {total} में से {n} केस | {total} માંથી {n} કેસ | pending | pending |
| `hist.search` | Search (case ID, patient ID, hospital, symptom) | खोजें (केस ID, मरीज़ ID, अस्पताल, लक्षण) | શોધો (કેસ ID, દર્દી ID, હૉસ્પિટલ, લક્ષણ) | pending | pending |
| `hist.ph` | For example E-0901 or chest pain | जैसे E-0901 या chest pain | જેમ કે E-0901 અથવા chest pain | pending | pending |
| `hist.type` | Type | प्रकार | પ્રકાર | pending | pending |
| `hist.allTypes` | All types | सभी प्रकार | બધા પ્રકાર | pending | pending |
| `hist.severity` | Severity | गंभीरता | ગંભીરતા | pending | pending |
| `hist.allSev` | All severities | सभी गंभीरता | બધી ગંભીરતા | pending | pending |
| `hist.state` | State | स्थिति | સ્થિતિ | pending | pending |
| `hist.s.finished` | Finished or cancelled | पूरे या रद्द | પૂરા અથવા રદ | pending | pending |
| `hist.s.done` | Handed over only | सिर्फ़ सौंपे गए | ફક્ત સોંપાયેલા | pending | pending |
| `hist.s.cancelled` | Cancelled only | सिर्फ़ रद्द | ફક્ત રદ | pending | pending |
| `hist.s.open` | Still open | अभी खुले | હજી ખુલ્લા | pending | pending |
| `hist.s.all` | All | सभी | બધા | pending | pending |
| `hist.hospital` | Hospital | अस्पताल | હૉસ્પિટલ | pending | pending |
| `hist.from` | From date | शुरू की तारीख | શરૂઆતની તારીખ | pending | pending |
| `hist.to` | To date | अंतिम तारीख | છેલ્લી તારીખ | pending | pending |
| `hist.clear` | Clear filters | फ़िल्टर हटाएँ | ફિલ્ટર હટાવો | pending | pending |
| `hist.c.case` | Case | केस | કેસ | pending | pending |
| `hist.c.time` | Time | समय | સમય | pending | pending |
| `hist.c.result` | Result | नतीजा | પરિણામ | pending | pending |
| `hist.c.total` | Total time | कुल समय | કુલ સમય | pending | pending |
| `hist.open` | Open report | रिपोर्ट खोलें | રિપોર્ટ ખોલો | pending | pending |
| `hist.patientSample` | {id} (sample) | {id} (नमूना) | {id} (નમૂના) | pending | pending |
| `hist.sampleCase` |  · sample case |  · नमूना केस |  · નમૂના કેસ | pending | pending |
| `hist.notEnough` | Not enough data yet. No emergency has been finished. | अभी पर्याप्त डेटा नहीं है। कोई आपातकाल पूरा नहीं हुआ। | હજી પૂરતો ડેટા નથી. કોઈ કટોકટી પૂરી થઈ નથી. | pending | pending |
| `hist.noMatch` | No case matches these filters. | इन फ़िल्टर से कोई केस नहीं मिला। | આ ફિલ્ટરથી કોઈ કેસ મળ્યો નથી. | pending | pending |
| `admin.title` | Admin | एडमिन | એડમિન | pending | pending |
| `admin.badge` | Sample hospitals | नमूना अस्पताल | નમૂના હૉસ્પિટલો | pending | pending |
| `admin.hospitals` | Hospitals | अस्पताल | હૉસ્પિટલો | pending | pending |
| `admin.hospNote` | Only verified hospitals are ranked. A new hospital starts as unverified. | सिर्फ़ सत्यापित अस्पताल रैंक होते हैं। नया अस्पताल असत्यापित से शुरू होता है। | ફક્ત ચકાસાયેલી હૉસ્પિટલો રેન્ક થાય છે. નવી હૉસ્પિટલ અચકાસાયેલી તરીકે શરૂ થાય છે. | pending | pending |
| `admin.verified` | Verified | सत्यापित | ચકાસાયેલ | pending | pending |
| `admin.unverified` | Unverified, not ranked | असत्यापित, रैंक नहीं | અચકાસાયેલ, રેન્ક નથી | pending | pending |
| `admin.removeVer` | Remove verification | सत्यापन हटाएँ | ચકાસણી હટાવો | pending | pending |
| `admin.markVer` | Mark verified | सत्यापित करें | ચકાસાયેલ કરો | pending | pending |
| `admin.edit` | Edit | संपादित करें | ફેરફાર કરો | pending | pending |
| `admin.verFail` | Could not change verification: {msg} | सत्यापन बदला नहीं जा सका: {msg} | ચકાસણી બદલી શકાઈ નથી: {msg} | pending | pending |
| `admin.f.editTitle` | Edit {name} | {name} संपादित करें | {name}માં ફેરફાર કરો | pending | pending |
| `admin.f.addTitle` | Add a hospital | अस्पताल जोड़ें | હૉસ્પિટલ ઉમેરો | pending | pending |
| `admin.f.name` | Hospital name | अस्पताल का नाम | હૉસ્પિટલનું નામ | pending | pending |
| `admin.f.address` | Address | पता | સરનામું | pending | pending |
| `admin.f.phone` | Phone | फ़ोन | ફોન | pending | pending |
| `admin.f.lat` | Latitude | अक्षांश | અક્ષાંશ | pending | pending |
| `admin.f.lng` | Longitude | देशांतर | રેખાંશ | pending | pending |
| `admin.f.caps` | Capabilities | सुविधाएँ | સુવિધાઓ | pending | pending |
| `admin.f.avail` | Availability now | अभी की उपलब्धता | હાલની ઉપલબ્ધતા | pending | pending |
| `admin.f.add` | Add hospital | अस्पताल जोड़ें | હૉસ્પિટલ ઉમેરો | pending | pending |
| `admin.f.saveChanges` | Save changes | बदलाव सहेजें | ફેરફાર સાચવો | pending | pending |
| `admin.f.fixOne` | Please fix the 1 problem above. | कृपया ऊपर की 1 समस्या ठीक करें। | કૃપા કરીને ઉપરની 1 સમસ્યા સુધારો. | pending | pending |
| `admin.f.fixMany` | Please fix the {n} problems above. | कृपया ऊपर की {n} समस्याएँ ठीक करें। | કૃપા કરીને ઉપરની {n} સમસ્યાઓ સુધારો. | pending | pending |
| `admin.f.saved` | Saved. | सहेजा गया। | સાચવ્યું. | pending | pending |
| `admin.f.added` | Hospital added. It is unverified, so it is not ranked until you verify it. | अस्पताल जोड़ा गया। यह असत्यापित है, इसलिए सत्यापन तक रैंक नहीं होगा। | હૉસ્પિટલ ઉમેરાઈ. તે અચકાસાયેલી છે, તેથી ચકાસણી સુધી રેન્ક થશે નહીં. | pending | pending |
| `admin.cap.cath_lab` | Cath lab | कैथ लैब | કેથ લેબ | pending | pending |
| `admin.cap.stroke_unit` | Stroke unit | स्ट्रोक यूनिट | સ્ટ્રોક યુનિટ | pending | pending |
| `admin.cap.icu` | ICU | ICU | ICU | pending | pending |
| `admin.cap.emergency` | Emergency department | आपातकालीन विभाग | ઇમર્જન્સી વિભાગ | pending | pending |
| `admin.int.title` | Backend connection | बैकएंड कनेक्शन | બેકએન્ડ કનેક્શન | pending | pending |
| `admin.int.mode` | Mode: | मोड: | મોડ: | pending | pending |
| `admin.int.mock` | Mock (no backend, simulated data) | मॉक (बैकएंड नहीं, simulated डेटा) | મૉક (બેકએન્ડ નહીં, simulated ડેટા) | pending | pending |
| `admin.int.real` | Real backend at {url} | असली बैकएंड: {url} | વાસ્તવિક બેકએન્ડ: {url} | pending | pending |
| `admin.int.endpoint` | Endpoint or event | एंडपॉइंट या इवेंट | એન્ડપૉઇન્ટ અથવા ઇવેન્ટ | pending | pending |
| `admin.int.usedFor` | Used for | किसलिए | શેના માટે | pending | pending |
| `admin.int.status` | Status | स्थिति | સ્થિતિ | pending | pending |
| `admin.int.fallback` | If the backend says no | अगर बैकएंड मना करे | જો બેકએન્ડ ના પાડે | pending | pending |
| `admin.int.agreed` | Agreed | तय | નક્કી | pending | pending |
| `admin.int.proposed` | Proposed, confirm with Daksh | प्रस्तावित, दक्ष से पुष्टि करें | પ્રસ્તાવિત, દક્ષ સાથે પુષ્ટિ કરો | pending | pending |
| `hf.nameShort` | Enter the hospital name (at least 3 letters). | अस्पताल का नाम लिखें (कम से कम 3 अक्षर)। | હૉસ્પિટલનું નામ લખો (ઓછામાં ઓછા 3 અક્ષર). | pending | pending |
| `hf.nameLong` | Name is too long (80 letters at most). | नाम बहुत लंबा है (ज़्यादा से ज़्यादा 80 अक्षर)। | નામ બહુ લાંબું છે (વધુમાં વધુ 80 અક્ષર). | pending | pending |
| `hf.address` | Enter the address. | पता लिखें। | સરનામું લખો. | pending | pending |
| `hf.phone` | Enter a phone number: digits, spaces or dashes, 7 to 20 characters. | फ़ोन नंबर लिखें: अंक, स्पेस या डैश, 7 से 20 अक्षर। | ફોન નંબર લખો: અંક, સ્પેસ કે ડેશ, 7 થી 20 અક્ષર. | pending | pending |
| `hf.lat` | Latitude must be a number from -90 to 90. | अक्षांश -90 से 90 के बीच की संख्या होना चाहिए। | અક્ષાંશ -90 થી 90 વચ્ચેની સંખ્યા હોવી જોઈએ. | pending | pending |
| `hf.lng` | Longitude must be a number from -180 to 180. | देशांतर -180 से 180 के बीच की संख्या होना चाहिए। | રેખાંશ -180 થી 180 વચ્ચેની સંખ્યા હોવી જોઈએ. | pending | pending |
| `hf.caps` | Tick at least one capability. | कम से कम एक सुविधा चुनें। | ઓછામાં ઓછી એક સુવિધા પસંદ કરો. | pending | pending |
| `hf.beds` | Beds free: a whole number, 0 or more. | खाली बेड: 0 या उससे ज़्यादा की पूरी संख्या। | ખાલી બેડ: 0 કે તેથી વધુ પૂર્ણ સંખ્યા. | pending | pending |
| `hf.icu` | ICU beds free: a whole number, 0 or more. | खाली ICU बेड: 0 या उससे ज़्यादा की पूरी संख्या। | ખાલી ICU બેડ: 0 કે તેથી વધુ પૂર્ણ સંખ્યા. | pending | pending |
| `hf.cathReady` | The cath lab cannot be ready if the hospital has no cath lab. | अगर अस्पताल में कैथ लैब नहीं है तो वह तैयार नहीं हो सकती। | જો હૉસ્પિટલમાં કેથ લેબ ન હોય તો તે તૈયાર ન હોઈ શકે. | pending | pending |
| `hf.strokeReady` | The stroke unit cannot be ready if the hospital has no stroke unit. | अगर अस्पताल में स्ट्रोक यूनिट नहीं है तो वह तैयार नहीं हो सकती। | જો હૉસ્પિટલમાં સ્ટ્રોક યુનિટ ન હોય તો તે તૈયાર ન હોઈ શકે. | pending | pending |
| `hf.icuNoIcu` | ICU beds are free, but the hospital has no ICU ticked. | ICU बेड खाली हैं, पर अस्पताल में ICU चुना नहीं गया है। | ICU બેડ ખાલી છે, પણ હૉસ્પિટલમાં ICU પસંદ કર્યું નથી. | pending | pending |
| `takeover.long` | The reason is too long ({max} letters at most). | कारण बहुत लंबा है (ज़्यादा से ज़्यादा {max} अक्षर)। | કારણ બહુ લાંબું છે (વધુમાં વધુ {max} અક્ષર). | pending | pending |
| `hist.allHosp` | All hospitals | सभी अस्पताल | બધી હોસ્પિટલો | pending | pending |
| `admin.f.notSaved` | Not saved: {msg} | सहेजा नहीं गया: {msg} | સાચવ્યું નથી: {msg} | pending | pending |
| `admin.f.cancel` | Cancel | रद्द करें | રદ કરો | pending | pending |
| `admin.f.saving` | Saving… | सहेज रहे हैं… | સાચવી રહ્યા છીએ… | pending | pending |
| `hospitals.fallback` | The hospital list could not be loaded from the server. Showing the saved sample list, so beds and units may be out of date. | अस्पतालों की सूची सर्वर से लोड नहीं हो सकी। सहेजी हुई नमूना सूची दिखाई जा रही है, इसलिए बिस्तर और यूनिट की जानकारी पुरानी हो सकती है। | હોસ્પિટલની યાદી સર્વર પરથી લોડ થઈ શકી નથી. સાચવેલી નમૂના યાદી બતાવી રહ્યા છીએ, તેથી બેડ અને યુનિટની માહિતી જૂની હોઈ શકે છે. | pending | pending |
| `a11y.skipMain` | Skip to main content | मुख्य सामग्री पर जाएँ | મુખ્ય સામગ્રી પર જાઓ | pending | pending |
| `a11y.skipQueue` | Skip to alert queue | अलर्ट कतार पर जाएँ | એલર્ટ કતાર પર જાઓ | pending | pending |
| `a11y.skipLogin` | Skip to the login form | लॉगिन फ़ॉर्म पर जाएँ | લૉગિન ફોર્મ પર જાઓ | pending | pending |
| `access.title` | Access denied | पहुँच नहीं मिली | ઍક્સેસ નકારી | pending | pending |
| `access.body` | Your role ({role}) cannot open this page. | आपकी भूमिका ({role}) यह पेज नहीं खोल सकती। | તમારી ભૂમિકા ({role}) આ પેજ ખોલી શકતી નથી. | pending | pending |
| `access.back` | Back to the alert queue | अलर्ट कतार पर वापस जाएँ | એલર્ટ કતાર પર પાછા જાઓ | pending | pending |
| `access.logout` | Log out | लॉग आउट | લૉગ આઉટ | pending | pending |
| `hist.savedNote` | This browser has saved {n} finished cases (the newest {max} are kept). | इस ब्राउज़र में {n} पूर्ण केस सहेजे गए हैं (सबसे नए {max} रखे जाते हैं)। | આ બ્રાઉઝરમાં {n} પૂર્ણ કેસ સાચવ્યા છે (સૌથી નવા {max} રાખવામાં આવે છે). | pending | pending |
| `hist.clearSaved` | Clear history | इतिहास साफ़ करें | ઇતિહાસ સાફ કરો | pending | pending |
| `hist.clearAsk` | Delete the {n} cases saved in this browser? The sample past cases stay. | इस ब्राउज़र में सहेजे गए {n} केस हटाएँ? नमूना पुराने केस बने रहेंगे। | આ બ્રાઉઝરમાં સાચવેલા {n} કેસ કાઢી નાખો? નમૂના જૂના કેસ રહેશે. | pending | pending |
| `hist.clearYes` | Yes, clear | हाँ, साफ़ करें | હા, સાફ કરો | pending | pending |
| `hist.clearNo` | No, keep | नहीं, रहने दें | ના, રહેવા દો | pending | pending |
| `present.off` | Presentation mode | प्रस्तुति मोड | પ્રસ્તુતિ મોડ | pending | pending |
| `present.on` | Presentation mode: on | प्रस्तुति मोड: चालू | પ્રસ્તુતિ મોડ: ચાલુ | pending | pending |
| `present.hint` | Bigger text, no demo helper buttons, language fixed | बड़ा टेक्स्ट, डेमो सहायक बटन छिपे, भाषा स्थिर | મોટા અક્ષરો, ડેમો સહાયક બટનો છુપાવેલા, ભાષા સ્થિર | pending | pending |
| `present.langLocked` | The language is fixed in presentation mode. Turn the mode off to change it. | प्रस्तुति मोड में भाषा स्थिर है। बदलने के लिए मोड बंद करें। | પ્રસ્તુતિ મોડમાં ભાષા સ્થિર છે. બદલવા માટે મોડ બંધ કરો. | pending | pending |
| `backend.down` | Backend unreachable, using mock data. Beds and units shown may be old samples. | बैकएंड नहीं मिल रहा, मॉक डेटा इस्तेमाल हो रहा है। दिखाए गए बिस्तर और यूनिट पुराने नमूने हो सकते हैं। | બેકએન્ડ મળતું નથી, મૉક ડેટા વપરાઈ રહ્યો છે. બતાવેલા બેડ અને યુનિટ જૂના નમૂના હોઈ શકે છે. | pending | pending |
| `hist.csv` | Download CSV | CSV डाउनलोड करें | CSV ડાઉનલોડ કરો | pending | pending |
| `hist.csvNote` | Exports the {n} cases shown above. | ऊपर दिखाए गए {n} केस निर्यात होते हैं। | ઉપર બતાવેલા {n} કેસ નિકાસ થાય છે. | pending | pending |
| `nav.handover` | Handover | हैंडओवर | હેન્ડઓવર | pending | pending |
| `handover.title` | Shift handover | शिफ्ट हैंडओवर | શિફ્ટ હેન્ડઓવર | pending | pending |
| `handover.badge` | Simulated cases · sample patients | Simulated मामले · नमूना मरीज़ | Simulated કેસ · નમૂના દર્દીઓ | pending | pending |
| `handover.print` | Print | प्रिंट करें | પ્રિન્ટ કરો | pending | pending |
| `handover.intro` | All open cases and their handover notes on one sheet. Printed {time}. Showing: {scope}. | सभी खुले केस और उनके हैंडओवर नोट एक शीट पर। प्रिंट समय {time}। दिखाया गया: {scope}। | બધા ખુલ્લા કેસ અને તેમની હેન્ડઓવર નોંધ એક શીટ પર. પ્રિન્ટ સમય {time}. બતાવેલ: {scope}. | pending | pending |
| `handover.scopeMine` | my hospital | मेरा अस्पताल | મારી હોસ્પિટલ | pending | pending |
| `handover.scopeAll` | all hospitals | सभी अस्पताल | બધી હોસ્પિટલો | pending | pending |
| `handover.summary` | {cases} open cases, {withNotes} with a handover note, {notes} notes in total. | {cases} खुले केस, {withNotes} में हैंडओवर नोट है, कुल {notes} नोट। | {cases} ખુલ્લા કેસ, {withNotes} માં હેન્ડઓવર નોંધ છે, કુલ {notes} નોંધ. | pending | pending |
| `handover.empty` | No open cases. Nothing to hand over. | कोई खुला केस नहीं। हैंडओवर के लिए कुछ नहीं। | કોઈ ખુલ્લો કેસ નથી. હેન્ડઓવર માટે કંઈ નથી. | pending | pending |
| `handover.noNote` | No handover note yet. | अभी तक कोई हैंडओवर नोट नहीं। | હજુ સુધી કોઈ હેન્ડઓવર નોંધ નથી. | pending | pending |
| `handover.patient` | Patient {id} | मरीज़ {id} | દર્દી {id} | pending | pending |
| `handover.notShared` | not shared | साझा नहीं | શેર કર્યું નથી | pending | pending |
| `handover.at` | Now at: {hospital} | अभी यहाँ: {hospital} | હાલ અહીં: {hospital} | pending | pending |
| `handover.by` | by {name} | {name} द्वारा | {name} દ્વારા | pending | pending |
| `handover.localOnly` | saved on this screen only | केवल इस स्क्रीन पर सहेजा गया | ફક્ત આ સ્ક્રીન પર સાચવ્યું | pending | pending |
| `handover.sign` | Handed over by: ______________ Received by: ______________ | हैंडओवर देने वाला: ______________ प्राप्तकर्ता: ______________ | હેન્ડઓવર આપનાર: ______________ મેળવનાર: ______________ | pending | pending |
| `type.HEART` | Heart attack | दिल का दौरा | હૃદયરોગનો હુમલો | pending | pending |
| `type.STROKE` | Stroke | स्ट्रोक | સ્ટ્રોક | pending | pending |
| `type.DIABETIC` | Diabetic emergency | मधुमेह आपातकाल | ડાયાબિટીસ કટોકટી | pending | pending |
| `type.ASTHMA` | Severe asthma | गंभीर दमा | ગંભીર અસ્થમા | pending | pending |
| `type.UNKNOWN` | Safety check-in (no symptoms) | सुरक्षा जाँच (कोई लक्षण नहीं) | સલામતી તપાસ (કોઈ લક્ષણ નથી) | pending | pending |
| `dur.sec` | {s} s | {s} सेकंड | {s} સેકન્ડ | pending | pending |
| `dur.minSec` | {m} min {s} s | {m} मिनट {s} सेकंड | {m} મિનિટ {s} સેકન્ડ | pending | pending |
| `dur.hourMin` | {h} h {m} min | {h} घंटा {m} मिनट | {h} કલાક {m} મિનિટ | pending | pending |
| `ann.newEmergency` | New emergency alert: {type}, {who}, simulated | नया आपातकालीन अलर्ट: {type}, {who}, simulated | નવો કટોકટી એલર્ટ: {type}, {who}, simulated | pending | pending |
| `ann.newAlert` | New alert: {type}, {who}, simulated | नया अलर्ट: {type}, {who}, simulated | નવો એલર્ટ: {type}, {who}, simulated | pending | pending |
| `ann.early` | Early notice: {type}, {who}, simulated | प्रारंभिक सूचना: {type}, {who}, simulated | પ્રારંભિક સૂચના: {type}, {who}, simulated | pending | pending |
| `ann.patient` | patient {id} | मरीज़ {id} | દર્દી {id} | pending | pending |
| `ann.patientNone` | patient not shared | मरीज़ की जानकारी साझा नहीं | દર્દીની માહિતી શેર કરી નથી | pending | pending |
| `ann.open` | {type}: {word} | {type}: {word} | {type}: {word} | pending | pending |
| `ann.other` | {type}, {who}: {word} | {type}, {who}: {word} | {type}, {who}: {word} | pending | pending |
| `ann.st.HOSPITAL_ACKNOWLEDGED` | Acknowledged | स्वीकार किया गया | સ્વીકાર્યું | pending | pending |
| `ann.st.AMBULANCE_DISPATCHED` | Ambulance dispatched (simulated) | एम्बुलेंस भेजी गई (simulated) | એમ્બ્યુલન્સ મોકલી (simulated) | pending | pending |
| `ann.st.EN_ROUTE` | Ambulance en route (simulated) | एम्बुलेंस रास्ते में है (simulated) | એમ્બ્યુલન્સ રસ્તામાં છે (simulated) | pending | pending |
| `ann.st.ARRIVED` | Arrived at hospital | अस्पताल पहुँच गई | હોસ્પિટલ પહોંચી | pending | pending |
| `ann.st.HANDOVER_DONE` | Handed over | सौंप दिया गया | સોંપી દીધું | pending | pending |
| `ann.st.CANCELLED` | Cancelled by the patient | मरीज़ ने रद्द किया | દર્દીએ રદ કર્યું | pending | pending |
| `ann.st.ESCALATED` | Escalated to the next hospital | अगले अस्पताल को भेजा गया | આગલી હોસ્પિટલને મોકલ્યું | pending | pending |
| `rc.title` | Pre-arrival readiness | आगमन-पूर्व तैयारी | આગમન પહેલાંની તૈયારી | pending | pending |
| `rc.eta` | Ambulance ETA | एम्बुलेंस का अनुमानित समय | એમ્બ્યુલન્સનો અંદાજિત સમય | pending | pending |
| `rc.checklist` | Pre-arrival checklist | आगमन-पूर्व चेकलिस्ट | આગમન પહેલાંની ચેકલિસ્ટ | pending | pending |
| `rc.fromAlert` | {label} (from the alert) | {label} (अलर्ट से) | {label} (એલર્ટમાંથી) | pending | pending |
| `rc.f.patient` | Patient ID | मरीज़ आईडी | દર્દી ID | pending | pending |
| `rc.f.reported` | Symptoms | लक्षण | લક્ષણો | pending | pending |
| `rc.f.vitals` | Vitals | महत्वपूर्ण संकेत | મહત્વના સંકેતો | pending | pending |
| `rc.f.location` | Location | स्थान | સ્થાન | pending | pending |
| `rc.opening` | Opening… | खुल रहा है… | ખુલી રહ્યું છે… | pending | pending |
| `rc.openPassport` | Open passport | पासपोर्ट खोलें | પાસપોર્ટ ખોલો | pending | pending |
| `rc.passportHint` | Opens the patient’s health passport once. The backend records that you opened it. | मरीज़ का हेल्थ पासपोर्ट एक बार खोलता है। बैकएंड दर्ज करता है कि आपने इसे खोला। | દર્દીનો હેલ્થ પાસપોર્ટ એક વાર ખોલે છે. બેકએન્ડ નોંધે છે કે તમે તેને ખોલ્યો. | pending | pending |
| `rc.noPatientId` | The patient ID is not shared, so the passport cannot be opened. | मरीज़ की आईडी साझा नहीं है, इसलिए पासपोर्ट नहीं खुल सकता। | દર્દીનું ID શેર કર્યું નથી, તેથી પાસપોર્ટ ખોલી શકાતો નથી. | pending | pending |
| `rc.passport` | Health passport | हेल्थ पासपोर्ट | હેલ્થ પાસપોર્ટ | pending | pending |
| `rc.passportSim` | (simulated sample) | (simulated नमूना) | (simulated નમૂનો) | pending | pending |
| `rc.hide` | Hide | छिपाएँ | છુપાવો | pending | pending |
| `rc.passportNote` | Only what the patient agreed to share is shown. Everything else reads Not shared. | केवल वही दिखता है जो मरीज़ ने साझा करने की अनुमति दी। बाकी सब में “Not shared” लिखा होता है। | ફક્ત તે જ બતાવાય છે જે દર્દીએ શેર કરવા માટે સંમતિ આપી. બાકીનામાં “Not shared” લખેલું હોય છે. | pending | pending |
| `nb.sample` | Sample data. Locations are made up for the demo. | नमूना डेटा। स्थान डेमो के लिए बनाए गए हैं। | નમૂના ડેટા. સ્થાનો ડેમો માટે બનાવેલા છે. | pending | pending |
| `nb.nearestAed` | Nearest AED | सबसे नज़दीकी AED | સૌથી નજીકનું AED | pending | pending |
| `nb.noLocation` | No patient location, so no AED can be found. | मरीज़ का स्थान नहीं है, इसलिए AED नहीं मिल सकता। | દર્દીનું સ્થાન નથી, તેથી AED શોધી શકાતું નથી. | pending | pending |
| `nb.nearest` | Nearest | सबसे नज़दीक | સૌથી નજીક | pending | pending |
| `nb.walk` | about {min} min on foot (simulated) | पैदल लगभग {min} मिनट (simulated) | ચાલીને લગભગ {min} મિનિટ (simulated) | pending | pending |
| `nb.responders` | Community responders within {km} km | {km} किमी के भीतर समुदाय के उत्तरदाता | {km} કિમીની અંદર સમુદાયના પ્રતિભાવકર્તા | pending | pending |
| `nb.noResponders` | No sample responder is near this patient. | इस मरीज़ के पास कोई नमूना उत्तरदाता नहीं है। | આ દર્દી પાસે કોઈ નમૂના પ્રતિભાવકર્તા નથી. | pending | pending |
| `nb.sent` | Alert sent (simulated) | अलर्ट भेजा गया (simulated) | એલર્ટ મોકલ્યું (simulated) | pending | pending |
| `nb.notify` | Notify responder (simulated) | उत्तरदाता को सूचित करें (simulated) | પ્રતિભાવકર્તાને જાણ કરો (simulated) | pending | pending |
| `nb.simNote` | A simulated alert is only a note on the timeline. It does not confirm that anyone will respond. | Simulated अलर्ट केवल टाइमलाइन पर एक नोट है। इससे पुष्टि नहीं होती कि कोई जवाब देगा। | Simulated એલર્ટ ફક્ત ટાઇમલાઇન પરની નોંધ છે. તેનાથી ખાતરી થતી નથી કે કોઈ પ્રતિસાદ આપશે. | pending | pending |
| `ctl.afterDispatch` | After Dispatch, the simulated ambulance sets “En route” and “Arrived” by itself. | रवाना करने के बाद simulated एम्बुलेंस खुद “रास्ते में” और “पहुँच गई” स्थिति बदलती है। | રવાના કર્યા પછી simulated એમ્બ્યુલન્સ પોતે “રસ્તામાં” અને “પહોંચી” સ્થિતિ બદલે છે. | pending | pending |
| `ctl.mockCancel` | Mock: patient presses “I’m OK” (cancel) | Mock: मरीज़ “मैं ठीक हूँ” दबाता है (रद्द) | Mock: દર્દી “હું ઠીક છું” દબાવે છે (રદ) | pending | pending |
| `ctl.mockConfirm` | Mock: patient confirms the SOS | Mock: मरीज़ SOS की पुष्टि करता है | Mock: દર્દી SOS ની પુષ્ટિ કરે છે | pending | pending |
| `ctl.mockEscalate` | Mock: escalate now | Mock: अभी आगे भेजें | Mock: હમણાં આગળ મોકલો | pending | pending |
| `hd.hint` | Click a hospital marker to see its details. | विवरण देखने के लिए अस्पताल के मार्कर पर क्लिक करें। | વિગતો જોવા હોસ્પિટલના માર્કર પર ક્લિક કરો. | pending | pending |
| `hd.match` | Has the capabilities needed for: {type} | ज़रूरी सुविधाएँ उपलब्ध हैं: {type} | જરૂરી સુવિધાઓ છે: {type} | pending | pending |
| `hd.miss` | Missing a capability needed for: {type} | ज़रूरी सुविधा की कमी: {type} | જરૂરી સુવિધાની ખામી: {type} | pending | pending |
| `mv.portal` | Ambulance movement: simulated by the portal | एम्बुलेंस की गति: पोर्टल द्वारा simulated | એમ્બ્યુલન્સની ગતિ: પોર્ટલ દ્વારા simulated | pending | pending |
| `mv.backend` | Ambulance movement: simulated by the backend | एम्बुलेंस की गति: बैकएंड द्वारा simulated | એમ્બ્યુલન્સની ગતિ: બેકએન્ડ દ્વારા simulated | pending | pending |
| `mv.auto` | Ambulance movement: the portal moves it unless the backend sends positions | एम्बुलेंस की गति: बैकएंड स्थान न भेजे तो पोर्टल इसे चलाता है | એમ્બ્યુલન્સની ગતિ: બેકએન્ડ સ્થાન ન મોકલે તો પોર્ટલ તેને ચલાવે છે | pending | pending |
| `rk.intro` | Hospitals without the needed capability are ruled out first. The rest are scored out of 100: capability {c}%, travel time {tt}%, availability {a}%. | जिन अस्पतालों में ज़रूरी सुविधा नहीं है उन्हें पहले बाहर किया जाता है। बाकी को 100 में से अंक मिलते हैं: सुविधा {c}%, यात्रा समय {tt}%, उपलब्धता {a}%। | જે હોસ્પિટલમાં જરૂરી સુવિધા નથી તેમને પહેલા બાકાત રાખવામાં આવે છે. બાકીનાને 100 માંથી ગુણ મળે છે: સુવિધા {c}%, મુસાફરી સમય {tt}%, ઉપલબ્ધતા {a}%. | pending | pending |
| `rk.simTravel` | Simulated travel time | Simulated यात्रा समय | Simulated મુસાફરી સમય | pending | pending |
| `rk.none` | No verified hospital has the capability this emergency needs. | किसी सत्यापित अस्पताल में इस आपातकाल के लिए ज़रूरी सुविधा नहीं है। | કોઈ ચકાસેલી હોસ્પિટલમાં આ કટોકટી માટે જરૂરી સુવિધા નથી. | pending | pending |
| `rk.capability` | Capability | सुविधा | સુવિધા | pending | pending |
| `rk.travel_time` | Travel time | यात्रा समय | મુસાફરી સમય | pending | pending |
| `rk.availability` | Availability | उपलब्धता | ઉપલબ્ધતા | pending | pending |
| `rk.s.alerted` | Alerted now | अभी अलर्ट किया | હમણાં એલર્ટ કર્યું | pending | pending |
| `rk.s.next` | Next if no answer | जवाब न मिले तो अगला | જવાબ ન મળે તો આગળનું | pending | pending |
| `rk.s.later` | After that | उसके बाद | ત્યારબાદ | pending | pending |
| `rk.s.no_answer` | Alerted · no answer | अलर्ट किया · जवाब नहीं | એલર્ટ કર્યું · જવાબ નથી | pending | pending |
| `rk.s.responding` | Responding | जवाब दे रहा है | પ્રતિસાદ આપે છે | pending | pending |
| `rk.s.not_needed` | Not needed | ज़रूरत नहीं | જરૂર નથી | pending | pending |
| `rk.why` | Why: | क्यों: | કેમ: | pending | pending |
| `rk.thisHospital` | This hospital | यह अस्पताल | આ હોસ્પિટલ | pending | pending |
| `rk.ruledOut` | Ruled out ({n}) | बाहर किए गए ({n}) | બાકાત ({n}) | pending | pending |
| `tk.waiting` | Waiting for ambulance details… | एम्बुलेंस का विवरण आने की प्रतीक्षा… | એમ્બ્યુલન્સની વિગતોની રાહ… | pending | pending |
| `tk.arrived` | Arrived | पहुँच गई | પહોંચી | pending | pending |
| `tk.eta` | ETA {time} | अनुमानित समय {time} | અંદાજિત સમય {time} | pending | pending |
| `tk.etaWait` | ETA … | अनुमानित समय … | અંદાજિત સમય … | pending | pending |
| `tk.atHospital` | Ambulance is at the hospital | एम्बुलेंस अस्पताल में है | એમ્બ્યુલન્સ હોસ્પિટલમાં છે | pending | pending |
| `tk.assigned` | Ambulance assigned, about to leave | एम्बुलेंस तय हुई, निकलने वाली है | એમ્બ્યુલન્સ નક્કી થઈ, નીકળવાની તૈયારી | pending | pending |
| `tk.toPatient` | Heading to the patient · {km} km left in total | मरीज़ की ओर · कुल {km} किमी बाकी | દર્દી તરફ · કુલ {km} કિમી બાકી | pending | pending |
| `tk.onBoard` | Patient on board · heading to the hospital · {km} km left | मरीज़ सवार है · अस्पताल की ओर · {km} किमी बाकी | દર્દી અંદર છે · હોસ્પિટલ તરફ · {km} કિમી બાકી | pending | pending |
| `tk.simRoute` | Simulated ambulance and route | Simulated एम्बुलेंस और रास्ता | Simulated એમ્બ્યુલન્સ અને રસ્તો | pending | pending |
| `tk.notRoad` | Not a road route · runs {n}× faster than real time | असली सड़क का रास्ता नहीं · असली समय से {n}× तेज़ चलता है | વાસ્તવિક રસ્તો નથી · વાસ્તવિક સમય કરતાં {n}× ઝડપી ચાલે છે | pending | pending |
| `tk.patientTip` | Patient (simulated) | मरीज़ (simulated) | દર્દી (simulated) | pending | pending |
| `tk.unitTip` | {name} (simulated) | {name} (simulated) | {name} (simulated) | pending | pending |
| `tk.driven` | Driven | तय किया | કાપેલો | pending | pending |
| `tk.toGo` | Still to go | अभी बाकी | હજી બાકી | pending | pending |
| `tk.patient` | Patient | मरीज़ | દર્દી | pending | pending |
| `tk.hospital` | Hospital | अस्पताल | હોસ્પિટલ | pending | pending |
| `tk.traffic` | Traffic | ट्रैफ़िक | ટ્રાફિક | pending | pending |
| `tk.trafficAuto` | Auto by time of day ({level}) | दिन के समय के अनुसार अपने आप ({level}) | દિવસના સમય પ્રમાણે આપમેળે ({level}) | pending | pending |
| `tk.trafficOpt` | {label} (×{factor}) | {label} (×{factor}) | {label} (×{factor}) | pending | pending |
| `tk.trafficSim` | Simulated traffic: {level} | Simulated ट्रैफ़िक: {level} | Simulated ટ્રાફિક: {level} | pending | pending |
| `tk.lvl.light` | Light | हल्का | હળવો | pending | pending |
| `tk.lvl.moderate` | Moderate | मध्यम | મધ્યમ | pending | pending |
| `tk.lvl.heavy` | Heavy | भारी | ભારે | pending | pending |
| `tk.corridor` | Request green corridor | ग्रीन कॉरिडोर का अनुरोध करें | ગ્રીન કોરિડોરની વિનંતી કરો | pending | pending |
| `tk.corridorLogged` | Corridor request logged (simulated) | कॉरिडोर अनुरोध दर्ज हुआ (simulated) | કોરિડોર વિનંતી નોંધાઈ (simulated) | pending | pending |
| `tk.simulation` | Simulation | सिमुलेशन | સિમ્યુલેશન | pending | pending |
| `tk.start` | Start simulated trip | Simulated यात्रा शुरू करें | Simulated મુસાફરી શરૂ કરો | pending | pending |
| `tk.pause` | Pause | रोकें | રોકો | pending | pending |
| `tk.resume` | Resume | फिर शुरू करें | ફરી શરૂ કરો | pending | pending |
| `tk.restart` | Restart route | रास्ता फिर से शुरू करें | રસ્તો ફરી શરૂ કરો | pending | pending |
| `tk.logFail` | Could not log the request: {msg} | अनुरोध दर्ज नहीं हो सका: {msg} | વિનંતી નોંધી શકાઈ નહીં: {msg} | pending | pending |
| `map.topRanked` | TOP RANKED | सबसे ऊपर | સૌથી ઉપર | pending | pending |
| `map.erOnly` | ER only | केवल ER | ફક્ત ER | pending | pending |
| `rd.noAmbulance` | No ambulance sent yet | अभी कोई एम्बुलेंस नहीं भेजी गई | હજી કોઈ એમ્બ્યુલન્સ મોકલી નથી | pending | pending |
| `rd.etaUnknown` | ETA not shared yet | अनुमानित समय अभी साझा नहीं | અંદાજિત સમય હજી શેર કર્યો નથી | pending | pending |
| `rd.etaSim` | {time} (simulated) | {time} (simulated) | {time} (simulated) | pending | pending |
| `rd.checklistDone` | {done} of {total} done | {total} में से {done} पूरे | {total} માંથી {done} પૂર્ણ | pending | pending |
| `rd.noChecklist` | No checklist for this type | इस प्रकार के लिए कोई चेकलिस्ट नहीं | આ પ્રકાર માટે કોઈ ચેકલિસ્ટ નથી | pending | pending |
| `rd.noTeam` | No one assigned yet | अभी किसी को नियुक्त नहीं किया गया | હજી કોઈને સોંપ્યું નથી | pending | pending |
| `rd.shared` | Shared | साझा | શેર કર્યું | pending | pending |
| `u.km` | {n} km | {n} किमी | {n} કિમી | pending | pending |
| `u.min` | {n} min | {n} मिनट | {n} મિનિટ | pending | pending |
| `capl.cath_lab` | Cath Lab | कैथ लैब | કેથ લેબ | pending | pending |
| `capl.stroke_unit` | Stroke Unit | स्ट्रोक यूनिट | સ્ટ્રોક યુનિટ | pending | pending |
| `capl.icu` | ICU | ICU | ICU | pending | pending |
| `hd.distance` | Distance (straight line) | दूरी (सीधी रेखा) | અંતર (સીધી રેખા) | pending | pending |
| `hd.travel` | Travel time | यात्रा समय | મુસાફરી સમય | pending | pending |
| `ck.none` | No checklist for this emergency type. | इस आपातकाल के प्रकार के लिए कोई चेकलिस्ट नहीं। | આ કટોકટીના પ્રકાર માટે કોઈ ચેકલિસ્ટ નથી. | pending | pending |
| `ck.saveFail` | Could not save: {msg} | सहेजा नहीं जा सका: {msg} | સાચવી શકાયું નહીં: {msg} | pending | pending |
| `cap.noEmergency` | No emergency department | आपातकालीन विभाग नहीं | ઇમરજન્સી વિભાગ નથી | pending | pending |
| `rk.notVerified` | Not verified | सत्यापित नहीं | ચકાસેલ નથી | pending | pending |
| `rk.pts` | {n} pts | {n} अंक | {n} ગુણ | pending | pending |

## Language check of every page (2026-11-14)
**How it was done.** Every route was opened in English, Hindi and Gujarati in a real browser (the portal in mock mode, signed in as staff, and as admin for Admin and the audit log). A script listed every visible text and every title, aria-label and placeholder that was the same in Gujarati as in English. Each hit was then sorted into "data on purpose" or "missing UI string".

**Pages checked:** Login, Dashboard (with an open alert and its detail panel), Map, Fleet, History, Activity, Handover, Analytics, Report (post-event report), Crew, Admin (as admin), and the admin audit log table. Hindi gave the same list as Gujarati.

**Missing UI strings found and fixed**
- The whole Report page (headings, buttons, outcome, hospital role, step durations, timeline state names, checklist line, handover and notes headings, dates and times).
- The readiness warnings ("Your cath lab is not ready for this alert", and the other 10) and the short warning line on alert cards.
- The nav bar role word (staff, admin).
- Hospital panel: Capabilities, Availability, Beds free, ICU free, Cath lab ready, Stroke unit ready, Yes/No, Close, Simulated ETA.
- Team assignment (Assigned, Assign, Change, the locked message, "(suggested)", sample roster note).
- Checklist: the read-only line, "Ticked by … at …", and the review status line ("Reviewed by …", "Partly reviewed …").
- Activity: the status text of each row, "Ticked/Unticked", note kinds; and the admin audit log table (title, columns, empty text, note).
- History: the total time column.
- Map: zoom button titles (all three maps), patient marker text, "Middle of the hospitals", "Demo patient location", "(sample)" on AED and responder markers, and km on nearby help, ranking and dispatch lists.
- Smaller ones: "No timeline yet.", the "Simulated" badge on the tracking map, "(simulated)" on the readiness card, the sample fleet message, the Admin "To switch, set …" line.

**Still English on purpose, and why**
- Names: hospitals, ambulance units, crew and staff names, volunteers, AED places and their opening hours (data).
- Symptom words and the vitals line (HR, SpO₂, BP, bpm): medical terms and units kept as written.
- Checklist item texts, and the specialty names from the roster (Cardiology, Neurology, …): content that waits for doctor review.
- Notes written by staff, and the actor names in the Activity list (System, Patient app, Ambulance (simulated)): case data.
- The "Why:" ranking sentences and the "1st / 2nd" ordinals.
- The canned crew chat replies on the Crew page (they are messages sent by the mock crew).
- The reason words saved on the timeline when a desk takes over a case, and "Corridor request logged (simulated)": they are written into the case timeline, which is English in every language.
- Files named .txt and .csv that are downloaded from a report: they stay English.
- The Admin integration table (endpoint names, status codes, the notes about the backend): developer documentation.
- Map credits ("Leaflet", "OpenStreetMap contributors").
- Text of a screen reader announcement that was already spoken before the language was changed.

**Could not open:** a hospital panel with a real map click (the test browser has no map tiles, so this was checked by code and tests only), the Admin page in real mode, and the audit log table with real rows (the mock has no audit endpoint, so only its empty/missing state shows).

**A test now guards this.** `src/i18n/hardcoded.test.js` scans every `.jsx` file for English typed straight into it (JSX text, title/aria-label/placeholder/alt, capitalised phrases in quotes). A new unlisted hit fails the test. The few reviewed exceptions are in `src/i18n/hardcodedAllow.json` with a reason each, and a stale entry also fails the test.

Please review these new strings (generated from `src/i18n/*.js`):

| Key | English | Hindi | Gujarati | Hindi review | Gujarati review |
|---|---|---|---|---|---|
| `warn.warning` | Warning:  | चेतावनी:  | ચેતવણી:  | pending | pending |
| `warn.note` | Note:  | नोट:  | નોંધ:  | pending | pending |
| `warn.aria` | Readiness warnings | तैयारी की चेतावनियाँ | તૈયારીની ચેતવણીઓ | pending | pending |
| `warn.c.not_accepting` | Your hospital is marked as not ready for new emergencies. | आपका अस्पताल नई आपात स्थितियों के लिए तैयार नहीं बताया गया है। | તમારી હોસ્પિટલ નવી ઇમરજન્સી માટે તૈયાર નથી એમ દર્શાવેલ છે. | pending | pending |
| `warn.c.no_cath` | Your hospital has no cath lab for this alert. | इस अलर्ट के लिए आपके अस्पताल में कैथ लैब नहीं है। | આ એલર્ટ માટે તમારી હોસ્પિટલમાં કેથ લેબ નથી. | pending | pending |
| `warn.c.cath_not_ready` | Your cath lab is not ready for this alert. | इस अलर्ट के लिए आपकी कैथ लैब तैयार नहीं है। | આ એલર્ટ માટે તમારી કેથ લેબ તૈયાર નથી. | pending | pending |
| `warn.c.cath_unknown` | Cath lab readiness is not shared, so it cannot be checked. | कैथ लैब की तैयारी साझा नहीं की गई है, इसलिए जाँच नहीं हो सकती। | કેથ લેબની તૈયારી શેર કરેલી નથી, તેથી તપાસી શકાતી નથી. | pending | pending |
| `warn.c.no_stroke` | Your hospital has no stroke unit for this alert. | इस अलर्ट के लिए आपके अस्पताल में स्ट्रोक यूनिट नहीं है। | આ એલર્ટ માટે તમારી હોસ્પિટલમાં સ્ટ્રોક યુનિટ નથી. | pending | pending |
| `warn.c.stroke_not_ready` | Your stroke unit is not ready for this alert. | इस अलर्ट के लिए आपकी स्ट्रोक यूनिट तैयार नहीं है। | આ એલર્ટ માટે તમારું સ્ટ્રોક યુનિટ તૈયાર નથી. | pending | pending |
| `warn.c.stroke_unknown` | Stroke unit readiness is not shared, so it cannot be checked. | स्ट्रोक यूनिट की तैयारी साझा नहीं की गई है, इसलिए जाँच नहीं हो सकती। | સ્ટ્રોક યુનિટની તૈયારી શેર કરેલી નથી, તેથી તપાસી શકાતી નથી. | pending | pending |
| `warn.c.no_icu` | Your hospital has no ICU for this alert. | इस अलर्ट के लिए आपके अस्पताल में ICU नहीं है। | આ એલર્ટ માટે તમારી હોસ્પિટલમાં ICU નથી. | pending | pending |
| `warn.c.icu_full` | Your ICU has no free bed for this alert. | इस अलर्ट के लिए आपके ICU में कोई खाली बिस्तर नहीं है। | આ એલર્ટ માટે તમારા ICU માં કોઈ ખાલી બેડ નથી. | pending | pending |
| `warn.c.icu_unknown` | ICU beds are not shared, so they cannot be checked. | ICU के बिस्तरों की जानकारी साझा नहीं की गई है, इसलिए जाँच नहीं हो सकती। | ICU બેડની માહિતી શેર કરેલી નથી, તેથી તપાસી શકાતી નથી. | pending | pending |
| `warn.c.no_emergency` | Your hospital has no emergency department. | आपके अस्पताल में आपातकालीन विभाग नहीं है। | તમારી હોસ્પિટલમાં ઇમરજન્સી વિભાગ નથી. | pending | pending |
| `warn.card.not_accepting` | Warning: your hospital is marked as not ready for new emergencies. | चेतावनी: आपका अस्पताल नई आपात स्थितियों के लिए तैयार नहीं बताया गया है। | ચેતવણી: તમારી હોસ્પિટલ નવી ઇમરજન્સી માટે તૈયાર નથી એમ દર્શાવેલ છે. | pending | pending |
| `warn.card.no_cath` | Warning: your hospital has no cath lab. | चेतावनी: आपके अस्पताल में कैथ लैब नहीं है। | ચેતવણી: તમારી હોસ્પિટલમાં કેથ લેબ નથી. | pending | pending |
| `warn.card.cath_not_ready` | Warning: your cath lab is not ready. | चेतावनी: आपकी कैथ लैब तैयार नहीं है। | ચેતવણી: તમારી કેથ લેબ તૈયાર નથી. | pending | pending |
| `warn.card.no_stroke` | Warning: your hospital has no stroke unit. | चेतावनी: आपके अस्पताल में स्ट्रोक यूनिट नहीं है। | ચેતવણી: તમારી હોસ્પિટલમાં સ્ટ્રોક યુનિટ નથી. | pending | pending |
| `warn.card.stroke_not_ready` | Warning: your stroke unit is not ready. | चेतावनी: आपकी स्ट्रोक यूनिट तैयार नहीं है। | ચેતવણી: તમારું સ્ટ્રોક યુનિટ તૈયાર નથી. | pending | pending |
| `warn.card.no_icu` | Warning: your hospital has no ICU. | चेतावनी: आपके अस्पताल में ICU नहीं है। | ચેતવણી: તમારી હોસ્પિટલમાં ICU નથી. | pending | pending |
| `warn.card.icu_full` | Warning: your ICU has no free bed. | चेतावनी: आपके ICU में कोई खाली बिस्तर नहीं है। | ચેતવણી: તમારા ICU માં કોઈ ખાલી બેડ નથી. | pending | pending |
| `warn.card.no_emergency` | Warning: your hospital has no emergency department. | चेतावनी: आपके अस्पताल में आपातकालीन विभाग नहीं है। | ચેતવણી: તમારી હોસ્પિટલમાં ઇમરજન્સી વિભાગ નથી. | pending | pending |
| `common.yes` | Yes | हाँ | હા | pending | pending |
| `common.no` | No | नहीं | ના | pending | pending |
| `common.close` | Close | बंद करें | બંધ કરો | pending | pending |
| `common.refresh` | Refresh | रीफ़्रेश करें | રિફ્રેશ કરો | pending | pending |
| `role.staff` | staff | स्टाफ़ | સ્ટાફ | pending | pending |
| `role.admin` | admin | एडमिन | એડમિન | pending | pending |
| `hd.simEta` | Simulated ETA | Simulated अनुमानित समय | Simulated અંદાજિત સમય | pending | pending |
| `hd.capabilities` | Capabilities | क्षमताएँ | ક્ષમતાઓ | pending | pending |
| `hd.availability` | Availability | उपलब्धता | ઉપલબ્ધતા | pending | pending |
| `hd.bedsFree` | Beds free: | खाली बिस्तर: | ખાલી બેડ: | pending | pending |
| `hd.icuFree` | ICU free: | खाली ICU: | ખાલી ICU: | pending | pending |
| `hd.cathReady` | Cath lab ready: | कैथ लैब तैयार: | કેથ લેબ તૈયાર: | pending | pending |
| `hd.strokeReady` | Stroke unit ready: | स्ट्रोक यूनिट तैयार: | સ્ટ્રોક યુનિટ તૈયાર: | pending | pending |
| `map.noLocation` | The patient did not share a location. | मरीज़ ने अपनी लोकेशन साझा नहीं की। | દર્દીએ પોતાનું લોકેશન શેર કર્યું નથી. | pending | pending |
| `map.patientLoc` | Patient location (simulated) | मरीज़ की लोकेशन (simulated) | દર્દીનું લોકેશન (simulated) | pending | pending |
| `map.middle` | Middle of the hospitals (no patient selected) | अस्पतालों का मध्य (कोई मरीज़ चुना नहीं गया) | હોસ્પિટલોની મધ્યમાં (કોઈ દર્દી પસંદ કર્યો નથી) | pending | pending |
| `map.zoomIn` | Zoom in | ज़ूम इन | ઝૂમ ઇન | pending | pending |
| `map.zoomOut` | Zoom out | ज़ूम आउट | ઝૂમ આઉટ | pending | pending |
| `tk.sim` | Simulated | Simulated · सिमुलेशन | Simulated · સિમ્યુલેશન | pending | pending |
| `rc.sim` | (simulated) | (simulated · सिमुलेशन) | (simulated · સિમ્યુલેશન) | pending | pending |
| `team.assigned` | Assigned: | नियुक्त: | સોંપેલ: | pending | pending |
| `team.nobody` | Nobody assigned yet. Suggested specialty: | अभी कोई नियुक्त नहीं। सुझाई गई विशेषज्ञता: | હજી કોઈને સોંપ્યું નથી. સૂચવેલ વિશેષતા: | pending | pending |
| `team.lockedCancelled` | Cancelled: the assignment can no longer be changed. | रद्द: नियुक्ति अब बदली नहीं जा सकती। | રદ: સોંપણી હવે બદલી શકાતી નથી. | pending | pending |
| `team.lockedDone` | Handed over: the assignment can no longer be changed. | हैंडओवर हो गया: नियुक्ति अब बदली नहीं जा सकती। | હેન્ડઓવર થઈ ગયું: સોંપણી હવે બદલી શકાતી નથી. | pending | pending |
| `team.suggested` |  (suggested) |  (सुझाया गया) |  (સૂચવેલ) | pending | pending |
| `team.assigning` | Assigning… | नियुक्त हो रहा है… | સોંપાઈ રહ્યું છે… | pending | pending |
| `team.change` | Change | बदलें | બદલો | pending | pending |
| `team.assign` | Assign | नियुक्त करें | સોંપો | pending | pending |
| `team.sample` | Sample roster. All names are invented. | नमूना रोस्टर। सभी नाम काल्पनिक हैं। | નમૂનારૂપ રોસ્ટર. બધાં નામ કાલ્પનિક છે. | pending | pending |
| `ck.readOnly` | Cancelled: the checklist is read-only. | रद्द: चेकलिस्ट केवल पढ़ने के लिए है। | રદ: ચેકલિસ્ટ ફક્ત વાંચવા માટે છે. | pending | pending |
| `ck.tickedBy` | Ticked by {who} at {time} | {who} ने {time} पर टिक किया | {who} એ {time} વાગ્યે ટિક કર્યું | pending | pending |
| `ck.staff` | staff | स्टाफ़ | સ્ટાફ | pending | pending |
| `tl.none` | No timeline yet. | अभी कोई टाइमलाइन नहीं। | હજી કોઈ ટાઇમલાઇન નથી. | pending | pending |
| `aud.title` | Server audit log | सर्वर ऑडिट लॉग | સર્વર ઑડિટ લૉગ | pending | pending |
| `aud.admin` | Admin only | सिर्फ़ एडमिन के लिए | ફક્ત એડમિન માટે | pending | pending |
| `aud.empty` | The audit log is empty. | ऑडिट लॉग खाली है। | ઑડિટ લૉગ ખાલી છે. | pending | pending |
| `aud.time` | Time | समय | સમય | pending | pending |
| `aud.user` | User | उपयोगकर्ता | વપરાશકર્તા | pending | pending |
| `aud.action` | Action | कार्रवाई | કાર્યવાહી | pending | pending |
| `aud.patient` | Patient | मरीज़ | દર્દી | pending | pending |
| `aud.outcome` | Outcome | नतीजा | પરિણામ | pending | pending |
| `aud.fields` | Shared fields | साझा किए गए फ़ील्ड | શેર કરેલા ફીલ્ડ | pending | pending |
| `aud.denied` | Denied | अस्वीकृत | નકારેલ | pending | pending |
| `aud.note` | Names of shared fields only; the log never holds tokens or patient values. | सिर्फ़ साझा फ़ील्ड के नाम; लॉग में कभी टोकन या मरीज़ के मान नहीं होते। | ફક્ત શેર કરેલા ફીલ્ડના નામ; લૉગમાં ક્યારેય ટોકન કે દર્દીની કિંમતો હોતી નથી. | pending | pending |
| `fleet.sampleNote` | The backend has no ambulance list yet, so a sample fleet is shown (not real units). | बैकएंड में अभी एम्बुलेंस सूची नहीं है, इसलिए नमूना बेड़ा दिखाया गया है (असली यूनिट नहीं)। | બેકએન્ડમાં હજી એમ્બ્યુલન્સની યાદી નથી, તેથી નમૂનારૂપ ફ્લીટ બતાવ્યો છે (વાસ્તવિક યુનિટ નથી). | pending | pending |
| `admin.int.sw1` | To switch, set | बदलने के लिए सेट करें | બદલવા માટે સેટ કરો | pending | pending |
| `admin.int.sw2` | in | यहाँ | અહીં | pending | pending |
| `admin.int.sw3` | (and the two address settings), then restart | (और दोनों पते की सेटिंग), फिर दोबारा शुरू करें | (અને બંને સરનામાંની સેટિંગ), પછી ફરી શરૂ કરો | pending | pending |
| `rp.notFound` | Case {id} was not found. | केस {id} नहीं मिला। | કેસ {id} મળ્યો નથી. | pending | pending |
| `rp.back` | Back to case history | केस इतिहास पर वापस जाएँ | કેસ ઇતિહાસ પર પાછા જાઓ | pending | pending |
| `rp.dlTxt` | Download (.txt) | डाउनलोड (.txt) | ડાઉનલોડ (.txt) | pending | pending |
| `rp.dlCsv` | Download timeline (.csv) | टाइमलाइन डाउनलोड (.csv) | ટાઇમલાઇન ડાઉનલોડ (.csv) | pending | pending |
| `rp.title` | Post-event report | घटना के बाद की रिपोर्ट | ઘટના પછીનો અહેવાલ | pending | pending |
| `rp.sample` | Sample content, pending medical review. Not a medical record. | नमूना सामग्री, चिकित्सीय समीक्षा बाकी है। यह मेडिकल रिकॉर्ड नहीं है। | નમૂનારૂપ સામગ્રી, તબીબી સમીક્ષા બાકી છે. આ મેડિકલ રેકોર્ડ નથી. | pending | pending |
| `rp.sampleCase` |  This is a sample past case. |  यह एक नमूना पुराना केस है। |  આ એક નમૂનારૂપ જૂનો કેસ છે. | pending | pending |
| `rp.patientId` | Patient ID (sample) | मरीज़ ID (नमूना) | દર્દી ID (નમૂનો) | pending | pending |
| `rp.type` | Type | प्रकार | પ્રકાર | pending | pending |
| `rp.alertTime` | Alert time | अलर्ट का समय | એલર્ટનો સમય | pending | pending |
| `rp.outcome` | Outcome | नतीजा | પરિણામ | pending | pending |
| `rp.o.cancelledEarly` | Cancelled by the patient before the SOS was sent | SOS भेजने से पहले मरीज़ ने रद्द किया | SOS મોકલતા પહેલાં દર્દીએ રદ કર્યું | pending | pending |
| `rp.o.cancelled` | Cancelled by the patient (false alarm) | मरीज़ ने रद्द किया (गलत अलार्म) | દર્દીએ રદ કર્યું (ખોટો એલાર્મ) | pending | pending |
| `rp.o.handed` | Handed over to the hospital team | अस्पताल की टीम को सौंपा गया | હૉસ્પિટલ ટીમને સોંપ્યું | pending | pending |
| `rp.o.open` | Still open (not finished) | अभी खुला है (पूरा नहीं हुआ) | હજી ખુલ્લો છે (પૂર્ણ થયો નથી) | pending | pending |
| `rp.h.chosen` | Chosen hospital | चुना गया अस्पताल | પસંદ કરેલી હૉસ્પિટલ | pending | pending |
| `rp.h.alerted` | Alerted hospital (no one acknowledged) | अलर्ट किया गया अस्पताल (किसी ने स्वीकार नहीं किया) | એલર્ટ કરેલી હૉસ્પિટલ (કોઈએ સ્વીકાર્યું નથી) | pending | pending |
| `rp.ranked` | ranked {pos} of {of} (score {total}).  | {of} में से {pos}वें स्थान पर (स्कोर {total})।  | {of} માંથી {pos} સ્થાને (સ્કોર {total}).  | pending | pending |
| `rp.reasonNote` | The reason is worked out again from the current hospital data (simulated). | कारण मौजूदा अस्पताल डेटा से दोबारा निकाला गया है (simulated)। | કારણ હાલના હૉસ્પિટલ ડેટા પરથી ફરી કાઢ્યું છે (simulated). | pending | pending |
| `rp.noHospital` | No hospital recorded. | कोई अस्पताल दर्ज नहीं। | કોઈ હૉસ્પિટલ નોંધાઈ નથી. | pending | pending |
| `rp.escalations` | Escalations to the next hospital: | अगले अस्पताल को भेजे गए अलर्ट: | આગલી હૉસ્પિટલને મોકલેલા એલર્ટ: | pending | pending |
| `rp.corridor` | Green corridor requested (simulated) | ग्रीन कॉरिडोर का अनुरोध (simulated) | ગ્રીન કૉરિડોરની વિનંતી (simulated) | pending | pending |
| `rp.noneSent` | None sent | कोई नहीं भेजी गई | કોઈ મોકલી નથી | pending | pending |
| `rp.team` | Assigned team | नियुक्त टीम | સોંપેલ ટીમ | pending | pending |
| `rp.noneAssigned` | None assigned | कोई नियुक्त नहीं | કોઈને સોંપ્યું નથી | pending | pending |
| `rp.durations` | Step durations | चरणों का समय | પગલાંનો સમય | pending | pending |
| `rp.notReached` | Not reached | नहीं पहुँचा | પહોંચ્યું નથી | pending | pending |
| `rp.total` | Total, alert to handed over | कुल, अलर्ट से हैंडओवर तक | કુલ, એલર્ટથી હેન્ડઓવર સુધી | pending | pending |
| `rp.totalCancelled` | Alert to cancelled | अलर्ट से रद्द तक | એલર્ટથી રદ સુધી | pending | pending |
| `rp.timeline` | Timeline | टाइमलाइन | ટાઇમલાઇન | pending | pending |
| `rp.sampleChecklist` | Sample checklist. Pending medical review. | नमूना चेकलिस्ट। चिकित्सीय समीक्षा बाकी है। | નમૂનારૂપ ચેકલિસ્ટ. તબીબી સમીક્ષા બાકી છે. | pending | pending |
| `rp.noHandover` | No handover note. | कोई हैंडओवर नोट नहीं। | કોઈ હેન્ડઓવર નોંધ નથી. | pending | pending |
| `rp.deskNotes` | Desk notes | डेस्क नोट्स | ડેસ્ક નોંધો | pending | pending |
| `rp.notes` | Notes | नोट्स | નોંધો | pending | pending |
| `rp.noNotes` | No notes. | कोई नोट नहीं। | કોઈ નોંધ નથી. | pending | pending |
| `rv.reviewed` | Reviewed by {who} on {date} | {who} द्वारा {date} को समीक्षा की गई | {who} દ્વારા {date} ના રોજ સમીક્ષા કરી | pending | pending |
| `rv.partial` | Partly reviewed ({n} of {m} items). Sample checklist. | आंशिक समीक्षा ({m} में से {n} आइटम)। नमूना चेकलिस्ट। | આંશિક સમીક્ષા ({m} માંથી {n} આઇટમ). નમૂનારૂપ ચેકલિસ્ટ. | pending | pending |
| `act.ticked` | Ticked | टिक किया | ટિક કર્યું | pending | pending |
| `act.unticked` | Unticked | टिक हटाया | ટિક હટાવ્યું | pending | pending |
| `act.nk.handover` | Handover note | हैंडओवर नोट | હેન્ડઓવર નોંધ | pending | pending |
| `act.nk.desk` | Desk note | डेस्क नोट | ડેસ્ક નોંધ | pending | pending |
| `act.nk.note` | Note | नोट | નોંધ | pending | pending |
| `map.demoLoc` | Demo patient location | डेमो मरीज़ की लोकेशन | ડેમો દર્દીનું લોકેશન | pending | pending |
| `map.sampleTag` | (sample) | (नमूना) | (નમૂનો) | pending | pending |
