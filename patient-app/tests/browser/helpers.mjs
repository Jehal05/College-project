// Shared helpers for the browser tests (Playwright + headless Chrome). Each *.test.mjs file is its own program.
// Addresses and Chrome come from the environment so the same tests run on a laptop and in CI.
import { chromium } from 'playwright-core';

export const API = process.env.TEST_API_URL || 'http://localhost:4000';
export const BASE = process.env.TEST_APP_URL || 'http://localhost:5173';
export const CHROME = process.env.CHROME_PATH || '/usr/bin/google-chrome';
export const BANNER = 'Simulated event. Not a medical diagnosis.';
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const results = [];
export const logs = []; // browser console errors and warnings

export function check(label, condition, extra = '') {
  results.push(Boolean(condition));
  console.log((condition ? 'PASS ' : 'FAIL ') + label, extra === '' ? '' : (typeof extra === 'string' ? extra : JSON.stringify(extra)));
}

export async function api(method, path, token, body) {
  const response = await fetch(API + path, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return response.json().catch(() => ({}));
}
export const token = async () => (await api('POST', '/auth/login', null, { email: 'patient@demo.test', password: 'demo1234' })).token;

// Start from a known state: demo data reset, English, no simulated failures.
export async function freshState() {
  const tok = await token();
  await api('POST', '/demo/fail', tok, { mode: 'off' });
  await api('POST', '/demo/reset', tok);
  await api('PATCH', '/patients/PT-2026-0417', tok, { language: 'en' });
  return tok;
}

export const launch = () => chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
export const phone = (browser, options = {}) => browser.newContext({ viewport: { width: 360, height: 740 }, ...options });

export async function newPage(context) {
  const page = await context.newPage();
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push([m.type(), m.text()]); });
  page.on('pageerror', (e) => logs.push(['pageerror', String(e)]));
  return page;
}

export async function login(page, base = BASE) {
  await page.goto(base + '/login');
  await page.fill('input[type=email]', 'patient@demo.test');
  await page.fill('input[type=password]', 'demo1234');
  await page.click('button[type=submit]');
  await page.waitForURL(base + '/');
}

// Console noise that is expected when a test switches the network off or breaks the server on purpose.
const EXPECTED = /ERR_INTERNET_DISCONNECTED|ERR_FAILED|Failed to load resource|Deliberate test crash|ErrorBoundary|The above error occurred|Error: Uncaught|net::/;
export function finish(name, { allowConsole = false } = {}) {
  if (!allowConsole) {
    const unexpected = logs.filter(([, text]) => !EXPECTED.test(text));
    check(name + ': no unexpected console errors or warnings', unexpected.length === 0, unexpected.slice(0, 3));
  }
  const failed = results.filter((r) => !r).length;
  console.log(name + ': ' + failed + ' failed of ' + results.length);
  process.exit(failed ? 1 : 0);
}

export const noOverflow = (page) => page.evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth');
export const unnamedControls = (page) => page.evaluate(`[...document.querySelectorAll('button,a,input,select')].filter(e=>{
  const n=(e.innerText||'').trim()||e.getAttribute('aria-label')||e.getAttribute('aria-labelledby')||(e.labels&&e.labels.length&&e.labels[0].innerText)||''; return !n}).map(e=>e.outerHTML.slice(0,70))`);
