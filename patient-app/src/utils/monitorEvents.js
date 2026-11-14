// Turns changes in the live readings into short timeline events: "left the usual range", "back within it", "connected", "lost".
// `prev` remembers the last state per vital so only CHANGES make an event (never every reading).
export function detectEvents(prev, rows, connected, now) {
  const events = [];
  const next = { ...prev };
  if (prev.connected !== undefined && prev.connected !== connected) events.push({ type: connected ? 'connected' : 'disconnected', at: now });
  next.connected = connected;
  for (const r of rows) {
    if (r.within === null) continue;
    if (prev[r.key] !== undefined && prev[r.key] !== r.within) events.push({ type: r.within ? 'back' : 'left', key: r.key, at: now });
    next[r.key] = r.within;
  }
  return { events, next };
}
