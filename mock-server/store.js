// In-memory data for the mock server. Everything resets when the server restarts.
// All data here is FAKE and used only for the simulated demo.
const users = require('./data/users.json');
const hospitals = require('./data/hospitals.json');
const emergencyTypes = require('./data/emergencyTypes.json');

// Deep copy so edits do not touch the JSON file on disk.
const patients = { 'HT-1001': JSON.parse(JSON.stringify(require('./data/patient.json'))) };
const tokens = new Map(); // token -> user
const emergencies = new Map(); // id -> emergency
let emergencyCounter = 0;

function nextEmergencyId() {
  emergencyCounter += 1;
  return 'E-' + String(emergencyCounter).padStart(4, '0');
}

module.exports = { users, hospitals, emergencyTypes, patients, tokens, emergencies, nextEmergencyId };
