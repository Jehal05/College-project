// Finds English text typed straight into a .jsx file instead of going through t() (used by hardcoded.test.js).
// No parser is available without node_modules, so this is a careful text scan. It looks at:
//   1. text between JSX tags            <b>Print</b>
//   2. visible attributes               title="Zoom in"  aria-label="..."  placeholder="..."  alt="..."
//   3. capitalised sentences in quotes  ? 'Not reached' : ...   (JS strings that look like UI words)
// Things that are fine on purpose go in hardcodedAllow.json with a reason.

const VISIBLE_ATTRS = ['title', 'aria-label', 'placeholder', 'alt', 'label'];

/** Remove comments but keep line numbers (comment text becomes spaces). */
export function stripComments(src) {
  const blank = (m) => m.replace(/[^\n]/g, ' ');
  return src.replace(/\/\*[\s\S]*?\*\//g, blank).replace(/(^|[^:'"`\\])\/\/[^\n]*/g, (m, p) => p + ' '.repeat(m.length - p.length));
}

const hasWords = (s) => /[A-Za-z]{3,}/.test(s);
const lineOf = (src, index) => src.slice(0, index).split('\n').length;
const clean = (s) => s.replace(/&[a-z]+;|&#\d+;/g, ' ').replace(/\s+/g, ' ').trim();

// A quoted string that looks like something a person reads: starts with a capital, has lowercase letters,
// is not a CONSTANT_NAME, a path or a CSS class list.
const PHRASE = /^[A-Z][a-z]{2,}[A-Za-z ,.:;·'’()\-–—…!?/&0-9]*$/;
const looksLikeUiText = (s) => PHRASE.test(s) && !/^[A-Z][a-z]+[A-Z]/.test(s) && !/\.(js|jsx|json|css)$/.test(s);

/** @returns {{line:number, text:string, kind:'text'|'attr'|'string'}[]} */
export function findHardcoded(source) {
  const src = stripComments(source);
  const found = [];
  const add = (index, text, kind) => {
    const t = clean(text);
    if (t && hasWords(t)) found.push({ line: lineOf(src, index), text: t, kind });
  };

  // 1. JSX text: after a tag's ">" and before the next "<" or "{". Skip ">" of arrows (=>), comparisons and generics.
  const textRe = /(?<![=\-])>([^<>{}]+)(?=[<{])/g;
  let m;
  while ((m = textRe.exec(src))) {
    const before = src.slice(Math.max(0, m.index - 200), m.index + 1);
    const lastOpen = before.lastIndexOf('<');
    const looksLikeTag = lastOpen !== -1 && /^<(>|\/?[A-Za-z][\w.]*(\s|\/|>|$))/.test(before.slice(lastOpen)) && !/[;)]\s*$/.test(before.slice(lastOpen, -1)) ;
    const text = m[1];
    if (!looksLikeTag || /[;=]/.test(text) || /\?\s*[('"`]|\bt\(/.test(text) || (text.match(/\)/g) || []).length > (text.match(/\(/g) || []).length) continue; // more ")" than "(" = the end of an if/for in code
    add(m.index + 1, text, 'text');
  }

  // 2. Visible attributes with a plain string value.
  const attrRe = new RegExp(`\\b(${VISIBLE_ATTRS.join('|')})=(?:"([^"]*)"|'([^']*)')`, 'g');
  while ((m = attrRe.exec(src))) add(m.index, m[2] ?? m[3], 'attr');

  // 3. Quoted phrases that look like UI text (not the argument of t(), not an import, not a className).
  const strRe = /(["'`])((?:\\.|(?!\1)[^\\\n])*)\1/g;
  while ((m = strRe.exec(src))) {
    const text = m[2];
    if (!looksLikeUiText(text)) continue;
    const lineStart = src.lastIndexOf('\n', m.index) + 1;
    const line = src.slice(lineStart, src.indexOf('\n', m.index) === -1 ? undefined : src.indexOf('\n', m.index));
    const head = src.slice(Math.max(lineStart, m.index - 40), m.index);
    if (/^\s*(import|export)\b/.test(line) || /\bt\(\s*$/.test(head) || /(className|data-[\w-]+|key|type|role|href|to|id|name|style|target|rel|testid)\s*=\s*\{?\s*$/.test(head)) continue;
    if (/\b[A-Za-z]+\(\s*['"][\w.]+['"]\s*,\s*$/.test(head)) continue; // the English default passed next to a key: L('tl.total', 'Total time')
    if (/(console\.\w+|new Error|throw)\s*\(?\s*$/.test(head)) continue;
    if (VISIBLE_ATTRS.some((a) => new RegExp(`${a}=$`).test(head))) continue; // already counted as an attribute
    add(m.index, text, 'string');
  }
  return found;
}
