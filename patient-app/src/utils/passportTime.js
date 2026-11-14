// "How long is the passport still valid?" as a translation key plus a number, e.g. { key: 'passport.left.hours', count: 23 }.
export function timeLeft(expiresAt, now = Date.now()) {
  const minutes = Math.ceil((Date.parse(expiresAt) - now) / 60000); // round up so a fresh 24 hour passport says 24 hours
  if (minutes <= 0 || Date.parse(expiresAt) - now < 1000) return { key: 'passport.left.soon', count: 0 };
  if (minutes < 60) return { key: 'passport.left.minutes', count: minutes };
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return { key: 'passport.left.hours', count: hours };
  return { key: 'passport.left.days', count: Math.floor(hours / 24) };
}
export const isExpired = (expiresAt, now = Date.now()) => Date.parse(expiresAt) <= now;
