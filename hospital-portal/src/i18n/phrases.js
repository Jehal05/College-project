// Small pure helpers that turn the portal's English labels into the chosen language (t = the function from useT()).
// Anything without a key stays in English, so nothing is ever blank.
import { STATE_LABELS } from '../services/contract.js';

const withFallback = (t, key, fallback) => {
  const v = t(key);
  return v === key ? fallback : v;
};

/** Long state label for cards and the detail header. */
export const stateText = (t, state) => withFallback(t, `state.${state}`, STATE_LABELS[state] || state);

/** Timeline step label. `english` is what the Timeline would show on its own. */
export const stepText = (t, state, english) => withFallback(t, `tl.${state}`, english);

/** Action button label (Acknowledge, Dispatch, ...). */
export const actionText = (t, target, english) => withFallback(t, `action.${target}`, english);

const CAP = { Ready: 'cap.ready', 'Not ready': 'cap.notReady', 'Not shared': 'common.notShared', 'No cath lab': 'cap.noCath', 'No stroke unit': 'cap.noStroke', 'No ICU': 'cap.noIcu' };
/** Words the capacity strip gets from services/capacity.js. Numbers and unknown words pass through. */
export const capText = (t, text) => (CAP[text] ? t(CAP[text]) : text);
