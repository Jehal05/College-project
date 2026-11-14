import { beforeEach, describe, expect, it } from 'vitest';
import { addNotification, clearNotifications, getItems, markAllRead } from '../../src/utils/notifications';
import { alertsOn, showAlert } from '../../src/utils/browserAlerts';

beforeEach(() => { clearNotifications(); sessionStorage.clear(); delete globalThis.Notification; });

describe('notification list', () => {
  it('keeps the newest first, unread until marked, and holds only keys and times', () => {
    addNotification('notif.hospital'); addNotification('notif.ambulance');
    expect(getItems().map((i) => i.key)).toEqual(['notif.ambulance', 'notif.hospital']); expect(getItems().every((i) => !i.read)).toBe(true);
    markAllRead(); expect(getItems().every((i) => i.read)).toBe(true); expect(Object.keys(getItems()[0]).sort()).toEqual(['at', 'id', 'key', 'read']);
  });
  it('keeps at most 20 and can be cleared', () => { for (let i = 0; i < 25; i++) addNotification('notif.passport'); expect(getItems().length).toBe(20); clearNotifications(); expect(getItems().length).toBe(0); });
});
describe('browser alerts', () => {
  it('are off by default and never throw without support', () => { expect(alertsOn()).toBe(false); expect(() => showAlert('t', 'b')).not.toThrow(); });
  it('only show when switched on, allowed and the tab is hidden', () => {
    const shown = []; globalThis.Notification = class { static permission = 'granted'; constructor(t, o) { shown.push([t, o.body]); } };
    showAlert('a', 'b'); expect(shown.length).toBe(0); // off
    sessionStorage.setItem('ht.browserAlerts', '1'); showAlert('a', 'b'); expect(shown.length).toBe(0); // tab visible
    document.hidden = true; showAlert('a', 'b'); expect(shown).toEqual([['a', 'b']]); document.hidden = false;
  });
});
