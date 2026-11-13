// Phase 4: Hindi and Gujarati on every screen, language saved on the record, and voice input that only suggests symptoms.
import { BASE, api, check, finish, freshState, launch, login, newPage, phone, sleep } from './helpers.mjs';

const BANNERS = { en: 'Simulated event. Not a medical diagnosis.', hi: 'सिमुलेटेड घटना। यह चिकित्सीय निदान नहीं है।', gu: 'સિમ્યુલેટેડ ઘટના. આ તબીબી નિદાન નથી.' };
// Latin words that may stay in Hindi/Gujarati screens: product names, units, fake data, hospital names.
const ALLOWED = new Set(('qr english heart care healthtwin ai spo2 bpm api demo_speed patient demo demo1234 mock pdf jpg png mb kb rahul mehta asha ravi edited penicillin http localhost com app version hospital city stroke neuro centre general chest respiratory institute community health and sos er desk amb e c r hdl lab b a o ab tel utc id gps iso m s am pm').split(' '));
const latinWords = (text) => [...new Set((text.match(/[A-Za-z][A-Za-z0-9_]*/g) || []).map((w) => w.toLowerCase()))].filter((w) => !ALLOWED.has(w));
const RAW_KEY = /\b(?:home|profile|consent|contacts|reports|twin|clock|notified|emergency|symptoms|symptom|category|state|voice|pending|offline|common|relation|error|demo|language|a11y|validation|login|nav|timeline|instructions|cancelled|notfound|passport|notif|view)\.[A-Za-z_.]+/g;

const tok = await freshState();
const browser = await launch(); const ctx = await phone(browser); const p = await newPage(ctx);
const lang = () => p.evaluate('document.documentElement.lang');
await p.goto(BASE + '/login'); await p.getByLabel('Language').selectOption('gu');
check('L1 login switches to Gujarati and sets <html lang>', (await p.innerText('h2')) === 'સાઇન ઇન કરો' && (await lang()) === 'gu');
await p.fill('input[type=email]', 'patient@demo.test'); await p.fill('input[type=password]', 'demo1234'); await p.click('button[type=submit]');
await p.waitForURL(BASE + '/'); await sleep(1000);
check('L2 language picked on Login is saved on the record', (await api('GET', '/patients/HT-1001', tok)).language === 'gu');

for (const code of ['hi', 'gu']) {
  await p.goto(BASE + '/profile'); await p.locator('select:has(option[value=hi])').selectOption(code); await sleep(1000);
  check(`L3 [${code}] saved to the record`, (await api('GET', '/patients/HT-1001', tok)).language === code);
  await api('POST', '/demo/reset', tok); await api('PATCH', '/patients/HT-1001', tok, { language: code });
  const ex = await api('POST', '/emergencies', tok, { patient_id: 'HT-1001', type: 'HEART', symptoms: ['CHEST_PAIN', 'SHORT_BREATH'] });
  const run = await api('POST', '/demo/scenario', tok, { type: 'ASTHMA' }); await sleep(300);
  const screens = [['/', 'home'], ['/profile', 'profile'], ['/consent', 'consent'], ['/contacts', 'contacts'], ['/reports', 'reports'], ['/symptoms', 'symptoms'],
    ['/passport', 'passport'], ['/emergency/' + ex.id, 'emergency countdown'], ['/emergency/' + run.id, 'emergency response'], ['/cancelled', 'cancelled'], ['/demo', 'demo'], ['/nope', 'not found']];
  for (const [path, name] of screens) {
    await p.goto(BASE + path); await sleep(1500);
    if (name === 'symptoms') await p.locator('[role=radio]').first().click();
    const body = await p.innerText('body'); const left = latinWords(body); const raw = body.match(RAW_KEY) || [];
    check(`L4 [${code}] ${name}: translated, banner, lang attr`, !left.length && !raw.length && body.includes(BANNERS[code]) && (await lang()) === code, [left.slice(0, 8), raw.slice(0, 3)]);
  }
  await p.goto(BASE + '/'); await p.reload(); await sleep(600); check(`L5 [${code}] persists after reload`, (await lang()) === code);
}
await api('PATCH', '/patients/HT-1001', tok, { language: 'hi' }); await p.goto(BASE + '/'); await sleep(1500);
await p.evaluate("localStorage.removeItem('ht.lang')"); await p.getByRole('button', { name: 'साइन आउट' }).click(); await p.waitForURL('**/login');
await p.reload(); await sleep(400);
check('L6 with no device choice the login screen is English', (await p.innerText('h2')) === 'Sign in');
await p.fill('input[type=email]', 'patient@demo.test'); await p.fill('input[type=password]', 'demo1234'); await p.click('button[type=submit]');
await p.waitForURL(BASE + '/'); await sleep(1500);
check('L7 sign-in applies the language saved on the record', (await lang()) === 'hi' && (await p.innerText('h1')).includes('नमस्ते'));
await p.goto(BASE + '/contacts'); await p.waitForSelector('text=Asha Demo'); check('L8 contact relations translated', (await p.innerText('body')).includes('माँ'));

// ---------------- voice ----------------
await api('PATCH', '/patients/HT-1001', tok, { language: 'en' });
const INIT = `window.__heard = 'chest pain'; window.__speechError = null;
class FakeRecognition { start(){ setTimeout(()=>{
  if (window.__speechError) { this.onerror && this.onerror({error: window.__speechError}); this.onend && this.onend(); }
  else if (window.__heard === null) { this.onend && this.onend(); }
  else { this.onresult && this.onresult({results:[[{transcript: window.__heard}]]}); this.onend && this.onend(); } }, 80); }
  abort(){} }
window.webkitSpeechRecognition = FakeRecognition; window.SpeechRecognition = FakeRecognition;`;
const vctx = await phone(browser); await vctx.addInitScript(INIT); const v = await newPage(vctx); await login(v);
async function speak(text, error = null) {
  await v.evaluate(([t, e]) => { window.__heard = t; window.__speechError = e; }, [text, error]);
  await v.getByRole('button', { name: /Speak your symptoms|अपने लक्षण|તમારાં લક્ષણો/ }).click();
  await v.waitForSelector("[role=status]:has-text('We heard'), [role=status]:has-text('हमने'), [role=status]:has-text('અમે'), [role=alert]", { timeout: 3000 });
}
const voiceText = () => v.innerText("section[aria-label='Voice input']");
await v.goto(BASE + '/symptoms'); await speak('I have chest pain and I am sweating'); let txt = await voiceText();
check('V1 suggestion shows category, symptoms and the warning', ['Heart or chest', 'Chest pain or pressure', 'Sweating', 'We may have heard wrong'].every((s) => txt.includes(s)));
check('V2 nothing ticked or sent before confirming', (await v.locator('input[type=checkbox]:checked').count()) === 0 && (await v.locator('[role=radio][aria-checked=true]').count()) === 0 && v.url().includes('/symptoms'));
await v.getByRole('button', { name: 'Tick them' }).click();
check('V3 after confirming: category chosen, two ticks, still not sent', (await v.locator('[role=radio][aria-checked=true]').innerText()) === 'Heart or chest' && (await v.locator('input[type=checkbox]:checked').count()) === 2 && v.url().includes('/symptoms'));
await speak('hello nothing relevant'); check('V4 no match message', (await voiceText()).includes('could not match')); await v.getByRole('button', { name: 'No thanks' }).click();
await speak('my sugar is low and I am shaking'); txt = await voiceText();
check('V5 low sugar suggested', ['Low sugar', 'Very low glucose reading', 'Shaking'].every((s) => txt.includes(s))); await v.getByRole('button', { name: 'Tick them' }).click();
check('V6 switching category replaces ticks', (await v.locator('[role=radio][aria-checked=true]').innerText()) === 'Low sugar' && (await v.locator('input[type=checkbox]:checked').count()) === 2);
await speak('wheezing and blue lips'); check('V7 asthma suggested', (await voiceText()).includes('Breathing')); await v.getByRole('button', { name: 'No thanks' }).click();
await speak('sweating'); check('V8 a tie goes to the chosen category', (await voiceText()).includes('Low sugar')); await v.getByRole('button', { name: 'No thanks' }).click();
for (const [kind, text] of [['not-allowed', 'Microphone access was blocked'], ['no-speech', 'We did not hear anything'], ['network', 'needs an internet connection']]) {
  await speak('x', kind); check(`V9 error '${kind}' gives a clear message`, (await voiceText()).includes(text));
}
await v.evaluate('window.__speechError=null'); await v.locator('[role=radio]').first().click(); await v.getByLabel('Chest pain or pressure').check();
check('V10 typing still works after voice errors', await v.getByRole('button', { name: 'Get help now' }).isEnabled());
const cases = [['hi', 'मुझे सीने में दर्द है और सांस फूल रही है', ['सीने में दर्द या दबाव', 'सांस फूलना']], ['hi', 'चेहरा टेढ़ा हो गया है और बोलने में लड़खड़ाहट', ['चेहरा टेढ़ा होना', 'बोलने में लड़खड़ाहट']],
  ['gu', 'મને છાતીમાં દુખાવો છે અને પરસેવો થાય છે', ['છાતીમાં દુખાવો અથવા દબાણ', 'પરસેવો થવો']], ['gu', 'મારા હોઠ ભૂરા છે અને સિસોટી જેવો અવાજ આવે છે', ['હોઠ ભૂરા થવા', 'સિસોટી જેવો અવાજ સાથે શ્વાસ']]];
for (const [code, spoken, ids] of cases) {
  await api('PATCH', '/patients/HT-1001', tok, { language: code }); await v.goto(BASE + '/symptoms'); await sleep(900);
  await speak(spoken); const t = await v.innerText('section[aria-label]'); check(`V11 [${code}] "${spoken.slice(0, 12)}..." suggests the right symptoms`, ids.every((i) => t.includes(i)));
}
const uctx = await phone(browser); await uctx.addInitScript('delete window.SpeechRecognition; delete window.webkitSpeechRecognition;');
const u = await newPage(uctx); await login(u); await u.goto(BASE + '/symptoms');
check('V12 unsupported browser: no mic button, one-line note', (await u.getByRole('button', { name: /Speak/ }).count()) === 0 && (await u.innerText('body')).includes('Voice input is not available'));
await browser.close(); finish('language-voice');
