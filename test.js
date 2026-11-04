// Polarity checks — run before every deploy:   node test.js
// Loads the real questions.js, figures.js and core.js (the same files the site uses) and verifies
// the guarantees the site makes: balanced statements, unbiased scoring, working share links, valid figures.
// Label placement on the chart needs a browser to measure text: open tests.html for that part.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const warnings = [];
const ctx = vm.createContext({ console: { ...console, warn: (...a) => warnings.push(a.join(' ')) } });
for (const f of ['questions.js', 'figures.js', 'core.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, f), 'utf8'), ctx, { filename: f });
}
const G = expr => vm.runInContext(expr, ctx);
const QUESTIONS = G('QUESTIONS'), CATS = G('CATS'), FIGURES = G('FIGURES');
const { scoreOf, encodeAnswers, decodeAnswers, QUICK_IDS } = G('({ scoreOf, encodeAnswers, decodeAnswers, QUICK_IDS })');

let pass = 0, fail = 0;
const check = (name, ok, detail = '') => { if (ok) pass++; else { fail++; console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`); } };
const section = t => console.log(`\n${t}`);
const near = (a, b) => Math.abs(a - b) < 1e-9;
const answersFrom = (fn, ids) => {
  const A = {};
  QUESTIONS.forEach((q, i) => { if (!ids || ids.has(q.id)) { const v = fn(q, i); if (v !== undefined) A[q.id] = { v, ms: 0, changes: 0, seq: i + 1 }; } });
  return A;
};

/* ---------- statements ---------- */
section('Statements');
check('balance audit passes', G('balanceAudit().ok'));
for (const c of CATS) {
  const qs = QUESTIONS.filter(q => q.cat === c.id);
  const pos = qs.filter(q => q.d > 0).length, neg = qs.filter(q => q.d < 0).length;
  check(`topic "${c.name}" is balanced (${pos} vs ${neg})`, pos === neg && pos >= 3);
}
check('the full test has exactly 100 statements', QUESTIONS.length === 100, `got ${QUESTIONS.length}`);
check('statement ids are unique', new Set(QUESTIONS.map(q => q.id)).size === QUESTIONS.length);
check('statement texts are unique', new Set(QUESTIONS.map(q => q.t)).size === QUESTIONS.length);
check('every statement belongs to a section', QUESTIONS.every(q => q.sec >= 0));
const pairs = {};
QUESTIONS.forEach(q => { if (q.p) (pairs[q.p] = pairs[q.p] || []).push(q); });
for (const [k, v] of Object.entries(pairs)) {
  check(`consistency pair "${k}" is two opposite statements on one axis`, v.length === 2 && v[0].axis === v[1].axis && v[0].d === -v[1].d);
}

/* ---------- quick test ---------- */
section('Quick test');
check('quick test has 52 statements', QUICK_IDS.size === 52, `got ${QUICK_IDS.size}`);
for (const c of CATS) {
  const qs = QUESTIONS.filter(q => q.cat === c.id && QUICK_IDS.has(q.id));
  check(`quick: topic "${c.name}" is 2 vs 2`, qs.filter(q => q.d > 0).length === 2 && qs.filter(q => q.d < 0).length === 2);
}

/* ---------- scoring ---------- */
section('Scoring (full and quick test)');
for (const [label, ids] of [['full', null], ['quick', QUICK_IDS]]) {
  const sc = fn => scoreOf(null, answersFrom(fn, ids));
  for (const [what, v] of [['agree with everything', 2], ['disagree with everything', -2], ['all neutral', 0], ['mild agree with everything', 1]]) {
    const s = sc(() => v);
    check(`${label}: ${what} scores (0, 0)`, near(s.econ, 0) && near(s.soc, 0), `got (${s.econ}, ${s.soc})`);
  }
  for (const [E, So] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const s = sc(q => 2 * q.d * (q.axis === 'econ' ? E : So));
    check(`${label}: corner (${E * 10}, ${So * 10}) is exact`, near(s.econ, E * 10) && near(s.soc, So * 10), `got (${s.econ}, ${s.soc})`);
    const h = sc(q => q.d * (q.axis === 'econ' ? E : So));
    check(`${label}: half-strength corner is (${E * 5}, ${So * 5})`, near(h.econ, E * 5) && near(h.soc, So * 5));
  }
  const dk = scoreOf(null, answersFrom(q => (q.axis === 'econ' ? 2 * q.d : null), ids));
  check(`${label}: "Don't know" on the social axis is excluded, not counted as 0`, near(dk.econ, 10) && dk.nS === 0);
}

/* ---------- share links ---------- */
section('Share links');
let seed = 42; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
for (let t = 0; t < 200; t++) {
  const quick = t % 2 === 1;
  const A = answersFrom(() => { const r = rnd(); return r < 0.1 ? null : Math.floor(rnd() * 5) - 2; }, quick ? QUICK_IDS : null);
  const d = decodeAnswers(encodeAnswers(A));
  const a = scoreOf(null, A), b = d.answers && scoreOf(null, d.answers);
  const same = b && near(a.econ, b.econ) && near(a.soc, b.soc) && Object.keys(A).length === Object.keys(d.answers).length;
  if (!same) { check(`round trip #${t} (${quick ? 'quick' : 'full'})`, false); break; }
  if (t === 199) check('200 random answer sets survive encode/decode exactly (full and quick)', true);
}
const good = encodeAnswers(answersFrom(() => 1));
check('rejects a link from another version', !!decodeAnswers('zzz' + good.slice(good.indexOf('.'))).error);
check('rejects a truncated link', !!decodeAnswers(good.slice(0, -5)).error);
check('rejects junk characters', !!decodeAnswers(good.slice(0, -1) + 'q').error);
check('rejects a link with no answers at all', !!decodeAnswers(good.split('.')[0] + '.' + '-'.repeat(QUESTIONS.length)).error);

/* ---------- figures ---------- */
section('Figures');
const names = FIGURES.map(f => f.name);
check('figure names are unique', new Set(names).size === names.length, names.filter((n, i) => names.indexOf(n) !== i).join(', '));
check('all positions are within -10..+10', FIGURES.every(f => Math.abs(f.econ) <= 10 && Math.abs(f.soc) <= 10));
check('every figure has a type', FIGURES.every(f => ['politician', 'thinker', 'media'].includes(f.kind)));
const missingDefaults = G('DEFAULT_FIGURES').filter(n => !names.includes(n));
check('every default figure exists', !missingDefaults.length, missingDefaults.join(', '));
const kindNames = [...G('FIGURE_KINDS.thinker'), ...G('FIGURE_KINDS.media')];
check('every name in FIGURE_KINDS exists', kindNames.every(n => names.includes(n)), kindNames.filter(n => !names.includes(n)).join(', '));
check('every manual stance matches a statement and a figure', !warnings.length, warnings.join(' | '));
const stanceNames = Object.keys(G('FIG_STANCES_RAW'));
check('every figure with manual stances exists', stanceNames.every(n => names.includes(n)), stanceNames.filter(n => !names.includes(n)).join(', '));
check('manual stances use -2..+2', FIGURES.every(f => Object.values(f.stance).every(v => Number.isInteger(v) && Math.abs(v) <= 2 && v !== 0)));
if (G('typeof FIGURE_WHY') !== 'undefined') {
  const why = G('FIGURE_WHY');
  check('every figure has a placement reason', names.every(n => why[n]), names.filter(n => !why[n]).join(', '));
  check('every placement reason belongs to a figure', Object.keys(why).every(n => names.includes(n)), Object.keys(why).filter(n => !names.includes(n)).join(', '));
}
if (G('typeof STATEMENT_HELP') !== 'undefined') {
  const help = G('STATEMENT_HELP');
  const unmatched = Object.keys(help).filter(k => QUESTIONS.filter(q => q.t.includes(k)).length !== 1);
  check('every statement explanation matches exactly one statement', !unmatched.length, unmatched.join(' | '));
}

console.log(`\n${fail ? 'FAILED' : 'All checks passed'}: ${pass} passed, ${fail} failed.`);
console.log('Chart labels: open tests.html in a browser (needs real text measurement).');
process.exit(fail ? 1 : 0);
