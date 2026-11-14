// Voice -> symptom suggestions. A pure function, easy to explain and to test:
//   matchSymptoms("chest pain and sweating", "en") -> { category: "HEART", ids: ["CHEST_PAIN", "SWEATING"] }
// Rules: a symptom matches when the spoken text contains one of its phrases (active language first, then English,
// because many people mix languages). Only ONE category is suggested: the one with the most matches
// (a tie goes to the category already chosen, else the first in the list). Nothing here ticks or sends anything.
import { CATEGORIES } from '../config/symptoms';
import { VOICE_KEYWORDS } from '../config/voiceKeywords';

const clean = (text) => String(text).toLowerCase().replace(/\s+/g, ' ').trim();

function matches(id, text, lang) {
  const words = VOICE_KEYWORDS[id] || {};
  const phrases = [...(words[lang] || []), ...(words.en || [])];
  return phrases.some((phrase) => text.includes(clean(phrase)));
}

export function matchSymptoms(spoken, lang, currentCategory = null) {
  const text = clean(spoken);
  const found = CATEGORIES.map((c) => ({ type: c.type, ids: c.symptoms.filter((id) => matches(id, text, lang)) }))
    .filter((c) => c.ids.length > 0);
  if (found.length === 0) return { category: null, ids: [] };
  const most = Math.max(...found.map((c) => c.ids.length));
  const best = found.filter((c) => c.ids.length === most);
  const winner = best.find((c) => c.type === currentCategory) || best[0];
  return { category: winner.type, ids: winner.ids };
}
