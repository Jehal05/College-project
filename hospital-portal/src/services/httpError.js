// Pure helpers for backend errors (tests: httpError.test.js).

/** A 401 on any call except the login call itself means the token is no longer valid. */
export const isSessionExpired = (status, path = '') => status === 401 && !String(path).startsWith('/auth/login');

/** The server's own short message from an error body, else ''. Accepts { error }, { message }, { detail } or { error: { message } }. */
export function messageFromBody(body) {
  if (body == null) return '';
  if (typeof body === 'string') return clean(body);
  const pick = body.message ?? body.error ?? body.detail;
  if (typeof pick === 'string') return clean(pick);
  if (pick && typeof pick.message === 'string') return clean(pick.message);
  return '';
}

// One plain line. A page of HTML or a token-like string is not a message for the desk.
function clean(text) {
  const line = String(text).split('\n')[0].trim();
  if (!line || line.startsWith('<')) return '';
  const hidden = line.replace(/Bearer\s+\S+/gi, 'Bearer …');
  return hidden.length > 160 ? `${hidden.slice(0, 157)}…` : hidden;
}

/** The error text: the server's message when there is one, else the plain "X failed: 500" text. */
export function failureText(method, path, status, serverMessage = '') {
  return serverMessage ? `${serverMessage} (${status})` : `${method} ${path} failed: ${status}`;
}
