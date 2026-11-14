// All HTTP calls live here. Components never hard-code URLs.
// Switch from mock to real backend by changing VITE_API_URL in .env.
import { getToken } from './auth';
import { readCopy, saveCopy } from '../utils/offlineCache';
import { isSimulatedOffline } from '../utils/simulatedOffline';
import { normalizeEmergency } from '../utils/adapters';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Calls that start or follow an emergency never get a time limit or an automatic sign-out:
// the offline "Not sent yet" logic (usePendingEmergency.js) owns them.
const EMERGENCY_PATH = /^\/emergencies/;
const TIMEOUT_MS = 10000; // everything else gives up after 10 seconds

// One fetch helper for everything: adds the token and turns failures into errors with
// .status (HTTP code) or .code === 'NETWORK' | 'TIMEOUT'. 5xx answers also get .server = true.
async function send(path, { method = 'GET', headers = {}, body, publicCall = false } = {}) {
  if (isSimulatedOffline() && !path.startsWith('/demo')) { // demo panel switch: behave offline without touching the real network
    window.dispatchEvent(new Event('ht:network-fail'));
    throw Object.assign(new Error('network'), { code: 'NETWORK' });
  }
  const token = publicCall ? null : getToken();
  const allHeaders = token ? { ...headers, Authorization: 'Bearer ' + token } : headers;
  const emergency = EMERGENCY_PATH.test(path);
  const controller = new AbortController();
  const timer = emergency ? null : setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response;
  try {
    response = await fetch(API_URL + path, { method, headers: allHeaders, body, signal: controller.signal });
  } catch (cause) {
    const timedOut = cause?.name === 'AbortError';
    const err = new Error(timedOut ? 'timeout' : 'network');
    err.code = timedOut ? 'TIMEOUT' : 'NETWORK';
    if (!timedOut) window.dispatchEvent(new Event('ht:network-fail')); // lets the offline banner know right away
    throw err; // Server not reachable, or too slow.
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const err = new Error(data.error || 'Request failed');
    err.status = response.status;
    err.server = response.status >= 500;
    // The login is no longer valid: sign out with a message (auth.js listens). Never for emergency calls or the login itself.
    if (response.status === 401 && token && !emergency) window.dispatchEvent(new Event('ht:unauthorized'));
    throw err;
  }
  return response;
}

// JSON in, JSON out (an empty answer such as 204 becomes {}).
// A few GET answers are remembered; if the network is down they come back as a "saved copy" (read-only use).
async function request(path, { method = 'GET', body } = {}) {
  try {
    const response = await send(path, {
      method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json().catch(() => ({}));
    if (method === 'GET' && getToken()) saveCopy(path, data); // not after sign out: a late answer must not leave data behind
    return data;
  } catch (err) {
    const copy = method === 'GET' && err.code === 'NETWORK' ? readCopy(path) : undefined;
    if (copy !== undefined) return copy;
    throw err;
  }
}

export const login = (email, password) => request('/auth/login', { method: 'POST', body: { username: email, password } }); // Daksh's backend logs in with `username`
export const getPatient = (id) => request('/patients/' + id);
export const updatePatient = (id, fields) => request('/patients/' + id, { method: 'PATCH', body: fields });
export const getVitals = (id) => request('/patients/' + id + '/vitals');

// ---- Emergency flow (Phase 2) ----
export const createEmergency = (body) => request('/emergencies', { method: 'POST', body });
export const sendSos = (id, location) => request('/emergencies/' + id + '/sos', { method: 'POST', body: { location } });
export const cancelEmergency = (id) => request('/emergencies/' + id + '/cancel', { method: 'POST' });
export const getEmergency = (id) => request('/emergencies/' + id).then(normalizeEmergency);

// ---- Demo helpers ----
export const runDemoScenario = (type) => request('/demo/scenario', { method: 'POST', body: { type } });
export const resetDemo = () => request('/demo/reset', { method: 'POST' });

// ---- Consent, contacts, reports and baseline (Phase 3) ----
const patientPath = (id, rest) => '/patients/' + id + rest;
export const getConsents = (id) => request(patientPath(id, '/consents'));
export const saveConsents = (id, consents) => request(patientPath(id, '/consents'), { method: 'PUT', body: consents });
export const getAccessLog = (id, { limit = 50, before } = {}) =>
  request(patientPath(id, '/access-log?limit=' + limit + (before ? '&before=' + before : '')));
export const getContacts = (id) => request(patientPath(id, '/contacts'));
export const addContact = (id, contact) => request(patientPath(id, '/contacts'), { method: 'POST', body: contact });
export const updateContact = (id, contactId, contact) => request(patientPath(id, '/contacts/' + contactId), { method: 'PUT', body: contact });
export const deleteContact = (id, contactId) => request(patientPath(id, '/contacts/' + contactId), { method: 'DELETE' });
export const getReports = (id) => request(patientPath(id, '/reports'));
export const deleteReport = (id, reportId) => request(patientPath(id, '/reports/' + reportId), { method: 'DELETE' });
export const getBaseline = (id) => request(patientPath(id, '/baseline'));

// A report is sent as the raw file (not JSON), with its own content type.
export const uploadReport = (id, file) => send(patientPath(id, '/reports?name=' + encodeURIComponent(file.name)),
  { method: 'POST', headers: { 'Content-Type': file.type }, body: file }).then((r) => r.json());

// The file needs the login token, so fetch it as a Blob and return a temporary address the browser can open.
export const getReportFileUrl = (id, reportId) => send(patientPath(id, '/reports/' + reportId + '/file'))
  .then((r) => r.blob()).then((blob) => URL.createObjectURL(blob));

// ---- Health passport (Phase 5) ----
export const createPassport = (id, hours) => request(patientPath(id, '/passport'), { method: 'POST', body: { hours } });
export const getPassport = (id) => request(patientPath(id, '/passport'));
export const revokePassport = (id) => request(patientPath(id, '/passport'), { method: 'DELETE' });
export const getPassportLog = (id) => request(patientPath(id, '/passport/log'));
// The responder page: no login, no token sent, never saved offline. 410 means expired or revoked.
export const getPublicPassport = (token) => send('/passport/' + encodeURIComponent(token), { publicCall: true }).then((r) => r.json());

// ---- Phase 6: reasons, summaries, reminders, preferences, demo state ----
export const getReasons = (emergencyId) => request('/emergencies/' + emergencyId + '/reasons');
export const getEmergencies = (id) => request(patientPath(id, '/emergencies'));
export const getSummary = (id, emergencyId) => request(patientPath(id, '/emergencies/' + emergencyId + '/summary'));
export const getReminders = (id) => request(patientPath(id, '/reminders'));
export const addReminder = (id, reminder) => request(patientPath(id, '/reminders'), { method: 'POST', body: reminder });
export const updateReminder = (id, rid, reminder) => request(patientPath(id, '/reminders/' + rid), { method: 'PUT', body: reminder });
export const deleteReminder = (id, rid) => request(patientPath(id, '/reminders/' + rid), { method: 'DELETE' });
export const markReminderShown = (id, rid, scheduledFor) =>
  request(patientPath(id, '/reminders/' + rid + '/shown'), { method: 'POST', body: { scheduled_for: scheduledFor } });
export const markReminderTaken = (id, rid, scheduledFor, at) =>
  request(patientPath(id, '/reminders/' + rid + '/taken'), { method: 'POST', body: { scheduled_for: scheduledFor, at } });
export const getReminderLog = (id) => request(patientPath(id, '/reminders/log'));
export const getPreferences = (id) => request(patientPath(id, '/preferences'));
export const savePreferences = (id, preferences) => request(patientPath(id, '/preferences'), { method: 'PUT', body: preferences });
// Family (Phase 10): a relative links with an invite code, sees only what the patient shared and can send a short check-in.
export const createFamilyInvite = (id) => request(patientPath(id, '/family-invites'), { method: 'POST' });
export const familyLink = (inviteCode) => request('/family/link', { method: 'POST', body: { invite_code: inviteCode } });
export const getFamilyPatients = () => request('/family/patients');
export const familyCheckin = (body) => request('/family/checkin', { method: 'POST', body });
// Volunteer responders and admins (Phase 10)
export const registerResponder = (body) => request('/responders/register', { method: 'POST', body });
export const getResponderAlerts = () => request('/responders/alerts');
export const acceptAlert = (id) => request('/responders/' + encodeURIComponent(id) + '/accept', { method: 'POST' });
export const getAdminUsers = () => request('/admin/users');
export const patchAdminUser = (body) => request('/admin/users', { method: 'PATCH', body });
export const getContent = (type) => request('/content/' + encodeURIComponent(type));
export const putContent = (type, body) => request('/content/' + encodeURIComponent(type), { method: 'PUT', body });
export const getAudit = (page = 1) => request('/audit?page=' + page + '&page_size=20');
export const getDemoState = () => request('/demo/state');
export const setDemoSpeed = (multiplier) => request('/demo/speed', { method: 'POST', body: { multiplier } });
export const setDemoVitals = (change) => request('/demo/vitals', { method: 'POST', body: change });
export const setDemoFail = (mode) => request('/demo/fail', { method: 'POST', body: { mode } });
