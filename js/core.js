// Gemeinsame Helfer, Zustand und Speicher
export const KEY = 'fp-state-v1';

export const $ = s => document.querySelector(s);
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const today = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
export const addDays = (iso, n) => { const d = new Date(iso + 'T12:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
export const fmtD = iso => new Date(iso + 'T12:00').toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
export const fmtS = iso => iso.slice(8, 10) + '.' + iso.slice(5, 7) + '.';
export const nf = n => String(+(+n).toFixed(2)).replace('.', ',');
export const fmtK = n => Math.round(n).toLocaleString('de-DE');
export const mmss = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
export const days = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
export const ic = (n, st) => `<svg class="i"${st ? ` style="${st}"` : ''} aria-hidden="true"><use href="#i-${n}"/></svg>`;
export const mondayOf = iso => { const d = new Date(iso + 'T12:00'); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d.toISOString().slice(0, 10); };

function load() {
  let s = {};
  try { s = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { s = {}; }
  s.sessions ??= []; s.bw ??= []; s.food ??= {}; s.myFoods ??= []; s.recent ??= [];
  s.goals ??= { kcal: 2900, p: 120, f: 70 };
  return s;
}
export const S = load();

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch (e) { toast('Speichern fehlgeschlagen – ist der Speicher voll?'); }
}

/* Ersetzt den gesamten Zustand (Import) */
export function replaceState(d) {
  for (const k of Object.keys(S)) delete S[k];
  Object.assign(S, d);
  S.sessions ??= []; S.bw ??= []; S.food ??= {}; S.myFoods ??= []; S.recent ??= [];
  S.goals ??= { kcal: 2900, p: 120, f: 70 };
  save();
}

export const app = { render: () => {} };

let tt;
export function toast(m, undo) {
  const t = $('#toast');
  t.innerHTML = '<span>' + esc(m) + '</span>' + (undo ? '<button id="undo">Rückgängig</button>' : '');
  t.hidden = false;
  if (undo) $('#undo').onclick = () => { undo(); t.hidden = true; };
  clearTimeout(tt); tt = setTimeout(() => { t.hidden = true; }, 6000);
}

export function setBw(date, kg) { S.bw = S.bw.filter(x => x.date !== date); S.bw.push({ date, kg: +kg.toFixed(1) }); }
export const bwSorted = () => S.bw.slice().sort((a, b) => a.date < b.date ? -1 : 1);

/* Gewichtstempo in kg pro Woche, wenn genug Daten da sind */
export function bwRate() {
  const b = bwSorted(); if (b.length < 2) return null;
  const dd = days(b[0].date, b[b.length - 1].date); if (dd < 7) return null;
  return (b[b.length - 1].kg - b[0].kg) / dd * 7;
}
