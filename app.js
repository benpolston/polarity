/* Compass Detailed — app logic. No dependencies. */
(() => {
const LABELS = ['Strongly disagree', 'Disagree', 'Neutral / unsure', 'Agree', 'Strongly agree'];
const STORE = 'compass-detailed-v3';
const $app = document.getElementById('app');
const $mini = document.getElementById('progress-mini');
const QBY = Object.fromEntries(QUESTIONS.map(q => [q.id, q]));
const CATBY = Object.fromEntries(CATS.map(c => [c.id, c]));

let S = load() || null;
if (S && (!S.order || S.order.length !== QUESTIONS.length || S.order.some(id => !QBY[id]))) S = null;  // stale save from an older question set      // {order:[ids], idx, answers:{id:{v,ms,changes,seq}}, started, finished}
let shownAt = 0;
let busy = false;   // blocks double input while the next question is loading
let tableState = { axis: '', cat: '', sec: '', text: '', sort: 'n', dir: 1 };

/* ---------------- utils ---------------- */
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = (x, d = 2) => (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(d);
const fmtS = (x, d = 2) => x.toFixed(d).replace('-', '−');
function load() { try { return JSON.parse(localStorage.getItem(STORE)); } catch { return null; } }
function save() { try { localStorage.setItem(STORE, JSON.stringify(S)); } catch {} }
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function median(a) { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
function dur(ms) { const s = Math.round(ms / 1000); return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`; }

/* ---------------- scoring ---------------- */
const eff = (q, v) => v * q.d;   // directional value, -2..+2 (+ = right / authoritarian)

// Score a subset of questions. Each axis: sum(eff) / (2 * n) * 10  => range -10..+10.
function scoreOf(filter, answers) {
  const out = { econ: 0, soc: 0, nE: 0, nS: 0 };
  let se = 0, ss = 0;
  for (const q of QUESTIONS) {
    if (filter && !filter(q)) continue;
    const a = answers[q.id]; if (!a) continue;
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
function answered() { return S ? Object.keys(S.answers).length : 0; }

/* ---------------- routing ---------------- */
function render() {
  window.scrollTo(0, 0);
  if (!S) return intro();
  if (S.finished) return results();
  if (answered() === 0 && S.idx === 0 && !S.started) return intro();
  quiz();
}
document.getElementById('home').addEventListener('click', e => { e.preventDefault(); if (S && S.finished) results(); else if (S && S.started) quiz(); else intro(); });

/* ---------------- intro ---------------- */
function intro() {
  $mini.textContent = '';
  const audit = balanceAudit();
  const resume = S && S.started && !S.finished;
  $app.innerHTML = `
    <h1>A more specific political compass</h1>
    <p class="lead">${QUESTIONS.length} concrete policy statements place you on two axes: <b>economic</b> (collective ↔ free market) and <b>social</b> (libertarian ↔ authoritarian). Each statement is a specific position rather than a slogan, so people at either extreme can disagree with some of them.</p>
    <div class="card">
      <div class="row">
        ${resume ? `<button id="resume">Resume (${answered()}/${QUESTIONS.length} answered)</button><button class="ghost" id="restart">Start over</button>`
                 : `<button id="start">Start the test</button>`}
        ${S && S.finished ? `<button class="ghost" id="seeres">View last results</button>` : ''}
      </div>
      <p class="muted small">${SECTIONS.length} short sections, about 12–18 minutes in all. Use keys 1–5 to answer, ← to go back.</p>
    </div>
    <div class="grid2">
      <div class="card"><h2>What you get</h2>
        <ul class="small">
          <li>Your position, to two decimal places, on both axes</li>
          <li>Scores for all ${CATS.length} topic areas (taxes, policing, immigration, …)</li>
          <li>Every answer, how much each one moved you, and how long you took</li>
          <li>Consistency checks on contradictory answer pairs</li>
          <li>A consistency score based on pairs of opposing statements</li>
          <li>Where political figures fall relative to you (rough estimates)</li>
          <li>Edit any answer and watch the result recompute; export JSON/CSV</li>
        </ul></div>
      <div class="card"><h2>How it avoids skewing</h2>
        <ul class="small">
          <li>Every topic has <b>exactly 4 statements pushing each way</b> (${audit.ok ? 'verified at load' : '<b>AUDIT FAILED</b>'}). Agreeing with everything lands you dead center.</li>
          <li>All statements carry equal weight.</li>
          <li>Question order is randomized within each section on every run.</li>
          <li>A true neutral option scores exactly 0.</li>
          <li>Direction of each statement is shown on the results page so nothing is hidden.</li>
        </ul></div>
    </div>`;
  const on = (id, f) => { const el = document.getElementById(id); if (el) el.onclick = f; };
  on('start', startNew);
  on('restart', () => { if (confirm('Discard your saved progress and start over?')) startNew(); });
  on('resume', () => { shownAt = 0; quiz(); });
  on('seeres', () => results());
}
function startNew() {
  S = { order: SECTIONS.flatMap((sc, i) => shuffle(QUESTIONS.filter(q => q.sec === i).map(q => q.id))), secShown: -1, idx: 0, answers: {}, started: Date.now(), finished: null };
  save(); quiz();
}

/* ---------------- quiz ---------------- */
function quiz() {
  const total = QUESTIONS.length;
  if (S.idx >= total) {
    const firstMissing = S.order.findIndex(id => !S.answers[id]);
    if (firstMissing === -1) return finish();
    S.idx = firstMissing; save();
  }
  busy = false;
  const q = QBY[S.order[S.idx]];
  const cur = S.answers[q.id];
  const sec = SECTIONS[q.sec];
  if ((S.secShown ?? -1) < q.sec) return sectionIntro(q.sec);
  $mini.textContent = `Section ${q.sec + 1}/${SECTIONS.length} · ${S.idx + 1} / ${total}`;
  $app.innerHTML = `
    <div class="bar"><i style="width:${(S.idx / total * 100).toFixed(1)}%"></i></div>
    <div class="card q-card">
      <div class="q-num">${sec.title} · statement ${S.order.slice(0, S.idx + 1).filter(id => QBY[id].sec === q.sec).length} of ${QUESTIONS.filter(x => x.sec === q.sec).length}</div>
      <p class="q-text">${esc(q.t)}</p>
      <div class="opts">
        ${LABELS.map((l, i) => `<button class="opt ${cur && cur.v === i - 2 ? 'sel' : ''}" data-v="${i - 2}"><kbd>${i + 1}</kbd>${l}</button>`).join('')}
      </div>
    </div>
    <div class="nav">
      <button class="ghost" id="back" ${S.idx === 0 ? 'disabled' : ''}>← Back</button>
      <button class="ghost" id="fwd" ${cur ? '' : 'disabled'}>${S.idx === total - 1 ? 'Finish' : 'Next →'}</button>
    </div>`;
  shownAt = performance.now();
  $app.querySelectorAll('.opt').forEach(b => b.onclick = () => answer(q, +b.dataset.v));
  document.getElementById('back').onclick = back;
  document.getElementById('fwd').onclick = () => { if (!S.answers[q.id]) return; S.idx++; save(); quiz(); window.scrollTo(0, 0); };
}
function sectionIntro(i) {
  const sec = SECTIONS[i], n = QUESTIONS.filter(q => q.sec === i).length;
  $mini.textContent = `Section ${i + 1}/${SECTIONS.length}`;
  $app.innerHTML = `
    <div class="bar"><i style="width:${(S.idx / QUESTIONS.length * 100).toFixed(1)}%"></i></div>
    <div class="card q-card">
      <div class="q-num">Section ${i + 1} of ${SECTIONS.length}</div>
      <p class="q-text" style="font-size:1.9rem">${esc(sec.title)}</p>
      <p class="lead">${esc(sec.blurb)}</p>
      <p class="muted small">${n} statements</p>
      <button id="go">Continue</button>
    </div>
    <div class="nav"><button class="ghost" id="back" ${S.idx === 0 ? 'disabled' : ''}>← Back</button><span></span></div>`;
  document.getElementById('go').onclick = () => { S.secShown = i; save(); quiz(); };
  document.getElementById('back').onclick = back;
}
function answer(q, v) {
  if (busy) return;
  busy = true;
  const ms = Math.round(performance.now() - shownAt);
  const prev = S.answers[q.id];
  if (prev) { if (prev.v !== v) prev.changes++; prev.v = v; prev.ms += ms; }
  else S.answers[q.id] = { v, ms, changes: 0, seq: Object.keys(S.answers).length + 1 };
  S.started = S.started || Date.now();
  S.idx++;
  if (answered() >= QUESTIONS.length) S.idx = QUESTIONS.length;
  save();
  setTimeout(() => quiz(), 120);
}
function back() { if (S.idx > 0) { S.idx--; save(); quiz(); } }
function finish() {
  S.finished = Date.now(); save(); results();
}
document.addEventListener('keydown', e => {
  if (!S || S.finished || !S.started || !$app.querySelector('.opts')) return;
  if (e.key >= '1' && e.key <= '5') answer(QBY[S.order[S.idx]], +e.key - 3);
  else if (e.key === 'ArrowLeft') back();
});

/* ---------------- SVG compass ---------------- */
// exact rendered text width, measured with a hidden SVG text node so label boxes hug the text
let _meas, _cache = {};
function textW(str, fs) {
  const k = fs + '|' + str; if (_cache[k]) return _cache[k];
  if (!_meas) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('style', 'position:absolute;visibility:hidden;width:0;height:0');
    _meas = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    svg.appendChild(_meas); document.body.appendChild(svg);
  }
  _meas.setAttribute('font-size', fs); _meas.textContent = str;
  return (_cache[k] = _meas.getComputedTextLength() || str.length * 6);
}
function compassSVG(x, y, figs, labelNames) {
  const SZ = 540, SZW = 620, P = 56, W = SZ - 2 * P;   // SZW leaves a right margin so labels can sit beside right-edge dots
  const px = v => P + (v + 10) / 20 * W, py = v => P + (10 - v) / 20 * W;
  let g = '';
  g += `<rect x="${P}" y="${P}" width="${W / 2}" height="${W / 2}" fill="var(--red)"/>`;
  g += `<rect x="${P + W / 2}" y="${P}" width="${W / 2}" height="${W / 2}" fill="var(--blue)"/>`;
  g += `<rect x="${P}" y="${P + W / 2}" width="${W / 2}" height="${W / 2}" fill="var(--green)"/>`;
  g += `<rect x="${P + W / 2}" y="${P + W / 2}" width="${W / 2}" height="${W / 2}" fill="var(--purple)"/>`;
  for (let i = -10; i <= 10; i++) {
    const major = i % 5 === 0, col = i === 0 ? '#111' : '#fff', op = i === 0 ? 1 : major ? .8 : .35;
    g += `<line x1="${px(i)}" y1="${P}" x2="${px(i)}" y2="${P + W}" stroke="${col}" stroke-opacity="${op}" stroke-width="${i === 0 ? 1.6 : major ? 1.2 : .6}"/>`;
    g += `<line x1="${P}" y1="${py(i)}" x2="${P + W}" y2="${py(i)}" stroke="${col}" stroke-opacity="${op}" stroke-width="${i === 0 ? 1.6 : major ? 1.2 : .6}"/>`;
    if (major && i !== 0) {
      g += `<text x="${px(i)}" y="${P + W + 14}" font-size="10" text-anchor="middle" fill="#555">${i}</text>`;
      g += `<text x="${P - 6}" y="${py(i) + 3}" font-size="10" text-anchor="end" fill="#555">${i}</text>`;
    }
  }
  g += `<rect x="${P}" y="${P}" width="${W}" height="${W}" fill="none" stroke="#111" stroke-width="1.2"/>`;
  g += `<text x="${P + W / 2}" y="${P - 30}" text-anchor="middle" font-size="13" font-weight="700">Authoritarian</text>`;
  g += `<text x="${P + W / 2}" y="${P + W + 38}" text-anchor="middle" font-size="13" font-weight="700">Libertarian</text>`;
  g += `<text x="${P - 34}" y="${P + W / 2}" text-anchor="middle" font-size="13" font-weight="700" transform="rotate(-90 ${P - 34} ${P + W / 2})">Left</text>`;
  g += `<text x="${P + W + 34}" y="${P + W / 2}" text-anchor="middle" font-size="13" font-weight="700" transform="rotate(90 ${P + W + 34} ${P + W / 2})">Right</text>`;
  if (figs) {
    const FS = 11.5, H = 16;
    // obstacles: every dot (and you), then labels as they get placed
    const boxes = figs.map(f => ({ x: px(f.econ) - 4, y: py(f.soc) - 4, w: 8, h: 8, owner: f.name }));
    boxes.push({ x: px(x) - 10, y: py(y) - 10, w: 20, h: 20, owner: '__you' });
    const hit = (r) => boxes.some(o => r.x < o.x + o.w && r.x + r.w > o.x && r.y < o.y + o.h && r.y + r.h > o.y && o.owner !== r.owner);
    for (const f of figs) {
      g += `<circle cx="${px(f.econ)}" cy="${py(f.soc)}" r="3.6" fill="#374151" fill-opacity=".7" stroke="#fff" stroke-width="1"></circle><circle cx="${px(f.econ)}" cy="${py(f.soc)}" r="9" fill="transparent" data-fig="${esc(f.name)}" tabindex="0" style="cursor:help"/>`;
    }
    // labels: nearest-first order is the order of labelNames; try 8 positions at two distances
    const order = labelNames ? figs.filter(f => labelNames.has(f.name)).sort((a, b) => [...labelNames].indexOf(a.name) - [...labelNames].indexOf(b.name)) : [];
    for (const f of order) {
      const cx = px(f.econ), cy = py(f.soc), w = textW(f.name, FS) + 3;
      // always to the RIGHT of the dot; if blocked, slide up/down on that same side (with a leader line)
      const tries = [0, -12, 12, -24, 24, -36, 36, -48, 48].map(dy => [cx + 7, cy - H / 2 + dy]);
      const spot = tries.find(([tx, ty]) => tx + w <= SZW - 20 && ty >= 4 && ty + H <= SZ - 4 && !hit({ x: tx, y: ty, w, h: H, owner: f.name }));
      if (!spot) continue;                       // no clear space: the dot's tooltip still names it
      boxes.push({ x: spot[0], y: spot[1], w, h: H, owner: '__label' });
      // leader line when the label isn't right beside its dot
      const nx = Math.max(spot[0], Math.min(cx, spot[0] + w)), ny = Math.max(spot[1], Math.min(cy, spot[1] + H));
      if (Math.hypot(nx - cx, ny - cy) > 9) g += `<line x1="${cx}" y1="${cy}" x2="${nx}" y2="${ny}" stroke="#111" stroke-width=".9" stroke-opacity=".85"/>`;
      g += `<text x="${spot[0]}" y="${spot[1] + H - 4}" font-size="${FS}" fill="#111" stroke="#fff" stroke-width="2.5" paint-order="stroke">${esc(f.name)}</text>`;
    }
  }
  g += `<circle cx="${px(x)}" cy="${py(y)}" r="9" fill="#111" stroke="#fff" stroke-width="2.5"/>`;
  return `<svg viewBox="0 0 ${SZW} ${SZ}" width="100%" role="img" aria-label="Political compass: economic ${fmt(x)}, social ${fmt(y)}"><g transform="translate(16 0)">${g}</g></svg>`;
}

/* ---------------- results ---------------- */
function results() {
  const A = S.answers;
  const missing = QUESTIONS.filter(q => !A[q.id]);
  if (missing.length) { S.finished = null; S.idx = S.order.findIndex(id => !A[id]); save(); return quiz(); }
  $mini.textContent = 'Results';
  const tot = scoreOf(null, A);
  const nE = tot.nE, nS = tot.nS;

  // per-category scores
  const catScores = CATS.map(c => {
    const s = scoreOf(q => q.cat === c.id, A);
    return { c, v: c.axis === 'econ' ? s.econ : s.soc };
  });

  // distributions
  const dist = f => { const d = [0, 0, 0, 0, 0]; QUESTIONS.filter(f).forEach(q => d[A[q.id].v + 2]++); return d; };
  const dAll = dist(() => true), dE = dist(q => q.axis === 'econ'), dS = dist(q => q.axis === 'soc');
  const stack = (d, label) => {
    const n = d.reduce((a, b) => a + b, 0);
    return `<div class="small"><b>${label}</b> <span class="muted">(${n} answers)</span></div><div class="stack">${d.map((c, i) => c ? `<span class="c${i}" style="width:${c / n * 100}%" title="${LABELS[i]}: ${c}">${c / n > .06 ? c : ''}</span>` : '').join('')}</div>`;
  };
  const agreeN = dAll[3] + dAll[4], disN = dAll[0] + dAll[1];
  const strongN = dAll[0] + dAll[4];
  const avgExtremity = QUESTIONS.reduce((s, q) => s + Math.abs(A[q.id].v), 0) / QUESTIONS.length;

  // contributions (in axis points) = eff * 5 / n
  const contrib = QUESTIONS.map(q => ({ q, a: A[q.id], e: eff(q, A[q.id].v), pts: eff(q, A[q.id].v) * 5 / (q.axis === 'econ' ? nE : nS) }));
  const rightPulls = ax => contrib.filter(c => c.q.axis === ax).sort((a, b) => b.pts - a.pts);
  const topList = (ax, sign, n = 6) => rightPulls(ax).filter(c => sign > 0 ? c.pts > 0 : c.pts < 0).sort((a, b) => sign * (b.pts - a.pts)).slice(0, n);
  const pullTotals = ax => {
    const cs = contrib.filter(c => c.q.axis === ax);
    return { pos: cs.filter(c => c.pts > 0).reduce((s, c) => s + c.pts, 0), neg: cs.filter(c => c.pts < 0).reduce((s, c) => s + c.pts, 0),
             nPos: cs.filter(c => c.pts > 0).length, nNeg: cs.filter(c => c.pts < 0).length, nZero: cs.filter(c => c.pts === 0).length };
  };

  // pairs
  const pairs = {};
  QUESTIONS.forEach(q => { if (q.p) (pairs[q.p] = pairs[q.p] || []).push(q); });
  const pairRows = Object.values(pairs).map(([a, b]) => {
    const ea = eff(a, A[a.id].v), eb = eff(b, A[b.id].v), prod = ea * eb;
    // opposite statements: consistent answers share the same sign of directional value
    const status = prod >= 0 ? 'ok' : prod >= -2 ? 'warn' : 'bad';
    return { a, b, ea, eb, status };
  });
  // Consistency score: each pair scores 100% unless answered on opposite sides;
  // opposite sides lose (disagreement size / 4) -- mild/mild loses 25%, strong/strong loses 100%.
  const consistency = pairRows.reduce((t, p) => t + (1 + Math.min(0, p.ea * p.eb) / 4), 0) / pairRows.length * 100;
  const cLabel = consistency >= 90 ? ['ok', 'highly consistent'] : consistency >= 75 ? ['ok', 'mostly consistent'] : consistency >= 60 ? ['warn', 'some contradictions'] : ['bad', 'many contradictions'];
  const nBad = pairRows.filter(p => p.status === 'bad').length, nWarn = pairRows.filter(p => p.status === 'warn').length;

  // timing
  const times = QUESTIONS.map(q => ({ q, ms: A[q.id].ms, ch: A[q.id].changes }));
  const totalMs = times.reduce((s, t) => s + t.ms, 0), medMs = median(times.map(t => t.ms));
  const changes = times.reduce((s, t) => s + t.ch, 0);
  const slow = times.slice().sort((a, b) => b.ms - a.ms).slice(0, 5), fast = times.slice().sort((a, b) => a.ms - b.ms).slice(0, 5);

  const pt = tot, quad = quadrant(pt.econ, pt.soc);
  const eT = pullTotals('econ'), sT = pullTotals('soc');

  $app.innerHTML = `
  <h1>Your results</h1>
  <div class="hero">
    <div class="card" style="margin-top:0"><div id="compass-wrap">${compassSVG(pt.econ, pt.soc)}</div>
      <div class="figpick noprint">
        <div class="figpick-bar">
          <b>Figures on chart</b>
          <select id="fp-kind"><option value="">All types</option>${Object.entries(KIND_LABEL).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select>
          <input id="fp-text" placeholder="Filter names…">
          <button class="ghost sm" id="fp-def">Best known</button>
          <button class="ghost sm" id="fp-near">5 closest</button>
          <button class="ghost sm" id="fp-all">All listed</button>
          <button class="ghost sm" id="fp-none">None</button>
          <span id="fp-count" class="muted small"></span>
        </div>
        <div id="fp-list" class="figpick-list"></div>
      </div>
      <div class="legend"><span><span class="dot" style="background:#111"></span>You</span></div></div>
    <div>
      <div class="card" style="margin-top:0">
        <div class="big">${quad}</div>
        <p class="muted">${describe(pt.econ) === 'near the center' ? 'Economically near the center' : 'Economically <b>' + describe(pt.econ) + ' ' + (pt.econ >= 0 ? 'right' : 'left') + '</b>'},
        ${describe(pt.soc) === 'near the center' ? 'socially near the center' : 'socially <b>' + describe(pt.soc) + ' ' + (pt.soc >= 0 ? 'authoritarian' : 'libertarian') + '</b>'}.</p>
        <div class="score-row">
          <div class="score"><small>Economic</small><b>${fmt(pt.econ)}</b><small>${pt.econ >= 0 ? 'Right' : 'Left'} · ${nE} answers</small></div>
          <div class="score"><small>Social</small><b>${fmt(pt.soc)}</b><small>${pt.soc >= 0 ? 'Authoritarian' : 'Libertarian'} · ${nS} answers</small></div>
        </div>
        <p class="small muted">Scale −10 to +10. Each score = (sum of your directional answers) ÷ (2 × number of statements) × 10, so ±10 means you strongly agreed with every statement in one direction.</p>
        <div class="row noprint">
          <button id="x-json">Export JSON</button><button class="ghost" id="x-csv">Export CSV</button><button class="ghost" id="x-print">Print</button><button class="ghost" id="x-copy">Copy summary</button>
        </div>
        <div class="row noprint" style="margin-top:8px"><button class="ghost" id="x-new">Retake test</button></div>
      </div>
      <div class="card">
        <h2>Consistency score</h2>
        <div class="big">${consistency.toFixed(0)}% <span class="pill ${cLabel[0]}">${cLabel[1]}</span></div>
        <p class="small muted">Based on ${pairRows.length} pairs of opposite statements. Answering opposites on opposite sides costs points in proportion to how strongly you did so; neutral answers never cost anything. Details are in the consistency check below.</p>
      </div>
    </div>
  </div>

  ${figuresCard()}

  <div class="card"><h2>Scores by topic</h2>
    <p class="small muted">Each topic is scored on the same −10…+10 scale from its 8 statements.</p>
    ${['econ', 'soc'].map(ax => `
      <h3>${AXES[ax].name} axis</h3>
      <div class="axislab"><span>← ${AXES[ax].negShort}</span><span>${AXES[ax].posShort} →</span></div>
      ${catScores.filter(s => s.c.axis === ax).map(s => `
        <div class="dbar"><span>${s.c.name}</span>
          <div class="dtrack"><div class="dfill" style="${s.v >= 0 ? 'left:50%' : 'right:50%'};width:${Math.abs(s.v) * 5}%;background:${ax === 'econ' ? (s.v >= 0 ? 'var(--right)' : 'var(--left)') : (s.v >= 0 ? 'var(--auth)' : 'var(--lib)')}"></div></div>
          <span class="dval">${fmt(s.v, 1)}</span></div>`).join('')}`).join('')}
  </div>

  <div class="grid2">
    <div class="card"><h2>What moved your economic score</h2>
      <p class="small">Points toward Right: <b>+${eT.pos.toFixed(2)}</b> (${eT.nPos} answers) · toward Left: <b>${fmtS(eT.neg)}</b> (${eT.nNeg} answers) · neutral: ${eT.nZero}. Net = ${fmt(pt.econ)}.</p>
      <h3>Biggest pulls to the Right</h3>${pullList(topList('econ', +1))}
      <h3>Biggest pulls to the Left</h3>${pullList(topList('econ', -1))}</div>
    <div class="card"><h2>What moved your social score</h2>
      <p class="small">Points toward Authoritarian: <b>+${sT.pos.toFixed(2)}</b> (${sT.nPos} answers) · toward Libertarian: <b>${fmtS(sT.neg)}</b> (${sT.nNeg} answers) · neutral: ${sT.nZero}. Net = ${fmt(pt.soc)}.</p>
      <h3>Biggest pulls to Authoritarian</h3>${pullList(topList('soc', +1))}
      <h3>Biggest pulls to Libertarian</h3>${pullList(topList('soc', -1))}</div>
  </div>

  <div class="card"><h2>How you answered</h2>
    <div class="row small muted" style="gap:14px"><span><span class="dot c0"></span>Strongly disagree</span><span><span class="dot c1"></span>Disagree</span><span><span class="dot c2"></span>Neutral</span><span><span class="dot c3"></span>Agree</span><span><span class="dot c4"></span>Strongly agree</span></div>
    ${stack(dAll, 'All statements')}${stack(dE, 'Economic statements')}${stack(dS, 'Social statements')}
    <p class="small">You agreed with <b>${agreeN}</b> and disagreed with <b>${disN}</b> statements (${dAll[2]} neutral). Because exactly half of all statements point each way, a habit of agreeing (or disagreeing) with everything cancels out rather than moving your position — ${Math.abs(agreeN - disN) > 20 ? 'you leaned noticeably toward ' + (agreeN > disN ? 'agreement' : 'disagreement') + ', which this design neutralizes.' : 'your agree/disagree balance is even.'}</p>
    <p class="small">Strong opinions (“strongly” either way): <b>${strongN}</b> of ${QUESTIONS.length} (${(strongN / QUESTIONS.length * 100).toFixed(0)}%). Average intensity: <b>${avgExtremity.toFixed(2)}</b> of 2.00.</p>
  </div>

  <div class="card"><h2>Consistency check</h2>
    <p class="small">${pairRows.length} pairs of statements are logical opposites (e.g. “free healthcare” vs. “pay for your own”). Opposite statements should get opposite answers. <span class="pill ${nBad ? 'bad' : nWarn ? 'warn' : 'ok'}">${nBad} conflicting · ${nWarn} mild tension · ${pairRows.length - nBad - nWarn} consistent</span></p>
    <div class="tw"><table><tr><th>Statement A</th><th>You</th><th>Statement B</th><th>You</th><th></th></tr>
    ${pairRows.map(p => `<tr><td>${esc(p.a.t)}</td><td>${LABELS[A[p.a.id].v + 2]}</td><td>${esc(p.b.t)}</td><td>${LABELS[A[p.b.id].v + 2]}</td><td><span class="pill ${p.status}">${{ ok: 'consistent', warn: 'tension', bad: 'conflict' }[p.status]}</span></td></tr>`).join('')}
    </table></div>
  </div>

  <div class="card"><h2>Timing &amp; hesitation</h2>
    <p class="small">Total time on statements: <b>${dur(totalMs)}</b> · median per statement: <b>${(medMs / 1000).toFixed(1)}s</b> · answers changed: <b>${changes}</b></p>
    <div class="grid2"><div><h3>Longest deliberation</h3><ul class="clean">${slow.map(t => `<li><span>${esc(t.q.t)}</span><span>${(t.ms / 1000).toFixed(1)}s</span></li>`).join('')}</ul></div>
    <div><h3>Fastest answers</h3><ul class="clean">${fast.map(t => `<li><span>${esc(t.q.t)}</span><span>${(t.ms / 1000).toFixed(1)}s</span></li>`).join('')}</ul></div></div>
    <h3>Time by section</h3>
    <ul class="clean">${SECTIONS.map((sc, i) => { const ts = times.filter(t => t.q.sec === i); return `<li><span>${i + 1}. ${esc(sc.title)} <span class="muted">(${ts.length} statements)</span></span><span>${dur(ts.reduce((a, t) => a + t.ms, 0))} · ${(median(ts.map(t => t.ms)) / 1000).toFixed(1)}s median</span></li>`; }).join('')}</ul>
    <p class="small muted">Fast “snap” answers and long hesitations can both flag statements where your view may be less settled.</p>
  </div>

  <div class="card"><h2>Every answer</h2>
    <p class="small muted">Change any answer here and everything above recalculates. “Points” is how many axis points that answer contributed (positive = Right on economic statements, Authoritarian on social statements; negative = Left or Libertarian).</p>
    <div class="filters noprint">
      <select id="f-axis"><option value="">All axes</option><option value="econ">Economic</option><option value="soc">Social</option></select>
      <select id="f-sec"><option value="">All sections</option>${SECTIONS.map((sc, i) => `<option value="${i}">${sc.title}</option>`).join('')}</select>
      <select id="f-cat"><option value="">All topics</option>${CATS.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}</select>
      <input id="f-text" placeholder="Search statements…" value="${esc(tableState.text)}">
    </div>
    <div class="tw"><table id="ans-table"></table></div>
  </div>

  <div class="card"><h2>Methodology &amp; balance audit</h2>
    <p class="small">Answers map to −2…+2. Each statement has a fixed direction (shown above as “Agree →”). Directional value = answer × direction. Axis score = Σ directional value ÷ (2 × statements on that axis) × 10. Weights are all 1, and no statement belongs to both axes.</p>
    ${['econ', 'soc'].map(ax => {
      const rows = balanceAudit().rows.filter(r => r.cat.axis === ax);
      const tp = rows.reduce((t, r) => t + r.pos, 0), tn = rows.reduce((t, r) => t + r.neg, 0);
      return `<h3>${AXES[ax].name} axis</h3><div class="tw"><table><tr><th>Topic</th><th>Agreeing pushes ${AXES[ax].posShort}</th><th>Agreeing pushes ${AXES[ax].negShort}</th></tr>
      ${rows.map(r => `<tr><td>${r.cat.name}</td><td>${r.pos}</td><td>${r.neg}</td></tr>`).join('')}
      <tr><td><b>Total</b></td><td><b>${tp}</b></td><td><b>${tn}</b></td></tr></table></div>`;
    }).join('')}
    <p class="small">Audit: <span class="pill ${balanceAudit().ok ? 'ok' : 'bad'}">${balanceAudit().ok ? 'perfectly balanced' : 'IMBALANCED'}</span> · Sanity checks: all-neutral → (0, 0); all-agree → (0, 0); all-disagree → (0, 0).</p>
    <p class="small muted">Limits: a short questionnaire cannot capture every view; the two axes are a simplification, and statements are phrased as the author understood common positions. Treat results as a description of your answers, not a verdict.</p>
  </div>`;

  // wire up
  document.getElementById('x-json').onclick = () => download('compass-results.json', JSON.stringify(exportData(pt, catScores, pairRows, consistency), null, 2), 'application/json');
  document.getElementById('x-csv').onclick = () => download('compass-answers.csv', exportCSV(), 'text/csv');
  document.getElementById('x-print').onclick = () => window.print();
  document.getElementById('x-copy').onclick = () => {
    const txt = `${quad}\nEconomic: ${fmt(pt.econ)} (${pt.econ >= 0 ? 'Right' : 'Left'})\nSocial: ${fmt(pt.soc)} (${pt.soc >= 0 ? 'Authoritarian' : 'Libertarian'})\n` + catScores.map(s => `${s.c.name}: ${fmt(s.v, 1)}`).join('\n');
    navigator.clipboard.writeText(txt).then(() => { const b = document.getElementById('x-copy'); b.textContent = 'Copied'; });
  };
  document.getElementById('x-new').onclick = () => { if (confirm('Discard these answers and retake the test?')) startNew(); };
  for (const [id, key] of [['f-axis', 'axis'], ['f-sec', 'sec'], ['f-cat', 'cat'], ['f-text', 'text']]) {
    const el = document.getElementById(id); el.value = tableState[key];
    el.oninput = () => { tableState[key] = el.value; drawTable(); };
  }
  drawTable();
  initFigures(pt);
}

/* ---------------- political figures ---------------- */
const FIG_STORE = 'compass-detailed-figs';
const figState = { quad: '', text: '', sort: 'dist', dir: 1, pick: '', kind: '',
  // no saved choice yet -> best-known defaults; a saved choice (even "None") is respected
  sel: new Set((() => { try { const v = JSON.parse(localStorage.getItem(FIG_STORE)); return Array.isArray(v) ? v : DEFAULT_FIGURES; } catch { return DEFAULT_FIGURES; } })()) };
const saveSel = () => { try { localStorage.setItem(FIG_STORE, JSON.stringify([...figState.sel])); } catch {} };
function figuresCard() {
  return `<div class="card" id="figs"><h2>Political figures</h2>
    <p class="small muted"><b>Positions are rough editorial estimates, not measurements.</b> They are not derived from this test's questions or taken from politicalcompass.org, and many figures shifted over their careers. Distance is the straight-line gap between your position and theirs on the −10…+10 grid (the maximum possible is about 28). Edit <code>figures.js</code> to correct any placement.</p>
    <div class="filters noprint">
      <select id="fg-quad"><option value="">All quadrants</option>${['Authoritarian Left', 'Authoritarian Right', 'Libertarian Left', 'Libertarian Right'].map(q => `<option>${q}</option>`).join('')}</select>
      <input id="fg-text" placeholder="Search names…">
    </div>
    <div class="grid2"><div><h3>Closest to you</h3><div id="fg-near"></div></div><div><h3>Furthest from you</h3><div id="fg-far"></div></div></div>
    <h3>All figures</h3><div class="tw"><table id="fg-table"></table></div>
  </div>`;
}
const fname = n => `<span class="fname" data-fig="${esc(n)}" tabindex="0">${esc(n)}</span>`;

/* What would this figure say to each statement? Manual stance if set, else a guess from their position. */
function figPredict(f, q) {
  if (f.stance && f.stance[q.id] !== undefined) return { v: f.stance[q.id], manual: true };
  const sc = q.axis === 'econ' ? f.econ : f.soc;
  const v = Math.max(-2, Math.min(2, q.d * sc / 5));
  return Math.abs(v) < 0.4 ? null : { v, manual: false };      // too close to center to guess
}
function figCompare(f) {
  const same = [], diff = [];
  for (const q of QUESTIONS) {
    const u = S.answers[q.id]?.v, p = figPredict(f, q);
    if (!u || !p) continue;                                     // user neutral, or no guess
    const row = { q, u, p, w: Math.abs(u) * Math.abs(p.v) + (p.manual ? 100 : 0) };
    (u * p.v > 0 ? same : diff).push(row);
  }
  const top = a => a.sort((x, y) => y.w - x.w).slice(0, 5);
  return { same: top(same), diff: top(diff), nSame: same.length, nDiff: diff.length };
}
const ans = v => v >= 1.4 ? 'Strongly agree' : v > 0 ? 'Agree' : v <= -1.4 ? 'Strongly disagree' : 'Disagree';
function popHTML(f) {
  const c = figCompare(f), quad = quadrant(f.econ, f.soc);
  const item = r => `<li>${esc(r.q.t)}<br><span class="muted">You: ${ans(r.u)} · ${esc(f.name.split(' ')[0] === f.name ? f.name : f.name.split(' ').slice(-1)[0])}: ${ans(r.p.v)}${r.p.manual ? ' ★' : ' (inferred)'}</span></li>`;
  return `<b>${esc(f.name)}</b><div class="muted small">${quad} · est. ${fmt(f.econ, 1)} econ, ${fmt(f.soc, 1)} social</div>
    <h4 class="ok">Likely to agree with you <span class="muted">(${c.nSame} statements)</span></h4><ul>${c.same.map(item).join('') || '<li class="muted">Nothing clear.</li>'}</ul>
    <h4 class="bad">Likely to disagree with you <span class="muted">(${c.nDiff} statements)</span></h4><ul>${c.diff.map(item).join('') || '<li class="muted">Nothing clear.</li>'}</ul>
    <div class="muted small">Mostly inferred from an estimated position, not documented stances. ★ = set manually in figures.js.</div>`;
}
let popEl;
function showPop(target, x, y) {
  const f = FIGURES.find(f => f.name === target.dataset.fig); if (!f) return;
  if (!popEl) { popEl = document.createElement('div'); popEl.id = 'fig-pop'; document.body.appendChild(popEl); }
  popEl.innerHTML = popHTML(f); popEl.style.display = 'block';
  const r = popEl.getBoundingClientRect();
  popEl.style.left = Math.max(8, Math.min(x + 14, innerWidth - r.width - 8)) + 'px';
  popEl.style.top = (y + 16 + r.height > innerHeight ? Math.max(8, y - r.height - 12) : y + 16) + 'px';
}
const hidePop = () => { if (popEl) popEl.style.display = 'none'; };
document.addEventListener('mouseover', e => { const t = e.target.closest?.('[data-fig]'); if (t) showPop(t, e.clientX, e.clientY); });
document.addEventListener('mousemove', e => { const t = e.target.closest?.('[data-fig]'); if (t && popEl && popEl.style.display === 'block') showPop(t, e.clientX, e.clientY); });
document.addEventListener('mouseout', e => { if (e.target.closest?.('[data-fig]')) hidePop(); });
document.addEventListener('focusin', e => { const t = e.target.closest?.('[data-fig]'); if (t) { const b = t.getBoundingClientRect(); showPop(t, b.left, b.bottom - 16); } });
document.addEventListener('focusout', hidePop);

function initFigures(pt) {
  const $ = id => document.getElementById(id);
  $('fg-quad').value = figState.quad; $('fg-text').value = figState.text; $('fp-text').value = figState.pick; $('fp-kind').value = figState.kind;
  $('fp-kind').onchange = e => { figState.kind = e.target.value; drawPicker(pt); };
  $('fp-text').oninput = e => { figState.pick = e.target.value; drawPicker(pt); };
  $('fp-near').onclick = () => { figState.sel = new Set(figsWithDist(pt).sort((a, b) => a.dist - b.dist).slice(0, 5).map(f => f.name)); saveSel(); drawPicker(pt); drawChartFigs(pt); };
  $('fp-def').onclick = () => { figState.sel = new Set(DEFAULT_FIGURES); saveSel(); drawPicker(pt); drawChartFigs(pt); };
  $('fp-all').onclick = () => { pickerList(pt).forEach(f => figState.sel.add(f.name)); saveSel(); drawPicker(pt); drawChartFigs(pt); };
  $('fp-none').onclick = () => { figState.sel.clear(); saveSel(); drawPicker(pt); drawChartFigs(pt); };
  $('fp-list').onchange = e => {
    const cb = e.target.closest('input[data-pick]'); if (!cb) return;
    cb.checked ? figState.sel.add(cb.dataset.pick) : figState.sel.delete(cb.dataset.pick);
    saveSel(); drawChartFigs(pt); updatePickCount();
  };
  drawPicker(pt);
  $('fg-quad').onchange = e => { figState.quad = e.target.value; drawFigures(pt); };
  $('fg-text').oninput = e => { figState.text = e.target.value; drawFigures(pt); };
  drawFigures(pt);
}
const figsWithDist = pt => FIGURES.map(f => ({ ...f, dist: Math.hypot(f.econ - pt.econ, f.soc - pt.soc), quad: quadrant(f.econ, f.soc) }));
const pickerList = pt => figsWithDist(pt).filter(f => (!figState.kind || f.kind === figState.kind) && (!figState.pick || f.name.toLowerCase().includes(figState.pick.toLowerCase()))).sort((a, b) => a.dist - b.dist);
const QCOL = { 'Authoritarian Left': 'var(--red)', 'Authoritarian Right': 'var(--blue)', 'Libertarian Left': 'var(--green)', 'Libertarian Right': 'var(--purple)' };
function updatePickCount() {
  const n = FIGURES.filter(f => figState.sel.has(f.name)).length;
  document.getElementById('fp-count').textContent = `${n} of ${FIGURES.length} shown`;
}
function drawPicker(pt) {
  const list = pickerList(pt);
  document.getElementById('fp-list').innerHTML = list.map(f => `<label class="fp-item"><input type="checkbox" data-pick="${esc(f.name)}" ${figState.sel.has(f.name) ? 'checked' : ''}>
      <span class="dot" style="background:${QCOL[f.quad]};border:1px solid #0002"></span><span class="fname" data-fig="${esc(f.name)}">${esc(f.name)}</span><span class="muted fp-d">${f.dist.toFixed(1)}</span></label>`).join('')
    || '<div class="muted small" style="padding:8px">No matching figures.</div>';
  updatePickCount();
}
// only the ticked figures go on the chart; nearest get first pick of label space
function drawChartFigs(pt) {
  const picked = figsWithDist(pt).filter(f => figState.sel.has(f.name)).sort((a, b) => a.dist - b.dist);
  document.getElementById('compass-wrap').innerHTML = compassSVG(pt.econ, pt.soc, picked.length ? picked : null, new Set(picked.map(f => f.name)));
}
function drawFigures(pt) {
  const all = figsWithDist(pt);
  const byDist = all.slice().sort((a, b) => a.dist - b.dist);
  const shown = all.filter(f => (!figState.quad || f.quad === figState.quad) && (!figState.text || f.name.toLowerCase().includes(figState.text.toLowerCase())));
  drawChartFigs(pt);
  // closest / furthest
  const li = f => `<li><span>${fname(f.name)} <span class="muted">${f.quad}</span></span><span>${f.dist.toFixed(1)}</span></li>`;
  document.getElementById('fg-near').innerHTML = `<ul class="clean">${byDist.slice(0, 8).map(li).join('')}</ul>`;
  document.getElementById('fg-far').innerHTML = `<ul class="clean">${byDist.slice(-8).reverse().map(li).join('')}</ul>`;
  // table
  const keys = { name: f => f.name, kind: f => f.kind, econ: f => f.econ, soc: f => f.soc, dist: f => f.dist, quad: f => f.quad };
  const k = keys[figState.sort];
  const rows = shown.slice().sort((a, b) => (k(a) > k(b) ? 1 : k(a) < k(b) ? -1 : 0) * figState.dir);
  const th = (key, label) => `<th data-sort="${key}">${label}${figState.sort === key ? (figState.dir > 0 ? ' ▲' : ' ▼') : ''}</th>`;
  const t = document.getElementById('fg-table');
  t.innerHTML = `<tr>${th('name', 'Figure')}${th('kind', 'Type')}${th('quad', 'Quadrant (est.)')}${th('econ', 'Economic')}${th('soc', 'Social')}${th('dist', 'Distance from you')}</tr>` +
    rows.map(f => `<tr><td>${fname(f.name)}</td><td class="small muted">${KIND_LABEL[f.kind]}</td><td><span class="tag">${f.quad}</span></td><td>${fmt(f.econ, 1)}</td><td>${fmt(f.soc, 1)}</td><td>${f.dist.toFixed(1)}</td></tr>`).join('') +
    (rows.length ? '' : '<tr><td colspan="6" class="muted">No matching figures.</td></tr>');
  t.querySelectorAll('th[data-sort]').forEach(h => h.onclick = () => { if (figState.sort === h.dataset.sort) figState.dir *= -1; else { figState.sort = h.dataset.sort; figState.dir = 1; } drawFigures(pt); });
}

function pullList(list, ax) {
  if (!list.length) return '<p class="small muted">None.</p>';
  return `<ul class="clean">${list.map(c => `<li><span>${esc(c.q.t)} <span class="muted">— ${LABELS[c.a.v + 2]}</span></span><span class="${c.pts > 0 ? 'pos' : 'neg'}-${c.q.axis[0]}">${fmt(c.pts)}</span></li>`).join('')}</ul>`;
}

function drawTable() {
  const A = S.answers, t = tableState;
  const nE = QUESTIONS.filter(q => q.axis === 'econ').length, nS = QUESTIONS.length - nE;
  let rows = QUESTIONS.map(q => {
    const a = A[q.id], e = eff(q, a.v);
    return { q, a, e, pts: e * 5 / (q.axis === 'econ' ? nE : nS) };
  }).filter(r => (!t.axis || r.q.axis === t.axis) && (t.sec === '' || r.q.sec === +t.sec) && (!t.cat || r.q.cat === t.cat) && (!t.text || r.q.t.toLowerCase().includes(t.text.toLowerCase())));
  const keys = { n: r => r.a.seq, shown: r => r.a.seq, topic: r => r.q.cat, v: r => r.a.v, pts: r => r.pts, ms: r => r.a.ms };
  const k = keys[t.sort] || keys.n;
  rows.sort((x, y) => (k(x) > k(y) ? 1 : k(x) < k(y) ? -1 : 0) * t.dir);
  const th = (key, label) => `<th data-sort="${key}">${label}${t.sort === key ? (t.dir > 0 ? ' ▲' : ' ▼') : ''}</th>`;
  const el = document.getElementById('ans-table');
  el.innerHTML = `<tr>${th('n', '#asked')}<th>Statement</th>${th('topic', 'Topic')}<th>Agreeing pushes</th>${th('v', 'Your answer')}${th('pts', 'Points')}${th('ms', 'Time')}</tr>` +
    rows.map(r => `<tr><td>${r.a.seq}</td><td>${esc(r.q.t)}</td><td><span class="tag">${CATBY[r.q.cat].name}</span></td>
      <td>${r.q.d > 0 ? AXES[r.q.axis].posShort : AXES[r.q.axis].negShort}</td>
      <td><select data-id="${r.q.id}">${LABELS.map((l, i) => `<option value="${i - 2}" ${r.a.v === i - 2 ? 'selected' : ''}>${l}</option>`).join('')}</select></td>
      <td class="${r.pts > 0 ? 'pos-' + r.q.axis[0] : r.pts < 0 ? 'neg-' + r.q.axis[0] : ''}">${fmt(r.pts)}</td><td>${(r.a.ms / 1000).toFixed(1)}s</td></tr>`).join('') +
    (rows.length ? '' : '<tr><td colspan="7" class="muted">No matching statements.</td></tr>');
  el.querySelectorAll('th[data-sort]').forEach(h => h.onclick = () => { if (t.sort === h.dataset.sort) t.dir *= -1; else { t.sort = h.dataset.sort; t.dir = 1; } drawTable(); });
  el.querySelectorAll('select').forEach(s => s.onchange = () => {
    const a = A[s.dataset.id]; a.v = +s.value; a.changes++; save();
    const y = window.scrollY; results(); window.scrollTo(0, y);
    document.getElementById('ans-table').scrollIntoView({ block: 'nearest' });
  });
}

/* ---------------- export ---------------- */
function exportData(pt, catScores, pairRows, consistency) {
  return {
    generated: new Date().toISOString(),
    scale: 'axis scores range -10..+10; economic + = right/free market, social + = authoritarian',
    scores: { economic: +pt.econ.toFixed(4), social: +pt.soc.toFixed(4), quadrant: quadrant(pt.econ, pt.soc) },
    consistencyScore: +consistency.toFixed(2),
    topics: catScores.map(s => ({ id: s.c.id, name: s.c.name, axis: s.c.axis, score: +s.v.toFixed(4) })),
    consistency: pairRows.map(p => ({ a: p.a.id, b: p.b.id, status: p.status })),
    answers: QUESTIONS.map(q => answerRow(q)),
  };
}
function answerRow(q) {
  const a = S.answers[q.id];
  return { orderAsked: a.seq, section: SECTIONS[q.sec].title, id: q.id, statement: q.t, axis: q.axis, topic: q.cat, agreeingPushes: q.d > 0 ? AXES[q.axis].posShort : AXES[q.axis].negShort,
    answer: a.v, answerLabel: LABELS[a.v + 2], directionalValue: eff(q, a.v), timeMs: a.ms, timesChanged: a.changes };
}
function exportCSV() {
  const rows = QUESTIONS.map(answerRow);
  const cols = Object.keys(rows[0]);
  const cell = v => `"${String(v).replace(/"/g, '""')}"`;
  return [cols.join(',')].concat(rows.map(r => cols.map(c => cell(r[c])).join(','))).join('\n');
}
function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}

render();
})();
