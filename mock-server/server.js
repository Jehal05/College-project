// HealthTwin AI mock server: REST API + WebSocket that sends fake vitals every second.
// Everything is simulated. Start it with: npm start (port 4000).
const http = require('http');
const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const routes = require('./routes');
const { delay, normalVitals } = require('./helpers');

const PORT = process.env.PORT || 4000;
// Extra ports are allowed so Puneet's hospital portal can call this server too.
const ORIGINS = (process.env.CORS_ORIGINS ||
  'http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://localhost:3000').split(',');

const app = express();
app.use(cors({ origin: ORIGINS }));
app.use(express.json());
app.use(delay);
app.use('/', routes);

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// Every second, send a vitals.update event to every connected client.
setInterval(() => {
  const v = normalVitals();
  const event = {
    type: 'vitals.update',
    emergency_id: null,
    state: 'MONITORING',
    timestamp: v.timestamp,
    payload: { patient_id: 'HT-1001', heart_rate: v.heart_rate, spo2: v.spo2 },
  };
  const message = JSON.stringify(event);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) client.send(message);
  });
}, 1000);

server.listen(PORT, () => {
  console.log('Mock server (simulated data) running on http://localhost:' + PORT);
  console.log('WebSocket on ws://localhost:' + PORT + '/ws');
});
