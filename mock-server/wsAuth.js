// Phase 9: the WebSocket checks the login token. Wrong or missing token: the socket is accepted and closed at once with code 1008
// (policy violation), so a browser can read the code. A socket with no token in the address may send { "type": "auth", "token": "..." }
// within 5 seconds instead (the portal's VITE_WS_AUTH=message). Until it is authorised it receives no events.
// WS_AUTH=off switches the check off for old scripts. Mock tokens do not expire, so "expired" means "unknown token".
const store = require('./store');

const WAIT_MS = 5000;
const enabled = () => process.env.WS_AUTH !== 'off';
const valid = (token) => Boolean(token) && store.tokens.has(token);

function attach(wss) {
  wss.on('connection', (ws, req) => {
    ws.authed = !enabled();
    if (ws.authed) return;
    const token = new URL(req.url, 'http://localhost').searchParams.get('token');
    if (token) {
      if (valid(token)) { ws.authed = true; ws.user = store.tokens.get(token); return; }
      return ws.close(1008, 'Unauthorized');
    }
    const timer = setTimeout(() => ws.close(1008, 'Unauthorized'), WAIT_MS);
    ws.on('close', () => clearTimeout(timer));
    ws.on('message', (raw) => {
      if (ws.authed) return;
      let msg = null; try { msg = JSON.parse(raw); } catch { /* not JSON */ }
      if (!msg || msg.type !== 'auth' || !valid(msg.token)) return ws.close(1008, 'Unauthorized');
      ws.authed = true; ws.user = store.tokens.get(msg.token); clearTimeout(timer);
      ws.send(JSON.stringify({ event: 'auth.ok', type: 'auth.ok', emergency_id: null, timestamp: new Date().toISOString(), payload: {} }));
    });
  });
}

module.exports = { attach, valid };
