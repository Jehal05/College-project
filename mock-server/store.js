// In-memory data for the mock server. Everything resets when the server restarts
// (or when POST /demo/reset is called). All data here is FAKE.
const users = require('./data/users.json');
const hospitals = require('./data/hospitals.json');
const emergencyTypes = require('./data/emergencyTypes.json');
const baseline = require('./data/baseline.json');

const seedPatient = () => JSON.parse(JSON.stringify(require('./data/patient.json'))); // deep copy

const patients = { 'HT-1001': seedPatient() };
const tokens = new Map(); // token -> user
const emergencies = new Map(); // id -> emergency
let emergencyCounter = 0;

// Phase 3 data, kept in memory only: uploaded reports (with their bytes) and the consent change log.
const reports = { 'HT-1001': [] };
const consentChanges = { 'HT-1001': [] };
const counters = { contact: 2, report: 0 }; // C-1 and C-2 are in the seed

function nextEmergencyId() {
  emergencyCounter += 1;
  return 'E-' + String(emergencyCounter).padStart(4, '0');
}

// Used by POST /demo/reset: forget all emergencies and restore the seed patient.
// Logins stay valid so the app does not log out.
function resetStore() {
  emergencies.clear();
  emergencyCounter = 0;
  patients['HT-1001'] = seedPatient();
  reports['HT-1001'] = [];
  consentChanges['HT-1001'] = [];
  counters.contact = 2;
  counters.report = 0;
}

module.exports = { users, hospitals, emergencyTypes, patients, tokens, emergencies, nextEmergencyId, resetStore,
  baseline, reports, consentChanges, counters };
