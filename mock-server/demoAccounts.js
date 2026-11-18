// Five fictional demo patients, each with their own login. SANDBOX data only.
// Passwords are random at every server start. The login check uses a salted scrypt hash.
// The readable password is kept in memory only so the local start page can show it to the presenter; it is never logged.
const crypto = require('crypto');

const PEOPLE = [
  { patient_id: 'PT-2026-0417', email: 'amit.verma@demo.test' },
  { patient_id: 'PT-2026-0418', email: 'priya.singh@demo.test' },
  { patient_id: 'PT-2026-0419', email: 'rohan.mehta@demo.test' },
  { patient_id: 'PT-2026-0420', email: 'rahul.sharma@demo.test' },
  { patient_id: 'PT-2026-0421', email: 'neha.kapoor@demo.test' },
];
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'; // no look-alike letters
const makePassword = () => Array.from(crypto.randomBytes(10), (b) => ALPHABET[b % ALPHABET.length]).join('');
const hash = (password, salt) => crypto.scryptSync(password, salt, 32).toString('hex');

const shown = []; // { name-less } for the local panel only

function createUsers() {
  shown.length = 0;
  return PEOPLE.map((p) => {
    const password = makePassword();
    const salt = crypto.randomBytes(16).toString('hex');
    shown.push({ patient_id: p.patient_id, email: p.email, password });
    return { email: p.email, role: 'PATIENT', patient_id: p.patient_id, salt, pwHash: hash(password, salt) };
  });
}

// True when this user record accepts the password (fixed demo users use plain "password", demo patients use the hash).
function passwordMatches(user, password) {
  if (typeof password !== 'string') return false;
  if (user.pwHash) {
    const a = Buffer.from(hash(password, user.salt), 'hex');
    return crypto.timingSafeEqual(a, Buffer.from(user.pwHash, 'hex'));
  }
  return user.password === password;
}

const accounts = () => shown.map((s) => ({ ...s }));
module.exports = { createUsers, passwordMatches, accounts, PEOPLE };
