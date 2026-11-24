// Abgleich zwischen Geräten über einen privaten GitHub-Gist im eigenen Konto.
// Der Token liegt nur lokal im Browser (nicht in den Backup-Daten).
import { $, S, save, app, toast, esc, hooks } from './core.js';

const FILE = 'fitness-planner.json', DESC = 'Fitness Planner Sync', CK = 'fp-sync';
const cfg = () => { try { return JSON.parse(localStorage.getItem(CK) || '{}') || {}; } catch (e) { return {}; } };
const setCfg = o => { try { localStorage.setItem(CK, JSON.stringify({ ...cfg(), ...o })); } catch (e) { /* egal */ } };

/* ---------- Zusammenführen (rein, ohne Netz) ---------- */
const num = v => +v || 0;
export function mergeState(L, R) {
  const now = Date.now(), tomb = {};
  for (const src of [R.tomb, L.tomb]) for (const [k, t] of Object.entries(src || {})) tomb[k] = Math.max(tomb[k] || 0, num(t));
  for (const k in tomb) if (now - tomb[k] > 120 * 864e5) delete tomb[k];
  const newer = (a, b) => num(b.u) > num(a.u) ? b : a; // a = lokal, bei Gleichstand gewinnt lokal
  const byId = (pre, ...lists) => {
    const m = new Map();
    for (const l of lists) for (const x of l || []) {
      if (tomb[pre + x.id]) continue;
      const k = String(x.id); m.set(k, m.has(k) ? newer(m.get(k), x) : x);
    }
    return [...m.values()].sort((a, b) => num(a.id) - num(b.id));
  };
  const sessions = byId('s:', L.sessions, R.sessions);
  const bwm = new Map();
  for (const x of [...(L.bw || []), ...(R.bw || [])]) bwm.set(x.date, bwm.has(x.date) ? newer(bwm.get(x.date), x) : x);
  const bw = [...bwm.values()].sort((a, b) => a.date < b.date ? -1 : 1);
  const food = {};
  for (const d of new Set([...Object.keys(L.food || {}), ...Object.keys(R.food || {})])) {
    const arr = byId('f:', (L.food || {})[d], (R.food || {})[d]); if (arr.length) food[d] = arr;
  }
  const uniq = (...lists) => { const seen = new Set(), o = []; for (const l of lists) for (const p of l || []) if (!seen.has(p.key)) { seen.add(p.key); o.push(p); } return o; };
  const ls = L.stamp || {}, rs = R.stamp || {}, pick = k => (num(rs[k]) > num(ls[k]) && R[k]) ? R[k] : (L[k] || R[k]);
  return {
    sessions, bw, food, myFoods: uniq(L.myFoods, R.myFoods), recent: uniq(L.recent, R.recent).slice(0, 40),
    goals: pick('goals'), rig: pick('rig'),
    stamp: { goals: Math.max(num(ls.goals), num(rs.goals)), rig: Math.max(num(ls.rig), num(rs.rig)) }, tomb
  };
}
/* Vergleichsschlüssel, unabhängig von der Reihenfolge in Listen */
export function sig(s) {
  const k = (a, f) => (a || []).slice().sort((x, y) => String(f(x)) < String(f(y)) ? -1 : 1);
  const food = {}; for (const d of Object.keys(s.food || {}).sort()) if (s.food[d].length) food[d] = k(s.food[d], e => e.id);
  const tomb = {}; for (const x of Object.keys(s.tomb || {}).sort()) tomb[x] = s.tomb[x];
  return JSON.stringify([k(s.sessions, e => String(e.id).padStart(16, '0')), k(s.bw, e => e.date), food, k(s.myFoods, e => e.key), k(s.recent, e => e.key), s.goals || null, s.rig || null, s.stamp || null, tomb]);
}
const FIELDS = ['sessions', 'bw', 'food', 'myFoods', 'recent', 'goals', 'rig', 'stamp', 'tomb'];
const snap = () => { const o = {}; for (const f of FIELDS) o[f] = S[f]; return o; };

/* ---------- GitHub-Gist ---------- */
async function api(token, method, path, body) {
  const ac = new AbortController(), to = setTimeout(() => ac.abort(), 20000);
  try {
    const r = await fetch('https://api.github.com' + path, {
      method, signal: ac.signal,
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined, cache: 'no-store'
    });
    if (!r.ok) { const e = new Error('HTTP ' + r.status); e.status = r.status; throw e; }
    return await r.json();
  } finally { clearTimeout(to); }
}
async function findOrCreate(token) {
  const list = await api(token, 'GET', '/gists?per_page=100');
  const g = list.find(x => x.files && x.files[FILE]);
  if (g) return g.id;
  const c = await api(token, 'POST', '/gists', { description: DESC, public: false, files: { [FILE]: { content: '{}' } } });
  return c.id;
}
const errText = e => e.status === 401 ? 'Token ungültig.' : e.status === 403 || e.status === 404 ? 'GitHub lehnt ab – Token braucht das Recht „gist“.' : e.status === 422 ? 'GitHub hat die Daten abgelehnt.' : 'Keine Verbindung zu GitHub.';

/* ---------- Abgleich ---------- */
let busy = false, again = false, timer = 0;
const when = t => new Date(t).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const statText = () => { const c = cfg(); return c.err ? 'Fehler: ' + c.err : c.last ? 'Zuletzt abgeglichen: ' + when(c.last) : 'Noch nicht abgeglichen'; };
const stat = t => { const el = $('#syStat'); if (el) el.textContent = t || statText(); };
const typing = () => { const a = document.activeElement, sh = $('#sheet'); return (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) || (sh && !sh.hidden); };

export async function syncNow(manual) {
  const c = cfg(); if (!c.token) return;
  if (busy) { again = true; return; }
  busy = true; clearTimeout(timer); stat('Gleiche ab …');
  try {
    let id = c.gist; if (!id) { id = await findOrCreate(c.token); setCfg({ gist: id }); }
    let r; try { r = await api(c.token, 'GET', '/gists/' + id); } catch (e) { if (e.status === 404) setCfg({ gist: '' }); throw e; }
    const f = r.files && r.files[FILE]; let remote = {};
    if (f) { try { remote = JSON.parse(f.truncated ? await (await fetch(f.raw_url)).text() : f.content) || {}; } catch (e) { remote = {}; } }
    const local = snap(), merged = mergeState(local, remote);
    let changed = false;
    if (sig(merged) !== sig(local)) { for (const k of FIELDS) S[k] = merged[k]; save(true); changed = true; }
    if (sig(merged) !== sig(remote)) await api(c.token, 'PATCH', '/gists/' + id, { files: { [FILE]: { content: JSON.stringify({ v: 1, saved: new Date().toISOString(), ...merged }) } } });
    setCfg({ last: Date.now(), err: '' });
    if (changed && !typing()) app.render();
    if (manual) toast(changed ? 'Abgeglichen – neue Daten geladen.' : 'Alles aktuell.');
  } catch (e) {
    setCfg({ err: errText(e) });
    if (manual || e.status === 401) toast(errText(e));
  }
  busy = false; stat();
  if (again) { again = false; syncNow(); }
}

export function init() {
  hooks.onSave = () => { if (cfg().token) { clearTimeout(timer); timer = setTimeout(syncNow, 8000); } };
  setTimeout(syncNow, 800);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') syncNow(); else if (timer) syncNow(); });
  addEventListener('online', () => syncNow());
  setInterval(() => { if (document.visibilityState === 'visible') syncNow(); }, 120000);
}

/* ---------- Oberfläche ---------- */
export function syncBlock() {
  const c = cfg();
  if (c.token) return `<section class="card cut"><p style="margin:0 0 4px"><b>Verbunden</b></p><p class="mut small" id="syStat" style="margin:0 0 12px">${esc(statText())}</p>
   <div class="row"><button class="btn ghost" data-act="sy-now">Jetzt abgleichen</button><button class="btn ghost" data-act="sy-off">Trennen</button></div>
   <p class="mut small" style="margin:12px 0 0">Läuft automatisch beim Öffnen und nach dem Speichern. Auf dem anderen Gerät denselben Token eintragen.</p></section>`;
  return `<section class="card cut"><p class="mut small" style="margin-top:0">Gleicht Training, Essen und Gewicht zwischen PC und Handy ab – über einen privaten Gist in deinem GitHub-Konto.</p>
   <ol class="mut small" style="padding-left:18px;margin:0 0 12px"><li><a href="https://github.com/settings/tokens/new?scopes=gist&amp;description=Fitness%20Planner" target="_blank" rel="noopener" style="color:var(--gold)">Diesen Link öffnen</a>, Ablauf „No expiration“ wählen und den Token erzeugen.</li><li>Token unten einfügen. Auf jedem Gerät derselbe Token.</li></ol>
   <form data-form="sy-connect"><label class="fl"><span class="lab">GitHub-Token</span><input id="syTok" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="ghp_…"></label>
   <button class="btn" style="margin-top:12px">Verbinden</button></form></section>`;
}
export const actions = {
  'sy-connect': async () => {
    const token = String(($('#syTok') || {}).value || '').trim(); if (!token) { toast('Bitte den Token einfügen.'); return; }
    try {
      const gist = await findOrCreate(token); setCfg({ token, gist, err: '', last: 0 });
      toast('Verbunden.'); await syncNow(); app.render();
    } catch (e) { toast(errText(e)); }
  },
  'sy-now': () => syncNow(true),
  'sy-off': () => { try { localStorage.removeItem(CK); } catch (e) { /* egal */ } toast('Getrennt. Die Daten bleiben hier und bei GitHub.'); app.render(); }
};
