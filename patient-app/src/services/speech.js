// Thin wrapper around the browser's Web Speech API (speech to text). No packages.
// It can be wrong or missing, so the app only uses it to SUGGEST symptoms.
export const SPEECH_LOCALES = { en: 'en-IN', hi: 'hi-IN', gu: 'gu-IN' };

const Recognition = () => window.SpeechRecognition || window.webkitSpeechRecognition;
export const speechSupported = () => Boolean(Recognition());

// Turn the browser's error names into the few cases the screen explains.
const ERRORS = { 'not-allowed': 'denied', 'service-not-allowed': 'denied', 'no-speech': 'nospeech', network: 'network', 'audio-capture': 'nomic' };

// Listen for ONE sentence. Returns a stop function.
// Callbacks: onResult(text), onError('denied' | 'nospeech' | 'network' | 'nomic' | 'other'), onEnd().
export function startListening(lang, { onResult, onError, onEnd }) {
  const recognition = new (Recognition())();
  recognition.lang = SPEECH_LOCALES[lang] || 'en-IN';
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.onresult = (event) => onResult(event.results[0][0].transcript);
  recognition.onerror = (event) => onError(ERRORS[event.error] || 'other');
  recognition.onend = onEnd;
  recognition.start();
  return () => { try { recognition.abort(); } catch { /* already stopped */ } };
}
