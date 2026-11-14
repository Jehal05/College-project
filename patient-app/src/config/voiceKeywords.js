// Words that make the voice matcher SUGGEST a symptom. A symptom matches when the spoken text
// CONTAINS one of these phrases (so short stems such as "सांस फूल" also catch "सांस फूल रही है").
// Shape: { SYMPTOM_ID: { en: [...], hi: [...], gu: [...] } }. Add more phrases here any time.
// The recogniser can be wrong, so matches are only suggestions the person must confirm.
export const VOICE_KEYWORDS = {
  CHEST_PAIN: {
    en: ['chest pain', 'chest pressure', 'pain in my chest', 'tight chest', 'chest is tight', 'chest hurts'],
    hi: ['सीने में दर्द', 'छाती में दर्द', 'सीने पर दबाव', 'छाती पर दबाव', 'सीने में जकड़न', 'सीने में भारीपन'],
    gu: ['છાતીમાં દુખાવો', 'છાતી દબાય છે', 'છાતી પર દબાણ', 'છાતીમાં દબાણ', 'છાતીમાં જકડાટ'],
  },
  SHORT_BREATH: {
    en: ['short of breath', "can't breathe", 'cannot breathe', 'breathless', 'hard to breathe', 'difficulty breathing'],
    hi: ['सांस फूल', 'सांस नहीं आ', 'दम घुट', 'सांस लेने में तकलीफ', 'सांस लेने में दिक्कत'],
    gu: ['શ્વાસ ચડ', 'શ્વાસ લઈ શકાતો નથી', 'શ્વાસ લેવામાં તકલીફ', 'દમ ઘૂંટાય', 'શ્વાસ ફૂલ'],
  },
  SWEATING: {
    en: ['sweating', 'sweat', 'sweaty', 'cold sweat'],
    hi: ['पसीना', 'ठंडा पसीना'],
    gu: ['પરસેવો', 'ઠંડો પરસેવો'],
  },
  NAUSEA: {
    en: ['nausea', 'nauseous', 'feel sick', 'want to vomit', 'vomiting'],
    hi: ['जी मिचल', 'मिचली', 'उल्टी', 'जी घबरा'],
    gu: ['ઉબકા', 'ઊલટી', 'મૂંઝારો', 'ઊબકા'],
  },
  ARM_JAW_PAIN: {
    en: ['arm pain', 'pain in my left arm', 'left arm', 'jaw pain', 'pain in my jaw'],
    hi: ['बाएं हाथ', 'बांह में दर्द', 'जबड़े में दर्द', 'जबड़े'],
    gu: ['ડાબા હાથ', 'હાથમાં દુખાવો', 'જડબામાં દુખાવો', 'જડબા'],
  },
  FAINTING: {
    en: ['fainting', 'fainted', 'faint', 'passed out', 'blacked out', 'unconscious'],
    hi: ['बेहोश', 'चक्कर खाकर गिर', 'होश नहीं'],
    gu: ['બેભાન', 'ચક્કર ખાઈ', 'ભાન નથી'],
  },
  FACE_DROOP: {
    en: ['face drooping', 'face is drooping', 'crooked face', 'face droop', 'one side of my face'],
    hi: ['चेहरा टेढ़ा', 'मुंह टेढ़ा', 'मुँह टेढ़ा', 'चेहरा लटक'],
    gu: ['ચહેરો વાંકો', 'મોઢું વાંકું', 'ચહેરો લટક', 'મોં વાંકું'],
  },
  LIMB_WEAKNESS: {
    en: ['arm weakness', 'leg weakness', 'weak arm', 'weak leg', 'cannot lift my arm', "can't lift my arm", 'arm is numb'],
    hi: ['हाथ में कमज़ोरी', 'हाथ में कमजोरी', 'पैर में कमज़ोरी', 'पैर में कमजोरी', 'हाथ सुन्न', 'हाथ उठा नहीं'],
    gu: ['હાથમાં નબળાઈ', 'પગમાં નબળાઈ', 'હાથ સુન્ન', 'હાથ ઊંચો થતો નથી'],
  },
  SLURRED_SPEECH: {
    en: ['slurred', "can't speak properly", 'cannot speak properly', 'speech is slurred', 'words are mixed up'],
    hi: ['लड़खड़ा', 'बोल नहीं पा', 'बोलने में दिक्कत', 'ज़ुबान लड़खड़'],
    gu: ['થોથવા', 'બોલી શકાતું નથી', 'બોલવામાં તકલીફ', 'જીભ થોથવાય'],
  },
  SUDDEN_CONFUSION: {
    en: ['sudden confusion', 'suddenly confused', 'very confused', "can't think", 'confused suddenly'],
    hi: ['अचानक भ्रम', 'अचानक उलझन', 'समझ नहीं आ रहा', 'अचानक घबराहट'],
    gu: ['અચાનક મૂંઝવણ', 'અચાનક ગૂંચવણ', 'સમજાતું નથી'],
  },
  SEVERE_HEADACHE: {
    en: ['severe headache', 'sudden headache', 'worst headache', 'terrible headache', 'head is splitting'],
    hi: ['तेज़ सिरदर्द', 'तेज सिरदर्द', 'अचानक सिरदर्द', 'सिर में तेज़ दर्द', 'सिर फट'],
    gu: ['તીવ્ર માથાનો દુખાવો', 'અચાનક માથાનો દુખાવો', 'માથું ફાટ', 'માથામાં સખત દુખાવો'],
  },
  DIA_CONFUSION: {
    en: ['confusion', 'confused', 'cannot think clearly', 'disoriented'],
    hi: ['भ्रम', 'उलझन', 'भ्रमित'],
    gu: ['મૂંઝવણ', 'ગૂંચવણ', 'ગૂંચવાયેલ'],
  },
  DIA_SHAKING: {
    en: ['shaking', 'trembling', 'shaky', 'shivering'],
    hi: ['कंपकंपी', 'काँप', 'कांप', 'हाथ काँप'],
    gu: ['ધ્રુજારી', 'ધ્રુજ', 'કંપારી'],
  },
  DIA_SWEATING: {
    en: ['sweating', 'sweat', 'sweaty', 'cold sweat'],
    hi: ['पसीना', 'ठंडा पसीना'],
    gu: ['પરસેવો', 'ઠંડો પરસેવો'],
  },
  DIA_FAINTING: {
    en: ['fainting', 'fainted', 'faint', 'passed out', 'blacked out'],
    hi: ['बेहोश', 'होश नहीं'],
    gu: ['બેભાન', 'ભાન નથી'],
  },
  LOW_GLUCOSE_READING: {
    en: ['low glucose', 'low sugar', 'glucose is low', 'sugar is low', 'low blood sugar', 'glucose reading is low'],
    hi: ['ग्लूकोज़ कम', 'ग्लूकोज कम', 'शुगर कम', 'शुगर लो', 'चीनी कम'],
    gu: ['ગ્લુકોઝ ઓછું', 'ગ્લુકોઝ ઓછો', 'શુગર ઓછી', 'શુગર લો', 'ખાંડ ઓછી'],
  },
  WHEEZING: {
    en: ['wheezing', 'wheeze', 'whistling when i breathe', 'whistling sound'],
    hi: ['घरघराहट', 'सीटी जैसी आवाज', 'सांस में सीटी', 'सीटी की आवाज'],
    gu: ['સિસોટી', 'ઘરઘરાટ', 'સીટી જેવો અવાજ', 'શ્વાસમાં સીટી'],
  },
  CANNOT_SPEAK_SENTENCES: {
    en: ['cannot speak full sentences', "can't speak full sentences", "can't finish a sentence", 'cannot finish a sentence', 'only speak a few words'],
    hi: ['पूरे वाक्य नहीं', 'पूरा वाक्य नहीं', 'बोल नहीं पा रहा', 'बात पूरी नहीं'],
    gu: ['પૂરાં વાક્યો', 'પૂરું વાક્ય', 'બોલી શકતો નથી', 'બોલી શકતી નથી'],
  },
  SEVERE_SHORT_BREATH: {
    en: ['severe shortness of breath', 'very short of breath', 'gasping', 'struggling to breathe', 'severely breathless'],
    hi: ['बहुत सांस फूल', 'तेज़ सांस फूल', 'तेज सांस फूल', 'सांस बहुत तेज़', 'हांफ'],
    gu: ['ખૂબ શ્વાસ ચડ', 'તીવ્ર શ્વાસ ચડ', 'હાંફ', 'શ્વાસ બહુ ચડે'],
  },
  BLUE_LIPS: {
    en: ['blue lips', 'lips are blue', 'lips turning blue', 'bluish lips'],
    hi: ['होंठ नीले', 'होंठ नीला', 'नीले होंठ'],
    gu: ['હોઠ ભૂરા', 'હોઠ વાદળી', 'ભૂરા હોઠ'],
  },
};
