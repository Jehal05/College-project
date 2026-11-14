// Chat messages per emergency (feature #49). A tiny store outside React, so the desk
// panel and the crew page work the same way, even for an emergency the page has not loaded.
import * as api from './api.js';
import { subscribe } from './socket.js';

const EMPTY = [];
const messages = new Map(); // emergency_id -> array of messages (a new array on every change)
const listeners = new Set();
let wired = false;

function add(emergencyId, message) {
  const list = messages.get(emergencyId) || EMPTY;
  if (list.some((m) => m.message_id === message.message_id)) return; // our own message echoed back
  messages.set(emergencyId, [...list, message]);
  listeners.forEach((cb) => cb());
}

function wire() {
  if (wired) return;
  wired = true;
  subscribe('chat.message', (msg) => {
    const p = msg.payload || {};
    add(msg.emergency_id, { ...p, message_id: p.message_id || `${msg.timestamp}|${p.sender_role}|${p.text}`, timestamp: msg.timestamp });
  });
}

export function onChat(callback) {
  wire();
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export const getMessages = (emergencyId) => messages.get(emergencyId) || EMPTY;

export async function sendMessage(emergencyId, text, senderRole, senderName) {
  wire();
  const res = await api.sendChat(emergencyId, { text, sender_role: senderRole, sender_name: senderName });
  if (res?.message_id) {
    add(emergencyId, { message_id: res.message_id, sender_role: res.sender_role || senderRole, sender_name: res.sender_name || senderName, text: res.text || text, timestamp: res.timestamp || new Date().toISOString() });
  }
}
