// In-memory data for the mock server. Everything resets when the server restarts
// (or when POST /demo/reset is called). All data here is FAKE.
const users = require('./data/users.json');
const hospitals = require('./data/hospitals.json');
const emergencyTypes = require('./data/emergencyTypes.json');

const seedPatient = () => JSON.parse(JSON.stringify(require('./data/patient.json'))); // deep copy

const patients = { 'HT-1001': seedPatient() };
const tokens = new Map(); // token -> user
const emergencies = new Map(); // id -> emergency
let emergencyCounter = 0;

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
}

module.exports = { users, hospitals, emergencyTypes, patients, tokens, emergencies, nextEmergencyId, resetStore };
