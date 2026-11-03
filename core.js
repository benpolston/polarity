/*
 * Polarity — core scoring and share-link logic.
 * Pure functions with no DOM access, shared by the site (app.js) and the checks (test.js),
 * so the tests exercise exactly the code visitors run.
 * Depends on QUESTIONS from questions.js.
 */

// answered with an opinion; v is -2..+2. "Don't know" is v = null, a statement not asked has no entry.
const known = a => !!a && typeof a.v === 'number';
const eff = (q, v) => v * q.d;   // directional value, -2..+2 (+ = Right on economic, Authoritarian on social)

// Score a subset of questions. Each axis: sum(eff) / (2 * n) * 10  => range -10..+10.
// "Don't know" answers and statements not asked are left out entirely, so they never pull anyone toward the center.
function scoreOf(filter, answers) {
  const out = { econ: 0, soc: 0, nE: 0, nS: 0 };
  let se = 0, ss = 0;
  for (const q of QUESTIONS) {
    if (filter && !filter(q)) continue;
    const a = answers[q.id]; if (!known(a)) continue;
    if (q.axis === 'econ') { se += eff(q, a.v); out.nE++; } else { ss += eff(q, a.v); out.nS++; }
  }
  out.econ = out.nE ? se / (2 * out.nE) * 10 : 0;
  out.soc = out.nS ? ss / (2 * out.nS) * 10 : 0;
  return out;
}
function describe(v) {
  const a = Math.abs(v);
  return a < 1 ? 'near the center' : a < 3 ? 'mildly' : a < 6 ? 'moderately' : a < 8.5 ? 'strongly' : 'extremely';
}
function quadrant(e, s) {
  return (s >= 0 ? 'Authoritarian ' : 'Libertarian ') + (e >= 0 ? 'Right' : 'Left');
}

// Quick test: the first 2 statements of each direction in every topic (the "A" half), i.e. 52 statements,
// still exactly balanced 2-vs-2 in every topic.
const QUICK_IDS = new Set(QUESTIONS.filter(q => q.half === 'A').map(q => q.id));

/* Share links:  #r=<key>.<codes>[&n=<name>]
 *   key   = fingerprint of the question set, so links from an older version are rejected, not misread
 *   codes = one character per statement in bank order:
 *           0..4 = strongly disagree..strongly agree, x = don't know, - = not asked (quick test)
 * Everything after # stays in the browser; it is never sent to the server.
 */
const QSET_KEY = (() => {
  let h = 7;
  for (const q of QUESTIONS) for (const ch of q.id + q.d) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h.toString(36);
})();
function encodeAnswers(answers) {
  return QSET_KEY + '.' + QUESTIONS.map(q => { const a = answers[q.id]; return !a ? '-' : known(a) ? String(a.v + 2) : 'x'; }).join('');
}
function decodeAnswers(code) {
  const [key, codes] = String(code || '').split('.');
  if (!codes) return { error: 'That link is incomplete. Make sure you copied the whole thing.' };
  if (key !== QSET_KEY) return { error: 'That link was made with a different version of the test, so its answers can\'t be read correctly.' };
  if (codes.length !== QUESTIONS.length || /[^0-4x-]/.test(codes) || !/[0-4x]/.test(codes)) return { error: 'That link is damaged or incomplete.' };
  const answers = {};
  QUESTIONS.forEach((q, i) => { const c = codes[i]; if (c !== '-') answers[q.id] = { v: c === 'x' ? null : +c - 2, ms: 0, changes: 0, seq: i + 1 }; });
  return { answers };
}

if (typeof module !== 'undefined') module.exports = { known, eff, scoreOf, describe, quadrant, QUICK_IDS, QSET_KEY, encodeAnswers, decodeAnswers };
