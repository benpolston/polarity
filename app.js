/* Polarity — app logic. No dependencies. */
(() => {
const LABELS = ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'];
const SKIP_LABEL = "Don't know";
const LABELS6 = [...LABELS, SKIP_LABEL];                 // index 5 = don't know (used by charts)
const STORE = 'compass-detailed-v3';
const FRIEND_STORE = 'compass-detailed-friend';
const NAME_STORE = 'compass-detailed-name';
const $app = document.getElementById('app');
const $mini = document.getElementById('progress-mini');
const QBY = Object.fromEntries(QUESTIONS.map(q => [q.id, q]));
const CATBY = Object.fromEntries(CATS.map(c => [c.id, c]));
// statement id -> plain-English explanation (from STATEMENT_HELP in questions.js)
const HELP = Object.fromEntries(QUESTIONS.map(q => [q.id, (Object.entries(STATEMENT_HELP).find(([k]) => q.t.includes(k)) || [])[1]]).filter(([, v]) => v));

// S = your own saved test: {order:[ids], idx, secShown, answers:{id:{v,ms,changes,seq}}, started, finished}
//     v is -2..+2, or null for "Don't know" (excluded from scoring).
let S = load();
if (S && (!S.order || ![QUESTIONS.length, QUICK_IDS.size].includes(S.order.length) || S.order.some(id => !QBY[id]))) S = null;  // stale save from an older question set
// R = the result currently on screen: your own (own:true) or a shared link (own:false)
let R = null;
// FRIEND = someone else's answers overlaid on your results for comparison
let FRIEND = loadFriend();
let shownAt = 0;
let busy = false;   // blocks double input while the next question is loading
let tableState = { axis: '', cat: '', sec: '', text: '', sort: 'n', dir: 1 };

/* ---------------- utils ---------------- */
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = (x, d = 2) => (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(d);
const fmtS = (x, d = 2) => x.toFixed(d).replace('-', '−');
// Saved progress is tied to the exact statement set (QSET_KEY). If the statements change, ids can point at
// different statements, so progress saved under an older set is dropped rather than misread.
function load() { try { const s = JSON.parse(localStorage.getItem(STORE)); return s && s.qset === QSET_KEY ? s : null; } catch { return null; } }
function save() { if (S) S.qset = QSET_KEY; try { localStorage.setItem(STORE, JSON.stringify(S)); } catch {} }
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function median(a) { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
function dur(ms) { const s = Math.round(ms / 1000); return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`; }
const labelOf = v => typeof v === 'number' ? LABELS[v + 2] : SKIP_LABEL;

/* scoring + share-link encoding live in core.js */
function answered() { return S ? Object.keys(S.answers).length : 0; }

/* ---------------- share links (encoding in core.js) ---------------- */
function parseShare(str) {
  const i = String(str || '').indexOf('#');
  const p = new URLSearchParams(i >= 0 ? str.slice(i + 1) : str);
  if (!p.get('r')) return null;
  const d = decodeAnswers(p.get('r'));
  return d.error ? d : { answers: d.answers, name: (p.get('n') || '').slice(0, 40), code: p.get('r') };
}
function shareURL(answers, name) {
  return location.origin + location.pathname + '#r=' + encodeAnswers(answers) + (name ? '&n=' + encodeURIComponent(name) : '');
}
function loadFriend() {
  try {
    const f = JSON.parse(localStorage.getItem(FRIEND_STORE)); if (!f) return null;
    const d = decodeAnswers(f.code); return d.error ? null : { answers: d.answers, name: f.name || '', code: f.code };
  } catch { return null; }
}
function setFriend(f) {
  FRIEND = f;
  try { f ? localStorage.setItem(FRIEND_STORE, JSON.stringify({ code: f.code, name: f.name })) : localStorage.removeItem(FRIEND_STORE); } catch {}
}
const friendName = () => (FRIEND && FRIEND.name) || 'Friend';
const clearHash = () => { if (location.hash) history.replaceState(null, '', location.pathname + location.search); };

/* ---------------- routing ---------------- */
function render() {
  window.scrollTo(0, 0);
  const shared = parseShare(location.hash);
  if (shared) return shared.error ? sharedError(shared.error) : results(shared);
  if (!S) return intro();
  if (S.finished) return results();
  if (answered() === 0 && S.idx === 0 && !S.started) return intro();
  quiz();
}
window.addEventListener('hashchange', render);
document.getElementById('home').addEventListener('click', e => {
  // always the landing page; it offers "Resume" or "View your last results" when there's saved progress
  e.preventDefault(); clearHash(); window.scrollTo(0, 0); intro();
});
function sharedError(msg) {
  $mini.textContent = '';
  $app.innerHTML = `<h1>Shared result</h1><div class="card"><p>${esc(msg)}</p><button id="se-home">Go to the test</button></div>`;
  document.getElementById('se-home').onclick = () => { clearHash(); render(); };
}

/* ---------------- landing page ---------------- */
function intro() {
  $mini.textContent = '';
  const audit = balanceAudit();
  const resume = S && S.started && !S.finished;
  const feature = (icon, title, body) => `<div class="feat"><div class="feat-i" aria-hidden="true">${icon}</div><h3>${title}</h3><p>${body}</p></div>`;
  $app.innerHTML = `
    <section class="land-hero">
      <div class="land-copy">
        <h1>Find out where you <em>actually</em> stand.</h1>
        <p class="lead">${QUESTIONS.length} specific policy statements, not slogans, place you on two axes: <b>economic</b> (left ↔ right) and <b>social</b> (libertarian ↔ authoritarian).</p>
        <div class="row land-cta">
          ${resume ? `<button id="resume">Resume (${answered()} of ${S.order.length} answered)</button><button class="ghost" id="restart">Start over</button>`
                   : `<button id="start">Take the full test <span class="cta-sub">${QUESTIONS.length} statements · about 15 min</span></button>
                      <button class="ghost" id="start-quick">Quick test <span class="cta-sub">${QUICK_IDS.size} statements · about 7 min</span></button>`}
        </div>
        ${S && S.finished ? `<p class="small"><a href="#" id="seeres">View your last results →</a></p>` : ''}
        <p class="muted small">No sign-up. Your answers stay in your browser.</p>
      </div>
      <figure class="card land-chart">
        <div id="landing-chart"></div>
        <figcaption class="small muted">Where well-known figures land (rough estimates). Your result appears on this chart too.</figcaption>
      </figure>
    </section>

    <h2 class="land-h2">What makes it different</h2>
    <div class="feats">
      ${feature('◎', 'Specific, not slogans', 'Every statement is a concrete policy, such as a $1 million top tax rate or unarmed police, so people at either extreme still find things to disagree with.')}
      ${feature('⚖', 'Balanced by design', `Every topic has the same number of statements pushing each way${audit.ok ? '' : ' (<b>audit failed</b>)'}, all weighted equally. Agreeing with everything puts you dead center, not on one side.`)}
      ${feature('?', '“Don’t know” is respected', 'Unsure about a topic? “Don’t know” is left out of your score entirely instead of quietly pulling you toward the middle. Jargon comes with a plain-English explanation.')}
      ${feature('▤', 'Every detail of your result', `Scores for all ${CATS.length} topics, the answers that moved you most, a consistency check, timing, and every answer, which you can change and watch the result update.`)}
      ${feature('●', 'See who you’re near', `Compare your position with ${FIGURES.length} politicians, thinkers and commentators, and see which of your views each one likely shares or opposes.`)}
      ${feature('⇄', 'Private sharing', 'Share a link, compare side by side with a friend, or save your chart as an image. No accounts, and nothing is stored on a server.')}
    </div>

    <h2 class="land-h2">How it works</h2>
    <ol class="steps">
      <li><b>Answer</b><span>${SECTIONS.length} short sections, from the economy to religion. Agree, disagree, or say you don't know.</span></li>
      <li><b>See where you land</b><span>Your position on both axes, a breakdown by topic, and the figures nearest to you.</span></li>
      <li><b>Dig in or share</b><span>Explore every answer, compare with a friend, or save your chart to share.</span></li>
    </ol>
    <div class="land-bottom">
      ${resume ? '' : `<button id="start2">Take the full test</button><button class="ghost" id="start-quick2">Quick test</button>`}
    </div>`;
  // sample chart: as many default figures as fit this width without any label moving
  const lc = document.getElementById('landing-chart');
  const w = lc.clientWidth;
  lc.innerHTML = compassSVG(null, null, FIGURES.filter(f => fittedDefaults(w).includes(f.name)), null, { width: w });
  const on = (id, f) => { const el = document.getElementById(id); if (el) el.onclick = e => { e.preventDefault(); f(); }; };
  on('start', () => startNew('full')); on('start2', () => startNew('full'));
  on('start-quick', () => startNew('quick')); on('start-quick2', () => startNew('quick'));
  on('restart', () => { if (confirm('Discard your saved progress and start over?')) startNew(S.mode || 'full'); });
  on('resume', () => { shownAt = 0; quiz(); });
  on('seeres', () => results());
}
// mode 'quick' asks the balanced 52-statement subset (2 each way per topic); 'full' asks all 100.
function startNew(mode = 'full') {
  clearHash();
  const pool = mode === 'quick' ? QUESTIONS.filter(q => QUICK_IDS.has(q.id)) : QUESTIONS;
  S = { mode, order: SECTIONS.flatMap((sc, i) => shuffle(pool.filter(q => q.sec === i).map(q => q.id))), secShown: -1, idx: 0, answers: {}, started: Date.now(), finished: null };
  save(); quiz();
}

/* ---------------- quiz ---------------- */
function quiz() {
  const total = S.order.length;
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
      <div class="q-num">${sec.title} · statement ${S.order.slice(0, S.idx + 1).filter(id => QBY[id].sec === q.sec).length} of ${S.order.filter(id => QBY[id].sec === q.sec).length}</div>
      <p class="q-text">${esc(q.t)}</p>
      ${HELP[q.id] ? `<button class="helplink" id="help-btn" aria-expanded="false" aria-controls="help-txt">What does this mean?</button>
      <p class="help" id="help-txt" hidden>${esc(HELP[q.id])}</p>` : ''}
      <div class="opts">
        ${LABELS.map((l, i) => `<button class="opt ${cur && cur.v === i - 2 ? 'sel' : ''}" data-v="${i - 2}"><kbd>${i + 1}</kbd>${l}</button>`).join('')}
      </div>
      <div class="skiprow"><button class="opt skip ${cur && cur.v === null ? 'sel' : ''}" data-v="skip"><kbd>0</kbd>${SKIP_LABEL} <span class="muted">— not counted in your score</span></button></div>
    </div>
    <div class="nav">
      <button class="ghost" id="back" ${S.idx === 0 ? 'disabled' : ''}>← Back</button>
      <button class="ghost" id="fwd" ${cur ? '' : 'disabled'}>${S.idx === total - 1 ? 'Finish' : 'Next →'}</button>
    </div>`;
  shownAt = performance.now();
  $app.querySelectorAll('.opt').forEach(b => b.onclick = () => answer(q, b.dataset.v === 'skip' ? null : +b.dataset.v));
  const hb = document.getElementById('help-btn');
  if (hb) hb.onclick = () => { const t = document.getElementById('help-txt'), open = t.hidden; t.hidden = !open; hb.setAttribute('aria-expanded', open); hb.textContent = open ? 'Hide explanation' : 'What does this mean?'; };
  document.getElementById('back').onclick = back;
  document.getElementById('fwd').onclick = () => { if (!S.answers[q.id]) return; S.idx++; save(); quiz(); window.scrollTo(0, 0); };
}
function sectionIntro(i) {
  const sec = SECTIONS[i], n = S.order.filter(id => QBY[id].sec === i).length;
  $mini.textContent = `Section ${i + 1}/${SECTIONS.length}`;
  $app.innerHTML = `
    <div class="bar"><i style="width:${(S.idx / S.order.length * 100).toFixed(1)}%"></i></div>
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
  if (S.order.every(id => S.answers[id])) S.idx = S.order.length;
  save();
  setTimeout(() => quiz(), 120);
}
function back() { if (S.idx > 0) { S.idx--; save(); quiz(); } }
function finish() {
  S.finished = Date.now(); save(); results();
}
document.addEventListener('keydown', e => {
  if (!S || S.finished || !S.started || !$app.querySelector('.opts')) return;
  if (e.target.closest && e.target.closest('input,select,textarea')) return;
  if (e.key >= '1' && e.key <= '5') answer(QBY[S.order[S.idx]], +e.key - 3);
  else if (e.key === '0') answer(QBY[S.order[S.idx]], null);
  else if (e.key === 'ArrowLeft') back();
});

/* ---------------- SVG compass ---------------- */
// exact rendered text width, measured with a hidden SVG text node so label boxes hug the text
let _meas, _cache = {};
function textW(str, fs, weight) {
  const k = fs + '|' + (weight || '') + '|' + str; if (_cache[k]) return _cache[k];
  if (!_meas) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('style', 'position:absolute;visibility:hidden;width:0;height:0');
    _meas = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    svg.appendChild(_meas); document.body.appendChild(svg);
  }
  _meas.setAttribute('font-size', fs); _meas.setAttribute('font-weight', weight || 'normal'); _meas.textContent = str;
  return (_cache[k] = _meas.getComputedTextLength() || str.length * 6);
}
// x,y = the person whose result this is (x === null: no result dot); figs = figures to draw;
// friend = optional {econ, soc, name}; opts.width = on-screen width to size labels for (default: #compass-wrap).
// After each call, compassSVG.lastMoved lists any figure whose label could not sit right beside its dot.
function compassSVG(x, y, figs, friend, opts = {}) {
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

  figs = figs || [];
  // label text is sized for the chart's real on-screen width, so names stay readable (~10px+) on phones
  const shownW = opts.width || (document.getElementById('compass-wrap') || {}).clientWidth || SZW;
  const FS = Math.max(11.5, Math.min(20, 10.5 * SZW / shownW)), H = Math.round(FS * 1.4);
  // obstacles: every figure dot, then labels as they get placed. Your dot and your friend's marker are
  // NOT obstacles: they're drawn on top instead, so a figure's label never moves just because of where
  // a result happened to land.
  const boxes = figs.map(f => ({ x: px(f.econ) - 4, y: py(f.soc) - 4, w: 8, h: 8, owner: f.name }));
  const hit = r => boxes.some(o => r.x < o.x + o.w && r.x + r.w > o.x && r.y < o.y + o.h && r.y + r.h > o.y && o.owner !== r.owner);
  for (const f of figs) {
    g += `<circle cx="${px(f.econ)}" cy="${py(f.soc)}" r="3.6" fill="#374151" fill-opacity=".7" stroke="#fff" stroke-width="1"></circle><circle cx="${px(f.econ)}" cy="${py(f.soc)}" r="9" fill="transparent" data-fig="${esc(f.name)}" tabindex="0" style="cursor:help"/>`;
  }
  // labels always sit to the RIGHT of their dot; if blocked, they slide up/down on that side with a leader line.
  // Your friend's label is placed first, then figures nearest-first.
  const labelItems = [], moved = [];
  if (friend) labelItems.push({ name: friend.name, cx: px(friend.econ), cy: py(friend.soc), gap: 12, bold: true, owner: '__friend' });
  for (const f of figs) labelItems.push({ name: f.name, cx: px(f.econ), cy: py(f.soc), gap: 7, owner: f.name });
  for (const L of labelItems) {
    const w = textW(L.name, FS, L.bold ? 700 : null) + 3;
    const tries = [0, -1, 1, -2, 2, -3, 3, -4, 4].map(k => [L.cx + L.gap, L.cy - H / 2 + k * (H - 4)]);
    const spot = tries.find(([tx, ty]) => tx + w <= SZW - 20 && ty >= 4 && ty + H <= SZ - 4 && !hit({ x: tx, y: ty, w, h: H, owner: L.owner }));
    if (L.owner !== '__friend' && spot !== tries[0]) moved.push(L.name);
    if (!spot) continue;                       // no clear space: the dot still names it on hover/tap
    boxes.push({ x: spot[0], y: spot[1], w, h: H, owner: '__label' });
    const nx = Math.max(spot[0], Math.min(L.cx, spot[0] + w)), ny = Math.max(spot[1], Math.min(L.cy, spot[1] + H));
    if (Math.hypot(nx - L.cx, ny - L.cy) > L.gap + 2) g += `<line x1="${L.cx}" y1="${L.cy}" x2="${nx}" y2="${ny}" stroke="#111" stroke-width=".9" stroke-opacity=".85"/>`;
    g += `<text x="${spot[0]}" y="${spot[1] + H - FS * 0.35}" font-size="${FS}"${L.bold ? ' font-weight="700"' : ''} fill="#111" stroke="#fff" stroke-width="2.5" paint-order="stroke">${esc(L.name)}</text>`;
  }
  if (friend) g += `<circle cx="${px(friend.econ)}" cy="${py(friend.soc)}" r="8" fill="#fff" stroke="#111" stroke-width="3"/>`;
  if (x !== null) {
    // your dot: bigger than any figure, with a halo + ring so it's findable on a crowded chart.
    // .you-pulse is invisible by default (opacity 0) and only animated by CSS, so saved images stay static.
    const cx = px(x), cy = py(y);
    g += `<circle class="you-pulse" cx="${cx}" cy="${cy}" r="11" fill="none" stroke="#111" stroke-width="3" opacity="0"/>`;
    g += `<circle cx="${cx}" cy="${cy}" r="19" fill="#fff" fill-opacity=".45" stroke="#111" stroke-opacity=".35" stroke-width="1.2"/>`;
    g += `<circle cx="${cx}" cy="${cy}" r="11" fill="#111" stroke="#fff" stroke-width="3"/>`;
    g += `<circle cx="${cx}" cy="${cy}" r="3.2" fill="#fff"/>`;
  }
  compassSVG.lastMoved = moved;
  const aria = x === null ? 'Political compass showing estimated positions of well-known figures' : `Political compass: economic ${fmt(x)}, social ${fmt(y)}`;
  return `<svg viewBox="0 0 ${SZW} ${SZ}" width="100%" role="img" aria-label="${aria}"><g transform="translate(16 0)">${g}</g></svg>`;
}

/* ---------------- results ---------------- */
// view: undefined → your own saved results; {answers, name} → a shared link (read-only)
function results(view) {
  if (!view) {
    if (!S) return intro();
    const missing = S.order.filter(id => !S.answers[id]);
    if (missing.length) { S.finished = null; S.idx = S.order.findIndex(id => !S.answers[id]); save(); return quiz(); }
    R = { answers: S.answers, own: true };
  } else {
    R = { answers: view.answers, own: false, name: view.name, code: view.code };
  }
  const A = R.answers, own = R.own;
  const QS = QUESTIONS.filter(q => A[q.id]);           // statements this person was asked (52 in a quick test)
  const isQuick = QS.length < QUESTIONS.length;
  const who = own ? 'You' : (R.name || 'They');
  $mini.textContent = own ? '' : 'Shared result';
  const tot = scoreOf(null, A);
  const nE = tot.nE, nS = tot.nS;
  const skipE = QS.filter(q => q.axis === 'econ' && A[q.id] && !known(A[q.id])).length;
  const skipS = QS.filter(q => q.axis === 'soc' && A[q.id] && !known(A[q.id])).length;

  // per-category scores (null when every statement in the topic was "Don't know")
  const catScores = CATS.map(c => {
    const s = scoreOf(q => q.cat === c.id, A), n = c.axis === 'econ' ? s.nE : s.nS;
    return { c, n, asked: QS.filter(q => q.cat === c.id).length, v: n ? (c.axis === 'econ' ? s.econ : s.soc) : null };
  });

  // distributions: indices 0..4 = the five opinions, 5 = don't know
  const dist = f => { const d = [0, 0, 0, 0, 0, 0]; QS.filter(f).forEach(q => d[known(A[q.id]) ? A[q.id].v + 2 : 5]++); return d; };
  const dAll = dist(() => true), dE = dist(q => q.axis === 'econ'), dS = dist(q => q.axis === 'soc');
  const stack = (d, label) => {
    const n = d.reduce((a, b) => a + b, 0);
    return `<div class="small"><b>${label}</b> <span class="muted">(${n} statements)</span></div><div class="stack">${d.map((c, i) => c ? `<span class="c${i}" style="width:${c / n * 100}%" title="${LABELS6[i]}: ${c}">${c / n > .06 ? c : ''}</span>` : '').join('')}</div>`;
  };
  const nKnown = QS.filter(q => known(A[q.id])).length;
  const agreeN = dAll[3] + dAll[4], disN = dAll[0] + dAll[1], skipN = dAll[5];
  const strongN = dAll[0] + dAll[4];
  const avgExtremity = nKnown ? QS.reduce((s, q) => s + (known(A[q.id]) ? Math.abs(A[q.id].v) : 0), 0) / nKnown : 0;

  // contributions (in axis points) = eff * 5 / n   — they sum exactly to the axis score
  const contrib = QS.filter(q => known(A[q.id])).map(q => ({ q, a: A[q.id], e: eff(q, A[q.id].v), pts: eff(q, A[q.id].v) * 5 / (q.axis === 'econ' ? nE : nS) }));
  const topList = (ax, sign, n = 6) => contrib.filter(c => c.q.axis === ax && (sign > 0 ? c.pts > 0 : c.pts < 0)).sort((a, b) => sign * (b.pts - a.pts)).slice(0, n);
  const pullTotals = ax => {
    const cs = contrib.filter(c => c.q.axis === ax);
    return { pos: cs.filter(c => c.pts > 0).reduce((s, c) => s + c.pts, 0), neg: cs.filter(c => c.pts < 0).reduce((s, c) => s + c.pts, 0),
             nPos: cs.filter(c => c.pts > 0).length, nNeg: cs.filter(c => c.pts < 0).length, nZero: cs.filter(c => c.pts === 0).length };
  };

  // consistency pairs ("Don't know" on either side → pair not judged)
  const pairs = {};
  QS.forEach(q => { if (q.p) (pairs[q.p] = pairs[q.p] || []).push(q); });
  const pairRows = Object.values(pairs).filter(p => p.length === 2).map(([a, b]) => {
    if (!known(A[a.id]) || !known(A[b.id])) return { a, b, status: 'skip' };
    const ea = eff(a, A[a.id].v), eb = eff(b, A[b.id].v), prod = ea * eb;
    // opposite statements: consistent answers share the same sign of directional value
    return { a, b, ea, eb, status: prod >= 0 ? 'ok' : prod >= -2 ? 'warn' : 'bad' };
  });
  const judged = pairRows.filter(p => p.status !== 'skip');
  // Consistency score: each pair scores 100% unless answered on opposite sides;
  // opposite sides lose (disagreement size / 4) -- mild/mild loses 25%, strong/strong loses 100%.
  const consistency = judged.length ? judged.reduce((t, p) => t + (1 + Math.min(0, p.ea * p.eb) / 4), 0) / judged.length * 100 : null;
  const cLabel = consistency === null ? ['skip', 'not enough answers'] : consistency >= 90 ? ['ok', 'highly consistent'] : consistency >= 75 ? ['ok', 'mostly consistent'] : consistency >= 60 ? ['warn', 'some contradictions'] : ['bad', 'many contradictions'];
  const nBad = judged.filter(p => p.status === 'bad').length, nWarn = judged.filter(p => p.status === 'warn').length, nSkipPairs = pairRows.length - judged.length;

  // timing (own results only; share links carry answers, not timings)
  const times = QS.map(q => ({ q, ms: A[q.id].ms, ch: A[q.id].changes }));
  const totalMs = times.reduce((s, t) => s + t.ms, 0), medMs = median(times.map(t => t.ms));
  const changes = times.reduce((s, t) => s + t.ch, 0);
  const slow = times.slice().sort((a, b) => b.ms - a.ms).slice(0, 5), fast = times.slice().sort((a, b) => a.ms - b.ms).slice(0, 5);

  const pt = tot;
  // an axis with zero counted answers (all "Don't know") has no direction, so don't claim one
  const quad = nE && nS ? quadrant(pt.econ, pt.soc)
    : nE ? (pt.econ >= 0 ? 'Right' : 'Left') + ' (social not scored)'
    : nS ? (pt.soc >= 0 ? 'Authoritarian' : 'Libertarian') + ' (economic not scored)' : 'Not enough answers';
  const dirE = nE ? (pt.econ >= 0 ? 'Right' : 'Left') : 'Not scored', dirS = nS ? (pt.soc >= 0 ? 'Authoritarian' : 'Libertarian') : 'Not scored';
  const eT = pullTotals('econ'), sT = pullTotals('soc');
  const showFriend = own && FRIEND;
  const savedName = (() => { try { return localStorage.getItem(NAME_STORE) || ''; } catch { return ''; } })();

  $app.innerHTML = `
  ${own ? '' : `<div class="card banner noprint"><div><b>You're viewing ${R.name ? esc(R.name) + "'s" : 'a'} shared result.</b> On this page, “you” refers to ${R.name ? esc(R.name) : 'the person who shared it'}. Nothing here is saved to your browser.</div>
    <div class="row" style="margin-top:10px">
      ${S && S.finished ? `<button id="sh-compare">Compare with my results</button><button class="ghost" id="sh-mine">See my results</button>` : `<button id="sh-take">Take the test yourself</button>`}
    </div></div>`}
  <h1>${own ? 'Your results' : esc(R.name ? R.name + "'s results" : 'Shared results')}</h1>
  ${isQuick ? `<div class="card banner noprint"><b>${own ? 'You took' : 'This is from'} the quick test (${QS.length} statements).</b>
    It's balanced the same way as the full test, but with half the statements the result is less precise.
    ${own ? `<div class="row" style="margin-top:10px"><button id="go-full">Answer the other ${QUESTIONS.length - QS.length} for the full result</button></div>` : ''}</div>` : ''}
  <nav class="rnav noprint" id="rnav" aria-label="Results sections">${[
      ['overview', 'Overview'], ...(showFriend ? [['compare', 'Compare']] : []), ['figs', 'Figures'], ['topics', 'Topics'],
      ['moved', 'What moved it'], ['style', 'Answer style'], ['consistency', 'Consistency'], ...(own ? [['timing', 'Timing']] : []),
      ['answers', 'Every answer'],
    ].map(([id, l]) => `<a href="#${id}" data-sec="${id}">${l}</a>`).join('')}</nav>
  <div class="hero" id="overview">
    <div class="card" style="margin-top:0"><div id="compass-wrap"></div>
      <div class="figpick noprint">
        <div class="figpick-bar">
          <b>Figures on chart</b>
          <select id="fp-kind"><option value="">All types</option>${Object.entries(KIND_LABEL).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select>
          <input id="fp-text" placeholder="Filter names…">
          <button class="ghost sm" id="fp-near">5 closest</button>
          <button class="ghost sm" id="fp-all">All listed</button>
          <button class="ghost sm" id="fp-none">None</button>
          <span id="fp-count" class="muted small"></span>
        </div>
        <div id="fp-list" class="figpick-list"></div>
      </div>
      <div class="legend"><span><span class="dot" style="background:#111;box-shadow:0 0 0 2px #fff,0 0 0 4px rgba(17,17,17,.35)"></span>${own ? 'You' : esc(R.name || 'Shared result')}</span>${showFriend ? `<span><span class="dot ring"></span>${esc(friendName())}</span>` : ''}</div></div>
    <div>
      <div class="card" style="margin-top:0">
        <div class="big">${quad}</div>
        <p class="muted">${!nE ? 'Economic views not scored (all “Don’t know”)' : describe(pt.econ) === 'near the center' ? 'Economically near the center' : 'Economically <b>' + describe(pt.econ) + ' ' + (pt.econ >= 0 ? 'right' : 'left') + '</b>'},
        ${!nS ? 'social views not scored (all “Don’t know”)' : describe(pt.soc) === 'near the center' ? 'socially near the center' : 'socially <b>' + describe(pt.soc) + ' ' + (pt.soc >= 0 ? 'authoritarian' : 'libertarian') + '</b>'}.</p>
        <div class="score-row">
          <div class="score"><small>Economic</small><b>${nE ? fmt(pt.econ) : 'n/a'}</b><small>${dirE} · ${nE} counted${skipE ? ` · ${skipE} don't know` : ''}</small></div>
          <div class="score"><small>Social</small><b>${nS ? fmt(pt.soc) : 'n/a'}</b><small>${dirS} · ${nS} counted${skipS ? ` · ${skipS} don't know` : ''}</small></div>
        </div>
        <p class="small muted">Scale −10 to +10. Each score = (sum of directional answers) ÷ (2 × statements counted) × 10, so ±10 means strongly agreeing with every statement in one direction. “Don't know” answers aren't counted.</p>
        <div class="row noprint">
          <button id="x-img">Save as image</button><button class="ghost" id="x-copy">Copy summary</button>
        </div>
        ${own ? `<div class="row noprint" style="margin-top:8px"><button class="ghost" id="x-new">Retake test</button></div>` : ''}
      </div>
      <div class="card">
        <h2>Consistency score</h2>
        <div class="big">${consistency === null ? 'n/a' : consistency.toFixed(0) + '%'} <span class="pill ${cLabel[0]}">${cLabel[1]}</span></div>
        <p class="small muted">Based on ${judged.length} pairs of opposite statements${nSkipPairs ? ` (${nSkipPairs} skipped because of “Don't know”)` : ''}. Answering opposites on opposite sides costs points in proportion to how strongly you did so; neutral answers never cost anything.</p>
      </div>
      ${own ? `<div class="card noprint" id="share-card">
        <h2>Share &amp; compare</h2>
        <label class="small muted" for="sh-name">Name to show on your link (optional)</label>
        <div class="row"><input id="sh-name" class="txt" maxlength="40" placeholder="e.g. Sam" value="${esc(savedName)}"></div>
        <div class="row" style="margin-top:8px"><input id="sh-link" class="txt" readonly><button id="sh-copy">Copy link</button></div>
        <p class="small muted">The link contains your answers (not your timings). Anyone with it can see this results page.</p>
        <h3>Compare with a friend</h3>
        ${showFriend ? `<p class="small">Comparing with <b>${esc(friendName())}</b>. <button class="ghost sm" id="cmp-clear">Remove comparison</button></p>` : ''}
        <div class="row"><input id="cmp-link" class="txt" placeholder="Paste their share link"><button class="ghost" id="cmp-go">Compare</button></div>
        <p class="small" id="cmp-err" style="color:#991b1b"></p>
      </div>` : ''}
    </div>
  </div>

  ${showFriend ? compareCard(pt, A, FRIEND) : ''}

  ${figuresCard()}

  <div class="card" id="topics"><h2>Scores by topic</h2>
    <p class="small muted">Each topic is scored on the same −10…+10 scale from its ${isQuick ? '4' : '8'} statements (minus any “Don't know”).</p>
    ${['econ', 'soc'].map(ax => `
      <h3>${AXES[ax].name} axis</h3>
      <div class="axislab"><span>← ${AXES[ax].negShort}</span><span>${AXES[ax].posShort} →</span></div>
      ${catScores.filter(s => s.c.axis === ax).map(s => topicBar(s.c.name, s.v, ax, s.n < s.asked ? `${s.n} of ${s.asked} counted` : '')).join('')}`).join('')}
  </div>

  <div class="grid2" id="moved">
    <div class="card"><h2>What moved the economic score</h2>
      <p class="small">Points toward Right: <b>+${eT.pos.toFixed(2)}</b> (${eT.nPos} answers) · toward Left: <b>${fmtS(eT.neg)}</b> (${eT.nNeg} answers) · neutral: ${eT.nZero}${skipE ? ` · don't know: ${skipE}` : ''}. Net = ${fmt(pt.econ)}.</p>
      <h3>Biggest pulls to the Right</h3>${pullList(topList('econ', +1))}
      <h3>Biggest pulls to the Left</h3>${pullList(topList('econ', -1))}</div>
    <div class="card"><h2>What moved the social score</h2>
      <p class="small">Points toward Authoritarian: <b>+${sT.pos.toFixed(2)}</b> (${sT.nPos} answers) · toward Libertarian: <b>${fmtS(sT.neg)}</b> (${sT.nNeg} answers) · neutral: ${sT.nZero}${skipS ? ` · don't know: ${skipS}` : ''}. Net = ${fmt(pt.soc)}.</p>
      <h3>Biggest pulls to Authoritarian</h3>${pullList(topList('soc', +1))}
      <h3>Biggest pulls to Libertarian</h3>${pullList(topList('soc', -1))}</div>
  </div>

  <div class="card" id="style"><h2>How ${own ? 'you' : 'they'} answered</h2>
    <div class="row small muted" style="gap:14px">${LABELS6.map((l, i) => `<span><span class="dot c${i}"></span>${l}</span>`).join('')}</div>
    ${stack(dAll, 'All statements')}${stack(dE, 'Economic statements')}${stack(dS, 'Social statements')}
    <p class="small">Agreed with <b>${agreeN}</b> and disagreed with <b>${disN}</b> statements (${dAll[2]} neutral, ${skipN} don't know). Because exactly half of all statements point each way, a habit of agreeing (or disagreeing) with everything cancels out rather than moving the position — ${Math.abs(agreeN - disN) > 20 ? 'this result leans noticeably toward ' + (agreeN > disN ? 'agreement' : 'disagreement') + ', which the design neutralizes.' : 'the agree/disagree balance here is even.'}</p>
    <p class="small">Strong opinions (“strongly” either way): <b>${strongN}</b> of ${nKnown} counted answers (${nKnown ? (strongN / nKnown * 100).toFixed(0) : 0}%). Average intensity: <b>${avgExtremity.toFixed(2)}</b> of 2.00.</p>
  </div>

  <div class="card" id="consistency"><h2>Consistency check</h2>
    <p class="small">${pairRows.length} pairs of statements are logical opposites (e.g. “free healthcare” vs. “pay for your own”). Opposite statements should get opposite answers. <span class="pill ${nBad ? 'bad' : nWarn ? 'warn' : 'ok'}">${nBad} conflicting · ${nWarn} mild tension · ${judged.length - nBad - nWarn} consistent${nSkipPairs ? ` · ${nSkipPairs} skipped` : ''}</span></p>
    <div class="tw"><table><tr><th>Statement A</th><th>Answer</th><th>Statement B</th><th>Answer</th><th></th></tr>
    ${pairRows.map(p => `<tr><td>${esc(p.a.t)}</td><td>${labelOf(A[p.a.id].v)}</td><td>${esc(p.b.t)}</td><td>${labelOf(A[p.b.id].v)}</td><td><span class="pill ${p.status}">${{ ok: 'consistent', warn: 'tension', bad: 'conflict', skip: 'skipped' }[p.status]}</span></td></tr>`).join('')}
    </table></div>
  </div>

  ${own ? `<div class="card" id="timing"><h2>Timing &amp; hesitation</h2>
    <p class="small">Total time on statements: <b>${dur(totalMs)}</b> · median per statement: <b>${(medMs / 1000).toFixed(1)}s</b> · answers changed: <b>${changes}</b></p>
    <div class="grid2"><div><h3>Longest deliberation</h3><ul class="clean">${slow.map(t => `<li><span>${esc(t.q.t)}</span><span>${(t.ms / 1000).toFixed(1)}s</span></li>`).join('')}</ul></div>
    <div><h3>Fastest answers</h3><ul class="clean">${fast.map(t => `<li><span>${esc(t.q.t)}</span><span>${(t.ms / 1000).toFixed(1)}s</span></li>`).join('')}</ul></div></div>
    <h3>Time by section</h3>
    <ul class="clean">${SECTIONS.map((sc, i) => { const ts = times.filter(t => t.q.sec === i); return `<li><span>${i + 1}. ${esc(sc.title)} <span class="muted">(${ts.length} statements)</span></span><span>${dur(ts.reduce((a, t) => a + t.ms, 0))} · ${(median(ts.map(t => t.ms)) / 1000).toFixed(1)}s median</span></li>`; }).join('')}</ul>
    <p class="small muted">Fast “snap” answers and long hesitations can both flag statements where your view may be less settled.</p>
  </div>` : ''}

  <div class="card" id="answers"><h2>Every answer</h2>
    <p class="small muted">${own ? 'Change any answer here and everything above recalculates. ' : ''}“Points” is how many axis points that answer contributed (positive = Right on economic statements, Authoritarian on social statements; negative = Left or Libertarian). “Don't know” contributes nothing.</p>
    <div class="filters noprint">
      <select id="f-axis"><option value="">All axes</option><option value="econ">Economic</option><option value="soc">Social</option></select>
      <select id="f-sec"><option value="">All sections</option>${SECTIONS.map((sc, i) => `<option value="${i}">${sc.title}</option>`).join('')}</select>
      <select id="f-cat"><option value="">All topics</option>${CATS.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}</select>
      <input id="f-text" placeholder="Search statements…" value="${esc(tableState.text)}">
    </div>
    <div class="tw"><table id="ans-table"></table></div>
  </div>`;

  // wire up
  const $ = id => document.getElementById(id);
  $('x-img').onclick = () => saveImage(pt, quad, nE, nS);
  $('x-copy').onclick = () => {
    const txt = `${quad}\nEconomic: ${fmt(pt.econ)} (${pt.econ >= 0 ? 'Right' : 'Left'})\nSocial: ${fmt(pt.soc)} (${pt.soc >= 0 ? 'Authoritarian' : 'Libertarian'})\n` + catScores.map(s => `${s.c.name}: ${s.v === null ? 'n/a' : fmt(s.v, 1)}`).join('\n');
    copyText(txt, $('x-copy'));
  };
  if (own && $('go-full')) $('go-full').onclick = () => {
    // keep every answer; add the remaining statements, grouped by section and shuffled within each
    const rest = QUESTIONS.filter(q => !S.order.includes(q.id));
    S.order = S.order.concat(SECTIONS.flatMap((sc, i) => shuffle(rest.filter(q => q.sec === i).map(q => q.id))));
    S.mode = 'full'; S.finished = null; S.secShown = -1;
    S.idx = S.order.findIndex(id => !S.answers[id]); save(); quiz(); window.scrollTo(0, 0);
  };
  if (own) {
    $('x-new').onclick = () => { if (confirm('Discard these answers and retake the test?')) startNew(); };
    const refreshLink = () => { $('sh-link').value = shareURL(S.answers, $('sh-name').value.trim()); };
    $('sh-name').oninput = () => { try { localStorage.setItem(NAME_STORE, $('sh-name').value.trim()); } catch {} refreshLink(); };
    $('sh-copy').onclick = () => copyText($('sh-link').value, $('sh-copy'), $('sh-link'));
    $('sh-link').onfocus = e => e.target.select();
    refreshLink();
    $('cmp-go').onclick = () => {
      const f = parseShare($('cmp-link').value.trim());
      if (!f) { $('cmp-err').textContent = 'That doesn\'t look like a share link from this test.'; return; }
      if (f.error) { $('cmp-err').textContent = f.error; return; }
      setFriend(f); rerenderKeepScroll();
    };
    if ($('cmp-clear')) $('cmp-clear').onclick = () => { setFriend(null); rerenderKeepScroll(); };
  } else {
    const on = (id, fn) => { if ($(id)) $(id).onclick = fn; };
    on('sh-take', () => { clearHash(); if (S && S.started && !S.finished) quiz(); else startNew(); });
    on('sh-mine', () => { clearHash(); results(); window.scrollTo(0, 0); });
    on('sh-compare', () => { setFriend({ answers: R.answers, name: R.name, code: R.code }); clearHash(); results(); window.scrollTo(0, 0); });
  }
  for (const [id, key] of [['f-axis', 'axis'], ['f-sec', 'sec'], ['f-cat', 'cat'], ['f-text', 'text']]) {
    const el = $(id); el.value = tableState[key];
    el.oninput = () => { tableState[key] = el.value; drawTable(); };
  }
  drawTable();
  initFigures(pt);
  initResultsNav();
}
function initResultsNav() {
  const nav = document.getElementById('rnav'); if (!nav) return;
  const links = [...nav.querySelectorAll('a')];
  nav.onclick = e => {
    const a = e.target.closest('a'); if (!a) return;
    e.preventDefault();                                   // keep the URL hash free for share links
    document.getElementById(a.dataset.sec)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const setActive = id => links.forEach(l => {
    const on = l.dataset.sec === id; l.classList.toggle('on', on);
    if (on) l.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  });
  if (window._rnavObs) window._rnavObs.disconnect();
  const seen = new Map();
  window._rnavObs = new IntersectionObserver(entries => {
    entries.forEach(en => seen.set(en.target.id, en.isIntersecting ? en.boundingClientRect.top : null));
    const visible = links.map(l => [l.dataset.sec, seen.get(l.dataset.sec)]).filter(([, t]) => t !== null && t !== undefined);
    if (visible.length) setActive(visible.sort((a, b) => Math.abs(a[1] - 110) - Math.abs(b[1] - 110))[0][0]);
  }, { rootMargin: '-100px 0px -55% 0px' });
  links.forEach(l => { const el = document.getElementById(l.dataset.sec); if (el) window._rnavObs.observe(el); });
  setActive('overview');
}
/* ---------------- save as image ---------------- */
// Builds a 1080x1350 PNG (portrait, suits social posts): wordmark, result, the chart as currently set up
// (chosen figures + any friend comparison), and the site address.
async function saveImage(pt, quad, nE, nS) {
  const btn = document.getElementById('x-img'), label = btn.textContent;
  btn.disabled = true; btn.textContent = 'Preparing…';
  try {
    const W = 1080, H = 1350, SCALE = 2, CHART_W = 1000, CHART_H = Math.round(CHART_W * 540 / 620);
    const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
    // chart at desktop label size (the size the no-shift rule is checked at), with CSS colors resolved
    const picked = figsWithDist(pt).filter(f => figState.sel.has(f.name)).sort((a, b) => a.dist - b.dist);
    let friend = null;
    if (R.own && FRIEND) { const fp = scoreOf(null, FRIEND.answers); friend = { econ: fp.econ, soc: fp.soc, name: friendName() }; }
    const css = getComputedStyle(document.documentElement);
    let svg = compassSVG(pt.econ, pt.soc, picked, friend, { width: CHART_W });
    svg = svg.replace(/var\(--(\w+)\)/g, (m, v) => css.getPropertyValue('--' + v).trim() || '#ccc')
             .replace(' width="100%"', '')        // a standalone SVG needs one fixed size (duplicate attributes are invalid)
             .replace('<svg ', `<svg xmlns="http://www.w3.org/2000/svg" width="${CHART_W}" height="${CHART_H}" font-family='${FONT}' `);
    const loadImg = src => new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = src; });
    const [chart, logo] = await Promise.all([
      loadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)),
      loadImg(document.querySelector('.wm-o').src),
    ]);
    const cv = document.createElement('canvas'); cv.width = W * SCALE; cv.height = H * SCALE;
    const c = cv.getContext('2d'); c.scale(SCALE, SCALE);
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, W, H);
    // wordmark: P + mark + larity
    c.fillStyle = '#1d1f24'; c.textBaseline = 'alphabetic';
    c.font = `800 46px ${FONT}`;
    let x = 40; const base = 84;
    c.fillText('P', x, base); x += c.measureText('P').width + 1;
    c.drawImage(logo, x, base - 29, 30, 30); x += 32;
    c.fillText('larity', x, base);
    // result
    const who = R.own ? '' : (R.name ? `${R.name}'s result` : 'Shared result');
    if (who) { c.font = `600 26px ${FONT}`; c.fillStyle = '#6b7280'; c.fillText(who, 40, 140); }
    c.fillStyle = '#1d1f24'; c.font = `800 60px ${FONT}`;
    c.fillText(quad, 40, who ? 200 : 180);
    c.font = `500 30px ${FONT}`; c.fillStyle = '#374151';
    const line = `Economic ${nE ? fmt(pt.econ) : 'n/a'}${nE ? (pt.econ >= 0 ? ' Right' : ' Left') : ''}     Social ${nS ? fmt(pt.soc) : 'n/a'}${nS ? (pt.soc >= 0 ? ' Authoritarian' : ' Libertarian') : ''}`;
    c.fillText(line, 40, who ? 248 : 228);
    // chart
    const chartY = 280;
    c.drawImage(chart, (W - CHART_W) / 2, chartY, CHART_W, CHART_H);
    // legend + footer
    const fy = chartY + CHART_H + 40;
    c.font = `500 24px ${FONT}`; c.fillStyle = '#1d1f24';
    c.beginPath(); c.arc(52, fy - 8, 9, 0, Math.PI * 2); c.fill();
    c.fillText(R.own ? 'You' : (R.name || 'Result'), 70, fy);
    if (friend) {
      const lx = 70 + c.measureText(R.own ? 'You' : 'Result').width + 40;
      c.lineWidth = 3; c.strokeStyle = '#1d1f24'; c.beginPath(); c.arc(lx, fy - 8, 8, 0, Math.PI * 2); c.stroke();
      c.fillText(friend.name, lx + 18, fy);
    }
    c.font = `400 20px ${FONT}`; c.fillStyle = '#6b7280';
    c.fillText('Figure positions are rough estimates.', 40, H - 40);
    const site = (location.host + location.pathname.replace(/index\.html$/, '')).replace(/\/$/, '');
    c.font = `600 24px ${FONT}`; c.fillStyle = '#1d1f24'; c.textAlign = 'right';
    c.fillText(`Take the test: ${site}`, W - 40, H - 40);
    await new Promise(done => cv.toBlob(blob => {
      const url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = 'polarity-result.png'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); done();
    }, 'image/png'));
    btn.textContent = 'Saved';
  } catch (e) {
    btn.textContent = 'Could not create image';
    console.error('saveImage failed', e);
  }
  setTimeout(() => { btn.textContent = label; btn.disabled = false; }, 1800);
}
function rerenderKeepScroll() { const y = window.scrollY; results(); window.scrollTo(0, y); }
function copyText(text, btn, fallbackInput) {
  const done = ok => { const old = btn.dataset.label || btn.textContent; btn.dataset.label = old; btn.textContent = ok ? 'Copied' : 'Press Ctrl+C'; setTimeout(() => btn.textContent = old, 1600); };
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(() => done(true), () => { fallbackInput && fallbackInput.select(); done(false); });
  else { if (fallbackInput) fallbackInput.select(); done(false); }
}

// one row of a diverging topic bar; v may be null (all "Don't know")
function topicBar(name, v, ax, note) {
  const col = ax === 'econ' ? (v >= 0 ? 'var(--right)' : 'var(--left)') : (v >= 0 ? 'var(--auth)' : 'var(--lib)');
  return `<div class="dbar"><span>${esc(name)}${note ? ` <span class="muted small">(${note})</span>` : ''}</span>
    <div class="dtrack">${v === null ? '' : `<div class="dfill" style="${v >= 0 ? 'left:50%' : 'right:50%'};width:${Math.abs(v) * 5}%;background:${col}"></div>`}</div>
    <span class="dval">${v === null ? 'n/a' : fmt(v, 1)}</span></div>`;
}

/* ---------------- compare with a friend ---------------- */
function compareCard(pt, A, F) {
  const fp = scoreOf(null, F.answers), name = esc(friendName());
  const both = QUESTIONS.filter(q => known(A[q.id]) && known(F.answers[q.id]))
    .map(q => ({ q, u: A[q.id].v, f: F.answers[q.id].v }));
  const sameSide = both.filter(r => Math.sign(r.u) === Math.sign(r.f)).length;
  const opposite = both.filter(r => r.u * r.f < 0).length;
  const gaps = both.filter(r => Math.abs(r.u - r.f) >= 2).sort((a, b) => Math.abs(b.u - b.f) - Math.abs(a.u - a.f)).slice(0, 8);
  const shared = both.filter(r => r.u * r.f >= 2).sort((a, b) => b.u * b.f - a.u * a.f).slice(0, 6);
  const dist = Math.hypot(pt.econ - fp.econ, pt.soc - fp.soc);
  const row = r => `<li><span>${esc(r.q.t)}<br><span class="muted">You: ${labelOf(r.u)} · ${name}: ${labelOf(r.f)}</span></span></li>`;
  const pairBar = (c, ax) => {
    const you = scoreOf(q => q.cat === c.id, A), them = scoreOf(q => q.cat === c.id, F.answers);
    const v1 = (ax === 'econ' ? you.nE : you.nS) ? you[ax] : null, v2 = (ax === 'econ' ? them.nE : them.nS) ? them[ax] : null;
    return `<div class="cmp-topic"><div class="small"><b>${esc(c.name)}</b></div>
      ${topicBar('You', v1, ax)}${topicBar(friendName(), v2, ax)}</div>`;
  };
  return `<div class="card" id="compare"><h2>You vs. ${name}</h2>
    <div class="score-row">
      <div class="score"><small>You</small><b>${fmt(pt.econ, 1)}, ${fmt(pt.soc, 1)}</b><small>${quadrant(pt.econ, pt.soc)}</small></div>
      <div class="score"><small>${name}</small><b>${fmt(fp.econ, 1)}, ${fmt(fp.soc, 1)}</b><small>${quadrant(fp.econ, fp.soc)}</small></div>
      <div class="score"><small>Distance apart</small><b>${dist.toFixed(1)}</b><small>on the −10…+10 grid</small></div>
    </div>
    <p class="small">Of the <b>${both.length}</b> statements you both had a view on, you landed on the same side of <b>${sameSide}</b> (${both.length ? Math.round(sameSide / both.length * 100) : 0}%) and on opposite sides of <b>${opposite}</b>.</p>
    <div class="grid2">
      <div><h3>Biggest disagreements</h3>${gaps.length ? `<ul class="clean cmp-list">${gaps.map(row).join('')}</ul>` : '<p class="small muted">None — no statement more than one step apart.</p>'}</div>
      <div><h3>Strongest shared views</h3>${shared.length ? `<ul class="clean cmp-list">${shared.map(row).join('')}</ul>` : '<p class="small muted">No strongly shared views.</p>'}</div>
    </div>
    <details><summary>Topic by topic</summary>
      ${['econ', 'soc'].map(ax => `<h3>${AXES[ax].name} axis</h3><div class="axislab"><span>← ${AXES[ax].negShort}</span><span>${AXES[ax].posShort} →</span></div>${CATS.filter(c => c.axis === ax).map(c => pairBar(c, ax)).join('')}`).join('')}
    </details>
  </div>`;
}

/* ---------------- political figures ---------------- */
const FIG_STORE = 'compass-detailed-figs';
const figState = { quad: '', text: '', sort: 'dist', dir: 1, pick: '', kind: '',
  // no saved choice yet -> best-known defaults; a saved choice (even "None") is respected
  sel: new Set((() => { try { const v = JSON.parse(localStorage.getItem(FIG_STORE)); return Array.isArray(v) ? v : DEFAULT_FIGURES; } catch { return DEFAULT_FIGURES; } })()) };
const saveSel = () => { figState.custom = true; try { localStorage.setItem(FIG_STORE, JSON.stringify([...figState.sel])); } catch {} };
figState.custom = (() => { try { return Array.isArray(JSON.parse(localStorage.getItem(FIG_STORE))); } catch { return false; } })();
// Largest set of default figures (taken in priority order) whose labels all sit beside their dots at this
// on-screen width. Label collisions don't depend on where a result lands (result dots aren't obstacles),
// so one check per width covers every result. On desktop this is normally the whole default list.
const _fitCache = {};
function fittedDefaults(width) {
  const w = Math.round(width || 0);
  if (_fitCache[w]) return _fitCache[w];
  const figs = DEFAULT_FIGURES.map(n => FIGURES.find(f => f.name === n)).filter(Boolean);
  const kept = [];
  for (const f of figs) {
    compassSVG(null, null, [...kept, f], null, { width: w });
    if (!compassSVG.lastMoved.length) kept.push(f);
  }
  return (_fitCache[w] = kept.map(f => f.name));
}
function applyDefaultsForWidth() {
  if (figState.custom) return false;
  const wrap = document.getElementById('compass-wrap');
  figState.sel = new Set(fittedDefaults(wrap && wrap.clientWidth));
  return true;
}
function figuresCard() {
  return `<div class="card" id="figs"><h2>Political figures</h2>
    <p class="small muted"><b>Positions are rough editorial estimates, not measurements.</b> They are not derived from this test's questions, and many figures shifted over their careers. Distance is the straight-line gap between this result and theirs on the −10…+10 grid (the maximum possible is about 28). Edit <code>figures.js</code> to correct any placement.</p>
    <div class="filters noprint">
      <select id="fg-quad"><option value="">All quadrants</option>${['Authoritarian Left', 'Authoritarian Right', 'Libertarian Left', 'Libertarian Right'].map(q => `<option>${q}</option>`).join('')}</select>
      <input id="fg-text" placeholder="Search names…">
    </div>
    <div class="grid2"><div><h3>Closest</h3><div id="fg-near"></div></div><div><h3>Furthest</h3><div id="fg-far"></div></div></div>
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
    const a = R && R.answers[q.id], p = figPredict(f, q);
    if (!known(a) || !a.v || !p) continue;                      // don't know / neutral, or no guess
    const u = a.v;
    const row = { q, u, p, w: Math.abs(u) * Math.abs(p.v) + (p.manual ? 100 : 0) };
    (u * p.v > 0 ? same : diff).push(row);
  }
  const top = a => a.sort((x, y) => y.w - x.w).slice(0, 5);
  return { same: top(same), diff: top(diff), nSame: same.length, nDiff: diff.length };
}
const ans = v => v >= 1.4 ? 'Strongly agree' : v > 0 ? 'Agree' : v <= -1.4 ? 'Strongly disagree' : 'Disagree';
function popHTML(f) {
  const c = figCompare(f), quad = quadrant(f.econ, f.soc);
  const who = R && !R.own ? esc(R.name || 'They') : 'You';
  const short = esc(f.name.split(' ').length > 1 ? f.name.split(' ').slice(-1)[0] : f.name);
  const item = r => `<li>${esc(r.q.t)}<br><span class="muted">${who}: ${ans(r.u)} · ${short}: ${ans(r.p.v)}${r.p.manual ? ' ★' : ' (inferred)'}</span></li>`;
  const why = (typeof FIGURE_WHY !== 'undefined' && FIGURE_WHY[f.name]) || '';
  const head = `<b>${esc(f.name)}</b><div class="muted small">${KIND_LABEL[f.kind]} · ${quad} · est. ${fmt(f.econ, 1)} econ, ${fmt(f.soc, 1)} social</div>${why ? `<p class="why"><b>Why here:</b> ${esc(why)}</p>` : ''}`;
  if (!c.nSame && !c.nDiff) {
    const central = Math.abs(f.econ) < 2 && Math.abs(f.soc) < 2;
    return head + `<p class="small" style="margin-top:8px">${central
      ? `${esc(f.name)} sits too close to the center to infer specific views from position alone, and no stances have been set manually yet.`
      : 'No overlap to show: the statements this figure has a clear lean on are ones answered neutral or “Don\'t know”.'}</p>
      <div class="muted small">Specific stances can be added in figures.js (FIG_STANCES_RAW).</div>`;
  }
  return head + `
    <h4 class="ok">Likely to agree <span class="muted">(${c.nSame} statements)</span></h4><ul>${c.same.map(item).join('') || '<li class="muted">Nothing clear.</li>'}</ul>
    <h4 class="bad">Likely to disagree <span class="muted">(${c.nDiff} statements)</span></h4><ul>${c.diff.map(item).join('') || '<li class="muted">Nothing clear.</li>'}</ul>
    <div class="muted small">★ = documented stance. Everything else is inferred from the estimated position.</div>`;
}
let popEl, popFor = null;
function showPop(target, x, y) {
  const f = FIGURES.find(f => f.name === target.dataset.fig); if (!f) return;
  if (!popEl) { popEl = document.createElement('div'); popEl.id = 'fig-pop'; document.body.appendChild(popEl); }
  if (popFor !== f.name || popEl.style.display !== 'block') popEl.innerHTML = popHTML(f);
  popFor = f.name; popEl.style.display = 'block';
  const r = popEl.getBoundingClientRect();
  popEl.style.left = Math.max(8, Math.min(x + 14, innerWidth - r.width - 8)) + 'px';
  popEl.style.top = (y + 16 + r.height > innerHeight ? Math.max(8, y - r.height - 12) : y + 16) + 'px';
}
const hidePop = () => { if (popEl) popEl.style.display = 'none'; popFor = null; };
// Mouse: hover. Touch screens (no hover): tap a name or dot to open, tap anywhere else to close.
// In the picker, tapping a name toggles its checkbox instead.
const touchMode = matchMedia('(hover: none)').matches;
if (!touchMode) {
  document.addEventListener('mouseover', e => { const t = e.target.closest?.('[data-fig]'); if (t) showPop(t, e.clientX, e.clientY); });
  document.addEventListener('mousemove', e => { const t = e.target.closest?.('[data-fig]'); if (t && popEl && popEl.style.display === 'block') showPop(t, e.clientX, e.clientY); });
  document.addEventListener('mouseout', e => { if (e.target.closest?.('[data-fig]')) hidePop(); });
  document.addEventListener('focusin', e => { const t = e.target.closest?.('[data-fig]'); if (t) { const b = t.getBoundingClientRect(); showPop(t, b.left, b.bottom - 16); } });
  document.addEventListener('focusout', hidePop);
} else {
  document.addEventListener('click', e => {
    const t = e.target.closest?.('[data-fig]');
    if (t && !t.closest('.fp-item')) {
      if (popFor === t.dataset.fig && popEl.style.display === 'block') return hidePop();
      const b = t.getBoundingClientRect(); showPop(t, Math.max(0, b.left - 14), b.bottom - 8);
    } else hidePop();
  });
  window.addEventListener('scroll', hidePop, { passive: true });
}

function initFigures(pt) {
  const $ = id => document.getElementById(id);
  applyDefaultsForWidth();
  window.onresize = (() => { let t; return () => { clearTimeout(t); t = setTimeout(() => { if (document.getElementById('fp-list') && applyDefaultsForWidth()) { drawPicker(pt); drawChartFigs(pt); } }, 250); }; })();
  $('fg-quad').value = figState.quad; $('fg-text').value = figState.text; $('fp-text').value = figState.pick; $('fp-kind').value = figState.kind;
  $('fp-kind').onchange = e => { figState.kind = e.target.value; drawPicker(pt); };
  $('fp-text').oninput = e => { figState.pick = e.target.value; drawPicker(pt); };
  $('fp-near').onclick = () => { figState.sel = new Set(figsWithDist(pt).sort((a, b) => a.dist - b.dist).slice(0, 5).map(f => f.name)); saveSel(); drawPicker(pt); drawChartFigs(pt); };
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
  let friend = null;
  if (R && R.own && FRIEND) { const fp = scoreOf(null, FRIEND.answers); friend = { econ: fp.econ, soc: fp.soc, name: friendName() }; }
  document.getElementById('compass-wrap').innerHTML = compassSVG(pt.econ, pt.soc, picked, friend);
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
  t.innerHTML = `<tr>${th('name', 'Figure')}${th('kind', 'Type')}${th('quad', 'Quadrant (est.)')}${th('econ', 'Economic')}${th('soc', 'Social')}${th('dist', 'Distance')}</tr>` +
    rows.map(f => `<tr><td>${fname(f.name)}</td><td class="small muted">${KIND_LABEL[f.kind]}</td><td><span class="tag">${f.quad}</span></td><td>${fmt(f.econ, 1)}</td><td>${fmt(f.soc, 1)}</td><td>${f.dist.toFixed(1)}</td></tr>`).join('') +
    (rows.length ? '' : '<tr><td colspan="6" class="muted">No matching figures.</td></tr>');
  t.querySelectorAll('th[data-sort]').forEach(h => h.onclick = () => { if (figState.sort === h.dataset.sort) figState.dir *= -1; else { figState.sort = h.dataset.sort; figState.dir = 1; } drawFigures(pt); });
}

function pullList(list) {
  if (!list.length) return '<p class="small muted">None.</p>';
  return `<ul class="clean">${list.map(c => `<li><span>${esc(c.q.t)} <span class="muted">— ${labelOf(c.a.v)}</span></span><span class="${c.pts > 0 ? 'pos' : 'neg'}-${c.q.axis[0]}">${fmt(c.pts)}</span></li>`).join('')}</ul>`;
}

function drawTable() {
  const A = R.answers, t = tableState, own = R.own;
  const nE = QUESTIONS.filter(q => q.axis === 'econ' && known(A[q.id])).length;
  const nS = QUESTIONS.filter(q => q.axis === 'soc' && known(A[q.id])).length;
  let rows = QUESTIONS.filter(q => A[q.id]).map(q => {
    const a = A[q.id], e = known(a) ? eff(q, a.v) : null;
    return { q, a, e, pts: e === null ? null : e * 5 / (q.axis === 'econ' ? nE : nS) };
  }).filter(r => (!t.axis || r.q.axis === t.axis) && (t.sec === '' || r.q.sec === +t.sec) && (!t.cat || r.q.cat === t.cat) && (!t.text || r.q.t.toLowerCase().includes(t.text.toLowerCase())));
  const num = v => v === null ? -99 : v;
  const keys = { n: r => r.a.seq, topic: r => r.q.cat, v: r => num(r.a.v), pts: r => num(r.pts), ms: r => r.a.ms };
  const k = keys[t.sort] || keys.n;
  rows.sort((x, y) => (k(x) > k(y) ? 1 : k(x) < k(y) ? -1 : 0) * t.dir);
  const th = (key, label) => `<th data-sort="${key}">${label}${t.sort === key ? (t.dir > 0 ? ' ▲' : ' ▼') : ''}</th>`;
  const opt = (val, label, sel) => `<option value="${val}" ${sel ? 'selected' : ''}>${label}</option>`;
  const el = document.getElementById('ans-table');
  el.innerHTML = `<tr>${th('n', own ? '#asked' : '#')}<th>Statement</th>${th('topic', 'Topic')}<th>Agreeing pushes</th>${th('v', 'Answer')}${th('pts', 'Points')}${own ? th('ms', 'Time') : ''}</tr>` +
    rows.map(r => `<tr><td>${r.a.seq}</td><td${HELP[r.q.id] ? ` title="${esc(HELP[r.q.id])}"` : ''}>${esc(r.q.t)}${HELP[r.q.id] ? ' <span class="muted" aria-hidden="true">ⓘ</span>' : ''}</td><td><span class="tag">${CATBY[r.q.cat].name}</span></td>
      <td>${r.q.d > 0 ? AXES[r.q.axis].posShort : AXES[r.q.axis].negShort}</td>
      <td>${own ? `<select data-id="${r.q.id}">${LABELS.map((l, i) => opt(i - 2, l, r.a.v === i - 2)).join('')}${opt('skip', SKIP_LABEL, !known(r.a))}</select>` : labelOf(r.a.v)}</td>
      <td class="${r.pts > 0 ? 'pos-' + r.q.axis[0] : r.pts < 0 ? 'neg-' + r.q.axis[0] : ''}">${r.pts === null ? '<span class="muted">—</span>' : fmt(r.pts)}</td>${own ? `<td>${(r.a.ms / 1000).toFixed(1)}s</td>` : ''}</tr>`).join('') +
    (rows.length ? '' : '<tr><td colspan="7" class="muted">No matching statements.</td></tr>');
  el.querySelectorAll('th[data-sort]').forEach(h => h.onclick = () => { if (t.sort === h.dataset.sort) t.dir *= -1; else { t.sort = h.dataset.sort; t.dir = 1; } drawTable(); });
  if (own) el.querySelectorAll('select').forEach(s => s.onchange = () => {
    const a = A[s.dataset.id]; a.v = s.value === 'skip' ? null : +s.value; a.changes++; save();
    rerenderKeepScroll();
    document.getElementById('ans-table').scrollIntoView({ block: 'nearest' });
  });
}

// used by tests.html to check chart label placement with the real drawing code
window.PolarityTest = { compassSVG, fittedDefaults };

render();
})();
