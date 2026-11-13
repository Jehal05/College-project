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
| `passport.title` | Health passport | स्वास्थ्य पासपोर्ट | આરોગ્ય પાસપોર્ટ | [ ] |
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
| `view.title` | Health passport | स्वास्थ्य पासपोर्ट | આરોગ્ય પાસપોર્ટ | [ ] |
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
| `login.wrongRole` | This app is for patients. Staff should use the hospital portal. | यह ऐप मरीज़ों के लिए है। स्टाफ़ अस्पताल पोर्टल का उपयोग करें। | આ એપ દર્દીઓ માટે છે. સ્ટાફે હૉસ્પિટલ પોર્ટલનો ઉપયોગ કરવો. | [ ] |
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

## Not translated on purpose

- `src/config/instructions.json`: condition-specific first-aid text stays hidden until a doctor sets `reviewed: true` (see `docs/CLINICAL_REVIEW.md`). Translate it only after that review.
- Hospital and person names in the mock data are demo data.
- Voice recognition accuracy for Hindi and Gujarati depends on the browser; the keyword dictionary in `src/config/voiceKeywords.js` also needs a native-speaker check.
- "QR" stays in Latin letters on purpose (it is the common term).
