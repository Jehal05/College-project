# Translation review (Hindi and Gujarati)

**Status: NOT reviewed by a native speaker.** The Hindi and Gujarati text was written by an AI assistant using the glossary below. It must be read by a fluent speaker of each language, and by a doctor for anything medical, before real users see it.

Phase 5 added the passport, responder page and notification strings (`passport.*`, `view.*`, `notif.*`, `home.passport`, `profile.passport`, `login.expired`). The responder page (`view.*`) is read by strangers in an emergency, so check it first.

## How to review

1. Read the **High priority** table first: these strings are shown during an emergency, on the responder page, or explain consent, offline and voice behaviour.
2. Check meaning, tone (calm, short, polite), and that the same word is used for the same idea everywhere (see glossary below).
3. Check that nothing sounds like a diagnosis or a promise. "Not sent yet" must never read as "sent", and the passport page must say the data was prepared by the patient and is not verified by a doctor.
4. Edit `patient-app/src/i18n/hi.json` or `gu.json` only. Keep the `{{placeholders}}` exactly as they are. Keys ending in `_one` / `_other` are singular and plural forms.
5. Run `npm run audit` afterwards: long words must not overflow at 360 px.

## Glossary used

| English | Hindi | Gujarati |
|---|---|---|
| Emergency | आपातकाल | કટોકટી |
| Ambulance | एम्बुलेंस | એમ્બ્યુલન્સ |
| Hospital | अस्पताल | હોસ્પિટલ |
| Symptoms | लक्षण | લક્ષણો |
| Cancel | रद्द करें | રદ કરો |
| Consent | सहमति | સંમતિ |
| Emergency contacts | आपातकालीन संपर्क | કટોકટીના સંપર્કો |
| Health passport | स्वास्थ्य पासपोर्ट | આરોગ્ય પાસપોર્ટ |
| Volunteer responder | आपातकालीन स्वयंसेवक | કટોકટી સ્વયંસેવક |
| Volunteer | स्वयंसेवक | સ્વયંસેવક |
| Approve (admin) | मंज़ूर | મંજૂર |
| Accept (alert) | स्वीकार करें | સ્વીકારો |
| Invite code | आमंत्रण कोड | આમંત્રણ કોડ |
| Disabled (account) | निष्क्रिय | નિષ્ક્રિય |

## High priority (191 strings)

| Key | English | Hindi | Gujarati | Reviewed |
|---|---|---|---|---|
| `state.MONITORING` | Monitoring | निगरानी | મોનિટરિંગ | [ ] |
| `state.SYMPTOMS_REPORTED` | Symptoms reported | लक्षण बताए गए | લક્ષણો જણાવાયાં | [ ] |
| `state.EMERGENCY_DETECTED` | Emergency detected | आपातकाल पहचाना गया | કટોકટી ઓળખાઈ | [ ] |
| `state.SOS_SENT` | SOS sent | SOS भेजा गया | SOS મોકલાયો | [ ] |
| `state.HOSPITAL_ACKNOWLEDGED` | Hospital acknowledged | अस्पताल ने पुष्टि की | હૉસ્પિટલે સ્વીકાર્યું | [ ] |
| `state.AMBULANCE_DISPATCHED` | Ambulance dispatched | एम्बुलेंस रवाना की गई | એમ્બ્યુલન્સ રવાના કરાઈ | [ ] |
| `state.EN_ROUTE` | En route | रास्ते में | રસ્તામાં | [ ] |
| `state.ARRIVED` | Arrived | पहुँच गई | પહોંચી ગઈ | [ ] |
| `state.HANDOVER_DONE` | Handover done | हस्तांतरण पूरा | સોંપણી પૂર્ણ | [ ] |
| `state.CANCELLED` | Cancelled | रद्द | રદ | [ ] |
| `state.ESCALATED` | Escalated | आगे बढ़ाया गया | આગળ વધારાયું | [ ] |
| `emergency.call` | Call 112 / 108 | 112 / 108 पर कॉल करें | 112 / 108 પર કૉલ કરો | [ ] |
| `symptom.CHEST_PAIN` | Chest pain or pressure | सीने में दर्द या दबाव | છાતીમાં દુખાવો અથવા દબાણ | [ ] |
| `symptom.SHORT_BREATH` | Shortness of breath | सांस फूलना | શ્વાસ ચડવો | [ ] |
| `symptom.SWEATING` | Sweating | पसीना आना | પરસેવો થવો | [ ] |
| `symptom.NAUSEA` | Nausea | जी मिचलाना | ઉબકા આવવા | [ ] |
| `symptom.ARM_JAW_PAIN` | Pain in left arm or jaw | बाएं हाथ या जबड़े में दर्द | ડાબા હાથ અથવા જડબામાં દુખાવો | [ ] |
| `symptom.FAINTING` | Fainting | बेहोशी | બેભાન થવું | [ ] |
| `symptom.FACE_DROOP` | Face drooping | चेहरा टेढ़ा होना | ચહેરો વાંકો થવો | [ ] |
| `symptom.LIMB_WEAKNESS` | Arm or leg weakness | हाथ या पैर में कमज़ोरी | હાથ કે પગમાં નબળાઈ | [ ] |
| `symptom.SLURRED_SPEECH` | Slurred speech | बोलने में लड़खड़ाहट | બોલવામાં થોથવાટ | [ ] |
| `symptom.SUDDEN_CONFUSION` | Sudden confusion | अचानक भ्रम | અચાનક મૂંઝવણ | [ ] |
| `symptom.SEVERE_HEADACHE` | Sudden severe headache | अचानक तेज़ सिरदर्द | અચાનક તીવ્ર માથાનો દુખાવો | [ ] |
| `symptom.DIA_CONFUSION` | Confusion | भ्रम | મૂંઝવણ | [ ] |
| `symptom.DIA_SHAKING` | Shaking | कंपकंपी | ધ્રુજારી | [ ] |
| `symptom.DIA_SWEATING` | Sweating | पसीना आना | પરસેવો થવો | [ ] |
| `symptom.DIA_FAINTING` | Fainting | बेहोशी | બેભાન થવું | [ ] |
| `symptom.LOW_GLUCOSE_READING` | Very low glucose reading | ग्लूकोज़ का बहुत कम रीडिंग | ગ્લુકોઝનું ખૂબ ઓછું રીડિંગ | [ ] |
| `symptom.WHEEZING` | Wheezing | घरघराहट | સિસોટી જેવો અવાજ સાથે શ્વાસ | [ ] |
| `symptom.CANNOT_SPEAK_SENTENCES` | Cannot speak full sentences | पूरे वाक्य नहीं बोल पाना | પૂરાં વાક્યો બોલી શકાતાં નથી | [ ] |
| `symptom.SEVERE_SHORT_BREATH` | Severe shortness of breath | बहुत तेज़ सांस फूलना | ખૂબ તીવ્ર શ્વાસ ચડવો | [ ] |
| `symptom.BLUE_LIPS` | Blue lips | होंठ नीले पड़ना | હોઠ ભૂરા થવા | [ ] |
| `symptoms.title` | What is happening? | क्या हो रहा है? | શું થઈ રહ્યું છે? | [ ] |
| `symptoms.pickCategory` | Choose what fits best | जो सबसे सही लगे वह चुनें | જે સૌથી વધુ બંધબેસે તે પસંદ કરો | [ ] |
| `symptoms.tickSymptoms` | Tick everything that applies | जो भी लागू हो सब चुनें | જે લાગુ પડે તે બધું પસંદ કરો | [ ] |
| `symptoms.getHelp` | Get help now | अभी मदद पाएं | હમણાં મદદ મેળવો | [ ] |
| `symptoms.needOne` | Tick at least one symptom | कम से कम एक लक्षण चुनें | ઓછામાં ઓછું એક લક્ષણ પસંદ કરો | [ ] |
| `symptoms.error` | Could not start the emergency. Use the call button above, then try again. | आपातकाल शुरू नहीं हो सका। ऊपर के कॉल बटन का उपयोग करें, फिर दोबारा कोशिश करें। | કટોકટી શરૂ થઈ શકી નથી. ઉપરના કૉલ બટનનો ઉપયોગ કરો, પછી ફરી પ્રયત્ન કરો. | [ ] |
| `symptoms.demoLocation` | Use demo location | डेमो लोकेशन का उपयोग करें | ડેમો લોકેશનનો ઉપયોગ કરો | [ ] |
| `emergency.title` | Emergency | आपातकाल | કટોકટી | [ ] |
| `emergency.sendNow` | Send now | अभी भेजें | હમણાં મોકલો | [ ] |
| `emergency.imOk` | I'm OK, cancel | मैं ठीक हूँ, रद्द करें | હું ઠીક છું, રદ કરો | [ ] |
| `emergency.countdown` | Sending alert in {{count}} seconds | {{count}} सेकंड में अलर्ट भेजा जाएगा | {{count}} સેકન્ડમાં ચેતવણી મોકલાશે | [ ] |
| `emergency.sent` | Alert sent | अलर्ट भेज दिया गया | ચેતવણી મોકલાઈ ગઈ | [ ] |
| `emergency.locationDemo` | Using demo location | डेमो लोकेशन उपयोग हो रही है | ડેમો લોકેશન વપરાઈ રહ્યું છે | [ ] |
| `emergency.locationOff` | Location sharing is off in your consent settings | आपकी सहमति सेटिंग में लोकेशन साझा करना बंद है | તમારી સંમતિ સેટિંગમાં લોકેશન શેર કરવાનું બંધ છે | [ ] |
| `emergency.locationReal` | Using your location | आपकी लोकेशन उपयोग हो रही है | તમારું લોકેશન વપરાઈ રહ્યું છે | [ ] |
| `emergency.hospital` | Hospital | अस्पताल | હૉસ્પિટલ | [ ] |
| `emergency.eta` | Ambulance ETA: {{minutes}} min {{seconds}} s | एम्बुलेंस पहुँचने का समय: {{minutes}} मिनट {{seconds}} सेकंड | એમ્બ્યુલન્સ પહોંચવાનો સમય: {{minutes}} મિનિટ {{seconds}} સેકન્ડ | [ ] |
| `emergency.confirmCancel` | Tell the hospital this was a false alarm? | अस्पताल को बताएँ कि यह गलत अलार्म था? | હૉસ્પિટલને જણાવવું છે કે આ ખોટો એલાર્મ હતો? | [ ] |
| `emergency.confirmYes` | Yes, cancel | हाँ, रद्द करें | હા, રદ કરો | [ ] |
| `emergency.confirmNo` | No, keep going | नहीं, जारी रखें | ના, ચાલુ રાખો | [ ] |
| `emergency.connectionLost` | Connection lost. Reconnecting... | कनेक्शन टूट गया। दोबारा जुड़ रहे हैं... | કનેક્શન તૂટી ગયું. ફરી જોડાઈ રહ્યા છીએ... | [ ] |
| `emergency.pendingReview` | Guidance for this condition will appear here after medical review. | इस स्थिति के लिए मार्गदर्शन चिकित्सा समीक्षा के बाद यहाँ दिखाई देगा। | આ સ્થિતિ માટેનું માર્ગદર્શન તબીબી સમીક્ષા પછી અહીં દેખાશે. | [ ] |
| `emergency.instructionsTitle` | What to do now | अभी क्या करें | હમણાં શું કરવું | [ ] |
| `emergency.falseAlarm` | False alarm? Cancel | गलत अलार्म? रद्द करें | ખોટો એલાર્મ? રદ કરો | [ ] |
| `emergency.sending` | Sending alert... | अलर्ट भेजा जा रहा है... | ચેતવણી મોકલી રહ્યા છીએ... | [ ] |
| `emergency.sendError` | Could not send the alert. Use the call button, then try again. | अलर्ट नहीं भेजा जा सका। कॉल बटन का उपयोग करें, फिर दोबारा कोशिश करें। | ચેતવણી મોકલી શકાઈ નથી. કૉલ બટનનો ઉપયોગ કરો, પછી ફરી પ્રયત્ન કરો. | [ ] |
| `emergency.cancelError` | Could not cancel. Please try again. | रद्द नहीं हो सका। कृपया दोबारा कोशिश करें। | રદ થઈ શક્યું નથી. કૃપા કરીને ફરી પ્રયત્ન કરો. | [ ] |
| `emergency.retry` | Try again | दोबारा कोशिश करें | ફરી પ્રયત્ન કરો | [ ] |
| `emergency.loading` | Loading emergency... | आपातकाल लोड हो रहा है... | કટોકટી લોડ થઈ રહી છે... | [ ] |
| `emergency.loadError` | Could not load this emergency. | यह आपातकाल लोड नहीं हो सका। | આ કટોકટી લોડ થઈ શકી નથી. | [ ] |
| `emergency.done` | The simulated emergency has ended. | सिमुलेटेड आपातकाल समाप्त हो गया है। | સિમ્યુલેટેડ કટોકટી પૂરી થઈ છે. | [ ] |
| `emergency.back` | Back to Home | होम पर वापस जाएँ | હોમ પર પાછા જાઓ | [ ] |
| `cancelled.title` | Alert cancelled | अलर्ट रद्द किया गया | ચેતવણી રદ કરાઈ | [ ] |
| `cancelled.text` | The hospital has been told this was a false alarm. | अस्पताल को बता दिया गया है कि यह गलत अलार्म था। | હૉસ્પિટલને જણાવી દેવાયું છે કે આ ખોટો એલાર્મ હતો. | [ ] |
| `cancelled.home` | Back to Home | होम पर वापस जाएँ | હોમ પર પાછા જાઓ | [ ] |
| `category.HEART` | Heart or chest | हृदय या सीना | હૃદય કે છાતી | [ ] |
| `category.STROKE` | Stroke signs | स्ट्रोक के संकेत | સ્ટ્રોકના સંકેતો | [ ] |
| `category.DIABETIC` | Low sugar | शुगर कम होना | શુગર ઓછી થવી | [ ] |
| `category.ASTHMA` | Breathing | सांस की समस्या | શ્વાસની તકલીફ | [ ] |
| `consent.title` | Consent | सहमति | સંમતિ | [ ] |
| `consent.intro` | You decide what the hospital can see. Changes apply to your next emergency. | आप तय करते हैं कि अस्पताल क्या देख सकता है। बदलाव आपके अगले आपातकाल पर लागू होंगे। | હૉસ્પિટલ શું જોઈ શકે તે તમે નક્કી કરો છો. ફેરફારો તમારી આગામી કટોકટીમાં લાગુ થશે. | [ ] |
| `consent.on` | On | चालू | ચાલુ | [ ] |
| `consent.off` | Off | बंद | બંધ | [ ] |
| `consent.loading` | Loading your consent settings... | आपकी सहमति सेटिंग लोड हो रही हैं... | તમારી સંમતિ સેટિંગ લોડ થઈ રહી છે... | [ ] |
| `consent.loadError` | Could not load your consent settings. | आपकी सहमति सेटिंग लोड नहीं हो सकीं। | તમારી સંમતિ સેટિંગ લોડ થઈ શકી નથી. | [ ] |
| `consent.saveError` | Could not save this change. The switch was put back. | यह बदलाव सहेजा नहीं जा सका। स्विच पहले जैसा कर दिया गया है। | આ ફેરફાર સાચવી શકાયો નથી. સ્વિચ પહેલાં જેવી કરી દેવાઈ છે. | [ ] |
| `consent.recent` | Recent changes | हाल के बदलाव | તાજેતરના ફેરફારો | [ ] |
| `consent.noChanges` | No changes yet. | अभी कोई बदलाव नहीं। | હજી કોઈ ફેરફાર નથી. | [ ] |
| `consent.location.title` | Location | लोकेशन | લોકેશન | [ ] |
| `consent.location.text` | Shares your approximate position with the hospital so the ambulance can find you. | आपकी अनुमानित स्थिति अस्पताल के साथ साझा करता है ताकि एम्बुलेंस आप तक पहुँच सके। | તમારું અંદાજિત સ્થાન હૉસ્પિટલ સાથે શેર કરે છે જેથી એમ્બ્યુલન્સ તમને શોધી શકે. | [ ] |
| `consent.history.title` | Medical history | चिकित्सा इतिहास | તબીબી ઇતિહાસ | [ ] |
| `consent.history.text` | Shares your conditions, allergies and medicines with the hospital that receives the alert. | आपकी बीमारियाँ, एलर्जी और दवाइयाँ उस अस्पताल के साथ साझा करता है जिसे अलर्ट मिलता है। | તમારી બીમારીઓ, એલર્જી અને દવાઓ ચેતવણી મેળવનાર હૉસ્પિટલ સાથે શેર કરે છે. | [ ] |
| `consent.vitals.title` | Live vitals | लाइव वाइटल्स | લાઇવ વાઇટલ્સ | [ ] |
| `consent.vitals.text` | Shares your heart rate, SpO2, blood pressure and glucose readings during an emergency. | आपातकाल के दौरान आपकी हृदय गति, SpO2, रक्तचाप और ग्लूकोज़ रीडिंग साझा करता है। | કટોકટી દરમિયાન તમારા હૃદયના ધબકારા, SpO2, બ્લડ પ્રેશર અને ગ્લુકોઝ રીડિંગ શેર કરે છે. | [ ] |
| `consent.reports.title` | Reports | रिपोर्ट | રિપોર્ટ | [ ] |
| `consent.reports.text` | Shares the reports you uploaded with the hospital that receives the alert. | आपकी अपलोड की गई रिपोर्ट उस अस्पताल के साथ साझा करता है जिसे अलर्ट मिलता है। | તમે અપલોડ કરેલા રિપોર્ટ ચેતવણી મેળવનાર હૉસ્પિટલ સાથે શેર કરે છે. | [ ] |
| `twin.title` | Digital twin | डिजिटल ट्विन | ડિજિટલ ટ્વિન | [ ] |
| `twin.heart_rate` | Heart rate | हृदय गति | હૃદયના ધબકારા | [ ] |
| `twin.spo2` | SpO2 | SpO2 | SpO2 | [ ] |
| `twin.bp` | Blood pressure | रक्तचाप | બ્લડ પ્રેશર | [ ] |
| `twin.glucose` | Glucose | ग्लूकोज़ | ગ્લુકોઝ | [ ] |
| `twin.usual` | Usual: {{range}} | आमतौर पर: {{range}} | સામાન્ય રીતે: {{range}} | [ ] |
| `twin.within` | Within your usual range | आपकी आमतौर की सीमा के भीतर | તમારી સામાન્ય રીતની મર્યાદાની અંદર | [ ] |
| `twin.different` | Different from your usual range | आपकी आमतौर की सीमा से अलग | તમારી સામાન્ય રીતની મર્યાદાથી અલગ | [ ] |
| `twin.notDiagnosis` | Not a diagnosis. | यह निदान नहीं है। | આ નિદાન નથી. | [ ] |
| `twin.loading` | Loading your usual ranges... | आपकी आमतौर की सीमाएँ लोड हो रही हैं... | તમારી સામાન્ય રીતની મર્યાદાઓ લોડ થઈ રહી છે... | [ ] |
| `twin.error` | Could not load your usual ranges. | आपकी आमतौर की सीमाएँ लोड नहीं हो सकीं। | તમારી સામાન્ય રીતની મર્યાદાઓ લોડ થઈ શકી નથી. | [ ] |
| `offline.banner` | You are offline. Some features are unavailable. Call 112 / 108 works without internet. | आप ऑफ़लाइन हैं। कुछ सुविधाएँ उपलब्ध नहीं हैं। 112 / 108 पर कॉल बिना इंटरनेट के भी काम करता है। | તમે ઑફલાઇન છો. કેટલીક સુવિધાઓ ઉપલબ્ધ નથી. 112 / 108 પર કૉલ ઇન્ટરનેટ વગર પણ કામ કરે છે. | [ ] |
| `offline.savedCopy` | Saved copy, may be out of date. | सहेजी हुई प्रति, पुरानी हो सकती है। | સાચવેલી નકલ, જૂની હોઈ શકે. | [ ] |
| `offline.readOnly` | You are offline, so changes are turned off. | आप ऑफ़लाइन हैं, इसलिए बदलाव बंद हैं। | તમે ઑફલાઇન છો, તેથી ફેરફારો બંધ છે. | [ ] |
| `pending.title` | Not sent yet | अभी भेजा नहीं गया | હજી મોકલાયું નથી | [ ] |
| `pending.text` | No alert has reached any hospital. Call 112 / 108 now. | कोई अलर्ट किसी अस्पताल तक नहीं पहुँचा है। अभी 112 / 108 पर कॉल करें। | કોઈ ચેતવણી કોઈ હૉસ્પિટલ સુધી પહોંચી નથી. હમણાં 112 / 108 પર કૉલ કરો. | [ ] |
| `pending.waiting` | Waiting for the connection. We will try again by ourselves. | कनेक्शन की प्रतीक्षा है। हम अपने आप दोबारा कोशिश करेंगे। | કનેક્શનની રાહ જોવાઈ રહી છે. અમે જાતે ફરી પ્રયત્ન કરીશું. | [ ] |
| `pending.online` | The connection is back. Trying to send... | कनेक्शन वापस आ गया है। भेजने की कोशिश हो रही है... | કનેક્શન પાછું આવી ગયું છે. મોકલવાનો પ્રયત્ન થઈ રહ્યો છે... | [ ] |
| `pending.failed` | Still could not send. Use the call button. | अब भी भेजा नहीं जा सका। कॉल बटन का उपयोग करें। | હજી પણ મોકલી શકાયું નથી. કૉલ બટનનો ઉપયોગ કરો. | [ ] |
| `pending.stale` | This was saved more than 10 minutes ago. Does it still apply? | यह 10 मिनट से अधिक पहले सहेजा गया था। क्या यह अब भी लागू है? | આ 10 મિનિટથી વધુ પહેલાં સાચવાયું હતું. શું તે હજી લાગુ પડે છે? | [ ] |
| `pending.sendAnyway` | Yes, send it now | हाँ, अभी भेजें | હા, હમણાં મોકલો | [ ] |
| `pending.discard` | Discard | छोड़ दें | છોડી દો | [ ] |
| `pending.homeBanner` | Your emergency alert has not been sent yet | आपका आपातकालीन अलर्ट अभी भेजा नहीं गया है | તમારી કટોકટી ચેતવણી હજી મોકલાઈ નથી | [ ] |
| `pending.open` | Open | खोलें | ખોલો | [ ] |
| `voice.title` | Voice input | आवाज़ से बताएँ | અવાજથી જણાવો | [ ] |
| `voice.start` | Speak your symptoms | अपने लक्षण बोलकर बताएँ | તમારાં લક્ષણો બોલીને જણાવો | [ ] |
| `voice.listening` | Listening... speak now | सुन रहे हैं... अभी बोलें | સાંભળી રહ્યા છીએ... હમણાં બોલો | [ ] |
| `voice.stop` | Stop | रोकें | બંધ કરો | [ ] |
| `voice.heard` | We heard | हमने सुना | અમે સાંભળ્યું | [ ] |
| `voice.tickThese` | Tick these? | ये चुनें? | આ પસંદ કરવાં? | [ ] |
| `voice.check` | We may have heard wrong. Please check. | हो सकता है हमने गलत सुना हो। कृपया जाँच लें। | કદાચ અમે ખોટું સાંભળ્યું હોય. કૃપા કરીને તપાસી લો. | [ ] |
| `voice.apply` | Tick them | इन्हें चुनें | આ પસંદ કરો | [ ] |
| `voice.dismiss` | No thanks | नहीं, धन्यवाद | ના, આભાર | [ ] |
| `voice.noMatch` | We could not match that to a symptom. You can tick them yourself. | हम इसे किसी लक्षण से मिला नहीं सके। आप खुद चुन सकते हैं। | અમે તેને કોઈ લક્ષણ સાથે મેળવી શક્યા નથી. તમે જાતે પસંદ કરી શકો છો. | [ ] |
| `voice.unsupported` | Voice input is not available in this browser. You can tick symptoms below. | इस ब्राउज़र में आवाज़ से बताने की सुविधा उपलब्ध नहीं है। आप नीचे लक्षण चुन सकते हैं। | આ બ્રાઉઝરમાં અવાજથી જણાવવાની સુવિધા ઉપલબ્ધ નથી. તમે નીચે લક્ષણો પસંદ કરી શકો છો. | [ ] |
| `voice.error.denied` | Microphone access was blocked. You can tick symptoms below. | माइक्रोफ़ोन की अनुमति नहीं मिली। आप नीचे लक्षण चुन सकते हैं। | માઇક્રોફોનની પરવાનગી મળી નથી. તમે નીચે લક્ષણો પસંદ કરી શકો છો. | [ ] |
| `voice.error.nospeech` | We did not hear anything. Try again or tick symptoms below. | कुछ सुनाई नहीं दिया। दोबारा कोशिश करें या नीचे लक्षण चुनें। | કંઈ સંભળાયું નહીં. ફરી પ્રયત્ન કરો અથવા નીચે લક્ષણો પસંદ કરો. | [ ] |
| `voice.error.network` | Voice input needs an internet connection. Tick symptoms below. | आवाज़ से बताने के लिए इंटरनेट चाहिए। नीचे लक्षण चुनें। | અવાજથી જણાવવા માટે ઇન્ટરનેટ જોઈએ. નીચે લક્ષણો પસંદ કરો. | [ ] |
| `voice.error.nomic` | No microphone was found. Tick symptoms below. | कोई माइक्रोफ़ोन नहीं मिला। नीचे लक्षण चुनें। | કોઈ માઇક્રોફોન મળ્યો નથી. નીચે લક્ષણો પસંદ કરો. | [ ] |
| `voice.error.other` | Voice input did not work. Tick symptoms below. | आवाज़ से बताना काम नहीं किया। नीचे लक्षण चुनें। | અવાજથી જણાવવાનું કામ કર્યું નહીં. નીચે લક્ષણો પસંદ કરો. | [ ] |
| `error.title` | Something went wrong | कुछ गलत हो गया | કંઈક ખોટું થયું | [ ] |
| `error.text` | The app had a problem. If this is an emergency, call now. | ऐप में समस्या आई। यदि यह आपातकाल है, तो अभी कॉल करें। | એપમાં સમસ્યા આવી. જો આ કટોકટી હોય, તો હમણાં કૉલ કરો. | [ ] |
| `error.reload` | Reload the app | ऐप फिर से खोलें | એપ ફરી ખોલો | [ ] |
| `login.expired` | Your session ended. Please sign in again. | आपका सत्र समाप्त हो गया। कृपया दोबारा साइन इन करें। | તમારું સત્ર પૂરું થયું. કૃપા કરીને ફરી સાઇન ઇન કરો. | [ ] |
| `passport.title` | Health passport | स्वास्थ्य पासपोर्ट | આરોગ્ય પાસપોર્ટ |
| Volunteer responder | आपातकालीन स्वयंसेवक | કટોકટી સ્વયંસેવક |
| Volunteer | स्वयंसेवक | સ્વયંસેવક |
| Approve (admin) | मंज़ूर | મંજૂર |
| Accept (alert) | स्वीकार करें | સ્વીકારો |
| Invite code | आमंत्रण कोड | આમંત્રણ કોડ |
| Disabled (account) | निष्क्रिय | નિષ્ક્રિય | [ ] |
| `passport.intro` | Show this QR code to a responder or doctor. It opens a page with the details you chose to share. The code itself holds no health data. | यह QR कोड किसी सहायक या डॉक्टर को दिखाएँ। इससे एक पेज खुलता है जिसमें वही जानकारी होती है जो आपने साझा करने के लिए चुनी है। कोड में स्वयं कोई स्वास्थ्य जानकारी नहीं होती। | આ QR કોડ કોઈ સહાયક અથવા ડૉક્ટરને બતાવો. તેનાથી એક પેજ ખુલે છે જેમાં તમે શેર કરવા માટે પસંદ કરેલી માહિતી હોય છે. કોડમાં પોતે કોઈ આરોગ્ય માહિતી નથી. | [ ] |
| `passport.validity` | How long should it work? | यह कितने समय तक चले? | તે કેટલો સમય ચાલે? | [ ] |
| `passport.hours1` | 1 hour | 1 घंटा | 1 કલાક | [ ] |
| `passport.hours24` | 24 hours | 24 घंटे | 24 કલાક | [ ] |
| `passport.days7` | 7 days | 7 दिन | 7 દિવસ | [ ] |
| `passport.create` | Create passport | पासपोर्ट बनाएँ | પાસપોર્ટ બનાવો | [ ] |
| `passport.qrLabel` | QR code for your health passport | आपके स्वास्थ्य पासपोर्ट का QR कोड | તમારા આરોગ્ય પાસપોર્ટનો QR કોડ | [ ] |
| `passport.left.days_one` | Valid for {{count}} day | {{count}} दिन के लिए मान्य | {{count}} દિવસ માટે માન્ય | [ ] |
| `passport.left.days_other` | Valid for {{count}} days | {{count}} दिन के लिए मान्य | {{count}} દિવસ માટે માન્ય | [ ] |
| `passport.left.hours_one` | Valid for {{count}} hour | {{count}} घंटे के लिए मान्य | {{count}} કલાક માટે માન્ય | [ ] |
| `passport.left.hours_other` | Valid for {{count}} hours | {{count}} घंटे के लिए मान्य | {{count}} કલાક માટે માન્ય | [ ] |
| `passport.left.minutes_one` | Valid for {{count}} minute | {{count}} मिनट के लिए मान्य | {{count}} મિનિટ માટે માન્ય | [ ] |
| `passport.left.minutes_other` | Valid for {{count}} minutes | {{count}} मिनट के लिए मान्य | {{count}} મિનિટ માટે માન્ય | [ ] |
| `passport.left.soon` | Valid for less than 1 minute | 1 मिनट से कम के लिए मान्य | 1 મિનિટથી ઓછા સમય માટે માન્ય | [ ] |
| `passport.download` | Download QR (PNG) | QR डाउनलोड करें (PNG) | QR ડાઉનલોડ કરો (PNG) | [ ] |
| `passport.print` | Print | प्रिंट करें | પ્રિન્ટ કરો | [ ] |
| `passport.revoke` | Revoke now | अभी रद्द करें | હમણાં રદ કરો | [ ] |
| `passport.revokeConfirm` | Stop this passport working? Anyone with the link will lose access. | इस पासपोर्ट को बंद करें? लिंक वाले किसी भी व्यक्ति की पहुँच खत्म हो जाएगी। | આ પાસપોર્ટ બંધ કરવો છે? લિંક ધરાવનાર કોઈની પણ ઍક્સેસ જતી રહેશે. | [ ] |
| `passport.revokeYes` | Yes, revoke it | हाँ, रद्द करें | હા, રદ કરો | [ ] |
| `passport.opens_one` | Opened {{count}} time | {{count}} बार खोला गया | {{count}} વાર ખોલવામાં આવ્યો | [ ] |
| `passport.opens_other` | Opened {{count}} times | {{count}} बार खोला गया | {{count}} વાર ખોલવામાં આવ્યો | [ ] |
| `passport.opensNone` | Not opened yet | अभी तक नहीं खोला गया | હજી સુધી ખોલવામાં આવ્યો નથી | [ ] |
| `passport.openPage` | Preview the responder page | सहायक का पेज देखें | સહાયકનું પેજ જુઓ | [ ] |
| `passport.sharedNote` | Only what your consent settings allow is shown. | केवल वही दिखता है जो आपकी सहमति सेटिंग अनुमति देती है। | ફક્ત તે જ દેખાય છે જે તમારી સંમતિ સેટિંગ મંજૂરી આપે છે. | [ ] |
| `passport.consentLink` | Check consent settings | सहमति सेटिंग देखें | સંમતિ સેટિંગ તપાસો | [ ] |
| `passport.offlineNote` | You are offline. The QR is shown from memory, but the link needs internet to open. | आप ऑफ़लाइन हैं। QR याददाश्त से दिख रहा है, लेकिन लिंक खुलने के लिए इंटरनेट चाहिए। | તમે ઑફલાઇન છો. QR મેમરીમાંથી બતાવાયો છે, પરંતુ લિંક ખોલવા માટે ઇન્ટરનેટ જોઈએ. | [ ] |
| `passport.loadError` | Could not load your passport. | आपका पासपोर्ट लोड नहीं हो सका। | તમારો પાસપોર્ટ લોડ થઈ શક્યો નથી. | [ ] |
| `passport.createError` | Could not create the passport. Please try again. | पासपोर्ट नहीं बन सका। कृपया दोबारा कोशिश करें। | પાસપોર્ટ બની શક્યો નથી. કૃપા કરીને ફરી પ્રયાસ કરો. | [ ] |
| `passport.revokeError` | Could not revoke the passport. Please try again. | पासपोर्ट रद्द नहीं हो सका। कृपया दोबारा कोशिश करें। | પાસપોર્ટ રદ થઈ શક્યો નથી. કૃપા કરીને ફરી પ્રયાસ કરો. | [ ] |
| `view.title` | Health passport | स्वास्थ्य पासपोर्ट | આરોગ્ય પાસપોર્ટ |
| Volunteer responder | आपातकालीन स्वयंसेवक | કટોકટી સ્વયંસેવક |
| Volunteer | स्वयंसेवक | સ્વયંસેવક |
| Approve (admin) | मंज़ूर | મંજૂર |
| Accept (alert) | स्वीकार करें | સ્વીકારો |
| Invite code | आमंत्रण कोड | આમંત્રણ કોડ |
| Disabled (account) | निष्क्रिय | નિષ્ક્રિય | [ ] |
| `view.preparedBy` | Prepared by the patient. Not verified by a doctor. | मरीज़ द्वारा तैयार किया गया। डॉक्टर द्वारा सत्यापित नहीं। | દર્દી દ્વારા તૈયાર કરેલું. ડૉક્ટર દ્વારા ચકાસાયેલું નથી. | [ ] |
| `view.patient` | Patient | मरीज़ | દર્દી | [ ] |
| `view.age` | Age: {{age}} years | आयु: {{age}} वर्ष | ઉંમર: {{age}} વર્ષ | [ ] |
| `view.bloodGroup` | Blood group | रक्त समूह | રક્ત જૂથ | [ ] |
| `view.allergies` | Allergies | एलर्जी | એલર્જી | [ ] |
| `view.conditions` | Conditions the patient entered | मरीज़ द्वारा बताई गई स्थितियाँ | દર્દીએ જણાવેલી સ્થિતિઓ | [ ] |
| `view.medicines` | Medicines | दवाइयाँ | દવાઓ | [ ] |
| `view.contacts` | Emergency contacts | आपातकालीन संपर्क | કટોકટીના સંપર્કો | [ ] |
| `view.none` | None listed | कुछ दर्ज नहीं | કંઈ નોંધાયેલ નથી | [ ] |
| `view.notShared` | The patient has not shared this section. | मरीज़ ने यह भाग साझा नहीं किया है। | દર્દીએ આ વિભાગ શેર કર્યો નથી. | [ ] |
| `view.loading` | Loading passport... | पासपोर्ट लोड हो रहा है... | પાસપોર્ટ લોડ થઈ રહ્યો છે... | [ ] |
| `view.error` | Could not load the passport. Check the internet connection. | पासपोर्ट लोड नहीं हो सका। इंटरनेट कनेक्शन जाँचें। | પાસપોર્ટ લોડ થઈ શક્યો નથી. ઇન્ટરનેટ કનેક્શન તપાસો. | [ ] |
| `view.gone` | This passport is no longer available. | यह पासपोर्ट अब उपलब्ध नहीं है। | આ પાસપોર્ટ હવે ઉપલબ્ધ નથી. | [ ] |
| `view.goneHelp` | Ask the patient for a new QR code, or call 112 / 108. | मरीज़ से नया QR कोड माँगें, या 112 / 108 पर कॉल करें। | દર્દી પાસેથી નવો QR કોડ માગો, અથવા 112 / 108 પર કૉલ કરો. | [ ] |
| `view.expires` | Link valid until {{time}} | लिंक {{time}} तक मान्य है | લિંક {{time}} સુધી માન્ય છે | [ ] |
| `notif.bell` | Notifications, {{count}} new | सूचनाएँ, {{count}} नई | સૂચનાઓ, {{count}} નવી | [ ] |
| `notif.title` | Notifications | सूचनाएँ | સૂચનાઓ | [ ] |
| `notif.empty` | No notifications yet | अभी कोई सूचना नहीं | હજી કોઈ સૂચના નથી | [ ] |
| `notif.hospital` | Hospital acknowledged | अस्पताल ने पुष्टि की | હોસ્પિટલે પુષ્ટિ કરી | [ ] |
| `notif.ambulance` | Ambulance dispatched | एम्बुलेंस रवाना की गई | એમ્બ્યુલન્સ રવાના કરી | [ ] |
| `notif.contacts` | Your contacts were notified (simulated) | आपके संपर्कों को सूचित किया गया (सिमुलेटेड) | તમારા સંપર્કોને જાણ કરવામાં આવી (સિમ્યુલેટેડ) | [ ] |
| `notif.passport` | Passport opened | पासपोर्ट खोला गया | પાસપોર્ટ ખોલવામાં આવ્યો | [ ] |
| `notif.clear` | Clear | साफ़ करें | સાફ કરો | [ ] |
| `notif.browser.title` | HealthTwin (simulated) | HealthTwin (सिमुलेटेड) | HealthTwin (સિમ્યુલેટેડ) | [ ] |
| `notif.browser.label` | Browser alerts | ब्राउज़र अलर्ट | બ્રાઉઝર એલર્ટ | [ ] |
| `notif.browser.help` | Show a pop-up when the app is in the background and the hospital or ambulance status changes. Off by default. | ऐप बैकग्राउंड में हो और अस्पताल या एम्बुलेंस की स्थिति बदले तो पॉप-अप दिखाएँ। डिफ़ॉल्ट रूप से बंद। | એપ બેકગ્રાઉન્ડમાં હોય અને હોસ્પિટલ કે એમ્બ્યુલન્સની સ્થિતિ બદલાય ત્યારે પૉપ-અપ બતાવો. મૂળભૂત રીતે બંધ. | [ ] |
| `notif.browser.denied` | Your browser blocked alerts. You can allow them in the browser settings. | आपके ब्राउज़र ने अलर्ट रोक दिए हैं। आप इन्हें ब्राउज़र सेटिंग में अनुमति दे सकते हैं। | તમારા બ્રાઉઝરે એલર્ટ અવરોધ્યા છે. તમે બ્રાઉઝર સેટિંગમાં તેમને મંજૂરી આપી શકો છો. | [ ] |
| `notif.browser.unsupported` | This browser does not support alerts. | यह ब्राउज़र अलर्ट का समर्थन नहीं करता। | આ બ્રાઉઝર એલર્ટને સપોર્ટ કરતું નથી. | [ ] |

## Everything else (146 strings)

| Key | English | Hindi | Gujarati | Reviewed |
|---|---|---|---|---|
| `app.title` | HealthTwin AI | HealthTwin AI | HealthTwin AI | [ ] |
| `banner.simulated` | Simulated event. Not a medical diagnosis. | सिमुलेटेड घटना। यह चिकित्सीय निदान नहीं है। | સિમ્યુલેટેડ ઘટના. આ તબીબી નિદાન નથી. | [ ] |
| `login.title` | Sign in | साइन इन करें | સાઇન ઇન કરો | [ ] |
| `login.email` | Email | ईमेल | ઇમેઇલ | [ ] |
| `login.password` | Password | पासवर्ड | પાસવર્ડ | [ ] |
| `login.submit` | Sign in | साइन इन करें | સાઇન ઇન કરો | [ ] |
| `login.loading` | Signing in... | साइन इन हो रहा है... | સાઇન ઇન થઈ રહ્યું છે... | [ ] |
| `login.error` | Invalid email or password | ईमेल या पासवर्ड गलत है | ઇમેઇલ અથવા પાસવર્ડ ખોટો છે | [ ] |
| `login.networkError` | Cannot reach the server. Is the mock server running? | सर्वर से संपर्क नहीं हो पा रहा। क्या मॉक सर्वर चालू है? | સર્વર સુધી પહોંચી શકાતું નથી. શું મૉક સર્વર ચાલુ છે? | [ ] |
| `login.wrongRole` | This app is for patients, their family, volunteers and admins. Hospital staff should use the hospital portal. | यह ऐप मरीज़ों, उनके परिवार, स्वयंसेवकों और एडमिन के लिए है। अस्पताल स्टाफ़ अस्पताल पोर्टल का उपयोग करें। | આ એપ દર્દીઓ, તેમના પરિવાર, સ્વયંસેવકો અને એડમિન માટે છે. હૉસ્પિટલ સ્ટાફે હૉસ્પિટલ પોર્ટલનો ઉપયોગ કરવો. | [ ] |
| `login.demoHint` | Demo account: patient@demo.test / demo1234 | डेमो खाता: patient@demo.test / demo1234 | ડેમો ખાતું: patient@demo.test / demo1234 | [ ] |
| `nav.label` | Main navigation | मुख्य नेविगेशन | મુખ્ય નેવિગેશન | [ ] |
| `nav.home` | Home | होम | હોમ | [ ] |
| `nav.profile` | Profile | प्रोफ़ाइल | પ્રોફાઇલ | [ ] |
| `home.greeting` | Hello, {{name}} | नमस्ते, {{name}} | નમસ્તે, {{name}} | [ ] |
| `home.status` | Monitoring connected | निगरानी जुड़ी है | મોનિટરિંગ જોડાયેલું છે | [ ] |
| `home.statusOffline` | Reconnecting to monitoring... | निगरानी से दोबारा जुड़ रहे हैं... | મોનિટરિંગ સાથે ફરી જોડાઈ રહ્યા છીએ... | [ ] |
| `home.heartRate` | Heart rate | हृदय गति | હૃદયના ધબકારા | [ ] |
| `home.spo2` | SpO2 | SpO2 | SpO2 | [ ] |
| `home.waiting` | Waiting for readings... | रीडिंग की प्रतीक्षा है... | રીડિંગની રાહ જોવાઈ રહી છે... | [ ] |
| `home.signOut` | Sign out | साइन आउट | સાઇન આઉટ | [ ] |
| `home.state` | Current status | वर्तमान स्थिति | હાલની સ્થિતિ | [ ] |
| `profile.title` | My profile | मेरी प्रोफ़ाइल | મારી પ્રોફાઇલ | [ ] |
| `profile.save` | Save changes | बदलाव सहेजें | ફેરફારો સાચવો | [ ] |
| `profile.saving` | Saving... | सहेजा जा रहा है... | સાચવી રહ્યા છીએ... | [ ] |
| `profile.saved` | Profile saved | प्रोफ़ाइल सहेज ली गई | પ્રોફાઇલ સાચવાઈ | [ ] |
| `profile.error` | Could not save. Please try again. | सहेज नहीं सके। कृपया दोबारा कोशिश करें। | સાચવી શકાયું નથી. કૃપા કરીને ફરી પ્રયત્ન કરો. | [ ] |
| `profile.loadError` | Could not load your profile. | आपकी प्रोफ़ाइल लोड नहीं हो सकी। | તમારી પ્રોફાઇલ લોડ થઈ શકી નથી. | [ ] |
| `profile.loading` | Loading your profile... | आपकी प्रोफ़ाइल लोड हो रही है... | તમારી પ્રોફાઇલ લોડ થઈ રહી છે... | [ ] |
| `profile.retry` | Try again | दोबारा कोशिश करें | ફરી પ્રયત્ન કરો | [ ] |
| `profile.name` | Full name | पूरा नाम | પૂરું નામ | [ ] |
| `profile.age` | Age | आयु | ઉંમર | [ ] |
| `profile.bloodGroup` | Blood group | रक्त समूह | બ્લડ ગ્રુપ | [ ] |
| `profile.bloodGroupPick` | Choose blood group | रक्त समूह चुनें | બ્લડ ગ્રુપ પસંદ કરો | [ ] |
| `profile.allergies` | Allergies (separate with commas) | एलर्जी (अल्पविराम से अलग करें) | એલર્જી (અલ્પવિરામથી અલગ કરો) | [ ] |
| `profile.conditions` | Medical conditions (separate with commas) | चिकित्सीय स्थितियाँ (अल्पविराम से अलग करें) | તબીબી સ્થિતિઓ (અલ્પવિરામથી અલગ કરો) | [ ] |
| `profile.medications` | Current medicines (separate with commas) | वर्तमान दवाइयाँ (अल्पविराम से अलग करें) | હાલની દવાઓ (અલ્પવિરામથી અલગ કરો) | [ ] |
| `profile.contacts` | Emergency contacts | आपातकालीन संपर्क | કટોકટી સંપર્કો | [ ] |
| `validation.required` | This field is required | यह जानकारी आवश्यक है | આ માહિતી જરૂરી છે | [ ] |
| `validation.age` | Enter an age from 0 to 120 | 0 से 120 के बीच आयु लिखें | 0 થી 120 વચ્ચેની ઉંમર લખો | [ ] |
| `validation.bloodGroup` | Choose a blood group from the list | सूची से रक्त समूह चुनें | યાદીમાંથી બ્લડ ગ્રુપ પસંદ કરો | [ ] |
| `validation.phone` | Enter a valid phone number, for example +91 00000 00001 | सही फ़ोन नंबर लिखें, जैसे +91 00000 00001 | સાચો ફોન નંબર લખો, જેમ કે +91 00000 00001 | [ ] |
| `timeline.title` | Timeline | समयरेखा | સમયરેખા | [ ] |
| `timeline.empty` | No events yet. | अभी कोई घटना नहीं। | હજી કોઈ ઘટના નથી. | [ ] |
| `notfound.title` | Page not found | पेज नहीं मिला | પેજ મળ્યું નથી | [ ] |
| `notfound.back` | Go to Home | होम पर जाएँ | હોમ પર જાઓ | [ ] |
| `home.emergency` | Emergency help | आपातकालीन मदद | કટોકટી મદદ | [ ] |
| `home.activeEmergency` | You have an active emergency | आपका एक आपातकाल चालू है | તમારી એક કટોકટી ચાલુ છે | [ ] |
| `home.returnToEmergency` | Return to it | उस पर लौटें | તેના પર પાછા જાઓ | [ ] |
| `instructions.general1` | Call 112 / 108 now. | अभी 112 / 108 पर कॉल करें। | હમણાં 112 / 108 પર કૉલ કરો. | [ ] |
| `instructions.general2` | If you can, unlock the door and tell someone nearby. | यदि हो सके तो दरवाज़ा खोल दें और आसपास किसी को बताएं। | જો શક્ય હોય તો દરવાજો ખોલી દો અને નજીકમાં કોઈને જણાવો. | [ ] |
| `instructions.general3` | Stay where you are. Your hospital has been alerted. | जहाँ हैं वहीं रहें। आपके अस्पताल को सूचित कर दिया गया है। | જ્યાં છો ત્યાં જ રહો. તમારી હૉસ્પિટલને જાણ કરવામાં આવી છે. | [ ] |
| `demo.title` | Demo tools | डेमो टूल | ડેમો ટૂલ્સ | [ ] |
| `demo.note` | Each button creates a simulated emergency and sends the alert at once. | हर बटन एक सिमुलेटेड आपातकाल बनाता है और तुरंत अलर्ट भेजता है। | દરેક બટન એક સિમ્યુલેટેડ કટોકટી બનાવે છે અને તરત ચેતવણી મોકલે છે. | [ ] |
| `demo.run` | Run {{type}} scenario | {{type}} परिदृश्य चलाएँ | {{type}} પરિદૃશ્ય ચલાવો | [ ] |
| `demo.reset` | Reset demo | डेमो रीसेट करें | ડેમો રીસેટ કરો | [ ] |
| `demo.resetDone` | Demo reset | डेमो रीसेट हो गया | ડેમો રીસેટ થયો | [ ] |
| `demo.error` | Could not reach the mock server. Is it running? | मॉक सर्वर से संपर्क नहीं हो सका। क्या वह चालू है? | મૉક સર્વર સુધી પહોંચી શકાયું નથી. શું તે ચાલુ છે? | [ ] |
| `demo.speedNote` | The mock server plays the hospital response in about 50 seconds. Start it with DEMO_SPEED=5 for a faster demo. | मॉक सर्वर अस्पताल की प्रतिक्रिया लगभग 50 सेकंड में दिखाता है। तेज़ डेमो के लिए इसे DEMO_SPEED=5 के साथ शुरू करें। | મૉક સર્વર હૉસ્પિટલનો પ્રતિસાદ લગભગ 50 સેકન્ડમાં બતાવે છે. ઝડપી ડેમો માટે તેને DEMO_SPEED=5 સાથે શરૂ કરો. | [ ] |
| `emergencyType.HEART` | Heart | हृदय | હૃદય | [ ] |
| `emergencyType.STROKE` | Stroke | स्ट्रोक | સ્ટ્રોક | [ ] |
| `emergencyType.DIABETIC` | Diabetic | मधुमेह | ડાયાબિટીસ | [ ] |
| `emergencyType.ASTHMA` | Asthma | दमा | અસ્થમા | [ ] |
| `common.back` | Back | वापस | પાછા | [ ] |
| `common.save` | Save | सहेजें | સાચવો | [ ] |
| `common.saving` | Saving... | सहेजा जा रहा है... | સાચવી રહ્યા છીએ... | [ ] |
| `common.saved` | Saved | सहेजा गया | સાચવાયું | [ ] |
| `common.retry` | Retry | दोबारा कोशिश करें | ફરી પ્રયત્ન કરો | [ ] |
| `common.cancel` | Cancel | रद्द करें | રદ કરો | [ ] |
| `common.edit` | Edit | संपादित करें | ફેરફાર કરો | [ ] |
| `common.delete` | Delete | हटाएँ | કાઢી નાખો | [ ] |
| `common.working` | Please wait... | कृपया प्रतीक्षा करें... | કૃપા કરીને રાહ જુઓ... | [ ] |
| `profile.links` | Your information | आपकी जानकारी | તમારી માહિતી | [ ] |
| `profile.consent` | Consent settings | सहमति सेटिंग | સંમતિ સેટિંગ | [ ] |
| `profile.reports` | Reports | रिपोर्ट | રિપોર્ટ | [ ] |
| `validation.relation` | Choose a relation from the list | सूची से संबंध चुनें | યાદીમાંથી સંબંધ પસંદ કરો | [ ] |
| `validation.fileType` | Only PDF, JPG or PNG files are allowed. | केवल PDF, JPG या PNG फ़ाइलें मान्य हैं। | ફક્ત PDF, JPG અથવા PNG ફાઇલોની મંજૂરી છે. | [ ] |
| `validation.fileSize` | This file is larger than 2 MB. | यह फ़ाइल 2 MB से बड़ी है। | આ ફાઇલ 2 MB કરતાં મોટી છે. | [ ] |
| `validation.fileEmpty` | This file is empty. | यह फ़ाइल खाली है। | આ ફાઇલ ખાલી છે. | [ ] |
| `contacts.title` | Emergency contacts | आपातकालीन संपर्क | કટોકટી સંપર્કો | [ ] |
| `contacts.intro` | Up to 5 people who can be told when you send an alert. One is your primary contact. | अधिकतम 5 लोग, जिन्हें आपके अलर्ट भेजने पर सूचित किया जा सकता है। एक आपका मुख्य संपर्क होता है। | વધુમાં વધુ 5 લોકો, જેમને તમે ચેતવણી મોકલો ત્યારે જાણ કરી શકાય. એક તમારો મુખ્ય સંપર્ક હોય છે. | [ ] |
| `contacts.loading` | Loading your contacts... | आपके संपर्क लोड हो रहे हैं... | તમારા સંપર્કો લોડ થઈ રહ્યા છે... | [ ] |
| `contacts.loadError` | Could not load your contacts. | आपके संपर्क लोड नहीं हो सके। | તમારા સંપર્કો લોડ થઈ શક્યા નથી. | [ ] |
| `contacts.empty` | You have no emergency contacts yet. | अभी आपका कोई आपातकालीन संपर्क नहीं है। | હજી તમારો કોઈ કટોકટી સંપર્ક નથી. | [ ] |
| `contacts.add` | Add contact | संपर्क जोड़ें | સંપર્ક ઉમેરો | [ ] |
| `contacts.edit` | Edit contact | संपर्क संपादित करें | સંપર્કમાં ફેરફાર કરો | [ ] |
| `contacts.name` | Name | नाम | નામ | [ ] |
| `contacts.relation` | Relation | संबंध | સંબંધ | [ ] |
| `contacts.relationPick` | Choose a relation | संबंध चुनें | સંબંધ પસંદ કરો | [ ] |
| `contacts.phone` | Phone | फ़ोन | ફોન | [ ] |
| `contacts.makePrimary` | Make this my primary contact | इसे मेरा मुख्य संपर्क बनाएँ | આને મારો મુખ્ય સંપર્ક બનાવો | [ ] |
| `contacts.makePrimaryShort` | Make primary | मुख्य बनाएँ | મુખ્ય બનાવો | [ ] |
| `contacts.primary` | Primary | मुख्य | મુખ્ય | [ ] |
| `contacts.editFor` | Edit {{name}} | {{name}} को संपादित करें | {{name}} માં ફેરફાર કરો | [ ] |
| `contacts.primaryFor` | Make primary: {{name}} | मुख्य बनाएँ: {{name}} | મુખ્ય બનાવો: {{name}} | [ ] |
| `contacts.deleteFor` | Delete {{name}} | {{name}} को हटाएँ | {{name}} ને કાઢી નાખો | [ ] |
| `contacts.limit` | You can save at most 5 contacts. Delete one to add another. | आप अधिकतम 5 संपर्क सहेज सकते हैं। नया जोड़ने के लिए एक हटाएँ। | તમે વધુમાં વધુ 5 સંપર્કો સાચવી શકો છો. નવો ઉમેરવા માટે એક કાઢી નાખો. | [ ] |
| `contacts.saveError` | Could not save this contact. Please try again. | यह संपर्क सहेजा नहीं जा सका। कृपया दोबारा कोशिश करें। | આ સંપર્ક સાચવી શકાયો નથી. કૃપા કરીને ફરી પ્રયત્ન કરો. | [ ] |
| `contacts.deleteError` | Could not delete this contact. Please try again. | यह संपर्क हटाया नहीं जा सका। कृपया दोबारा कोशिश करें। | આ સંપર્ક કાઢી શકાયો નથી. કૃપા કરીને ફરી પ્રયત્ન કરો. | [ ] |
| `contacts.confirmDelete` | Delete {{name}} from your contacts? | {{name}} को आपके संपर्कों से हटाएँ? | {{name}} ને તમારા સંપર્કોમાંથી કાઢી નાખવા છે? | [ ] |
| `contacts.confirmYes` | Yes, delete | हाँ, हटाएँ | હા, કાઢી નાખો | [ ] |
| `reports.title` | Reports | रिपोर्ट | રિપોર્ટ | [ ] |
| `reports.demoOnly` | Demo only. Do not upload real medical documents. | केवल डेमो। असली चिकित्सा दस्तावेज़ अपलोड न करें। | ફક્ત ડેમો માટે. અસલી તબીબી દસ્તાવેજો અપલોડ કરશો નહીં. | [ ] |
| `reports.choose` | Choose a report file | रिपोर्ट फ़ाइल चुनें | રિપોર્ટ ફાઇલ પસંદ કરો | [ ] |
| `reports.rules` | PDF, JPG or PNG, up to 2 MB each. Up to 10 reports. | PDF, JPG या PNG, प्रत्येक अधिकतम 2 MB। अधिकतम 10 रिपोर्ट। | PDF, JPG અથવા PNG, દરેક વધુમાં વધુ 2 MB. વધુમાં વધુ 10 રિપોર્ટ. | [ ] |
| `reports.uploading` | Uploading... | अपलोड हो रहा है... | અપલોડ થઈ રહ્યું છે... | [ ] |
| `reports.uploadError` | Could not upload this file. Please try again. | यह फ़ाइल अपलोड नहीं हो सकी। कृपया दोबारा कोशिश करें। | આ ફાઇલ અપલોડ થઈ શકી નથી. કૃપા કરીને ફરી પ્રયત્ન કરો. | [ ] |
| `reports.limit` | You can keep at most 10 reports. Delete one first. | आप अधिकतम 10 रिपोर्ट रख सकते हैं। पहले एक हटाएँ। | તમે વધુમાં વધુ 10 રિપોર્ટ રાખી શકો છો. પહેલાં એક કાઢી નાખો. | [ ] |
| `reports.loading` | Loading your reports... | आपकी रिपोर्ट लोड हो रही हैं... | તમારા રિપોર્ટ લોડ થઈ રહ્યા છે... | [ ] |
| `reports.loadError` | Could not load your reports. | आपकी रिपोर्ट लोड नहीं हो सकीं। | તમારા રિપોર્ટ લોડ થઈ શક્યા નથી. | [ ] |
| `reports.yours` | Your reports | आपकी रिपोर्ट | તમારા રિપોર્ટ | [ ] |
| `reports.empty` | No reports yet. | अभी कोई रिपोर्ट नहीं। | હજી કોઈ રિપોર્ટ નથી. | [ ] |
| `reports.shared` | Will be shared | साझा की जाएगी | શેર કરવામાં આવશે | [ ] |
| `reports.notShared` | Not shared: Reports sharing is off | साझा नहीं होगी: रिपोर्ट साझा करना बंद है | શેર નહીં થાય: રિપોર્ટ શેર કરવાનું બંધ છે | [ ] |
| `reports.open` | Open | खोलें | ખોલો | [ ] |
| `reports.openFor` | Open {{name}} | {{name}} खोलें | {{name}} ખોલો | [ ] |
| `reports.deleteFor` | Delete {{name}} | {{name}} हटाएँ | {{name}} કાઢી નાખો | [ ] |
| `reports.openError` | Could not open this report. | यह रिपोर्ट खोली नहीं जा सकी। | આ રિપોર્ટ ખોલી શકાયો નથી. | [ ] |
| `reports.deleteError` | Could not delete this report. Please try again. | यह रिपोर्ट हटाई नहीं जा सकी। कृपया दोबारा कोशिश करें। | આ રિપોર્ટ કાઢી શકાયો નથી. કૃપા કરીને ફરી પ્રયત્ન કરો. | [ ] |
| `reports.confirmDelete` | Delete {{name}}? | {{name}} हटाएँ? | {{name}} કાઢી નાખવો છે? | [ ] |
| `reports.confirmYes` | Yes, delete | हाँ, हटाएँ | હા, કાઢી નાખો | [ ] |
| `clock.title` | Time since alert | अलर्ट के बाद का समय | ચેતવણી પછીનો સમય | [ ] |
| `clock.alertSent` | Alert sent | अलर्ट भेजा गया | ચેતવણી મોકલાઈ | [ ] |
| `clock.acknowledged` | Hospital acknowledged | अस्पताल ने पुष्टि की | હૉસ્પિટલે સ્વીકાર્યું | [ ] |
| `clock.dispatched` | Ambulance dispatched | एम्बुलेंस रवाना की गई | એમ્બ્યુલન્સ રવાના કરાઈ | [ ] |
| `clock.arrived` | Arrived | पहुँच गई | પહોંચી ગઈ | [ ] |
| `clock.waiting` | Waiting... | प्रतीक्षा है... | રાહ જોવાઈ રહી છે... | [ ] |
| `clock.note` | Simulated timer. It is not medical advice. | सिमुलेटेड टाइमर। यह चिकित्सीय सलाह नहीं है। | સિમ્યુલેટેડ ટાઇમર. તે તબીબી સલાહ નથી. | [ ] |
| `clock.announce` | {{count}} minutes since alert | अलर्ट के बाद {{count}} मिनट | ચેતવણી પછી {{count}} મિનિટ | [ ] |
| `notified.title` | Contacts | संपर्क | સંપર્કો | [ ] |
| `notified.done` | Your contacts were notified (simulated) | आपके संपर्कों को सूचित किया गया (सिमुलेटेड) | તમારા સંપર્કોને જાણ કરવામાં આવી (સિમ્યુલેટેડ) | [ ] |
| `notified.none` | You have no emergency contacts. | आपका कोई आपातकालीन संपर्क नहीं है। | તમારો કોઈ કટોકટી સંપર્ક નથી. | [ ] |
| `notified.add` | Add some in Profile. | प्रोफ़ाइल में कुछ जोड़ें। | પ્રોફાઇલમાં થોડા ઉમેરો. | [ ] |
| `language.label` | Language | भाषा | ભાષા | [ ] |
| `language.deviceOnly` | Language changed on this device only. It could not be saved to your profile. | भाषा केवल इस डिवाइस पर बदली गई। इसे आपकी प्रोफ़ाइल में सहेजा नहीं जा सका। | ભાષા ફક્ત આ ડિવાઇસ પર બદલાઈ. તે તમારી પ્રોફાઇલમાં સાચવી શકાઈ નથી. | [ ] |
| `a11y.skip` | Skip to content | सामग्री पर जाएँ | સામગ્રી પર જાઓ | [ ] |
| `demo.build` | App version {{version}} · API {{api}} | ऐप संस्करण {{version}} · API {{api}} | એપ આવૃત્તિ {{version}} · API {{api}} | [ ] |
| `relation.Mother` | Mother | माँ | માતા | [ ] |
| `relation.Father` | Father | पिता | પિતા | [ ] |
| `relation.Spouse` | Spouse | जीवनसाथी | જીવનસાથી | [ ] |
| `relation.Sibling` | Sibling | भाई/बहन | ભાઈ/બહેન | [ ] |
| `relation.Child` | Child | बच्चा | સંતાન | [ ] |
| `relation.Friend` | Friend | दोस्त | મિત્ર | [ ] |
| `relation.Other` | Other | अन्य | અન્ય | [ ] |
| `home.passport` | Health passport (QR) | स्वास्थ्य पासपोर्ट (QR) | આરોગ્ય પાસપોર્ટ (QR) | [ ] |
| `profile.passport` | Health passport (QR) | स्वास्थ्य पासपोर्ट (QR) | આરોગ્ય પાસપોર્ટ (QR) | [ ] |

## Phase 6 additions: high priority (124 strings)

Medical-sounding or safety-relevant wording (the "Why this alert" card, safety check-in, SMS fallback, reminders, record/summary and trend labels). Please have a native speaker who knows health wording check these first. Several are deliberately neutral ("checklist", "usual range", "record"): keep them neutral, do not make them sound like a diagnosis, a score or advice.

| Key | English | Hindi | Gujarati | Checked |
|---|---|---|---|---|
| `why.title` | Why this alert | यह अलर्ट क्यों | આ એલર્ટ કેમ | [ ] |
| `why.loading` | Loading... | लोड हो रहा है... | લોડ થઈ રહ્યું છે... | [ ] |
| `why.unavailable` | Reasons are not available right now | कारण अभी उपलब्ध नहीं हैं | કારણો હમણાં ઉપલબ્ધ નથી | [ ] |
| `why.told` | What you told us | आपने हमें क्या बताया | તમે અમને શું જણાવ્યું | [ ] |
| `why.noneReported` | You did not report any symptoms. | आपने कोई लक्षण नहीं बताया। | તમે કોઈ લક્ષણ જણાવ્યું નથી. | [ ] |
| `why.noneCheckIn` | You did not report symptoms. This alert started from the safety check-in. | आपने कोई लक्षण नहीं बताया। यह अलर्ट सुरक्षा जाँच से शुरू हुआ। | તમે કોઈ લક્ષણ જણાવ્યું નથી. આ એલર્ટ સલામતી તપાસથી શરૂ થયું. | [ ] |
| `why.readings` | What your readings showed | आपकी रीडिंग में क्या दिखा | તમારા રીડિંગમાં શું દેખાયું | [ ] |
| `why.noReadings` | No readings were shared. Live vitals sharing is off, or no reading was available. | कोई रीडिंग साझा नहीं की गई। लाइव वाइटल्स साझा करना बंद है, या कोई रीडिंग उपलब्ध नहीं थी। | કોઈ રીડિંગ શેર થયું નથી. લાઇવ વાઇટલ્સ શેર કરવું બંધ છે, અથવા કોઈ રીડિંગ ઉપલબ્ધ નહોતું. | [ ] |
| `why.readingsAt` | Reading taken at {{time}} | रीडिंग का समय: {{time}} | રીડિંગનો સમય: {{time}} | [ ] |
| `why.checklist` | Which checklist matched | कौन सी जाँच-सूची मेल खाई | કઈ ચેકલિસ્ટ મેળ ખાધી | [ ] |
| `why.neutral` | This combination is on our alert checklist. | यह संयोजन हमारी अलर्ट जाँच-सूची में है। | આ સંયોજન અમારી એલર્ટ ચેકલિસ્ટમાં છે. | [ ] |
| `why.noMatch` | Nothing matched our checklist. This does not say anything about your health. | कुछ भी हमारी जाँच-सूची से मेल नहीं खाया। इससे आपके स्वास्थ्य के बारे में कुछ नहीं कहा जा सकता। | કંઈ પણ અમારી ચેકલિસ્ટ સાથે મેળ ખાધું નથી. તેનાથી તમારા સ્વાસ્થ્ય વિશે કંઈ કહી શકાય નહીં. | [ ] |
| `why.draft` | This checklist is a draft waiting for a doctor to review. It does not say what is wrong with you. If you feel unwell, call 112 / 108. | यह जाँच-सूची एक मसौदा है जिसे डॉक्टर की समीक्षा का इंतज़ार है। यह नहीं बताती कि आपको क्या समस्या है। अस्वस्थ लगे तो 112 / 108 पर कॉल करें। | આ ચેકલિસ્ટ એક ડ્રાફ્ટ છે જે ડૉક્ટરની સમીક્ષાની રાહ જુએ છે. તે એ નથી કહેતી કે તમને શું તકલીફ છે. અસ્વસ્થ લાગે તો 112 / 108 પર કૉલ કરો. | [ ] |
| `twin.resp_rate` | Breathing rate | साँस की दर | શ્વાસનો દર | [ ] |
| `twin.alt` | {{name}} over the last minute: between {{min}} and {{max}}, usual range {{usual}}. | {{name}}, पिछले एक मिनट में: {{min}} से {{max}} के बीच, सामान्य सीमा {{usual}}। | {{name}}, છેલ્લી એક મિનિટમાં: {{min}} થી {{max}} વચ્ચે, સામાન્ય સીમા {{usual}}. | [ ] |
| `twin.altBp` | Blood pressure over the last minute: top number between {{smin}} and {{smax}}, bottom number between {{dmin}} and {{dmax}}, usual range {{usual}}. | रक्तचाप, पिछले एक मिनट में: ऊपर की संख्या {{smin}} से {{smax}} के बीच, नीचे की संख्या {{dmin}} से {{dmax}} के बीच, सामान्य सीमा {{usual}}। | બ્લડ પ્રેશર, છેલ્લી એક મિનિટમાં: ઉપરનો આંકડો {{smin}} થી {{smax}} વચ્ચે, નીચેનો આંકડો {{dmin}} થી {{dmax}} વચ્ચે, સામાન્ય સીમા {{usual}}. | [ ] |
| `twin.collecting` | Collecting readings... | रीडिंग जमा हो रही हैं... | રીડિંગ એકઠા થઈ રહ્યા છે... | [ ] |
| `twin.sharingOff` | Live vitals sharing is off | लाइव वाइटल्स साझा करना बंद है | લાઇવ વાઇટલ્સ શેર કરવું બંધ છે | [ ] |
| `twin.sharingOffLink` | Change in Consent settings | सहमति सेटिंग में बदलें | સંમતિ સેટિંગમાં બદલો | [ ] |
| `twin.simulated` | Simulated wearable data | सिमुलेटेड वियरेबल डेटा | સિમ્યુલેટેડ વેરેબલ ડેટા | [ ] |
| `checkin.title` | Are you OK? | क्या आप ठीक हैं? | શું તમે ઠીક છો? | [ ] |
| `checkin.countdown` | Alert starts in {{count}} seconds if you do not answer | अगर आप जवाब नहीं देते तो {{count}} सेकंड में अलर्ट शुरू होगा | જો તમે જવાબ ન આપો તો {{count}} સેકન્ડમાં એલર્ટ શરૂ થશે | [ ] |
| `checkin.announce` | {{count}} seconds left to answer | जवाब देने के लिए {{count}} सेकंड बचे हैं | જવાબ આપવા માટે {{count}} સેકન્ડ બાકી છે | [ ] |
| `checkin.imOk` | I'm OK | मैं ठीक हूँ | હું ઠીક છું | [ ] |
| `checkin.starting` | Starting the alert... | अलर्ट शुरू हो रहा है... | એલર્ટ શરૂ થઈ રહ્યું છે... | [ ] |
| `checkin.simulatedFall` | Simulated fall | सिमुलेटेड गिरना | સિમ્યુલેટેડ પડી જવું | [ ] |
| `checkin.inactivity` | Safety check-in | सुरक्षा जाँच | સલામતી તપાસ | [ ] |
| `checkin.soundOn` | Sound and vibration: on (tap to mute) | आवाज़ और कंपन: चालू (बंद करने के लिए टैप करें) | અવાજ અને વાઇબ્રેશન: ચાલુ (બંધ કરવા ટૅપ કરો) | [ ] |
| `checkin.soundOff` | Sound and vibration: off (tap to turn on) | आवाज़ और कंपन: बंद (चालू करने के लिए टैप करें) | અવાજ અને વાઇબ્રેશન: બંધ (ચાલુ કરવા ટૅપ કરો) | [ ] |
| `checkin.note` | Simulated safety check-in. If you do not answer, the app starts an alert like the emergency button does. Call 112 / 108 any time. | सिमुलेटेड सुरक्षा जाँच। अगर आप जवाब नहीं देते, तो ऐप आपातकालीन बटन की तरह अलर्ट शुरू करता है। कभी भी 112 / 108 पर कॉल करें। | સિમ્યુલેટેડ સલામતી તપાસ. જો તમે જવાબ ન આપો, તો એપ કટોકટી બટનની જેમ એલર્ટ શરૂ કરે છે. ગમે ત્યારે 112 / 108 પર કૉલ કરો. | [ ] |
| `checkinSetting.title` | Safety check-in | सुरक्षा जाँच | સલામતી તપાસ | [ ] |
| `checkinSetting.help` | If you turn this on and do not touch your phone for a while, the app asks "Are you OK?". If you do not answer in 30 seconds, it starts an alert. | इसे चालू करने पर, अगर आप कुछ देर फ़ोन नहीं छूते, तो ऐप पूछता है "क्या आप ठीक हैं?"। 30 सेकंड में जवाब न देने पर वह अलर्ट शुरू करता है। | આને ચાલુ કરશો અને થોડા સમય સુધી ફોનને અડશો નહીં, તો એપ પૂછશે "શું તમે ઠીક છો?". 30 સેકન્ડમાં જવાબ ન આપો તો તે એલર્ટ શરૂ કરે છે. | [ ] |
| `checkinSetting.after` | Ask me after | इतनी देर बाद पूछें | આટલા સમય પછી પૂછો | [ ] |
| `checkinSetting.minutes` | {{count}} minutes | {{count}} मिनट | {{count}} મિનિટ | [ ] |
| `checkinSetting.limits` | This works only while the app is open on your screen. It cannot detect a fall by itself and cannot run when the app is closed. | यह तभी काम करता है जब ऐप आपकी स्क्रीन पर खुला हो। यह खुद गिरना नहीं पहचान सकता और ऐप बंद होने पर नहीं चल सकता। | આ ત્યારે જ કામ કરે છે જ્યારે એપ તમારી સ્ક્રીન પર ખુલ્લી હોય. તે જાતે પડી જવું ઓળખી શકતું નથી અને એપ બંધ હોય ત્યારે ચાલી શકતું નથી. | [ ] |
| `checkinSetting.failed` | Could not save. The setting was put back. | सहेजा नहीं जा सका। सेटिंग पहले जैसी कर दी गई। | સાચવી શકાયું નથી. સેટિંગ પહેલાં જેવું કરી દેવાયું. | [ ] |
| `sms.title` | No internet. Tell your contacts by SMS | इंटरनेट नहीं है। अपने संपर्कों को SMS से बताएँ | ઇન્ટરનેટ નથી. તમારા સંપર્કોને SMS થી જણાવો | [ ] |
| `sms.help` | Your phone will open its messages app with the text ready. You must press send yourself. | आपका फ़ोन संदेश ऐप खोलेगा और पाठ तैयार रहेगा। भेजें आपको खुद दबाना होगा। | તમારો ફોન મેસેજ એપ ખોલશે અને લખાણ તૈયાર હશે. મોકલો તમારે જાતે દબાવવું પડશે. | [ ] |
| `sms.textLabel` | The text that will be used: | इस्तेमाल होने वाला पाठ: | વપરાનાર લખાણ: | [ ] |
| `sms.body` | I need help. This is a simulated alert from the HealthTwin demo. | मुझे मदद चाहिए। यह HealthTwin डेमो का सिमुलेटेड अलर्ट है। | મને મદદ જોઈએ છે. આ HealthTwin ડેમોનું સિમ્યુલેટેડ એલર્ટ છે. | [ ] |
| `sms.button` | SMS {{name}} | {{name}} को SMS करें | {{name}} ને SMS કરો | [ ] |
| `sms.loading` | Loading your contacts... | आपके संपर्क लोड हो रहे हैं... | તમારા સંપર્કો લોડ થઈ રહ્યા છે... | [ ] |
| `sms.cannotKnow` | The app cannot tell whether an SMS was sent. Call 112 / 108 if you need help now. | ऐप यह नहीं जान सकता कि SMS भेजा गया या नहीं। अभी मदद चाहिए तो 112 / 108 पर कॉल करें। | એપ જાણી શકતી નથી કે SMS મોકલાયો કે નહીં. હમણાં મદદ જોઈએ તો 112 / 108 પર કૉલ કરો. | [ ] |
| `reminders.title` | Medicine reminders | दवा के रिमाइंडर | દવાના રિમાઇન્ડર | [ ] |
| `reminders.openOnly` | Reminders only work while this app is open. Do not rely on them for medicines you cannot miss. | रिमाइंडर तभी काम करते हैं जब यह ऐप खुला हो। जो दवाएँ छूट नहीं सकतीं, उनके लिए इन पर निर्भर न रहें। | રિમાઇન્ડર ત્યારે જ કામ કરે છે જ્યારે આ એપ ખુલ્લી હોય. જે દવાઓ ચૂકી શકાય નહીં તેના માટે તેના પર આધાર રાખશો નહીં. | [ ] |
| `reminders.missed` | Missed a dose? Ask your doctor or pharmacist what to do. | कोई खुराक छूट गई? अपने डॉक्टर या फ़ार्मासिस्ट से पूछें कि क्या करना है। | કોઈ ડોઝ ચૂકી ગયા? શું કરવું તે તમારા ડૉક્ટર અથવા ફાર્માસિસ્ટને પૂછો. | [ ] |
| `reminders.loading` | Loading your reminders... | आपके रिमाइंडर लोड हो रहे हैं... | તમારા રિમાઇન્ડર લોડ થઈ રહ્યા છે... | [ ] |
| `reminders.loadError` | Could not load your reminders. | आपके रिमाइंडर लोड नहीं हो सके। | તમારા રિમાઇન્ડર લોડ થઈ શક્યા નથી. | [ ] |
| `reminders.add` | Add a reminder | रिमाइंडर जोड़ें | રિમાઇન્ડર ઉમેરો | [ ] |
| `reminders.addTitle` | New reminder | नया रिमाइंडर | નવું રિમાઇન્ડર | [ ] |
| `reminders.editTitle` | Edit reminder | रिमाइंडर बदलें | રિમાઇન્ડર બદલો | [ ] |
| `reminders.name` | Medicine name | दवा का नाम | દવાનું નામ | [ ] |
| `reminders.doseNote` | Dose note (as written by your doctor) | खुराक का नोट (जैसा आपके डॉक्टर ने लिखा है) | ડોઝની નોંધ (તમારા ડૉક્ટરે લખ્યા મુજબ) | [ ] |
| `reminders.times` | Times | समय | સમય | [ ] |
| `reminders.timeN` | Time {{n}} | समय {{n}} | સમય {{n}} | [ ] |
| `reminders.addTime` | Add a time | समय जोड़ें | સમય ઉમેરો | [ ] |
| `reminders.removeTime` | Remove | हटाएँ | દૂર કરો | [ ] |
| `reminders.days` | Days | दिन | દિવસો | [ ] |
| `reminders.saveError` | Could not save. Please try again. | सहेजा नहीं जा सका। कृपया दोबारा कोशिश करें। | સાચવી શકાયું નથી. કૃપા કરીને ફરી પ્રયાસ કરો. | [ ] |
| `reminders.empty` | You have no reminders yet. | आपके पास अभी कोई रिमाइंडर नहीं है। | તમારી પાસે હજી કોઈ રિમાઇન્ડર નથી. | [ ] |
| `reminders.maxReached` | You can have at most {{count}} reminders. | आपके अधिकतम {{count}} रिमाइंडर हो सकते हैं। | તમારા વધુમાં વધુ {{count}} રિમાઇન્ડર હોઈ શકે. | [ ] |
| `reminders.paused` | Paused | रुका हुआ | થોભાવેલું | [ ] |
| `reminders.pause` | Pause | रोकें | થોભાવો | [ ] |
| `reminders.resume` | Resume | फिर शुरू करें | ફરી શરૂ કરો | [ ] |
| `reminders.everyDay` | Every day | हर दिन | દરરોજ | [ ] |
| `reminders.next` | Next: {{time}} | अगला: {{time}} | આગળનું: {{time}} | [ ] |
| `reminders.deleteConfirm` | Delete the reminder for {{name}}? | {{name}} का रिमाइंडर हटाएँ? | {{name}} નું રિમાઇન્ડર કાઢી નાખવું છે? | [ ] |
| `reminders.logTitle` | Last 7 days | पिछले 7 दिन | છેલ્લા 7 દિવસ | [ ] |
| `reminders.logEmpty` | Nothing recorded yet. | अभी कुछ दर्ज नहीं हुआ। | હજી કંઈ નોંધાયું નથી. | [ ] |
| `reminders.takenAt` | Marked taken at {{time}} | {{time}} पर लिया हुआ चिह्नित | {{time}} એ લીધેલું ચિહ્નિત | [ ] |
| `reminders.notMarked` | Not marked as taken | लिया हुआ चिह्नित नहीं | લીધેલું ચિહ્નિત નથી | [ ] |
| `reminders.bannerLabel` | Medicine reminder | दवा का रिमाइंडर | દવાનું રિમાઇન્ડર | [ ] |
| `reminders.timeFor` | Time for: {{name}} | समय हो गया: {{name}} | સમય થયો: {{name}} | [ ] |
| `reminders.dueAt` | Due at {{time}} | नियत समय {{time}} | નિયત સમય {{time}} | [ ] |
| `reminders.more` | {{count}} more due | {{count}} और बाकी | {{count}} વધુ બાકી | [ ] |
| `reminders.taken` | Taken | ले ली | લીધી | [ ] |
| `reminders.snooze` | Remind me in 10 minutes | 10 मिनट बाद याद दिलाएँ | 10 મિનિટ પછી યાદ અપાવો | [ ] |
| `reminders.notifyTitle` | Reminder from HealthTwin | HealthTwin की ओर से रिमाइंडर | HealthTwin તરફથી રિમાઇન્ડર | [ ] |
| `reminders.notifyBody` | Open the app to see it. | देखने के लिए ऐप खोलें। | જોવા માટે એપ ખોલો. | [ ] |
| `reminders.err.name` | Enter the medicine name. | दवा का नाम लिखें। | દવાનું નામ લખો. | [ ] |
| `reminders.err.nameLong` | Use 60 characters or fewer. | 60 अक्षर या उससे कम रखें। | 60 અક્ષર કે તેથી ઓછા રાખો. | [ ] |
| `reminders.err.noteLong` | Use 60 characters or fewer. | 60 अक्षर या उससे कम रखें। | 60 અક્ષર કે તેથી ઓછા રાખો. | [ ] |
| `reminders.err.times` | Add at least one valid time. | कम से कम एक सही समय जोड़ें। | ઓછામાં ઓછો એક સાચો સમય ઉમેરો. | [ ] |
| `reminders.err.timesRepeat` | Each time must be different. | हर समय अलग होना चाहिए। | દરેક સમય અલગ હોવો જોઈએ. | [ ] |
| `reminders.err.days` | Choose at least one day. | कम से कम एक दिन चुनें। | ઓછામાં ઓછો એક દિવસ પસંદ કરો. | [ ] |
| `summary.title` | Alert record | अलर्ट का रिकॉर्ड | એલર્ટનો રેકોર્ડ | [ ] |
| `summary.record` | This is a record of what the app did. It does not describe your health. | यह इसका रिकॉर्ड है कि ऐप ने क्या किया। यह आपके स्वास्थ्य के बारे में कुछ नहीं बताता। | આ એપે શું કર્યું તેનો રેકોર્ડ છે. તે તમારા સ્વાસ્થ્ય વિશે કંઈ જણાવતો નથી. | [ ] |
| `summary.loading` | Loading the record... | रिकॉर्ड लोड हो रहा है... | રેકોર્ડ લોડ થઈ રહ્યો છે... | [ ] |
| `summary.notFound` | This record was not found. | यह रिकॉर्ड नहीं मिला। | આ રેકોર્ડ મળ્યો નથી. | [ ] |
| `summary.error` | Could not load this record. | यह रिकॉर्ड लोड नहीं हो सका। | આ રેકોર્ડ લોડ થઈ શક્યો નથી. | [ ] |
| `summary.docTitle` | HealthTwin AI: record of an alert (simulated) | HealthTwin AI: अलर्ट का रिकॉर्ड (सिमुलेटेड) | HealthTwin AI: એલર્ટનો રેકોર્ડ (સિમ્યુલેટેડ) | [ ] |
| `summary.started` | Started: {{time}} | शुरू हुआ: {{time}} | શરૂ થયું: {{time}} | [ ] |
| `summary.startedBy` | Started by: {{who}} | किसने शुरू किया: {{who}} | કોણે શરૂ કર્યું: {{who}} | [ ] |
| `summary.by.MANUAL` | You (emergency button) | आपने (आपातकालीन बटन) | તમે (કટોકટી બટન) | [ ] |
| `summary.by.FALL_CHECK` | Safety check-in (simulated fall) | सुरक्षा जाँच (सिमुलेटेड गिरना) | સલામતી તપાસ (સિમ્યુલેટેડ પડી જવું) | [ ] |
| `summary.by.INACTIVITY_CHECK` | Safety check-in (no activity) | सुरक्षा जाँच (कोई गतिविधि नहीं) | સલામતી તપાસ (કોઈ પ્રવૃત્તિ નહીં) | [ ] |
| `summary.timeline` | Timeline | समयरेखा | સમયરેખા | [ ] |
| `summary.after.ack` | Hospital acknowledged after {{time}} | अस्पताल ने {{time}} बाद पुष्टि की | હોસ્પિટલે {{time}} પછી સ્વીકાર્યું | [ ] |
| `summary.after.dispatch` | Ambulance dispatched after {{time}} | एम्बुलेंस {{time}} बाद रवाना की गई | એમ્બ્યુલન્સ {{time}} પછી રવાના કરાઈ | [ ] |
| `summary.after.arrive` | Ambulance arrived after {{time}} | एम्बुलेंस {{time}} बाद पहुँची | એમ્બ્યુલન્સ {{time}} પછી પહોંચી | [ ] |
| `summary.after.handover` | Handover done after {{time}} | हस्तांतरण {{time}} बाद पूरा हुआ | સોંપણી {{time}} પછી પૂર્ણ થઈ | [ ] |
| `summary.minSec` | {{m}} min {{s}} s | {{m}} मिनट {{s}} सेकंड | {{m}} મિનિટ {{s}} સેકન્ડ | [ ] |
| `summary.sec` | {{s}} s | {{s}} सेकंड | {{s}} સેકન્ડ | [ ] |
| `summary.sharedTitle` | Shared with the hospital | अस्पताल के साथ साझा किया गया | હોસ્પિટલ સાથે શેર કર્યું | [ ] |
| `summary.nothingShared` | Nothing was shared. | कुछ भी साझा नहीं किया गया। | કંઈ શેર કરાયું નથી. | [ ] |
| `summary.hospital` | Hospital | अस्पताल | હોસ્પિટલ | [ ] |
| `summary.contactsTitle` | Contacts notified (simulated) | सूचित संपर्क (सिमुलेटेड) | જાણ કરાયેલા સંપર્કો (સિમ્યુલેટેડ) | [ ] |
| `summary.symptomsTitle` | Symptoms you reported | आपके बताए लक्षण | તમે જણાવેલા લક્ષણો | [ ] |
| `summary.readingsTitle` | Readings at the time of the alert | अलर्ट के समय की रीडिंग | એલર્ટ સમયના રીડિંગ | [ ] |
| `summary.none` | None | कोई नहीं | કોઈ નહીં | [ ] |
| `summary.notesTitle` | Questions for my doctor | मेरे डॉक्टर के लिए प्रश्न | મારા ડૉક્ટર માટે પ્રશ્નો | [ ] |
| `summary.notesPlaceholder` | Type your own notes here. They stay on this screen and are added to the text you share. | अपने नोट यहाँ लिखें। वे इसी स्क्रीन पर रहते हैं और आप जो पाठ साझा करते हैं उसमें जुड़ जाते हैं। | તમારી પોતાની નોંધ અહીં લખો. તે આ સ્ક્રીન પર જ રહે છે અને તમે શેર કરો છો તે લખાણમાં ઉમેરાય છે. | [ ] |
| `summary.footer` | Prepared by the app. Not verified by a doctor. | ऐप द्वारा तैयार किया गया। डॉक्टर द्वारा सत्यापित नहीं। | એપ દ્વારા તૈયાર કરાયું. ડૉક્ટર દ્વારા ચકાસાયેલું નથી. | [ ] |
| `summary.share` | Share | साझा करें | શેર કરો | [ ] |
| `summary.copy` | Copy text | पाठ कॉपी करें | લખાણ કૉપિ કરો | [ ] |
| `summary.download` | Download as text file | टेक्स्ट फ़ाइल डाउनलोड करें | ટેક્સ્ટ ફાઇલ ડાઉનલોડ કરો | [ ] |
| `summary.print` | Print / Save as PDF | प्रिंट करें / PDF में सहेजें | પ્રિન્ટ કરો / PDF માં સાચવો | [ ] |
| `summary.copied` | Copied. | कॉपी हो गया। | કૉપિ થઈ ગયું. | [ ] |
| `summary.copyFailed` | Could not copy. Use Download instead. | कॉपी नहीं हो सका। इसके बजाय डाउनलोड करें। | કૉપિ થઈ શક્યું નથી. તેના બદલે ડાઉનલોડ કરો. | [ ] |
| `summary.downloaded` | Downloaded. | डाउनलोड हो गया। | ડાઉનલોડ થઈ ગયું. | [ ] |
| `summary.shareFailed` | Could not share. Use Copy or Download instead. | साझा नहीं हो सका। इसके बजाय कॉपी या डाउनलोड करें। | શેર થઈ શક્યું નથી. તેના બદલે કૉપિ અથવા ડાઉનલોડ કરો. | [ ] |
| `summary.shareNote` | You choose where this goes. The app does not upload or send it. | यह कहाँ जाएगा, यह आप तय करते हैं। ऐप इसे अपलोड या भेजता नहीं है। | આ ક્યાં જશે તે તમે નક્કી કરો છો. એપ તેને અપલોડ કે મોકલતી નથી. | [ ] |
| `past.title` | Past alerts | पिछले अलर्ट | અગાઉના એલર્ટ | [ ] |
| `past.none` | No past alerts yet. | अभी कोई पिछला अलर्ट नहीं है। | હજી કોઈ અગાઉનું એલર્ટ નથી. | [ ] |

## Phase 6 additions: everything else (50 strings)

Demo panel and rehearsal checklist text (only visible in demo builds) and small labels.

| Key | English | Hindi | Gujarati | Checked |
|---|---|---|---|---|
| `unit.bpm` | bpm | bpm | bpm | [ ] |
| `unit.percent` | % | % | % | [ ] |
| `unit.mgdl` | mg/dL | mg/dL | mg/dL | [ ] |
| `unit.perMinute` | per minute | प्रति मिनट | પ્રતિ મિનિટ | [ ] |
| `unit.mmhg` | mmHg | mmHg | mmHg | [ ] |
| `emergency.fromCheckIn` | Started because you did not answer the safety check-in (simulated) | शुरू हुआ क्योंकि आपने सुरक्षा जाँच का जवाब नहीं दिया (सिमुलेटेड) | શરૂ થયું કારણ કે તમે સલામતી તપાસનો જવાબ આપ્યો નહીં (સિમ્યુલેટેડ) | [ ] |
| `emergency.backOnlineSending` | Back online. Sending your alert... | इंटरनेट वापस आ गया। आपका अलर्ट भेजा जा रहा है... | ઇન્ટરનેટ પાછું આવ્યું. તમારું એલર્ટ મોકલાઈ રહ્યું છે... | [ ] |
| `emergency.backOnlineSent` | Back online. Your alert was sent. | इंटरनेट वापस आ गया। आपका अलर्ट भेज दिया गया। | ઇન્ટરનેટ પાછું આવ્યું. તમારું એલર્ટ મોકલાઈ ગયું. | [ ] |
| `emergency.viewSummary` | See the record of this alert | इस अलर्ट का रिकॉर्ड देखें | આ એલર્ટનો રેકોર્ડ જુઓ | [ ] |
| `emergencyType.UNKNOWN` | Safety check-in | सुरक्षा जाँच | સલામતી તપાસ | [ ] |
| `home.reminders` | Medicine reminders | दवा के रिमाइंडर | દવાના રિમાઇન્ડર | [ ] |
| `profile.reminders` | Medicine reminders | दवा के रिमाइंडर | દવાના રિમાઇન્ડર | [ ] |
| `demo.status` | Speed {{speed}}× · Vitals: {{profile}} | गति {{speed}}× · वाइटल्स: {{profile}} | ઝડપ {{speed}}× · વાઇટલ્સ: {{profile}} | [ ] |
| `demo.statusLoading` | Loading demo state... | डेमो की स्थिति लोड हो रही है... | ડેમોની સ્થિતિ લોડ થઈ રહી છે... | [ ] |
| `demo.speedTitle` | Speed | गति | ઝડપ | [ ] |
| `demo.speedHelp` | Applies to alerts started after you change it. | बदलाव के बाद शुरू होने वाले अलर्ट पर लागू होता है। | બદલ્યા પછી શરૂ થતા એલર્ટ પર લાગુ પડે છે. | [ ] |
| `demo.profileTitle` | Simulated wearable (vitals profile) | सिमुलेटेड वियरेबल (वाइटल्स प्रोफ़ाइल) | સિમ્યુલેટેડ વેરેબલ (વાઇટલ્સ પ્રોફાઇલ) | [ ] |
| `demo.profile.normal` | Resting | आराम की स्थिति | આરામની સ્થિતિ | [ ] |
| `demo.profile.heart_attack` | Heart emergency | हृदय आपातकाल | હૃદય કટોકટી | [ ] |
| `demo.profile.stroke` | Stroke | स्ट्रोक | સ્ટ્રોક | [ ] |
| `demo.profile.low_glucose` | Low glucose | कम ग्लूकोज़ | ઓછું ગ્લુકોઝ | [ ] |
| `demo.profile.asthma` | Asthma | अस्थमा | અસ્થમા | [ ] |
| `demo.pinTitle` | Pin a value (leave empty for automatic) | कोई मान तय करें (खाली छोड़ें तो अपने आप) | કોઈ કિંમત નક્કી કરો (ખાલી રાખો તો આપોઆપ) | [ ] |
| `demo.vital.heart_rate` | Heart rate | हृदय गति | હૃદયના ધબકારા | [ ] |
| `demo.vital.spo2` | SpO2 | SpO2 | SpO2 | [ ] |
| `demo.vital.bp_sys` | BP top number | रक्तचाप ऊपर की संख्या | બ્લડ પ્રેશર ઉપરનો આંકડો | [ ] |
| `demo.vital.bp_dia` | BP bottom number | रक्तचाप नीचे की संख्या | બ્લડ પ્રેશર નીચેનો આંકડો | [ ] |
| `demo.vital.glucose` | Glucose | ग्लूकोज़ | ગ્લુકોઝ | [ ] |
| `demo.vital.resp_rate` | Breathing rate | साँस की दर | શ્વાસનો દર | [ ] |
| `demo.pinApply` | Apply | लागू करें | લાગુ કરો | [ ] |
| `demo.pinClear` | Clear pinned values | तय किए मान हटाएँ | નક્કી કરેલી કિંમતો હટાવો | [ ] |
| `demo.simTitle` | Simulate | सिमुलेट करें | સિમ્યુલેટ કરો | [ ] |
| `demo.fall` | Simulated fall | सिमुलेटेड गिरना | સિમ્યુલેટેડ પડી જવું | [ ] |
| `demo.offline` | No data connection (simulated) | डेटा कनेक्शन नहीं (सिमुलेटेड) | ડેટા કનેક્શન નથી (સિમ્યુલેટેડ) | [ ] |
| `demo.serverError` | Server errors (simulated) | सर्वर त्रुटियाँ (सिमुलेटेड) | સર્વર ભૂલો (સિમ્યુલેટેડ) | [ ] |
| `demo.simHelp` | These switches only change the app's behaviour. They never touch your real network. Reset turns them off. | ये स्विच केवल ऐप का व्यवहार बदलते हैं। ये आपके असली नेटवर्क को नहीं छूते। रीसेट करने पर ये बंद हो जाते हैं। | આ સ્વિચ ફક્ત એપની વર્તણૂક બદલે છે. તે તમારા સાચા નેટવર્કને અડતા નથી. રીસેટ કરવાથી તે બંધ થાય છે. | [ ] |
| `rehearsal.title` | Rehearsal script | रिहर्सल सूची | રિહર્સલ યાદી | [ ] |
| `rehearsal.reset` | Press Reset demo, then sign in | डेमो रीसेट दबाएँ, फिर साइन इन करें | ડેમો રીસેટ દબાવો, પછી સાઇન ઇન કરો | [ ] |
| `rehearsal.home` | Home: live vitals, trend and usual range | होम: लाइव वाइटल्स, ट्रेंड और सामान्य सीमा | હોમ: લાઇવ વાઇટલ્સ, ટ્રેન્ડ અને સામાન્ય સીમા | [ ] |
| `rehearsal.language` | Switch to Hindi, then Gujarati, then English | हिन्दी, फिर ગુજરાતી, फिर English चुनें | હિન્દી, પછી ગુજરાતી, પછી English પસંદ કરો | [ ] |
| `rehearsal.profile` | Choose the Heart emergency profile and watch the trend change | हृदय आपातकाल प्रोफ़ाइल चुनें और ट्रेंड बदलते देखें | હૃદય કટોકટી પ્રોફાઇલ પસંદ કરો અને ટ્રેન્ડ બદલાતો જુઓ | [ ] |
| `rehearsal.scenario` | Run a scenario (for example Stroke) | एक परिदृश्य चलाएँ (जैसे स्ट्रोक) | એક પરિદૃશ્ય ચલાવો (જેમ કે સ્ટ્રોક) | [ ] |
| `rehearsal.why` | Open Why this alert | "यह अलर्ट क्यों" खोलें | "આ એલર્ટ કેમ" ખોલો | [ ] |
| `rehearsal.contacts` | Point out the contacts notified and Time since alert | सूचित संपर्क और अलर्ट के बाद का समय दिखाएँ | જાણ કરાયેલા સંપર્કો અને એલર્ટ પછીનો સમય બતાવો | [ ] |
| `rehearsal.summary` | Open the alert record and show Share | अलर्ट का रिकॉर्ड खोलें और साझा करना दिखाएँ | એલર્ટનો રેકોર્ડ ખોલો અને શેર કરવું બતાવો | [ ] |
| `rehearsal.passport` | Create the passport QR and open the responder page | पासपोर्ट QR बनाएँ और सहायक का पेज खोलें | પાસપોર્ટ QR બનાવો અને સહાયકનું પેજ ખોલો | [ ] |
| `rehearsal.offline` | Turn on No data connection and show the SMS card | डेटा कनेक्शन नहीं चालू करें और SMS कार्ड दिखाएँ | ડેટા કનેક્શન નથી ચાલુ કરો અને SMS કાર્ડ બતાવો | [ ] |
| `rehearsal.fall` | Press Simulated fall and let the check-in time out | सिमुलेटेड गिरना दबाएँ और जाँच का समय पूरा होने दें | સિમ્યુલેટેડ પડી જવું દબાવો અને તપાસનો સમય પૂરો થવા દો | [ ] |
| `rehearsal.reminder` | Show the medicine reminders screen | दवा के रिमाइंडर की स्क्रीन दिखाएँ | દવાના રિમાઇન્ડરની સ્ક્રીન બતાવો | [ ] |
| `screen.needsConnection` | This screen needs an internet connection the first time you open it. Go back, or call 112 / 108 if you need help now. | यह स्क्रीन पहली बार खोलने पर इंटरनेट माँगती है। वापस जाएँ, या अभी मदद चाहिए तो 112 / 108 पर कॉल करें। | આ સ્ક્રીન પહેલી વાર ખોલતી વખતે ઇન્ટરનેટ માંગે છે. પાછા જાઓ, અથવા હમણાં મદદ જોઈએ તો 112 / 108 પર કૉલ કરો. | [ ] |

## Family screen and invite (Phase 10, AI-written, AI-reviewed once, not human-reviewed)

The texts of the family screen live in `src/i18n/family.*.json` (loaded with the screen); the invite and sign-in texts are in the main files. An AI review (acting as doctor and Hindi/Gujarati reviewer) was applied on 14 Nov: neutral wording for check-ins, "आपातकाल" and "હોસ્પિટલ" as in the glossary, "आपातकालीन स्वयंसेवक" instead of "उत्तरदाता", "मंज़ूर" (approve) apart from "स्वीकार" (accept). Still open for a human: `responder.intro` has no "do not put yourself in danger" line (needs a doctor's decision); "vitals" and "health history" wording (doctor); whether Western digits ("24") are fine.

| Key | English | Hindi | Gujarati | OK |
|---|---|---|---|---|
| `family.title` | Family | परिवार | પરિવાર | [ ] |
| `family.intro` | See how the people who shared their safety information with you are doing. You only see what they chose to share. | जिन लोगों ने आपके साथ अपनी सुरक्षा की जानकारी साझा की है, उनकी स्थिति देखें। आपको केवल वही दिखता है जो उन्होंने साझा करना चुना है। | જેમણે તમારી સાથે પોતાની સુરક્ષાની માહિતી વહેંચી છે તેમની સ્થિતિ જુઓ. તમને ફક્ત તે જ દેખાય છે જે તેમણે વહેંચવાનું પસંદ કર્યું છે. | [ ] |
| `family.linkTitle` | Link a person | किसी व्यक्ति को जोड़ें | વ્યક્તિને જોડો | [ ] |
| `family.codeLabel` | Invite code | आमंत्रण कोड | આમંત્રણ કોડ | [ ] |
| `family.linkButton` | Link | जोड़ें | જોડો | [ ] |
| `family.linkNotFound` | This code was not found. Check it and try again. | यह कोड नहीं मिला। जाँचकर दोबारा कोशिश करें। | આ કોડ મળ્યો નથી. તપાસીને ફરી પ્રયત્ન કરો. | [ ] |
| `family.linkExpired` | This code has expired. Ask for a new one. | यह कोड समाप्त हो गया है। नया कोड माँगें। | આ કોડની મુદત પૂરી થઈ ગઈ છે. નવો કોડ માંગો. | [ ] |
| `family.linkError` | Could not link. Please try again. | जोड़ा नहीं जा सका। कृपया दोबारा कोशिश करें। | જોડી શકાયું નથી. કૃપા કરીને ફરી પ્રયત્ન કરો. | [ ] |
| `family.empty` | You are not linked to anyone yet. Ask the person for an invite code. | आप अभी किसी से जुड़े नहीं हैं। उस व्यक्ति से आमंत्रण कोड माँगें। | તમે હજી કોઈની સાથે જોડાયેલા નથી. તે વ્યક્તિ પાસેથી આમંત્રણ કોડ માંગો. | [ ] |
| `family.loadError` | Could not load. Please try again. | लोड नहीं हो सका। कृपया दोबारा कोशिश करें। | લોડ થઈ શક્યું નથી. કૃપા કરીને ફરી પ્રયત્ન કરો. | [ ] |
| `family.shared` | Shared with you | आपके साथ साझा किया गया | તમારી સાથે વહેંચાયેલું | [ ] |
| `family.sharedNone` | Nothing is shared | कुछ भी साझा नहीं है | કંઈ પણ વહેંચાયેલું નથી | [ ] |
| `family.share.location` | Location | स्थान | સ્થાન | [ ] |
| `family.share.history` | Health history | स्वास्थ्य इतिहास | આરોગ્ય ઇતિહાસ | [ ] |
| `family.share.vitals` | Vitals | महत्त्वपूर्ण संकेत | મહત્ત્વના સંકેતો | [ ] |
| `family.share.reports` | Reports | रिपोर्ट | રિપોર્ટ | [ ] |
| `family.vitals` | Latest readings (simulated) | नवीनतम रीडिंग (सिमुलेटेड) | નવીનતમ રીડિંગ (સિમ્યુલેટેડ) | [ ] |
| `family.hr` | Heart rate | हृदय गति | હૃદયના ધબકારા | [ ] |
| `family.spo2` | Oxygen level | ऑक्सीजन स्तर | ઓક્સિજન સ્તર | [ ] |
| `family.noEmergency` | No active emergency. | कोई सक्रिय आपातकाल नहीं है। | કોઈ સક્રિય કટોકટી નથી. | [ ] |
| `family.activeTitle` | Emergency in progress (simulated) | आपातकाल जारी है (सिमुलेटेड) | કટોકટી ચાલુ છે (સિમ્યુલેટેડ) | [ ] |
| `family.state.SOS_SENT` | The alert was sent to a hospital. | अलर्ट अस्पताल को भेजा गया। | ચેતવણી હોસ્પિટલને મોકલવામાં આવી છે. | [ ] |
| `family.state.HOSPITAL_ACKNOWLEDGED` | The hospital has seen the alert. | अस्पताल ने अलर्ट देख लिया है। | હોસ્પિટલે ચેતવણી જોઈ છે. | [ ] |
| `family.state.AMBULANCE_DISPATCHED` | An ambulance has been sent. | एम्बुलेंस भेजी गई है। | એમ્બ્યુલન્સ મોકલવામાં આવી છે. | [ ] |
| `family.state.EN_ROUTE` | The ambulance is on its way. | एम्बुलेंस रास्ते में है। | એમ્બ્યુલન્સ રસ્તામાં છે. | [ ] |
| `family.state.ARRIVED` | The ambulance has arrived. | एम्बुलेंस पहुँच गई है। | એમ્બ્યુલન્સ પહોંચી ગઈ છે. | [ ] |
| `family.hospital` | Hospital: {{name}} | अस्पताल: {{name}} | હોસ્પિટલ: {{name}} | [ ] |
| `family.eta` | About {{minutes}} min away (estimate) | लगभग {{minutes}} मिनट दूर (अनुमान) | લગભગ {{minutes}} મિનિટ દૂર (અંદાજ) | [ ] |
| `family.checkin.title` | Let them know | उन्हें बताएँ | તેમને જણાવો | [ ] |
| `family.checkin.ON_MY_WAY` | I'm on my way | मैं रास्ते में हूँ | હું રસ્તામાં છું | [ ] |
| `family.checkin.CALLING_NOW` | I'm calling them | हम उन्हें कॉल कर रहे हैं | અમે તેમને કૉલ કરી રહ્યા છીએ | [ ] |
| `family.checkin.CANNOT_REACH` | I can't reach them | उनसे संपर्क नहीं हो पा रहा है | તેમની સાથે સંપર્ક થઈ શકતો નથી | [ ] |
| `family.checkin.done` | Your message was sent. | आपका संदेश भेज दिया गया। | તમારો સંદેશ મોકલવામાં આવ્યો છે. | [ ] |
| `family.checkin.error` | Could not send. Please try again. | भेजा नहीं जा सका। कृपया दोबारा कोशिश करें। | મોકલી શકાયું નથી. કૃપા કરીને ફરી પ્રયત્ન કરો. | [ ] |
| `login.wrongRole` | This app is for patients, their family, volunteers and admins. Hospital staff should use the hospital portal. | यह ऐप मरीज़ों, उनके परिवार, स्वयंसेवकों और एडमिन के लिए है। अस्पताल के कर्मचारी कृपया अस्पताल पोर्टल का उपयोग करें। | આ એપ દર્દીઓ, તેમના પરિવાર, સ્વયંસેવકો અને એડમિન માટે છે. હોસ્પિટલ સ્ટાફે હોસ્પિટલ પોર્ટલનો ઉપયોગ કરવો. | [ ] |
| `invite.title` | Invite a family member | परिवार के सदस्य को आमंत्रित करें | પરિવારના સભ્યને આમંત્રિત કરો | [ ] |
| `invite.help` | Create a code and give it to a relative. They sign in to this app with their own account and enter it. They only see what you chose to share. | एक कोड बनाएँ और किसी रिश्तेदार को दें। वे अपने खाते से इस ऐप में साइन इन करके इसे दर्ज करते हैं। उन्हें केवल वही दिखता है जो आपने साझा करना चुना है। | કોડ બનાવો અને સંબંધીને આપો. તેઓ પોતાના ખાતાથી આ એપમાં સાઇન ઇન કરીને તે દાખલ કરે છે. તેમને ફક્ત તે જ દેખાય છે જે તમે વહેંચવાનું પસંદ કર્યું છે. | [ ] |
| `invite.create` | Create invite code | आमंत्रण कोड बनाएँ | આમંત્રણ કોડ બનાવો | [ ] |
| `invite.valid` | Valid for 24 hours. | 24 घंटे के लिए मान्य। | 24 કલાક માટે માન્ય. | [ ] |
| `invite.error` | Could not create a code. Please try again. | कोड नहीं बन सका। कृपया दोबारा कोशिश करें। | કોડ બનાવી શકાયો નથી. કૃપા કરીને ફરી પ્રયત્ન કરો. | [ ] |

## Volunteer responder and admin screens (Phase 10, AI-written, AI-reviewed once, not human-reviewed)

Files: `src/i18n/responder.*.json`, `src/i18n/admin.*.json`. `login.wrongRole` is in the table above.

| Key | English | Hindi | Gujarati | OK |
|---|---|---|---|---|
| `responder.title` | Volunteer responder | आपातकालीन स्वयंसेवक | કટોકટી સ્વયંસેવક | [ ] |
| `responder.intro` | Someone nearby may need help. Accept an alert to see what the person chose to share. This is a simulation: in a real emergency call 112. | आस-पास किसी को मदद की ज़रूरत हो सकती है। अलर्ट स्वीकार करें और देखें कि उस व्यक्ति ने क्या साझा किया है। यह एक सिमुलेशन है: असली आपात स्थिति में 112 पर कॉल करें। | નજીકમાં કોઈને મદદની જરૂર હોઈ શકે છે. ચેતવણી સ્વીકારો અને જુઓ કે તે વ્યક્તિએ શું વહેંચ્યું છે. આ સિમ્યુલેશન છે: સાચી કટોકટીમાં 112 પર કૉલ કરો. | [ ] |
| `responder.notVerified` | Your account is waiting for an admin to verify it. You will see alerts after that. | आपका खाता एडमिन के सत्यापन की प्रतीक्षा में है। उसके बाद आपको अलर्ट दिखेंगे। | તમારું ખાતું એડમિન દ્વારા ચકાસણીની રાહ જુએ છે. ત્યાર પછી તમને ચેતવણીઓ દેખાશે. | [ ] |
| `responder.none` | No alerts right now. | अभी कोई अलर्ट नहीं है। | હાલમાં કોઈ ચેતવણી નથી. | [ ] |
| `responder.distance` | {{metres}} m away | {{metres}} मीटर दूर | {{metres}} મીટર દૂર | [ ] |
| `responder.accept` | Accept | स्वीकार करें | સ્વીકારો | [ ] |
| `responder.accepted` | You accepted this alert. | आपने यह अलर्ट स्वीकार किया है। | તમે આ ચેતવણી સ્વીકારી છે. | [ ] |
| `responder.age` | Age {{age}} | आयु {{age}} | ઉંમર {{age}} | [ ] |
| `responder.allergies` | Allergies: {{list}} | एलर्जी: {{list}} | એલર્જી: {{list}} | [ ] |
| `responder.location` | Location: {{latitude}}, {{longitude}} | स्थान: {{latitude}}, {{longitude}} | સ્થાન: {{latitude}}, {{longitude}} | [ ] |
| `responder.noLocation` | Location is not shared. | स्थान साझा नहीं किया गया है। | સ્થાન વહેંચાયેલું નથી. | [ ] |
| `responder.loadError` | Could not load. Please try again. | लोड नहीं हो सका। कृपया दोबारा कोशिश करें। | લોડ થઈ શક્યું નથી. કૃપા કરીને ફરી પ્રયત્ન કરો. | [ ] |
| `responder.acceptError` | Could not accept. The alert may have ended. | स्वीकार नहीं हो सका। अलर्ट समाप्त हो चुका हो सकता है। | સ્વીકારી શકાયું નથી. ચેતવણી પૂરી થઈ ગઈ હોઈ શકે છે. | [ ] |
| `responder.state.SOS_SENT` | Alert sent | अलर्ट भेजा गया | ચેતવણી મોકલાઈ | [ ] |
| `responder.state.HOSPITAL_ACKNOWLEDGED` | Hospital has seen it | अस्पताल ने देख लिया | હોસ્પિટલે જોયું | [ ] |
| `responder.state.AMBULANCE_DISPATCHED` | Ambulance sent | एम्बुलेंस भेजी गई | એમ્બ્યુલન્સ મોકલાઈ | [ ] |
| `responder.state.EN_ROUTE` | Ambulance on its way | एम्बुलेंस रास्ते में है | એમ્બ્યુલન્સ રસ્તામાં છે | [ ] |
| `responder.state.ARRIVED` | Ambulance arrived | एम्बुलेंस पहुँच गई | એમ્બ્યુલન્સ પહોંચી | [ ] |
| `volunteer.title` | Become a volunteer responder | आपातकालीन स्वयंसेवक बनें | કટોકટી સ્વયંસેવક બનો | [ ] |
| `volunteer.intro` | Sign up, then an admin checks your account. Until then you will not receive alerts. | साइन अप करें, फिर एडमिन आपका खाता जाँचेगा। तब तक आपको अलर्ट नहीं मिलेंगे। | સાઇન અપ કરો, પછી એડમિન તમારું ખાતું તપાસશે. ત્યાં સુધી તમને ચેતવણીઓ મળશે નહીં. | [ ] |
| `volunteer.name` | Full name | पूरा नाम | પૂરું નામ | [ ] |
| `volunteer.email` | Email | ईमेल | ઇમેઇલ | [ ] |
| `volunteer.password` | Password (at least 8 characters) | पासवर्ड (कम से कम 8 अक्षर) | પાસવર્ડ (ઓછામાં ઓછા 8 અક્ષર) | [ ] |
| `volunteer.submit` | Sign up | साइन अप करें | સાઇન અપ કરો | [ ] |
| `volunteer.done` | Thank you. An admin will verify your account. You can sign in after that. | धन्यवाद। एडमिन आपका खाता सत्यापित करेगा। उसके बाद आप साइन इन कर सकते हैं। | આભાર. એડમિન તમારું ખાતું ચકાસશે. ત્યાર પછી તમે સાઇન ઇન કરી શકશો. | [ ] |
| `volunteer.exists` | This email is already registered. | यह ईमेल पहले से पंजीकृत है। | આ ઇમેઇલ પહેલેથી નોંધાયેલો છે. | [ ] |
| `volunteer.invalid` | Please fill in every field. The password needs at least 8 characters. | कृपया सभी जानकारी भरें। पासवर्ड में कम से कम 8 अक्षर होने चाहिए। | કૃપા કરીને બધી વિગતો ભરો. પાસવર્ડમાં ઓછામાં ઓછા 8 અક્ષર હોવા જોઈએ. | [ ] |
| `volunteer.error` | Could not sign up. Please try again. | साइन अप नहीं हो सका। कृपया दोबारा कोशिश करें। | સાઇન અપ થઈ શક્યું નથી. કૃપા કરીને ફરી પ્રયત્ન કરો. | [ ] |
| `volunteer.back` | Back to sign in | साइन इन पर वापस जाएँ | સાઇન ઇન પર પાછા જાઓ | [ ] |
| `admin.title` | Admin | एडमिन | એડમિન | [ ] |
| `admin.intro` | Manage accounts, approve texts and read the access log. Simulated data only. | खाते प्रबंधित करें, सामग्री मंज़ूर करें और एक्सेस लॉग पढ़ें। केवल सिमुलेटेड डेटा। | ખાતાં સંભાળો, લખાણ મંજૂર કરો અને એક્સેસ લૉગ વાંચો. ફક્ત સિમ્યુલેટેડ ડેટા. | [ ] |
| `admin.users` | Accounts | खाते | ખાતાં | [ ] |
| `admin.role.PATIENT` | Patient | मरीज़ | દર્દી | [ ] |
| `admin.role.HOSPITAL_STAFF` | Hospital staff | अस्पताल स्टाफ़ | હોસ્પિટલ સ્ટાફ | [ ] |
| `admin.role.ADMIN` | Admin | एडमिन | એડમિન | [ ] |
| `admin.role.FAMILY` | Family | परिवार | પરિવાર | [ ] |
| `admin.role.RESPONDER` | Volunteer | स्वयंसेवक | સ્વયંસેવક | [ ] |
| `admin.disabled` | Disabled | निष्क्रिय | નિષ્ક્રિય | [ ] |
| `admin.verified` | Verified | सत्यापित | ચકાસાયેલ | [ ] |
| `admin.notVerified` | Not verified | सत्यापित नहीं | ચકાસાયેલ નથી | [ ] |
| `admin.disable` | Disable | बंद करें | બંધ કરો | [ ] |
| `admin.enable` | Enable | चालू करें | ચાલુ કરો | [ ] |
| `admin.verify` | Verify | सत्यापित करें | ચકાસો | [ ] |
| `admin.userError` | Could not change this account. | यह खाता बदला नहीं जा सका। | આ ખાતું બદલી શકાયું નથી. | [ ] |
| `admin.ownAccount` | You cannot disable your own account. | आप अपना खाता बंद नहीं कर सकते। | તમે તમારું પોતાનું ખાતું બંધ કરી શકતા નથી. | [ ] |
| `admin.content` | Texts | सामग्री | લખાણ | [ ] |
| `admin.content.emergency_numbers` | Emergency numbers | आपातकाल के नंबर | કટોકટી નંબર | [ ] |
| `admin.content.first_aid_basics` | First-aid basics (not reviewed by a doctor) | प्राथमिक उपचार की बुनियादी बातें (डॉक्टर ने जाँचा नहीं) | પ્રાથમિક સારવારની મૂળભૂત બાબતો (ડૉક્ટરે તપાસી નથી) | [ ] |
| `admin.version` | Version {{n}} | संस्करण {{n}} | આવૃત્તિ {{n}} | [ ] |
| `admin.approved` | Approved | मंज़ूर | મંજૂર | [ ] |
| `admin.notApproved` | Not approved | मंज़ूर नहीं | મંજૂર નથી | [ ] |
| `admin.edit` | Edit | संपादित करें | ફેરફાર કરો | [ ] |
| `admin.editNote` | A changed text stays hidden from the apps until you approve it. | बदली हुई सामग्री आपके मंज़ूर करने तक ऐप्स से छिपी रहती है। | બદલાયેલું લખાણ તમે મંજૂર કરો ત્યાં સુધી એપ્સમાંથી છુપાયેલું રહે છે. | [ ] |
| `admin.itemsLabel` | Text (one line per item) | सामग्री (हर बात के लिए एक पंक्ति) | લખાણ (દરેક બાબત માટે એક લીટી) | [ ] |
| `admin.approveBox` | Approve this text | इस सामग्री को मंज़ूर करें | આ લખાણ મંજૂર કરો | [ ] |
| `admin.save` | Save | सहेजें | સાચવો | [ ] |
| `admin.saved` | Saved. | सहेजा गया। | સાચવ્યું. | [ ] |
| `admin.saveError` | Could not save. | सहेजा नहीं जा सका। | સાચવી શકાયું નથી. | [ ] |
| `admin.audit` | Access log | एक्सेस लॉग | એક્સેસ લૉગ | [ ] |
| `admin.auditEmpty` | Nothing recorded yet. | अभी कुछ दर्ज नहीं है। | હજી કંઈ નોંધાયું નથી. | [ ] |
| `admin.when` | When | कब | ક્યારે | [ ] |
| `admin.who` | Who | कौन | કોણ | [ ] |
| `admin.action` | Action | क्रिया | ક્રિયા | [ ] |
| `admin.outcome` | Result | परिणाम | પરિણામ | [ ] |
| `admin.refresh` | Refresh | ताज़ा करें | તાજું કરો | [ ] |
| `admin.loadError` | Could not load. Please try again. | लोड नहीं हो सका। कृपया दोबारा कोशिश करें। | લોડ થઈ શક્યું નથી. કૃપા કરીને ફરી પ્રયત્ન કરો. | [ ] |
| `login.volunteer` | Become a volunteer responder | आपातकालीन स्वयंसेवक बनें | કટોકટી સ્વયંસેવક બનો | [ ] |

## Disease Intelligence and Live Monitoring screens (UI phase 1d)

Drafts, not yet checked by a native speaker.

| Key | English | Hindi | Gujarati | Checked |
|---|---|---|---|---|
| `dis.intro` | Six health areas, each with a plain observation about your readings and how much data it is based on. | छह स्वास्थ्य क्षेत्र, हर एक में आपकी रीडिंग पर सरल अवलोकन और यह कि वह कितने डेटा पर आधारित है। | છ આરોગ્ય વિભાગ, દરેકમાં તમારી રીડિંગ પર સરળ અવલોકન અને તે કેટલા ડેટા પર આધારિત છે. | [ ] |
| `dis.rules` | Observations come from simple rules that compare your readings with your own usual ranges. There is no risk score and no diagnosis. | ये अवलोकन सरल नियमों से बनते हैं जो आपकी रीडिंग की तुलना आपकी अपनी सामान्य सीमा से करते हैं। इसमें कोई जोखिम स्कोर या निदान नहीं है। | આ અવલોકનો સરળ નિયમોથી બને છે જે તમારી રીડિંગની સરખામણી તમારી પોતાની સામાન્ય શ્રેણી સાથે કરે છે. તેમાં કોઈ જોખમ સ્કોર કે નિદાન નથી. | [ ] |
| `dis.open` | Open details | विवरण खोलें | વિગતો ખોલો | [ ] |
| `dis.back` | Back to all areas | सभी क्षेत्रों पर वापस | બધા વિભાગો પર પાછા | [ ] |
| `dis.status.within` | Within your usual range | आपकी सामान्य सीमा में | તમારી સામાન્ય શ્રેણીમાં | [ ] |
| `dis.status.different` | Different from usual | सामान्य से अलग | સામાન્યથી અલગ | [ ] |
| `dis.status.nodata` | No live readings | कोई लाइव रीडिंग नहीं | કોઈ લાઇવ રીડિંગ નથી | [ ] |
| `dis.status.waiting` | Waiting for readings | रीडिंग का इंतज़ार | રીડિંગની રાહ | [ ] |
| `dis.quality.title` | Data quality and confidence | डेटा की गुणवत्ता और भरोसा | ડેટાની ગુણવત્તા અને વિશ્વાસ | [ ] |
| `dis.quality.low` | Data quality: low | डेटा गुणवत्ता: कम | ડેટા ગુણવત્તા: ઓછી | [ ] |
| `dis.quality.medium` | Data quality: medium | डेटा गुणवत्ता: मध्यम | ડેટા ગુણવત્તા: મધ્યમ | [ ] |
| `dis.quality.good` | Data quality: good | डेटा गुणवत्ता: अच्छी | ડેટા ગુણવત્તા: સારી | [ ] |
| `dis.confidence.low` | Confidence is low: there is too little data to say much. | भरोसा कम है: ज़्यादा कुछ कहने के लिए डेटा बहुत कम है। | વિશ્વાસ ઓછો છે: વધુ કહેવા માટે ડેટા બહુ ઓછો છે. | [ ] |
| `dis.confidence.medium` | Confidence is medium: some data is available, more would help. | भरोसा मध्यम है: कुछ डेटा है, और होता तो बेहतर होता। | વિશ્વાસ મધ્યમ છે: થોડો ડેટા છે, વધુ હોય તો સારું. | [ ] |
| `dis.confidence.good` | Confidence is better here, but this is still an estimate and not a diagnosis. | यहाँ भरोसा बेहतर है, फिर भी यह अनुमान है, निदान नहीं। | અહીં વિશ્વાસ વધુ સારો છે, છતાં આ અંદાજ છે, નિદાન નથી. | [ ] |
| `dis.reason.noLive` | This prototype has no live readings for this area. | इस प्रोटोटाइप में इस क्षेत्र की कोई लाइव रीडिंग नहीं है। | આ પ્રોટોટાઇપમાં આ વિભાગની કોઈ લાઇવ રીડિંગ નથી. | [ ] |
| `dis.reason.fewReadings` | Fewer than 10 readings have been shared so far. | अब तक 10 से कम रीडिंग साझा हुई हैं। | હજુ સુધી 10 થી ઓછી રીડિંગ શેર થઈ છે. | [ ] |
| `dis.reason.noBaseline` | Your usual range is not set yet. | आपकी सामान्य सीमा अभी तय नहीं है। | તમારી સામાન્ય શ્રેણી હજુ નક્કી નથી. | [ ] |
| `dis.reason.noReports` | No related report is uploaded. | कोई संबंधित रिपोर्ट अपलोड नहीं है। | કોઈ સંબંધિત રિપોર્ટ અપલોડ નથી. | [ ] |
| `dis.obs.title` | Automatic observation (rules, not a doctor) | स्वचालित अवलोकन (नियम, डॉक्टर नहीं) | સ્વચાલિત અવલોકન (નિયમો, ડૉક્ટર નહીં) | [ ] |
| `dis.obs.within` | Your {{name}} readings are within your own usual range. | आपकी {{name}} रीडिंग आपकी अपनी सामान्य सीमा में हैं। | તમારી {{name}} રીડિંગ તમારી પોતાની સામાન્ય શ્રેણીમાં છે. | [ ] |
| `dis.obs.different` | One or more readings are outside your usual range. This is an observation, not a diagnosis. Please talk to a doctor if you are worried. | एक या अधिक रीडिंग आपकी सामान्य सीमा से बाहर हैं। यह अवलोकन है, निदान नहीं। चिंता हो तो डॉक्टर से बात करें। | એક કે વધુ રીડિંગ તમારી સામાન્ય શ્રેણીની બહાર છે. આ અવલોકન છે, નિદાન નથી. ચિંતા હોય તો ડૉક્ટર સાથે વાત કરો. | [ ] |
| `dis.obs.nodata` | No live readings exist for this area in the prototype, so nothing can be observed. | इस प्रोटोटाइप में इस क्षेत्र की कोई लाइव रीडिंग नहीं है, इसलिए कुछ देखा नहीं जा सकता। | આ પ્રોટોટાઇપમાં આ વિભાગની કોઈ લાઇવ રીડિંગ નથી, તેથી કંઈ જોઈ શકાતું નથી. | [ ] |
| `dis.obs.waiting` | Waiting for the first readings to compare. | तुलना के लिए पहली रीडिंग का इंतज़ार। | સરખામણી માટે પહેલી રીડિંગની રાહ. | [ ] |
| `dis.steps.title` | General next steps to discuss with a doctor | डॉक्टर से चर्चा के लिए सामान्य अगले कदम | ડૉક્ટર સાથે ચર્ચા માટે સામાન્ય આગળનાં પગલાં | [ ] |
| `dis.steps.note` | General suggestions only. They are not advice for your case. | केवल सामान्य सुझाव। ये आपके मामले की सलाह नहीं हैं। | ફક્ત સામાન્ય સૂચનો. તે તમારા કેસની સલાહ નથી. | [ ] |
| `mon.intro` | Live readings from the simulated wearable, as they arrive. | सिमुलेटेड वियरेबल की लाइव रीडिंग, जैसे-जैसे आती हैं। | સિમ્યુલેટેડ વેરેબલની લાઇવ રીડિંગ, જેમ આવે તેમ. | [ ] |
| `mon.ecg.title` | Heart rhythm trace | हृदय लय की रेखा | હૃદય લયની રેખા | [ ] |
| `mon.ecg.label` | Simulated heart rhythm trace at {{bpm}} beats per minute | {{bpm}} धड़कन प्रति मिनट पर सिमुलेटेड हृदय लय रेखा | {{bpm}} ધબકારા પ્રતિ મિનિટે સિમ્યુલેટેડ હૃદય લય રેખા | [ ] |
| `mon.ecg.note` | Simulated: a made-up trace drawn on your device from the heart rate. It is not a recording and not a real ECG. | सिमुलेटेड: हृदय गति से आपके डिवाइस पर बनाई गई काल्पनिक रेखा। यह रिकॉर्डिंग नहीं है और असली ECG नहीं है। | સિમ્યુલેટેડ: હૃદય ગતિ પરથી તમારા ડિવાઇસ પર દોરેલી કાલ્પનિક રેખા. તે રેકોર્ડિંગ નથી અને સાચો ECG નથી. | [ ] |
| `mon.conn.on` | Wearable connected | वियरेबल जुड़ा है | વેરેબલ જોડાયેલું છે | [ ] |
| `mon.conn.off` | Wearable not connected | वियरेबल जुड़ा नहीं है | વેરેબલ જોડાયેલું નથી | [ ] |
| `mon.latest` | Heart rate {{bpm}} bpm | हृदय गति {{bpm}} bpm | હૃદય ગતિ {{bpm}} bpm | [ ] |
| `mon.waiting` | Waiting for a reading | रीडिंग का इंतज़ार | રીડિંગની રાહ | [ ] |
| `mon.ago` | {{s}} s ago | {{s}} सेकंड पहले | {{s}} સેકન્ડ પહેલાં | [ ] |
| `mon.noShare` | Vitals sharing is off, so the trends stay empty. Turn it on in Consent to see them. | वाइटल्स साझा करना बंद है, इसलिए ट्रेंड खाली रहेंगे। देखने के लिए सहमति में इसे चालू करें। | વાઇટલ્સ શેરિંગ બંધ છે, તેથી ટ્રેન્ડ ખાલી રહેશે. જોવા માટે સંમતિમાં તેને ચાલુ કરો. | [ ] |
| `mon.events.title` | Recent events | हाल की घटनाएँ | તાજેતરની ઘટનાઓ | [ ] |
| `mon.events.empty` | No changes yet. Events appear when a reading leaves or returns to your usual range, or the connection changes. | अभी कोई बदलाव नहीं। जब रीडिंग सामान्य सीमा से बाहर जाए या लौटे, या कनेक्शन बदले, तब घटनाएँ दिखेंगी। | હજુ કોઈ ફેરફાર નથી. રીડિંગ સામાન્ય શ્રેણીની બહાર જાય કે પાછી આવે, અથવા કનેક્શન બદલાય ત્યારે ઘટનાઓ દેખાશે. | [ ] |
| `mon.events.note` | Kept only in this page, not saved. | केवल इसी पेज पर रखा गया, सहेजा नहीं गया। | ફક્ત આ પેજ પર રખાય છે, સાચવાતું નથી. | [ ] |
| `mon.event.left` | {{name}} left your usual range | {{name}} आपकी सामान्य सीमा से बाहर गया | {{name}} તમારી સામાન્ય શ્રેણીની બહાર ગયું | [ ] |
| `mon.event.back` | {{name}} is back in your usual range | {{name}} फिर सामान्य सीमा में है | {{name}} ફરી સામાન્ય શ્રેણીમાં છે | [ ] |
| `mon.event.connected` | Wearable connected | वियरेबल जुड़ गया | વેરેબલ જોડાયું | [ ] |
| `mon.event.disconnected` | Wearable connection lost | वियरेबल का कनेक्शन टूटा | વેરેબલનું કનેક્શન તૂટ્યું | [ ] |
| `dis.mod.cardiac.name` | Cardiac | हृदय | હૃદય | [ ] |
| `dis.mod.cardiac.about` | Heart rate and blood pressure compared with your usual ranges. | हृदय गति और रक्तचाप की तुलना आपकी सामान्य सीमा से। | હૃદય ગતિ અને બ્લડ પ્રેશરની સરખામણી તમારી સામાન્ય શ્રેણી સાથે. | [ ] |
| `dis.steps.cardiac.1` | Keep a regular log of blood pressure readings to show your doctor. | डॉक्टर को दिखाने के लिए रक्तचाप की रीडिंग का नियमित रिकॉर्ड रखें। | ડૉક્ટરને બતાવવા માટે બ્લડ પ્રેશર રીડિંગનો નિયમિત રેકોર્ડ રાખો. | [ ] |
| `dis.steps.cardiac.2` | Ask your doctor how often your heart should be checked. | डॉक्टर से पूछें कि हृदय की जाँच कितनी बार होनी चाहिए। | ડૉક્ટરને પૂછો કે હૃદયની તપાસ કેટલી વાર કરવી. | [ ] |
| `dis.steps.cardiac.3` | Bring your medicine list to every visit. | हर विज़िट पर अपनी दवाओं की सूची साथ ले जाएँ। | દરેક મુલાકાતે તમારી દવાઓની યાદી સાથે રાખો. | [ ] |
| `dis.mod.neuro.name` | Neurological | तंत्रिका | ચેતાતંત્ર | [ ] |
| `dis.mod.neuro.about` | No live readings in this prototype; reports and notes only. | इस प्रोटोटाइप में लाइव रीडिंग नहीं; केवल रिपोर्ट और नोट। | આ પ્રોટોટાઇપમાં લાઇવ રીડિંગ નથી; ફક્ત રિપોર્ટ અને નોંધ. | [ ] |
| `dis.steps.neuro.1` | Note any new headaches, weakness or speech changes and when they happened. | नया सिरदर्द, कमज़ोरी या बोलने में बदलाव कब हुआ, लिख लें। | નવો માથાનો દુખાવો, નબળાઈ કે બોલવામાં ફેરફાર ક્યારે થયો તે લખો. | [ ] |
| `dis.steps.neuro.2` | Ask your doctor which scans or tests suit you. | डॉक्टर से पूछें कि कौन-सी स्कैन या जाँच आपके लिए ठीक है। | ડૉક્ટરને પૂછો કે કયા સ્કેન કે ટેસ્ટ તમારા માટે યોગ્ય છે. | [ ] |
| `dis.steps.neuro.3` | Keep past scan reports together. | पुरानी स्कैन रिपोर्ट एक जगह रखें। | જૂના સ્કેન રિપોર્ટ એક જગ્યાએ રાખો. | [ ] |
| `dis.mod.respiratory.name` | Respiratory | श्वसन | શ્વસન | [ ] |
| `dis.mod.respiratory.about` | Oxygen level (SpO2) compared with your usual range. | ऑक्सीजन स्तर (SpO2) की तुलना आपकी सामान्य सीमा से। | ઓક્સિજન સ્તર (SpO2) ની સરખામણી તમારી સામાન્ય શ્રેણી સાથે. | [ ] |
| `dis.steps.respiratory.1` | Note when breathing feels harder and what you were doing. | लिख लें कि साँस कब भारी लगी और तब आप क्या कर रहे थे। | શ્વાસ ક્યારે ભારે લાગ્યો અને ત્યારે તમે શું કરતા હતા તે લખો. | [ ] |
| `dis.steps.respiratory.2` | Ask your doctor about a lung check if you have a cough that lasts. | लंबी खाँसी हो तो डॉक्टर से फेफड़ों की जाँच के बारे में पूछें। | લાંબી ઉધરસ હોય તો ડૉક્ટરને ફેફસાંની તપાસ વિશે પૂછો. | [ ] |
| `dis.steps.respiratory.3` | Keep your inhaler or medicines where you can reach them. | इनहेलर या दवाएँ ऐसी जगह रखें जहाँ आप पहुँच सकें। | ઇન્હેલર કે દવાઓ પહોંચી શકાય તેવી જગ્યાએ રાખો. | [ ] |
| `dis.mod.diabetes.name` | Diabetes | मधुमेह | ડાયાબિટીસ | [ ] |
| `dis.mod.diabetes.about` | Glucose readings compared with your usual range. | ग्लूकोज़ रीडिंग की तुलना आपकी सामान्य सीमा से। | ગ્લુકોઝ રીડિંગની સરખામણી તમારી સામાન્ય શ્રેણી સાથે. | [ ] |
| `dis.steps.diabetes.1` | Note glucose readings with meal times to share with your doctor. | डॉक्टर को दिखाने के लिए ग्लूकोज़ रीडिंग खाने के समय के साथ लिखें। | ડૉક્ટરને બતાવવા ગ્લુકોઝ રીડિંગ જમવાના સમય સાથે લખો. | [ ] |
| `dis.steps.diabetes.2` | Ask your doctor how often to test and what range is right for you. | डॉक्टर से पूछें कि कितनी बार जाँच करें और आपके लिए सही सीमा क्या है। | ડૉક્ટરને પૂછો કે કેટલી વાર તપાસ કરવી અને તમારા માટે યોગ્ય શ્રેણી શું છે. | [ ] |
| `dis.steps.diabetes.3` | Keep your HbA1c reports together. | HbA1c रिपोर्ट एक जगह रखें। | HbA1c રિપોર્ટ એક જગ્યાએ રાખો. | [ ] |
| `dis.mod.kidney.name` | Kidney | गुर्दा | કિડની | [ ] |
| `dis.mod.kidney.about` | No live readings in this prototype; reports and notes only. | इस प्रोटोटाइप में लाइव रीडिंग नहीं; केवल रिपोर्ट और नोट। | આ પ્રોટોટાઇપમાં લાઇવ રીડિંગ નથી; ફક્ત રિપોર્ટ અને નોંધ. | [ ] |
| `dis.steps.kidney.1` | Keep recent kidney test reports (creatinine, eGFR) together. | हाल की गुर्दा जाँच रिपोर्ट (क्रिएटिनिन, eGFR) एक जगह रखें। | તાજેતરના કિડની ટેસ્ટ રિપોર્ટ (ક્રિએટિનિન, eGFR) એક જગ્યાએ રાખો. | [ ] |
| `dis.steps.kidney.2` | Ask your doctor how often these tests are needed. | डॉक्टर से पूछें कि ये जाँच कितनी बार चाहिए। | ડૉક્ટરને પૂછો કે આ ટેસ્ટ કેટલી વાર જોઈએ. | [ ] |
| `dis.steps.kidney.3` | Tell every doctor about all medicines you take. | हर डॉक्टर को अपनी सभी दवाओं के बारे में बताएँ। | દરેક ડૉક્ટરને તમારી બધી દવાઓ વિશે જણાવો. | [ ] |
| `dis.mod.liver.name` | Liver | लिवर | લિવર | [ ] |
| `dis.mod.liver.about` | No live readings in this prototype; reports and notes only. | इस प्रोटोटाइप में लाइव रीडिंग नहीं; केवल रिपोर्ट और नोट। | આ પ્રોટોટાઇપમાં લાઇવ રીડિંગ નથી; ફક્ત રિપોર્ટ અને નોંધ. | [ ] |
| `dis.steps.liver.1` | Keep recent liver test reports together. | हाल की लिवर जाँच रिपोर्ट एक जगह रखें। | તાજેતરના લિવર ટેસ્ટ રિપોર્ટ એક જગ્યાએ રાખો. | [ ] |
| `dis.steps.liver.2` | Ask your doctor how often these tests are needed. | डॉक्टर से पूछें कि ये जाँच कितनी बार चाहिए। | ડૉક્ટરને પૂછો કે આ ટેસ્ટ કેટલી વાર જોઈએ. | [ ] |
| `dis.steps.liver.3` | Tell every doctor about all medicines and supplements you take. | हर डॉक्टर को अपनी सभी दवाओं और सप्लीमेंट के बारे में बताएँ। | દરેક ડૉક્ટરને તમારી બધી દવાઓ અને સપ્લિમેન્ટ વિશે જણાવો. | [ ] |

## Emergency Response Center (UI phase 1e)

Drafts, not yet checked by a native speaker.

| Key | English | Hindi | Gujarati | Checked |
|---|---|---|---|---|
| `emc.intro` | See what the alert flow is doing, who would be told and what would be shared. | देखें कि अलर्ट प्रक्रिया क्या कर रही है, किसे बताया जाएगा और क्या साझा होगा। | જુઓ કે એલર્ટ પ્રક્રિયા શું કરી રહી છે, કોને જણાવાશે અને શું શેર થશે. | [ ] |
| `emc.sim` | SIMULATION: no real ambulance, hospital or person is contacted by this prototype. In a real emergency call 112 / 108. | सिमुलेशन: यह प्रोटोटाइप किसी असली एम्बुलेंस, अस्पताल या व्यक्ति से संपर्क नहीं करता। असली आपात स्थिति में 112 / 108 पर कॉल करें। | સિમ્યુલેશન: આ પ્રોટોટાઇપ કોઈ સાચી એમ્બ્યુલન્સ, હોસ્પિટલ કે વ્યક્તિનો સંપર્ક કરતું નથી. સાચી કટોકટીમાં 112 / 108 પર કૉલ કરો. | [ ] |
| `emc.status` | Current emergency | मौजूदा आपातकाल | હાલની કટોકટી | [ ] |
| `emc.none` | No emergency is running. | कोई आपातकाल चल नहीं रहा। | કોઈ કટોકટી ચાલુ નથી. | [ ] |
| `emc.start` | Report symptoms | लक्षण बताएँ | લક્ષણો જણાવો | [ ] |
| `emc.open` | Open the full emergency screen | पूरी आपातकालीन स्क्रीन खोलें | પૂરી કટોકટી સ્ક્રીન ખોલો | [ ] |
| `emc.loading` | Loading… | लोड हो रहा है… | લોડ થઈ રહ્યું છે… | [ ] |
| `emc.loadError` | Could not load this emergency. Please try again. | यह आपातकाल लोड नहीं हो सका। कृपया फिर कोशिश करें। | આ કટોકટી લોડ થઈ શકી નથી. કૃપા કરીને ફરી પ્રયત્ન કરો. | [ ] |
| `emc.live` | Live updates on | लाइव अपडेट चालू | લાઇવ અપડેટ ચાલુ | [ ] |
| `emc.offline` | Live updates paused | लाइव अपडेट रुके हैं | લાઇવ અપડેટ અટક્યા છે | [ ] |
| `emc.stages` | Steps of the alert | अलर्ट के चरण | એલર્ટનાં પગલાં | [ ] |
| `emc.notYet` | not happened yet | अभी हुआ नहीं | હજી થયું નથી | [ ] |
| `emc.stage.detected` | Emergency detected | आपातकाल पहचाना गया | કટોકટી ઓળખાઈ | [ ] |
| `emc.stage.sos` | Alert sent (simulated) | अलर्ट भेजा गया (सिमुलेटेड) | એલર્ટ મોકલાયું (સિમ્યુલેટેડ) | [ ] |
| `emc.stage.ack` | Hospital acknowledged (simulated) | अस्पताल ने स्वीकार किया (सिमुलेटेड) | હોસ્પિટલે સ્વીકાર્યું (સિમ્યુલેટેડ) | [ ] |
| `emc.stage.dispatched` | Ambulance dispatched (simulated) | एम्बुलेंस भेजी गई (सिमुलेटेड) | એમ્બ્યુલન્સ મોકલાઈ (સિમ્યુલેટેડ) | [ ] |
| `emc.stage.enroute` | En route | रास्ते में | રસ્તામાં | [ ] |
| `emc.stage.arrived` | Arrived | पहुँच गई | પહોંચી | [ ] |
| `emc.stage.handover` | Handover done | हस्तांतरण पूरा | હસ્તાંતરણ પૂર્ણ | [ ] |
| `emc.hospital` | Hospital chosen: {{name}} | चुना गया अस्पताल: {{name}} | પસંદ કરેલી હોસ્પિટલ: {{name}} | [ ] |
| `emc.eta` | Estimated arrival (simulated): about {{min}} min | अनुमानित पहुँच (सिमुलेटेड): लगभग {{min}} मिनट | અંદાજિત પહોંચ (સિમ્યુલેટેડ): લગભગ {{min}} મિનિટ | [ ] |
| `emc.sentHospital` | Hospital notification: sent. | अस्पताल को सूचना: भेजी गई। | હોસ્પિટલને સૂચના: મોકલાઈ. | [ ] |
| `emc.notSentHospital` | Hospital notification: not sent yet. | अस्पताल को सूचना: अभी भेजी नहीं गई। | હોસ્પિટલને સૂચના: હજી મોકલાઈ નથી. | [ ] |
| `emc.ackHospital` | Hospital acknowledgement: received. | अस्पताल की स्वीकृति: मिल गई। | હોસ્પિટલની સ્વીકૃતિ: મળી. | [ ] |
| `emc.notAckHospital` | Hospital acknowledgement: not received yet. | अस्पताल की स्वीकृति: अभी नहीं मिली। | હોસ્પિટલની સ્વીકૃતિ: હજી મળી નથી. | [ ] |
| `emc.sentContacts` | Contacts notification sent to: {{names}}. | संपर्कों को सूचना भेजी गई: {{names}}। | સંપર્કોને સૂચના મોકલાઈ: {{names}}. | [ ] |
| `emc.notSentContacts` | Contacts notification: not sent. | संपर्कों को सूचना: भेजी नहीं गई। | સંપર્કોને સૂચના: મોકલાઈ નથી. | [ ] |
| `emc.ackContacts` | Contact acknowledgement: not tracked in this prototype. | संपर्क की स्वीकृति: इस प्रोटोटाइप में ट्रैक नहीं होती। | સંપર્કની સ્વીકૃતિ: આ પ્રોટોટાઇપમાં ટ્રેક થતી નથી. | [ ] |
| `emc.share` | What would be shared | क्या साझा होगा | શું શેર થશે | [ ] |
| `emc.shareHelp` | Only what you allow is sent with an alert. | अलर्ट के साथ केवल वही भेजा जाता है जिसकी आप अनुमति देते हैं। | એલર્ટ સાથે ફક્ત તમે મંજૂર કરેલું જ મોકલાય છે. | [ ] |
| `emc.on` | Allowed | अनुमति है | મંજૂર | [ ] |
| `emc.off` | Not shared | साझा नहीं | શેર નથી | [ ] |
| `emc.changeShare` | Change sharing | साझा करना बदलें | શેરિંગ બદલો | [ ] |
| `emc.contacts` | Your emergency contacts | आपके आपातकालीन संपर्क | તમારા કટોકટી સંપર્કો | [ ] |
| `emc.noContacts` | No contacts yet. Add someone who should be told. | अभी कोई संपर्क नहीं। जिसे बताया जाना चाहिए उसे जोड़ें। | હજી કોઈ સંપર્ક નથી. જેને જણાવવું જોઈએ તેને ઉમેરો. | [ ] |
| `emc.manageContacts` | Manage contacts | संपर्क प्रबंधित करें | સંપર્કો મેનેજ કરો | [ ] |
| `emc.history` | Recent alerts | हाल के अलर्ट | તાજેતરના એલર્ટ | [ ] |
| `emc.noHistory` | No earlier alerts. | पहले कोई अलर्ट नहीं। | અગાઉ કોઈ એલર્ટ નથી. | [ ] |
| `emc.record` | View record | रिकॉर्ड देखें | રેકોર્ડ જુઓ | [ ] |
| `emc.notService` | HealthTwin AI is a student prototype. It is not an emergency service and not a medical device. | HealthTwin AI एक छात्र प्रोटोटाइप है। यह आपातकालीन सेवा नहीं है और चिकित्सा उपकरण नहीं है। | HealthTwin AI વિદ્યાર્થી પ્રોટોટાઇપ છે. તે કટોકટી સેવા નથી અને તબીબી ઉપકરણ નથી. | [ ] |

## Report Intelligence (UI phase 1f)

Drafts, not yet checked by a native speaker. Lab test names should follow the wording on real Indian lab reports.

| Key | English | Hindi | Gujarati | Checked |
|---|---|---|---|---|
| `ri.intro` | Add values from your medical reports. They update your Twin only after you confirm them. | अपनी मेडिकल रिपोर्ट के मान जोड़ें। आपके पुष्टि करने के बाद ही ये आपके ट्विन को अपडेट करते हैं। | તમારા મેડિકલ રિપોર્ટના મૂલ્યો ઉમેરો. તમે પુષ્ટિ કરો પછી જ તે તમારા ટ્વિનને અપડેટ કરે છે. | [ ] |
| `ri.honest` | This prototype cannot read your files by itself. Read the number from your report and type it in. Nothing reaches your Twin until you confirm it, and no clinician has reviewed it. | यह प्रोटोटाइप आपकी फ़ाइलें खुद नहीं पढ़ सकता। रिपोर्ट से संख्या पढ़कर यहाँ लिखें। आपकी पुष्टि तक कुछ भी आपके ट्विन तक नहीं पहुँचता, और किसी चिकित्सक ने इसकी समीक्षा नहीं की है। | આ પ્રોટોટાઇપ તમારી ફાઇલો જાતે વાંચી શકતું નથી. રિપોર્ટમાંથી સંખ્યા વાંચીને અહીં લખો. તમારી પુષ્ટિ સુધી કંઈ તમારા ટ્વિન સુધી પહોંચતું નથી, અને કોઈ ચિકિત્સકે તેની સમીક્ષા કરી નથી. | [ ] |
| `ri.files` | Your uploaded reports | आपकी अपलोड की गई रिपोर्ट | તમારા અપલોડ કરેલા રિપોર્ટ | [ ] |
| `ri.loading` | Loading reports… | रिपोर्ट लोड हो रही हैं… | રિપોર્ટ લોડ થઈ રહ્યા છે… | [ ] |
| `ri.loadError` | Could not load your reports. | आपकी रिपोर्ट लोड नहीं हो सकीं। | તમારા રિપોર્ટ લોડ થઈ શક્યા નથી. | [ ] |
| `ri.noFiles` | No reports uploaded yet. | अभी कोई रिपोर्ट अपलोड नहीं हुई। | હજી કોઈ રિપોર્ટ અપલોડ થયો નથી. | [ ] |
| `ri.manageFiles` | Upload or manage files | फ़ाइलें अपलोड या प्रबंधित करें | ફાઇલો અપલોડ કે મેનેજ કરો | [ ] |
| `ri.notReviewed` | Clinician review: not reviewed | चिकित्सक समीक्षा: समीक्षा नहीं हुई | ચિકિત્સક સમીક્ષા: સમીક્ષા થઈ નથી | [ ] |
| `ri.add` | Add a value from a report | रिपोर्ट से एक मान जोड़ें | રિપોર્ટમાંથી એક મૂલ્ય ઉમેરો | [ ] |
| `ri.test` | Test | जाँच | તપાસ | [ ] |
| `ri.value` | Value | मान | મૂલ્ય | [ ] |
| `ri.low` | Lowest value printed on the report (optional) | रिपोर्ट में छपा सबसे कम मान (वैकल्पिक) | રિપોર્ટમાં છાપેલું સૌથી ઓછું મૂલ્ય (વૈકલ્પિક) | [ ] |
| `ri.high` | Highest value printed on the report (optional) | रिपोर्ट में छपा सबसे अधिक मान (वैकल्पिक) | રિપોર્ટમાં છાપેલું સૌથી વધુ મૂલ્ય (વૈકલ્પિક) | [ ] |
| `ri.rangeHelp` | Type the range printed on your own report if there is one. The app does not decide what is normal. | अगर आपकी अपनी रिपोर्ट में सीमा छपी है तो वही लिखें। ऐप तय नहीं करता कि क्या सामान्य है। | તમારા પોતાના રિપોર્ટમાં શ્રેણી છાપેલી હોય તો તે લખો. એપ નક્કી કરતી નથી કે શું સામાન્ય છે. | [ ] |
| `ri.date` | Date of the test | जाँच की तारीख | તપાસની તારીખ | [ ] |
| `ri.fromReport` | From which report (optional) | किस रिपोर्ट से (वैकल्पिक) | કયા રિપોર્ટમાંથી (વૈકલ્પિક) | [ ] |
| `ri.noneReport` | Not linked to a file | किसी फ़ाइल से जुड़ा नहीं | કોઈ ફાઇલ સાથે જોડાયેલું નથી | [ ] |
| `ri.review` | Review before adding | जोड़ने से पहले जाँचें | ઉમેરતા પહેલાં તપાસો | [ ] |
| `ri.confirmTitle` | Please check this value | कृपया यह मान जाँचें | કૃપા કરીને આ મૂલ્ય તપાસો | [ ] |
| `ri.confirmText` | Compare it with your report. It is added to your Twin only when you press Confirm. | इसे अपनी रिपोर्ट से मिलाएँ। पुष्टि दबाने पर ही यह आपके ट्विन में जुड़ता है। | તેને તમારા રિપોર્ટ સાથે સરખાવો. પુષ્ટિ દબાવો ત્યારે જ તે તમારા ટ્વિનમાં ઉમેરાય છે. | [ ] |
| `ri.confirm` | Confirm and add to my Twin | पुष्टि करें और मेरे ट्विन में जोड़ें | પુષ્ટિ કરો અને મારા ટ્વિનમાં ઉમેરો | [ ] |
| `ri.edit` | Edit | बदलें | બદલો | [ ] |
| `ri.added` | Added to your Twin. | आपके ट्विन में जोड़ दिया गया। | તમારા ટ્વિનમાં ઉમેરાયું. | [ ] |
| `ri.saveError` | Could not save on this device. Storage may be blocked. | इस डिवाइस पर सहेजा नहीं जा सका। स्टोरेज बंद हो सकता है। | આ ડિવાઇસ પર સાચવી શકાયું નથી. સ્ટોરેજ બંધ હોઈ શકે. | [ ] |
| `ri.confirmed` | Values you confirmed | आपके पुष्टि किए हुए मान | તમે પુષ્ટિ કરેલા મૂલ્યો | [ ] |
| `ri.confirmedShort` | Values you confirmed from reports | रिपोर्ट से आपके पुष्टि किए हुए मान | રિપોર્ટમાંથી તમે પુષ્ટિ કરેલા મૂલ્યો | [ ] |
| `ri.noneConfirmed` | You have not confirmed any values yet. | आपने अभी कोई मान पुष्ट नहीं किया है। | તમે હજી કોઈ મૂલ્ય પુષ્ટ કર્યું નથી. | [ ] |
| `ri.deviceOnly` | Saved only on this device for now. They are not sent to the hospital. | अभी केवल इसी डिवाइस पर सहेजे गए हैं। ये अस्पताल को नहीं भेजे जाते। | હમણાં ફક્ત આ ડિવાઇસ પર સાચવાયા છે. તે હોસ્પિટલને મોકલાતા નથી. | [ ] |
| `ri.measured` | Measured on {{date}} | {{date}} को जाँचा गया | {{date}} ના રોજ તપાસ્યું | [ ] |
| `ri.printed` | Printed range {{low}} to {{high}} | छपी सीमा {{low}} से {{high}} | છાપેલી શ્રેણી {{low}} થી {{high}} | [ ] |
| `ri.status.within` | Inside the range on your report | आपकी रिपोर्ट की सीमा के अंदर | તમારા રિપોર્ટની શ્રેણીની અંદર | [ ] |
| `ri.status.outside` | Outside the range on your report | आपकी रिपोर्ट की सीमा के बाहर | તમારા રિપોર્ટની શ્રેણીની બહાર | [ ] |
| `ri.status.norange` | No range given | कोई सीमा नहीं दी गई | કોઈ શ્રેણી આપી નથી | [ ] |
| `ri.removeFor` | Delete {{name}} | {{name}} हटाएँ | {{name}} કાઢી નાખો | [ ] |
| `ri.err.required` | Please fill this in. | कृपया यह भरें। | કૃપા કરીને આ ભરો. | [ ] |
| `ri.err.range` | Enter a number above 0. | 0 से बड़ी संख्या लिखें। | 0 થી મોટી સંખ્યા લખો. | [ ] |
| `ri.err.number` | Enter a number. | संख्या लिखें। | સંખ્યા લખો. | [ ] |
| `ri.err.order` | The highest value must not be below the lowest. | सबसे अधिक मान सबसे कम मान से कम नहीं हो सकता। | સૌથી વધુ મૂલ્ય સૌથી ઓછા મૂલ્યથી ઓછું ન હોઈ શકે. | [ ] |
| `ri.err.future` | The date cannot be in the future. | तारीख भविष्य की नहीं हो सकती। | તારીખ ભવિષ્યની ન હોઈ શકે. | [ ] |
| `lab.hba1c` | HbA1c | HbA1c | HbA1c | [ ] |
| `lab.fasting_glucose` | Fasting glucose | खाली पेट ग्लूकोज़ | ખાલી પેટે ગ્લુકોઝ | [ ] |
| `lab.creatinine` | Creatinine | क्रिएटिनिन | ક્રિએટિનિન | [ ] |
| `lab.egfr` | eGFR | eGFR | eGFR | [ ] |
| `lab.alt` | ALT (SGPT) | ALT (SGPT) | ALT (SGPT) | [ ] |
| `lab.ast` | AST (SGOT) | AST (SGOT) | AST (SGOT) | [ ] |
| `lab.bilirubin` | Bilirubin | बिलीरुबिन | બિલિરુબિન | [ ] |
| `lab.cholesterol` | Total cholesterol | कुल कोलेस्ट्रॉल | કુલ કોલેસ્ટ્રોલ | [ ] |
| `lab.ldl` | LDL cholesterol | LDL कोलेस्ट्रॉल | LDL કોલેસ્ટ્રોલ | [ ] |

## Health Simulator (UI phase 2a)

Drafts, not yet checked by a native speaker.

| Key | English | Hindi | Gujarati | Checked |
|---|---|---|---|---|
| `sim.intro` | Try a "what if" value and see where it would sit compared with your own usual range. | एक "अगर ऐसा हो" मान आज़माएँ और देखें कि वह आपकी अपनी सामान्य सीमा की तुलना में कहाँ बैठता है। | એક "જો આમ થાય" મૂલ્ય અજમાવો અને જુઓ કે તે તમારી પોતાની સામાન્ય શ્રેણી સામે ક્યાં બેસે છે. | [ ] |
| `sim.hypothetical` | Hypothetical, not a prediction | काल्पनिक, भविष्यवाणी नहीं | કાલ્પનિક, આગાહી નથી | [ ] |
| `sim.notPrediction` | This is a what-if tool. It does not predict what will happen, does not estimate any risk and is not a diagnosis. It only compares a number you choose with your own usual range. | यह "अगर ऐसा हो" देखने का टूल है। यह नहीं बताता कि क्या होगा, किसी जोखिम का अनुमान नहीं लगाता और निदान नहीं है। यह केवल आपके चुने हुए मान की तुलना आपकी अपनी सामान्य सीमा से करता है। | આ "જો આમ થાય" જોવાનું સાધન છે. તે શું થશે તે કહેતું નથી, કોઈ જોખમનો અંદાજ કાઢતું નથી અને નિદાન નથી. તે ફક્ત તમે પસંદ કરેલા મૂલ્યની સરખામણી તમારી પોતાની સામાન્ય શ્રેણી સાથે કરે છે. | [ ] |
| `sim.controls` | What if… | अगर ऐसा हो… | જો આમ થાય… | [ ] |
| `sim.reset` | Reset to my latest readings | मेरी ताज़ा रीडिंग पर वापस | મારી તાજી રીડિંગ પર પાછા | [ ] |
| `sim.valueLabel` | {{name}} value | {{name}} का मान | {{name}} નું મૂલ્ય | [ ] |
| `sim.compare` | Baseline and hypothetical | आधार और काल्पनिक | આધાર અને કાલ્પનિક | [ ] |
| `sim.col.metric` | Reading | रीडिंग | રીડિંગ | [ ] |
| `sim.col.baseline` | Latest (baseline) | ताज़ा (आधार) | તાજી (આધાર) | [ ] |
| `sim.col.hypo` | What-if value | काल्पनिक मान | કાલ્પનિક મૂલ્ય | [ ] |
| `sim.col.usual` | Your usual range | आपकी सामान्य सीमा | તમારી સામાન્ય શ્રેણી | [ ] |
| `sim.col.where` | What-if is | काल्पनिक मान है | કાલ્પનિક મૂલ્ય છે | [ ] |
| `sim.where.within` | Inside your usual range | आपकी सामान्य सीमा में | તમારી સામાન્ય શ્રેણીમાં | [ ] |
| `sim.where.outside` | Outside your usual range | आपकी सामान्य सीमा से बाहर | તમારી સામાન્ય શ્રેણીની બહાર | [ ] |
| `sim.noRange` | No usual range set | सामान्य सीमा तय नहीं | સામાન્ય શ્રેણી નક્કી નથી | [ ] |
| `sim.summaryIn` | With these values, nothing would be outside your usual range. | इन मानों से कुछ भी आपकी सामान्य सीमा से बाहर नहीं होगा। | આ મૂલ્યોથી કંઈ તમારી સામાન્ય શ્રેણીની બહાર નહીં હોય. | [ ] |
| `sim.summaryOut` | With these values, these would be outside your usual range: {{names}}. This says nothing about what would actually happen. | इन मानों से ये आपकी सामान्य सीमा से बाहर होंगे: {{names}}। इससे यह पता नहीं चलता कि असल में क्या होगा। | આ મૂલ્યોથી આ તમારી સામાન્ય શ્રેણીની બહાર હશે: {{names}}. આનાથી ખરેખર શું થશે તે કહી શકાતું નથી. | [ ] |
| `sim.assumptions` | Assumptions | मान्यताएँ | ધારણાઓ | [ ] |
| `sim.assume.1` | The baseline is your latest shared reading. With no reading yet, the sliders start in the middle of your usual range. | आधार आपकी ताज़ा साझा रीडिंग है। रीडिंग न हो तो स्लाइडर आपकी सामान्य सीमा के बीच से शुरू होते हैं। | આધાર તમારી તાજી શેર કરેલી રીડિંગ છે. રીડિંગ ન હોય તો સ્લાઇડર તમારી સામાન્ય શ્રેણીની વચ્ચેથી શરૂ થાય છે. | [ ] |
| `sim.assume.2` | "Usual range" is the range saved in your profile. The app does not know what is normal for anyone else. | "सामान्य सीमा" वही है जो आपकी प्रोफ़ाइल में सहेजी है। ऐप नहीं जानता कि किसी और के लिए क्या सामान्य है। | "સામાન્ય શ્રેણી" એટલે તમારી પ્રોફાઇલમાં સાચવેલી શ્રેણી. એપ જાણતી નથી કે બીજા કોઈ માટે શું સામાન્ય છે. | [ ] |
| `sim.assume.3` | Each value is looked at on its own. Combinations and effects on each other are not modelled. | हर मान को अलग से देखा जाता है। आपस के असर का मॉडल नहीं बनाया गया। | દરેક મૂલ્ય અલગથી જોવાય છે. એકબીજા પરની અસરનું મોડેલ બનાવ્યું નથી. | [ ] |
| `sim.assume.4` | No medicines, activity, sleep or illness are taken into account. | दवाएँ, गतिविधि, नींद या बीमारी का ध्यान नहीं रखा गया। | દવાઓ, પ્રવૃત્તિ, ઊંઘ કે બીમારીને ધ્યાનમાં લેવાઈ નથી. | [ ] |
| `sim.uncertainty` | How much your readings vary | आपकी रीडिंग कितनी बदलती हैं | તમારી રીડિંગ કેટલી બદલાય છે | [ ] |
| `sim.uncertaintyHelp` | Your real readings move around from moment to moment. A what-if inside this spread is not unusual for you. | आपकी असली रीडिंग पल-पल बदलती रहती हैं। इस दायरे के अंदर का काल्पनिक मान आपके लिए असामान्य नहीं है। | તમારી સાચી રીડિંગ ક્ષણે ક્ષણે બદલાય છે. આ વિસ્તારની અંદરનું કાલ્પનિક મૂલ્ય તમારા માટે અસામાન્ય નથી. | [ ] |
| `sim.spread` | {{min}} to {{max}} ({{n}} readings) | {{min}} से {{max}} ({{n}} रीडिंग) | {{min}} થી {{max}} ({{n}} રીડિંગ) | [ ] |
| `sim.noReadings` | no readings yet | अभी कोई रीडिंग नहीं | હજી કોઈ રીડિંગ નથી | [ ] |

## Not translated on purpose

- `src/config/instructions.json`: condition-specific first-aid text stays hidden until a doctor sets `reviewed: true` (see `docs/CLINICAL_REVIEW.md`). Translate it only after that review.
- Hospital and person names in the mock data are demo data.
- Voice recognition accuracy for Hindi and Gujarati depends on the browser; the keyword dictionary in `src/config/voiceKeywords.js` also needs a native-speaker check.
- "QR" stays in Latin letters on purpose (it is the common term).
