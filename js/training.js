// Trainingsplan, Logbuch, Fortschritt und Plan-Ansicht
import { $, S, save, app, toast, esc, ic, today, fmtD, fmtS, nf, mmss, days, setBw, bwSorted, bwRate, replaceState } from './core.js';

export const PLAN = {
  A: { name: 'Training A', focus: 'Beine · Brust · Rücken · Schultern · Bauch', ex: [
    { id: 'goblet', n: 'Goblet-Kniebeuge', t: 'kg', kg: 12, lo: 8, hi: 12, sets: 3, rest: 120, one: 1, tip: 'Eine Hantel senkrecht vor der Brust halten, Brust raus, Fersen am Boden, tief in die Hocke.' },
    { id: 'floor', n: 'Floor Press', t: 'kg', kg: 8, lo: 8, hi: 12, sets: 3, rest: 120, tip: 'Rücklings auf dem Boden, Ellbogen ca. 45° vom Körper, Oberarme berühren kurz den Boden.' },
    { id: 'row1', n: 'Einarmiges Rudern', t: 'kg', kg: 10, lo: 8, hi: 12, sets: 3, rest: 90, side: 'pro Seite', tip: 'Hand und Knie auf Stuhl oder Bett, Rücken gerade, Hantel zur Hüfte ziehen.' },
    { id: 'ohp', n: 'Schulterdrücken stehend', t: 'kg', kg: 5, lo: 8, hi: 12, sets: 3, rest: 90, tip: 'Bauch und Po anspannen, kein Hohlkreuz, Hanteln senkrecht über den Kopf drücken.' },
    { id: 'plank', n: 'Plank', t: 'sec', lo: 30, hi: 45, sets: 3, rest: 60, tip: 'Unterarme unter den Schultern, Körper bildet eine Linie von Kopf bis Ferse.' }] },
  B: { name: 'Training B', focus: 'Beinrückseite · Beine · Brust · Rücken · Arme', ex: [
    { id: 'rdl', n: 'Rumänisches Kreuzheben', t: 'kg', kg: 10, lo: 8, hi: 12, sets: 3, rest: 120, tip: 'Knie leicht gebeugt, Hüfte nach hinten schieben, Hanteln nah an den Beinen, Rücken gerade.' },
    { id: 'bss', n: 'Bulgarian Split Squat', t: 'kg', kg: 6, lo: 8, hi: 10, sets: 3, rest: 90, side: 'pro Bein', tip: 'Hinterer Fuß auf einem Stuhl, vorderes Knie über dem Fuß, senkrecht absenken.' },
    { id: 'push', n: 'Liegestütze', t: 'bw', lo: 6, hi: 12, sets: 3, rest: 90, tip: 'Körper gerade, Brust bis kurz über den Boden. Zu schwer? Erst auf den Knien.' },
    { id: 'row2', n: 'Vorgebeugtes Rudern', t: 'kg', kg: 8, lo: 8, hi: 12, sets: 3, rest: 90, tip: 'Oberkörper ca. 45° vorgebeugt, Rücken gerade, beide Hanteln zum Bauch ziehen.' },
    { id: 'curl', n: 'Bizeps-Curls', t: 'kg', kg: 5, lo: 10, hi: 15, sets: 2, rest: 60, tip: 'Ellbogen bleiben am Körper, nicht schwingen, langsam ablassen.' },
    { id: 'tri', n: 'Trizeps über Kopf', t: 'kg', kg: 6, lo: 10, hi: 15, sets: 2, rest: 60, one: 1, tip: 'Eine Hantel mit beiden Händen hinter den Kopf senken, Ellbogen zeigen nach oben.' }] }
};
const STEP = 1.5;
const ALL = {}; for (const k in PLAN) for (const e of PLAN[k].ex) ALL[e.id] = e;
const tIcon = e => e.t === 'kg' ? 'db' : e.t === 'bw' ? 'body' : 'timer';

export const sorted = () => S.sessions.slice().sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id);
export const nextType = () => { const s = sorted(); return s.length && s[s.length - 1].type === 'A' ? 'B' : 'A'; };
export const weekNo = d => { const s = sorted(); return s.length ? Math.max(1, Math.floor(days(s[0].date, d || today()) / 7) + 1) : 1; };
const setsFor = (e, light, d) => { let n = e.sets; if (weekNo(d) <= 2) n = Math.min(n, 2); if (light) n = Math.max(1, n - 1); return n; };
function lastFor(id) { const s = sorted(); for (let i = s.length - 1; i >= 0; i--) if (s[i].ex[id] && s[i].ex[id].length) return s[i].ex[id]; return null; }
function suggest(e) {
  const L = lastFor(e.id);
  if (e.t === 'kg') {
    if (!L) return { kg: e.kg, r: e.lo, why: 'Startgewicht. Die letzten 2 Wdh. sollen schwer sein – sonst anpassen.' };
    const kg = Math.max(...L.map(x => x.kg)), top = L.every(x => x.r >= e.hi);
    return top ? { kg: +(kg + STEP).toFixed(2), r: e.lo, why: 'Letztes Mal alle Sätze mit ' + e.hi + ' Wdh. – heute +1,5 kg.' }
      : { kg, r: Math.min(e.hi, Math.max(...L.map(x => x.r)) + 1), why: 'Gleiches Gewicht wie letztes Mal, versuch 1 Wdh. mehr.' };
  }
  const u = e.t === 'sec' ? ' s' : ' Wdh.'; if (!L) return { r: e.lo, why: 'Start mit ' + e.lo + u + '.' };
  const b = Math.max(...L.map(x => x.r)); return { r: b + (e.t === 'sec' ? 5 : 1), why: 'Letztes Mal max. ' + b + u + ' – heute etwas mehr.' };
}
function makeDraft(type, light, date, prev) {
  const d = { type, light: !!light, date: date || today(), note: prev ? prev.note : '', bw: prev ? prev.bw : '', ex: {} };
  for (const e of PLAN[type].ex) {
    const g = suggest(e); let kg = g.kg; if (light && kg) kg = Math.round(kg * .85 * 4) / 4;
    d.ex[e.id] = Array.from({ length: setsFor(e, light, d.date) }, () => ({ kg: kg ?? 0, r: g.r, done: false }));
  }
  return d;
}
let draft = null;
try {
  const d = JSON.parse(localStorage.getItem('fp-draft') || 'null');
  if (d && PLAN[d.type] && d.ex && PLAN[d.type].ex.every(e => d.ex[e.id]) && (d.date === today() || Object.values(d.ex).some(a => a.some(x => x.done)))) draft = d;
} catch (e) { /* kein Entwurf */ }
const saveDraft = () => { try { localStorage.setItem('fp-draft', JSON.stringify(draft)); } catch (e) { /* egal */ } };

/* ---------- Training (heute) ---------- */
export function trainView() {
  if (!draft) draft = makeDraft(nextType(), false);
  const P = PLAN[draft.type], s = sorted(), last = s[s.length - 1]; let warn = '';
  if (last) {
    const g = days(last.date, draft.date);
    if (g === 0) warn = 'Heute hast du schon trainiert. Nächstes Training frühestens übermorgen.';
    else if (g === 1) warn = 'Gestern war Training. Zwischen zwei Einheiten mindestens 1 Ruhetag – heute lieber Pause.';
  }
  return `<section class="card hero hatch cut corner">
  <div class="in"><div class="hero-top"><div><p class="kick">Training · Woche ${weekNo(draft.date)}</p>
   <div style="display:flex;align-items:center;gap:12px"><span class="dia">${ic('spark')}</span><h2>${P.name}</h2></div>
   <p class="focus">${P.focus}</p></div>
  <div class="seg" role="group" aria-label="Training wählen">${['A', 'B'].map(t => `<button data-act="type" data-v="${t}" class="${draft.type === t ? 'on' : ''}" aria-pressed="${draft.type === t}">${t}</button>`).join('')}</div></div>
  ${warn ? `<p class="warn">${ic('warn')}<span>${warn}</span></p>` : ''}
  <label class="tog"><input type="checkbox" data-act="light" ${draft.light ? 'checked' : ''}><span class="sw"></span><span><b>Leichter Tag</b><span class="mut small">Muskelkater oder harter Arbeitstag: 1 Satz weniger, ca. 15 % weniger Gewicht</span></span></label></div>
  <div class="meta"><label>${ic('cal')}<span>${fmtD(draft.date)}</span></label><label><span class="lab" style="font-size:13px">Datum ändern</span><input type="date" data-act="date" value="${draft.date}" aria-label="Datum"></label></div>
  <div class="goldbar"></div>
 </section>
 <div class="sec"><p class="lab">Übungen in Reihenfolge</p><p class="hint">Nach jedem Satz abhaken</p></div>
 ${P.ex.map(exCard).join('')}
 <section class="card fin cut corner">
  <label><span class="lab">Körpergewicht heute (optional)</span><span class="unit-in"><input type="number" inputmode="decimal" step="0.1" data-act="bw" value="${esc(draft.bw)}" placeholder="65"><b>KG</b></span></label>
  <label><span class="lab">Notiz</span><textarea data-act="note" rows="2" placeholder="Wie lief's? Arbeitstag, Schlaf, Schmerzen …">${esc(draft.note)}</textarea></label>
  <button class="btn" data-act="save">${ic('save')}Einheit speichern</button>
  <p class="mut small" style="margin-top:10px">Wird auf diesem Gerät gespeichert. Zum Übertragen: Fortschritt → Daten sichern.</p>
 </section>`;
}
function exCard(e, i) {
  const sets = draft.ex[e.id], g = suggest(e), kg = e.t === 'kg';
  return `<article class="card ex cut corner ${kg ? '' : 'nokg'}">
  <div class="head hatch"><div class="tags"><span class="badge">${i + 1}</span>${ic(tIcon(e))}</div><span></span>
   <h3>${e.n}</h3><p class="tgt">${sets.length} × ${e.lo}–${e.hi}${e.t === 'sec' ? ' s' : ''}${e.side ? ' ' + e.side : ''} · Pause ${mmss(e.rest)}</p></div>
  <div class="goldbar"></div>
  <div class="body"><p class="sg">${ic('up')}<span>${esc(g.why)}${kg ? (e.one ? ' Gewicht = 1 Hantel.' : ' Gewicht pro Hantel.') : ''}</span></p>
  <div class="sets"><div class="sr hd"><span style="text-align:center">Satz</span>${kg ? '<span>kg</span>' : ''}<span>${e.t === 'sec' ? 'Sekunden' : 'Wdh.'}</span><span></span></div>
  ${sets.map((x, j) => `<div class="sr ${x.done ? 'done' : ''}"><span class="n">${j + 1}</span>${kg ? `<input type="number" inputmode="decimal" step="0.25" min="0" aria-label="${e.n}, Satz ${j + 1}, kg" data-act="kg" data-e="${e.id}" data-i="${j}" value="${x.kg}">` : ''}<input type="number" inputmode="numeric" min="0" aria-label="${e.n}, Satz ${j + 1}, ${e.t === 'sec' ? 'Sekunden' : 'Wiederholungen'}" data-act="r" data-e="${e.id}" data-i="${j}" value="${x.r}"><button class="chk" data-act="done" data-e="${e.id}" data-i="${j}" aria-pressed="${!!x.done}" aria-label="Satz ${j + 1} erledigt">${ic('check')}</button></div>`).join('')}</div>
  <div class="exf"><button class="lnk" data-act="addset" data-e="${e.id}">${ic('plus')}Satz</button>${sets.length > 1 ? `<button class="lnk" data-act="rmset" data-e="${e.id}">${ic('minus')}Satz</button>` : ''}<details class="tech"><summary>${ic('info')}Technik</summary><p>${e.tip}</p></details></div></div>
 </article>`;
}
function saveSession() {
  const ex = {}; let n = 0;
  for (const id in draft.ex) {
    const e = ALL[id]; if (!e) continue;
    const a = draft.ex[id].filter(x => +x.r > 0).map(x => e.t === 'kg' ? { kg: +x.kg || 0, r: +x.r } : { r: +x.r });
    if (a.length) { ex[id] = a; n += a.length; }
  }
  if (!n) { toast('Trag mindestens einen Satz ein.'); return; }
  S.sessions.push({ id: Date.now(), date: draft.date, type: draft.type, light: draft.light, note: String(draft.note || '').slice(0, 500), ex });
  const bw = parseFloat(String(draft.bw).replace(',', '.')); if (bw > 30 && bw < 250) setBw(draft.date, bw);
  draft = null; try { localStorage.removeItem('fp-draft'); } catch (e) { /* egal */ }
  save(); scrollTo(0, 0); app.render(); toast('Gespeichert – nächstes Mal Training ' + nextType() + '.');
}

/* ---------- Plan ---------- */
export function planView() {
  const wk = [['Mo', 'A'], ['Di', ''], ['Mi', 'B'], ['Do', ''], ['Fr', 'A'], ['Sa', ''], ['So', '']];
  const blk = k => {
    const P = PLAN[k];
    return `<section class="card cut corner"><div class="ph"><div class="t"><span class="dia">${ic('spark')}</span><div><h2 style="font-size:32px">${P.name}</h2><p class="focus" style="margin:0">${P.focus}</p></div></div></div><ol class="pl">${P.ex.map((e, i) => `<li><span class="badge">${i + 1}</span><div><h4>${e.n}</h4><p class="mut">${e.tip}</p></div><div class="pr"><span>${e.sets} × ${e.lo}–${e.hi}${e.t === 'sec' ? ' s' : ''}${e.side ? ' ' + e.side : ''}</span><span class="mut">${e.t === 'kg' ? 'Start ' + nf(e.kg) + ' kg' + (e.one ? ' (1 Hantel)' : ' pro Hand') : e.t === 'bw' ? 'Körpergewicht' : 'Halten'}</span><span class="mut">Pause ${mmss(e.rest)}</span></div></li>`).join('')}</ol></section>`;
  };
  const R = (b, t) => `<li><span><b>${b}</b> ${t}</span></li>`;
  return `<div class="sec"><p class="lab">Wochenrotation</p><p class="hint">Tage frei wählbar</p></div>
 <section class="card cut corner"><h2>So läuft deine Woche</h2>
  <div class="week">${wk.map(([d, t]) => `<div class="day ${t ? 't' : ''}">${d}<b>${t || '–'}</b></div>`).join('')}</div>
  <p class="mut">Danach wechselst du immer ab (B, A, B …). Leg die Tage, wie es zu deiner Arbeit passt, z. B. Di/Do/Sa – nur nie zwei Tage am Stück.</p>
  <ul class="rules">
   ${R('Woche 1–2:', 'nur 2 Sätze pro Übung, leichter, Technik lernen. Ab Woche 3 volle Sätze – die App stellt das automatisch ein.')}
   ${R('Richtiges Gewicht:', 'Die letzten 2 Wiederholungen sind schwer, 1–2 wären aber noch drin.')}
   ${R('Steigern:', 'Schaffst du in allen Sätzen die obere Zahl, kommt pro Hantel je eine 0,75-kg-Scheibe pro Seite dazu (+1,5 kg). Die App schlägt es dir vor.')}
   ${R('Tempo:', '2 Sekunden ablassen, kontrolliert hochdrücken.')}
   ${R('Aufwärmen:', '5 Minuten bewegen, dann 1 leichter Satz der ersten Übung.')}
   ${R('Nach hartem Arbeitstag:', 'leichter Muskelkater – „Leichter Tag“ einschalten. Gelenkschmerzen, Schwindel oder völlig platt – Pause und am nächsten Tag nachholen.')}
  </ul></section>
  <div class="sec"><p class="lab">Trainingseinheiten</p></div>
  ${blk('A')}${blk('B')}
  <div class="sec"><p class="lab">Versorgung</p></div>
  <section class="card cut corner"><div class="ph"><div class="t">${ic('food')}<h2 style="font-size:32px">Essen &amp; Erholung</h2></div></div><ul class="rules">
   ${R('Kalorien:', 'grob 2.800–3.000 kcal am Tag. 1× pro Woche morgens wiegen: +0,25–0,5 kg pro Woche passt. Ziel unter Essen anpassbar.')}
   ${R('Protein:', '105–130 g am Tag, auf 3–4 Mahlzeiten verteilt (Eier, Quark, Skyr, Milch, Hähnchen, Thunfisch, Linsen).')}
   ${R('Trinken:', '2–3 Liter Wasser.')}${R('Schlaf:', '7–9 Stunden – da wachsen die Muskeln.')}</ul></section>`;
}

/* ---------- Fortschritt ---------- */
let CH = {}, ro = null;
const score = (e, a) => e.t === 'kg' ? Math.max(...a.map(x => x.kg * (1 + x.r / 30))) : Math.max(...a.map(x => x.r));
function best(e, a) {
  if (e.t === 'kg') { let b = a[0]; for (const x of a) if (x.kg * (1 + x.r / 30) > b.kg * (1 + b.r / 30)) b = x; return nf(b.kg) + ' kg × ' + b.r; }
  const m = Math.max(...a.map(x => x.r)); return m + (e.t === 'sec' ? ' s' : ' Wdh.');
}
export function progView() {
  CH = {}; const s = sorted();
  if (!s.length) return `<div class="sec"><p class="lab">Fortschritt</p></div><section class="card hatch cut corner"><h2>Noch keine Einheiten</h2><p style="margin-top:10px">Trag dein erstes Training unter <a href="#training" style="color:var(--gold2)">Training</a> ein. Danach siehst du hier für jede Übung, wie du stärker wirst – und wie viele Wiederholungen dir bis zur nächsten Steigerung fehlen.</p></section>${bwBlock()}${dataBlock()}`;
  const cards = Object.values(ALL).map(e => {
    const pts = s.filter(x => x.ex[e.id] && x.ex[e.id].length).map(x => ({ d: x.date, v: score(e, x.ex[e.id]), lab: best(e, x.ex[e.id]), sets: x.ex[e.id] }));
    if (!pts.length) return ''; CH[e.id] = pts; const L = pts[pts.length - 1], ch = pts.length > 1 ? Math.round((L.v / pts[0].v - 1) * 100) : null;
    let bar = '';
    if (e.t === 'kg') {
      const tot = e.hi * L.sets.length, got = L.sets.reduce((a, x) => a + Math.min(x.r, e.hi), 0), miss = tot - got, pc = Math.round(got / tot * 100);
      bar = `<div class="kv"><p class="lab">Bis +1,5 kg</p><b class="${miss ? '' : 'up'}">${pc}%</b></div><div class="pity"><i style="width:${pc}%"></i></div><p class="mut small">${miss ? `Noch ${miss} Wdh. bis zur nächsten Steigerung` : 'Steigerung freigeschaltet – nächstes Mal +1,5 kg'}</p>`;
    } else {
      const pc = Math.min(100, Math.round(Math.max(...L.sets.map(x => x.r)) / e.hi * 100));
      bar = `<div class="kv"><p class="lab">Bis Zielwert</p><b>${pc}%</b></div><div class="pity ice"><i style="width:${pc}%"></i></div><p class="mut small">Ziel: ${e.hi}${e.t === 'sec' ? ' s' : ' Wdh.'} am Stück</p>`;
    }
    return `<section class="card cut corner"><div class="ph"><div class="t">${ic(tIcon(e))}<h3>${e.n}</h3></div><span class="delta${ch > 0 ? ' up' : ''}">${ch === null ? 'Erste Einheit' : (ch > 0 ? '+' : '') + ch + ' %'}</span></div>
   ${bar}<div class="fig"><svg data-ch="${e.id}" role="img" aria-label="Verlauf ${e.n}, zuletzt ${L.lab}"></svg></div></section>`;
  }).join('');
  const hist = s.slice().reverse().map(x => {
    const n = Object.values(x.ex).reduce((a, b) => a + b.length, 0);
    const li = Object.keys(x.ex).map(id => { const e = ALL[id]; if (!e) return ''; return `<li><span>${e.n}</span><span>${x.ex[id].map(z => e.t === 'kg' ? nf(z.kg) + '×' + z.r : z.r + (e.t === 'sec' ? ' s' : '')).join(' · ')}</span></li>`; }).join('');
    return `<details class="hi"><summary><b>${fmtD(x.date)} · ${x.type}</b><span>${x.light ? 'Leicht · ' : ''}${n} Sätze</span></summary><ul>${li}</ul>${x.note ? `<p class="mut" style="margin-top:6px">${esc(x.note)}</p>` : ''}<button class="lnk red" data-act="del" data-id="${x.id}">${ic('x')}Einheit löschen</button></details>`;
  }).join('');
  return `<div class="sec"><p class="lab">Kraft pro Übung</p><p class="hint">Bester Satz je Einheit</p></div>
  ${cards}${bwBlock()}
  <div class="sec"><p class="lab">Verlauf</p></div><section class="card cut corner">${hist}</section>${dataBlock()}`;
}
function bwBlock() {
  const b = bwSorted(); CH.bw = b.map(x => ({ d: x.date, v: x.kg, lab: nf(x.kg) + ' kg' }));
  const r = bwRate();
  const rate = r === null ? '' : `<p class="mut small" style="margin-top:6px">Tempo: ${r >= 0 ? '+' : ''}${nf(r.toFixed(2))} kg pro Woche – ${r < 0.2 ? 'eher zu wenig, iss etwas mehr' : r > 0.6 ? 'etwas schnell, ein bisschen weniger essen' : 'passt'}.</p>`;
  return `<div class="sec"><p class="lab">Körpergewicht</p><p class="hint">Ziel: +0,25–0,5 kg pro Woche</p></div>
 <section class="card cut corner"><div class="ph"><div class="t">${ic('scale')}<h3>Gewichtsverlauf</h3></div></div>
  ${b.length ? `<div class="fig"><svg data-ch="bw" role="img" aria-label="Verlauf Körpergewicht"></svg></div>${rate}` : '<p class="mut">Noch kein Eintrag. Am besten 1× pro Woche morgens wiegen.</p>'}
  <div class="row"><span class="unit-in"><input id="bwIn" type="number" inputmode="decimal" step="0.1" placeholder="65,0" aria-label="Körpergewicht heute in kg"><b>KG</b></span><button class="btn ghost" data-act="bwadd">${ic('plus')}Eintragen</button></div></section>`;
}
const dataBlock = () => `<details class="card cut tech"><summary>${ic('copy')}Daten sichern oder übertragen</summary><p class="mut small">Alles liegt nur auf diesem Gerät. Sichere es als Datei oder Text und importiere es auf einem anderen Gerät. Importieren ersetzt alles Aktuelle. Auch Daten aus dem alten Claude-Logbuch funktionieren.</p><div class="row" style="margin:6px 0 10px"><button class="btn ghost" data-act="dl">${ic('in')}Als Datei</button><button class="btn ghost" data-act="copy">${ic('copy')}Kopieren</button></div><textarea id="imp" rows="3" placeholder="Gesicherte Daten hier einfügen"></textarea><div class="row"><button class="btn ghost" data-act="import">${ic('in')}Importieren</button><label class="btn ghost" style="cursor:pointer">${ic('plan')}Datei wählen<input type="file" accept=".json,application/json" data-act="impfile" hidden></label></div></details>`;

function draw(svg) {
  const pts = CH[svg.dataset.ch]; if (!pts || !pts.length) return; const W = svg.clientWidth, H = svg.clientHeight; if (!W || !H) return;
  const pl = 6, pr = 6, pt = 26, pb = 20, vs = pts.map(p => p.v); let lo = Math.min(...vs), hi = Math.max(...vs); if (hi - lo < 1) { lo -= 1; hi += 1; } const pd = (hi - lo) * .12; lo -= pd; hi += pd;
  const L = pts.length - 1, X = i => L ? pl + i * (W - pl - pr) / L : W / 2, Y = v => pt + (hi - v) / (hi - lo) * (H - pt - pb);
  const line = pts.map((p, i) => X(i).toFixed(1) + ',' + Y(p.v).toFixed(1)).join(' ');
  let grid = ''; for (let k = 0; k < 4; k++) { const y = pt + k * (H - pt - pb) / 3; grid += `<line x1="0" x2="${W}" y1="${y}" y2="${y}" stroke="#2d2e35" stroke-dasharray="2 5"/>`; }
  const gid = 'g-' + svg.dataset.ch;
  svg.innerHTML = `<defs><linearGradient id="${gid}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#d4ab5a" stop-opacity=".35"/><stop offset="1" stop-color="#d4ab5a" stop-opacity="0"/></linearGradient></defs>${grid}<line x1="0" x2="${W}" y1="${H - pb}" y2="${H - pb}" stroke="#3d3e46"/>
 ${L ? `<polygon points="${X(0)},${H - pb} ${line} ${X(L)},${H - pb}" fill="url(#${gid})"/><polyline points="${line}" fill="none" stroke="#d4ab5a" stroke-width="2.2" stroke-linejoin="round"/>` : ''}
 ${pts.map((p, i) => { const x = X(i), y = Y(p.v), r = i === L ? 6 : 4; return `<path d="M${x} ${y - r}L${x + r} ${y}L${x} ${y + r}L${x - r} ${y}Z" fill="${i === L ? '#f1d494' : '#15161b'}" stroke="#d4ab5a" stroke-width="1.6"/>`; }).join('')}
 <text x="${L ? W - pr : W / 2}" y="${Math.max(15, Y(pts[L].v) - 13)}" text-anchor="${L ? 'end' : 'middle'}" font-family="Rajdhani,sans-serif" font-size="16" font-weight="700" fill="#f2f0ea">${esc(pts[L].lab)}</text>
 <text x="${pl}" y="${H - 3}" font-size="12" fill="#9a9ba3">${fmtS(pts[0].d)}</text>${L && W > 240 ? `<text x="${W - pr}" y="${H - 3}" font-size="12" text-anchor="end" fill="#9a9ba3">${fmtS(pts[L].d)}</text>` : ''}`;
}
export function beforeRender() { if (ro) { ro.disconnect(); ro = null; } }
export function afterRender(v) {
  if (v !== 'fortschritt') return;
  const list = document.querySelectorAll('svg[data-ch]');
  ro = new ResizeObserver(en => { for (const x of en) draw(x.target); });
  list.forEach(s => ro.observe(s));
}

/* ---------- Pausen-Timer ---------- */
let tmr = null, tEnd = 0, tTot = 1;
function startRest(sec) { tTot = sec; tEnd = Date.now() + sec * 1000; clearInterval(tmr); clearTimeout(tmr); $('#rest').hidden = false; tick(); tmr = setInterval(tick, 250); }
function tick() {
  const left = Math.max(0, Math.ceil((tEnd - Date.now()) / 1000)); $('#restT').textContent = left ? mmss(left) : 'Nächster Satz';
  $('#restBar').style.width = (100 - left / tTot * 100) + '%';
  if (!left) { clearInterval(tmr); try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (e) { /* egal */ } tmr = setTimeout(() => { $('#rest').hidden = true; }, 5000); }
}
export function init() { $('#restSkip').addEventListener('click', () => { clearInterval(tmr); clearTimeout(tmr); $('#rest').hidden = true; }); }

/* ---------- Import / Export ---------- */
function importData(txt) {
  try {
    const d = JSON.parse(txt); if (!Array.isArray(d.sessions)) throw 0;
    replaceState({ sessions: d.sessions, bw: Array.isArray(d.bw) ? d.bw : [], food: d.food || {}, myFoods: d.myFoods || [], recent: d.recent || [], goals: d.goals || S.goals });
    draft = null; app.render(); toast('Daten importiert.');
  } catch (e) { toast('Das sind keine gültigen Daten.'); }
}

/* ---------- Ereignisse ---------- */
export function onInput(ev) {
  const t = ev.target, a = t.dataset.act; if (!a || !draft) return;
  if (a === 'kg' || a === 'r') { const x = draft.ex[t.dataset.e][+t.dataset.i]; x[a] = t.value === '' ? '' : +t.value; saveDraft(); }
  else if (a === 'note' || a === 'bw') { draft[a] = t.value; saveDraft(); }
}
export function onChange(ev) {
  const t = ev.target, a = t.dataset.act;
  if (a === 'impfile' && t.files && t.files[0]) { t.files[0].text().then(importData); return; }
  if (!draft) return;
  if (a === 'light') { draft = makeDraft(draft.type, t.checked, draft.date, draft); saveDraft(); app.render(); }
  else if (a === 'date' && t.value) { draft.date = t.value; saveDraft(); app.render(); }
}
export const actions = {
  type: b => { draft = makeDraft(b.dataset.v, draft.light, draft.date, draft); saveDraft(); app.render(); },
  done: b => { const id = b.dataset.e, x = draft.ex[id][+b.dataset.i]; x.done = !x.done; b.closest('.sr').classList.toggle('done', x.done); b.setAttribute('aria-pressed', x.done); saveDraft(); if (x.done) startRest(ALL[id].rest); },
  addset: b => { const arr = draft.ex[b.dataset.e], l = arr[arr.length - 1]; arr.push({ kg: l.kg, r: l.r, done: false }); saveDraft(); app.render(); },
  rmset: b => { draft.ex[b.dataset.e].pop(); saveDraft(); app.render(); },
  save: () => saveSession(),
  del: b => {
    const i = S.sessions.findIndex(x => String(x.id) === b.dataset.id); if (i < 0) return;
    const [rm] = S.sessions.splice(i, 1); save(); app.render();
    toast('Einheit gelöscht.', () => { S.sessions.push(rm); save(); app.render(); });
  },
  bwadd: () => { const v = parseFloat(String($('#bwIn').value).replace(',', '.')); if (!(v > 30 && v < 250)) { toast('Bitte ein Gewicht in kg eingeben.'); return; } setBw(today(), v); save(); app.render(); toast('Gewicht eingetragen.'); },
  copy: async () => { try { await navigator.clipboard.writeText(JSON.stringify(S)); toast('Daten kopiert.'); } catch (e) { $('#imp').value = JSON.stringify(S); toast('Text steht im Feld – markieren und kopieren.'); } },
  dl: () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(S)], { type: 'application/json' })); a.download = 'fitness-backup-' + today() + '.json'; document.body.appendChild(a); a.click(); a.remove(); },
  import: () => importData($('#imp').value)
};
