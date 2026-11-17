// Two cities: the Hospitals screen, the city chooser, the home city, and a simulated SOS that reaches a hospital of the chosen city.
import { api, check, finish, freshState, launch, login, newPage, noOverflow, phone, sleep, token, unnamedControls } from './helpers.mjs';

let tok = await freshState();
const pid = 'PT-2026-0417';
const names = async (city) => (await api('GET', '/hospitals?city_id=' + city, tok)).map((h) => h.name);
const [amd, pnq] = [await names('AMD'), await names('PNQ')];
check('20.0 the server lists five hospitals per city', amd.length === 5 && pnq.length === 5, [amd.length, pnq.length]);

const browser = await launch();
const ctx = await phone(browser); const p = await newPage(ctx); await login(p); await p.waitForSelector('text=Hello, Rahul');

// Ahmedabad is the home city
await p.goto((new URL(p.url())).origin + '/hospitals'); await p.getByRole('heading', { level: 1, name: 'Hospitals' }).waitFor();
await p.waitForSelector('text=Showing: Ahmedabad, Gujarat'); await p.waitForSelector('ol[aria-label=Hospitals] > li');
let body = await p.innerText('body');
check('20.1 a patient whose home city is Ahmedabad sees the Ahmedabad hospitals', amd.every((n) => body.includes(n)) && (await p.locator('ol[aria-label=Hospitals] > li').count()) === 5);
check('20.2 no Pune hospital is shown there', pnq.every((n) => !body.includes(n)));
check('20.3 it says the data is simulated and where the simulated start is', body.includes('Simulated location in Ahmedabad') && body.includes('SIMULATED MAP'));
check('20.4 the map is one labelled picture and nothing overflows at 360 px', (await p.locator('svg[role=img]').count()) === 1 && (await noOverflow(p)) && (await unnamedControls(p)).length === 0);

// switch to Pune on the same screen
await p.locator('label', { hasText: 'Pune' }).click();
await p.waitForSelector('text=Showing: Pune, Maharashtra'); await p.waitForSelector(`text=${pnq[0]}`);
body = await p.innerText('body');
check('20.5 switching to Pune shows only the Pune hospitals', pnq.every((n) => body.includes(n)) && amd.every((n) => !body.includes(n)) && body.includes('Simulated location in Pune'));
check('20.6 the choice is saved as the home city on the server', (await api('GET', '/patients/' + pid, tok)).home_city_id === 'PNQ');
await p.reload(); await p.waitForSelector('text=Showing: Pune, Maharashtra');
check('20.7 it survives a reload', true);
await p.goto((new URL(p.url())).origin + '/'); await p.waitForSelector('text=Hello, Rahul');
await p.goto((new URL(p.url())).origin + '/overview'); await p.waitForSelector('text=City: Pune');
check('20.8 Overview shows the city chip', true);
await p.goto((new URL(p.url())).origin + '/profile'); await p.waitForSelector('text=My profile');
check('20.9 the profile has the chooser with Pune selected', await p.getByRole('radio', { name: /Pune/ }).isChecked());

// A simulated SOS from Pune reaches a Pune hospital
const origin = new URL(p.url()).origin;
await p.goto(origin + '/symptoms'); await p.waitForSelector('text=What is happening?');
await p.click('text=Heart or chest'); await p.getByLabel('Chest pain or pressure').check(); await p.getByLabel('Shortness of breath').check();
await p.click('text=Get help now'); await p.waitForURL('**/emergency/EM-*'); await p.click('text=Send now'); await p.waitForSelector('text=Alert sent');
const id = new URL(p.url()).pathname.split('/').pop();
const e = await api('GET', '/emergencies/' + id, tok);
check('20.10 the SOS from Pune went to a Pune hospital', e.hospital && e.hospital.id.startsWith('HSP-PNQ-') && e.city_id === 'PNQ' && !e.hospital.other_city, e.hospital);
await p.waitForSelector(`text=/Hospital: ${e.hospital.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/`, { timeout: 5000 });
check('20.11 the screen names that Pune hospital', true);
await p.click("text=I'm OK, cancel").catch(() => {});

// Back to Ahmedabad: the same flow goes to an Ahmedabad hospital (no regression)
await ctx.close();
await api('POST', '/demo/reset', tok); await api('PATCH', '/patients/' + pid, tok, { home_city_id: 'AMD' });
const ctx2 = await phone(browser); const p2 = await newPage(ctx2); await login(p2);
await p2.goto(origin + '/symptoms'); await p2.waitForSelector('text=What is happening?');
await p2.click('text=Heart or chest'); await p2.getByLabel('Chest pain or pressure').check(); await p2.getByLabel('Shortness of breath').check();
await p2.click('text=Get help now'); await p2.waitForURL('**/emergency/EM-*'); await p2.click('text=Send now'); await p2.waitForSelector('text=Alert sent');
const id2 = new URL(p2.url()).pathname.split('/').pop(); const e2 = await api('GET', '/emergencies/' + id2, tok);
check('20.12 the SOS from Ahmedabad still goes to an Ahmedabad hospital', e2.hospital && e2.hospital.id.startsWith('HSP-AMD-') && e2.city_id === 'AMD', e2.hospital);

// Hindi, phone
await api('PATCH', '/patients/' + pid, tok, { language: 'hi' });
await p2.goto(origin + '/hospitals'); await p2.waitForSelector('text=/दिखा रहे हैं: Ahmedabad/', { timeout: 8000 });
body = await p2.innerText('body');
check('20.13 the Hospitals screen is translated into Hindi and does not overflow', body.includes('सिम्युलेटेड') && (await noOverflow(p2)));
await api('PATCH', '/patients/' + pid, tok, { language: 'en' });

await ctx2.close(); await browser.close();
await freshState();
finish('phase20-cities');
