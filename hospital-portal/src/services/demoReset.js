// Reset demo (mock mode): forget everything the browser kept and start again with the
// sample data. The login stays, so you do not have to log in again.
export const MOCK_HOSPITALS_KEY = 'ht_mock_hospitals';
export const HISTORY_KEY = 'ht_mock_history';

export function clearDemoData() {
  try {
    localStorage.removeItem(MOCK_HOSPITALS_KEY);
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    /* storage not available: nothing to clear */
  }
}

export function resetDemo() {
  clearDemoData();
  window.location.assign('/dashboard');
}
