// Remembers the id of the emergency that is running, so a reload or the Home screen can return to it.
const KEY = 'healthtwin_active_emergency';

export function getActive() {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setActive(id) {
  try {
    sessionStorage.setItem(KEY, id);
  } catch {
    /* storage may be blocked */
  }
}

export function clearActive() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* storage may be blocked */
  }
}

// When the countdown started on THIS device (milliseconds). Using the device clock avoids
// problems when the phone and the server clocks differ.
export function setStarted(id, ms) {
  try {
    sessionStorage.setItem(KEY + '_start_' + id, String(ms));
  } catch {
    /* storage may be blocked */
  }
}

export function getStarted(id) {
  try {
    const value = sessionStorage.getItem(KEY + '_start_' + id);
    return value ? Number(value) : null;
  } catch {
    return null;
  }
}
