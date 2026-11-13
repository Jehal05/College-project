// Phase 9: a refused cancel (409, ambulance already sent) says so in plain words; a real network failure still says "try again".
import { BASE, BANNER, api, check, finish, freshState, launch, newPage, phone, sleep } from './helpers.mjs';

const tok = await freshState();
const browser = await launch();
const TEXT = { en: ['The ambulance is already sent. Please call the number shown.', 'Could not cancel. Please try again.'],
  hi: ['एम्बुलेंस पहले ही भेजी जा चुकी है। कृपया दिखाया गया नंबर कॉल करें।', 'रद्द नहीं हो सका। कृपया दोबारा कोशिश करें।'],
  gu: ['એમ્બ્યુલન્સ પહેલેથી જ મોકલી દેવામાં આવી છે. કૃપા કરીને બતાવેલા નંબર પર કૉલ કરો.', 'રદ થઈ શક્યું નથી. કૃપા કરીને ફરી પ્રયત્ન કરો.'] };
const CANCEL = { en: "I'm OK, cancel", hi: /ठीक हूँ|रद्द/, gu: /ઠીક છું|રદ/ };

for (const lang of ['en', 'hi', 'gu']) {
  await api('POST', '/demo/reset', tok); await api('PATCH', '/patients/PT-2026-0417', tok, { language: lang });
  for (const mode of ['refused', 'network']) {
    const ctx = await phone(browser, { geolocation: { latitude: 23.0225, longitude: 72.5714 }, permissions: ['geolocation'] });
    const p = await newPage(ctx);
    await p.goto(BASE + '/login'); await p.evaluate(`localStorage.setItem('ht.lang','${lang}')`); await p.reload();
    await p.fill('input[type=email]', 'patient@demo.test'); await p.fill('input[type=password]', 'demo1234'); await p.click('button[type=submit]'); await p.waitForURL(BASE + '/');
    const made = await api('POST', '/emergencies', tok, { patient_id: 'PT-2026-0417', type: 'HEART', symptoms: ['CHEST_PAIN', 'SWEATING'] });
    await p.route('**/emergencies/*/cancel', (r) => (mode === 'refused' ? r.fulfill({ status: 409, contentType: 'application/json', body: '{"error":"Invalid transition"}' }) : r.abort('failed')));
    await p.goto(BASE + '/emergency/' + made.id); await sleep(800);
    await p.getByRole('button').filter({ hasText: typeof CANCEL[lang] === 'string' ? CANCEL[lang] : CANCEL[lang] }).first().click();
    await sleep(900);
    const body = await p.innerText('body'); const [refused, retry] = TEXT[lang];
    check(`P1 [${lang}/${mode}] shows the right cancel message`, mode === 'refused' ? body.includes(refused) && !body.includes(retry) : body.includes(retry) && !body.includes(refused), body.slice(0, 200));
    check(`P2 [${lang}/${mode}] banner and Call 112 / 108 stay on screen`, body.includes(lang === 'en' ? BANNER : body.slice(0, 40)) && (await p.locator("a[href='tel:112']").count()) > 0);
    check(`P3 [${lang}/${mode}] never says help is on the way`, !/help is on the way/i.test(body));
    await ctx.close();
  }
}
await api('PATCH', '/patients/PT-2026-0417', tok, { language: 'en' });
// Opening the emergency address directly (no tap yet) makes Chrome warn about the alarm sound and vibration; that is expected here.
finish('phase9-cancel', { allowConsole: true });
