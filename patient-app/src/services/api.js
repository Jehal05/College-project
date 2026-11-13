// All HTTP calls live here. Components never hard-code URLs.
// Switch from mock to real backend by changing VITE_API_URL in .env.
import { getToken } from './auth';
import { readCopy, saveCopy } from '../utils/offlineCache';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// One fetch helper for everything: adds the token and turns failures into errors with .status or .code === 'NETWORK'.
async function send(path, { method = 'GET', headers = {}, body } = {}) {
  const token = getToken();
  const allHeaders = token ? { ...headers, Authorization: 'Bearer ' + token } : headers;
  let response;
  try {
    response = await fetch(API_URL + path, { method, headers: allHeaders, body });
  } catch {
    const err = new Error('network');
    err.code = 'NETWORK';
    window.dispatchEvent(new Event('ht:network-fail')); // lets the offline banner know right away
    throw err; // Server not reachable.
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const err = new Error(data.error || 'Request failed');
    err.status = response.status;
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
    if (method === 'GET') saveCopy(path, data);
    return data;
  } catch (err) {
    const copy = method === 'GET' && err.code === 'NETWORK' ? readCopy(path) : undefined;
    if (copy !== undefined) return copy;
    throw err;
  }
}

export const login = (email, password) => request('/auth/login', { method: 'POST', body: { email, password } });
export const getPatient = (id) => request('/patients/' + id);
export const updatePatient = (id, fields) => request('/patients/' + id, { method: 'PATCH', body: fields });
export const getVitals = (id) => request('/patients/' + id + '/vitals');

// ---- Emergency flow (Phase 2) ----
export const createEmergency = (body) => request('/emergencies', { method: 'POST', body });
export const sendSos = (id, location) => request('/emergencies/' + id + '/sos', { method: 'POST', body: { location } });
export const cancelEmergency = (id) => request('/emergencies/' + id + '/cancel', { method: 'POST' });
export const getEmergency = (id) => request('/emergencies/' + id);

// ---- Demo helpers ----
export const runDemoScenario = (type) => request('/demo/scenario', { method: 'POST', body: { type } });
export const resetDemo = () => request('/demo/reset', { method: 'POST' });

// ---- Consent, contacts, reports and baseline (Phase 3) ----
const patientPath = (id, rest) => '/patients/' + id + rest;
export const getConsents = (id) => request(patientPath(id, '/consents'));
export const saveConsents = (id, consents) => request(patientPath(id, '/consents'), { method: 'PUT', body: consents });
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
