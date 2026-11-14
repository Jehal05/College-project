// Pure helpers for the ErrorBoundary component (tests: errorBoundary.test.js).
// A screen error must never show a stack trace or a token to the desk. Only a short, plain line is shown.

/** The state the boundary keeps after a render error. */
export const stateFromError = (error) => ({ failed: true, detail: shortDetail(error) });

export const NO_ERROR = { failed: false, detail: '' };

/** One short line about the error (message only, no stack, cut at 120 letters, tokens hidden). */
export function shortDetail(error) {
  const raw = String(error?.message ?? error ?? '').split('\n')[0].trim();
  const hidden = raw.replace(/Bearer\s+\S+/gi, 'Bearer …').replace(/[A-Za-z0-9_-]{30,}/g, '…');
  return hidden.length > 120 ? `${hidden.slice(0, 117)}…` : hidden;
}
