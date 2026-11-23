// Start, Navigation und Ereignis-Verteilung
import { $, app, ic, fmtK, nf, today, mondayOf, bwSorted } from './core.js';
import * as T from './training.js';
import * as F from './food.js';

const VIEWS = { training: T.trainView, essen: F.foodView, fortschritt: T.progView, plan: T.planView };
const view = () => { const h = location.hash.slice(1); return VIEWS[h] ? h : 'training'; };

function resBar() {
  const s = T.sorted(), mon = mondayOf(today()), bw = bwSorted();
  const chips = [
    ['db', s.length, 'Einheiten'],
    ['ring', s.filter(x => x.date >= mon).length + '/3', 'Wochenziel'],
    ['food', fmtK(F.kcalToday()), 'kcal heute'],
    ['scale', bw.length ? nf(bw[bw.length - 1].kg) : '–', 'Gewicht']
  ];
  return chips.map(([i, v, l]) => `<div class="chip cut">${ic(i)}<div><b>${v}</b><small>${l}</small></div></div>`).join('');
}

function render() {
  const v = view();
  document.querySelectorAll('.nav a').forEach(a => {
    const on = a.getAttribute('href') === '#' + v;
    a.classList.toggle('on', on); on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current');
  });
  $('#res').innerHTML = resBar();
  T.beforeRender();
  $('#app').innerHTML = VIEWS[v]();
  T.afterRender(v);
}
app.render = render;

const ACT = { ...T.actions, ...F.actions };
document.addEventListener('click', ev => {
  const b = ev.target.closest('button[data-act]');
  if (b && ACT[b.dataset.act] && !b.disabled) ACT[b.dataset.act](b, ev);
});
document.addEventListener('input', ev => { T.onInput(ev); F.onInput(ev); });
document.addEventListener('change', ev => { T.onChange(ev); F.onChange(ev); });
document.addEventListener('submit', ev => {
  const f = ev.target.dataset.form;
  if (f && ACT[f]) { ev.preventDefault(); ACT[f](ev.target, ev); }
});
addEventListener('hashchange', () => { render(); scrollTo(0, 0); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') render(); });

T.init(); F.init();
render();

// Offline-Fähigkeit und dauerhafter Speicher
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
