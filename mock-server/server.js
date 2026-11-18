// HealthTwin AI mock server: REST API + WebSocket that sends fake vitals every second.
// Everything is simulated. Start it with: npm start (port 4000).
const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const routes = require('./routes');
const { delay } = require('./helpers');
const vitals = require('./vitals');
const simulator = require('./simulator');
const failMode = require('./failMode');
const compat = require('./compat');
const wsAuth = require('./wsAuth');
const store = require('./store');
const guards = require('./guards');
const persist = require('./persist');
const notify = require('./notify');

const PORT = process.env.PORT || 4000;
// Extra ports are allowed so Puneet's hospital portal can call this server too.
const ORIGINS = (process.env.CORS_ORIGINS ||
  'http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://localhost:3000').split(',');

// ONE-ADDRESS MODE (SERVE_APPS=true, used by `npm run one`): this server also serves the built patient app at /, the hospital portal at
// /portal/ and a small start page at /start, and the API moves to /api (the apps have routes such as /hospitals that would clash with it).
// WebSocket stays at /ws. Without SERVE_APPS nothing changes: the API is at the root and the apps run on their own dev ports.
const SERVE_APPS = /^(1|true|yes)$/i.test(process.env.SERVE_APPS || '');
const PATIENT_DIST = path.resolve(__dirname, '../patient-app/dist-one');
const PORTAL_DIST = path.resolve(__dirname, '../hospital-portal/dist-one');

const app = express();
app.use(cors({ origin: ORIGINS }));
const api = express.Router();
api.use(express.json());
api.use(delay);
api.use('/emergencies', guards.emergencyScope); // a patient reaches only its own alerts
api.use('/ambulances', guards.staffWrites);
api.use(compat.middleware); // Daksh's contract names, added next to ours (compat.js)
api.use('/', failMode.router);
api.use(failMode.middleware);
api.use('/', compat.router);
api.use('/', routes);
app.use(SERVE_APPS ? '/api' : '/', api);

if (SERVE_APPS) {
  const page = (dir) => (req, res) => res.sendFile(path.join(dir, 'index.html'));
  app.get(['/start', '/start/'], (req, res) => res.sendFile(path.join(__dirname, 'start.html')));
  app.use('/portal', express.static(PORTAL_DIST, { index: false }));
  app.get('/portal/*', page(PORTAL_DIST)); // the portal's own pages (/portal/map, /portal/fleet ...)
  app.use(express.static(PATIENT_DIST, { index: false }));
  app.get('*', (req, res, next) => (/^\/(api|ws)(\/|$)/.test(req.path) ? next() : page(PATIENT_DIST)(req, res)));
}

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });
// /ws is ours; /ws/emergencies/:id and /ws/hospitals/:id are Daksh's paths. The mock sends every event on all of them.
server.on('upgrade', (req, socket, head) => {
  if (!/^(\/api)?\/ws(\/(emergencies|hospitals)\/[^/?]+)?(\?|$)/.test(req.url)) return socket.destroy();
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
});
wsAuth.attach(wss); // wrong or missing token: closed with 1008 (wsAuth.js)
simulator.setServer(wss); // the simulator uses it to broadcast emergency events

// Every second, send a vitals.update event to every connected client.
setInterval(() => {
  for (const patientId of Object.keys(store.patients)) { // each patient has their own simulated wearable
    const v = vitals.currentVitals(patientId);
    simulator.broadcast({
      type: 'vitals.update',
      emergency_id: null,
      state: 'MONITORING',
      timestamp: v.timestamp,
      payload: { patient_id: patientId, heart_rate: v.heart_rate, spo2: v.spo2, bp: v.bp, bp_sys: v.bp_sys, bp_dia: v.bp_dia, glucose: v.glucose, resp_rate: v.resp_rate },
    });
  }
}, 1000);

// Node closes idle connections after 5 s; a browser that reuses one at that moment can see a request stall. Keep them open longer.
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

const saved = persist.start(); // real data saving (persist.js)
notify.init();

server.listen(PORT, () => {
  console.log(saved.enabled ? 'Saving to a SQLite file (' + saved.file + '): ' + saved.emergencies + ' earlier alert(s) restored' + (saved.interrupted ? ', ' + saved.interrupted + ' closed because the server had stopped' : '') : 'Data stays in memory only (' + (saved.reason || 'off') + ')');
  console.log(notify.describe());
  console.log('Mock server (simulated data) running on http://localhost:' + PORT);
  if (SERVE_APPS) console.log('ONE ADDRESS: http://localhost:' + PORT + '/start  (patient app /, hospital portal /portal/, API /api)');
  console.log('WebSocket on ws://localhost:' + PORT + '/ws');
});
