// Turns one access-log entry from the server into plain words (no medical meaning is added).
const isBlocked = (e) => /^den/i.test(String(e.outcome || '')); // server says "denied" (any letter case)

export function describeEntry(t, e) {
  const kind = e.who && e.who.kind;
  const who = kind === 'hospital_desk' && e.who.hospital
    ? t('access.who.hospital_named', { name: e.who.hospital })
    : t('access.who.' + (kind || 'unknown'));
  const what = t('access.what.' + (e.what || 'data'));
  const fields = Array.isArray(e.fields) ? e.fields : [];
  let result;
  if (isBlocked(e)) result = t('access.blocked');
  else if (fields.length === 0) result = t('access.nothing');
  else result = t('access.shown', { list: fields.map((f) => String(f).replace(/_/g, ' ')).join(', ') });
  return { who, what, result, blocked: isBlocked(e) };
}

// Add live entries on top without duplicates.
export const mergeEntries = (current, incoming) => {
  const seen = new Set(current.map((x) => x.id));
  return [...incoming.filter((x) => !seen.has(x.id)), ...current];
};
