// Medication reminder schedule: small pure functions (easy to test). Uses the DEVICE's local time.
// A reminder is { id, name, dose_note, times: ["08:00"], days: [0..6] (0 = Sunday), paused }.
export const DUE_WINDOW_MS = 30 * 60 * 1000; // a reminder stays "due" for 30 minutes after its time
export const SNOOZE_MS = 10 * 60 * 1000;

const atTime = (day, hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m, 0, 0);
};

// Every time this reminder is scheduled on the local calendar day of `day`.
export const slotsOn = (reminder, day) => (reminder.days.includes(day.getDay()) ? reminder.times.map((t) => atTime(day, t)) : []);

// Slots that came due in the last 30 minutes (looks at today and yesterday so a slot just before midnight still counts).
export function dueNow(reminder, now) {
  if (reminder.paused) return [];
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  return [...slotsOn(reminder, yesterday), ...slotsOn(reminder, now)]
    .filter((slot) => slot <= now && now - slot < DUE_WINDOW_MS);
}

// The next slot after `now` within the coming week, or null (paused or no days).
export function nextDue(reminder, now) {
  if (reminder.paused) return null;
  for (let add = 0; add <= 7; add += 1) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + add);
    const later = slotsOn(reminder, day).filter((slot) => slot > now).sort((a, b) => a - b);
    if (later.length) return later[0];
  }
  return null;
}

export const slotKey = (reminderId, slot) => reminderId + '|' + slot.toISOString();

// Slots to show now. `handled` is a Set of keys (taken), `snoozedUntil` a Map of key -> time in ms.
export function visibleDue(reminders, now, handled, snoozedUntil) {
  const out = [];
  reminders.forEach((reminder) => {
    dueNow(reminder, now).forEach((slot) => {
      const key = slotKey(reminder.id, slot);
      if (!handled.has(key) && !(snoozedUntil.get(key) > now.getTime())) out.push({ key, reminder, slot });
    });
  });
  return out.sort((a, b) => a.slot - b.slot);
}

// Snoozed reminders come back after their snooze time, even if their 30 minutes have passed.
export function snoozedBack(reminders, now, handled, snoozedUntil) {
  const out = [];
  snoozedUntil.forEach((until, key) => {
    const [id, iso] = key.split('|');
    const reminder = reminders.find((r) => r.id === id);
    if (reminder && !reminder.paused && !handled.has(key) && until <= now.getTime()) out.push({ key, reminder, slot: new Date(iso) });
  });
  return out;
}

// Plain checks for the form. Returns { field: 'i18n key' } (empty = fine).
export function validateReminder(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'reminders.err.name';
  else if (form.name.trim().length > 60) errors.name = 'reminders.err.nameLong';
  if (form.dose_note.length > 60) errors.dose_note = 'reminders.err.noteLong';
  if (!form.times.length || form.times.some((t) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(t))) errors.times = 'reminders.err.times';
  else if (new Set(form.times).size !== form.times.length) errors.times = 'reminders.err.timesRepeat';
  if (!form.days.length) errors.days = 'reminders.err.days';
  return errors;
}
