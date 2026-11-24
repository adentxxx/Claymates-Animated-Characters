// Typography: keep short words from dangling at the end of a line.
// A short function word (to, the, no, and, of, up…) is glued to the word after it with a
// non-breaking space, and so are numbers to their units ("1 year") and "«i» button".
// Use on plain text only (not on HTML with attributes).
const SHORT = 'a|an|the|to|of|in|on|at|by|for|no|and|or|from|with|up|as|is|if|we|you|your|our|its|any|via|per|not|nor|so';
// only a plain space after the word is replaced, so each pass moves on to the next short word
const GLUE = new RegExp(`(^|[\\s(«“—])(${SHORT}) +(?=\\S)`, 'gi');
const NBSP = ' ';

export function nbsp(text) {
  let out = text, prev;
  do {                                   // repeat: "up to 1 year" has several short words in a row
    prev = out;
    out = out.replace(GLUE, (m, before, word) => before + word + NBSP);
  } while (out !== prev);
  return out
    .replace(/(\d)\s+(?=[a-z%×])/gi, `$1${NBSP}`)   // 1 year, 2048 × 2048
    .replace(/×\s+(?=\d)/g, `×${NBSP}`)
    .replace(/»\s+(?=\S)/g, `»${NBSP}`)             // «i» button
    .replace(/\s+→\s+/g, `${NBSP}→ `);              // keep the arrow with what comes before it
}
