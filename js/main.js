// Start, Navigation und Ereignis-Verteilung
import { $, app } from './core.js';
import * as T from './training.js';
import * as F from './food.js';
import { initBg, setBg } from './bg.js';

const VIEWS = { training: T.trainView, essen: F.foodView, fortschritt: T.progView, plan: T.planView };
const view = () => { const h = location.hash.slice(1); return VIEWS[h] ? h : 'training'; };

const TITLES = { training: 'Training', essen: 'Essen', fortschritt: 'Fortschritt', plan: 'Plan' };

function render() {
  const v = view();
  document.querySelectorAll('.nav a').forEach(a => {
    const on = a.getAttribute('href') === '#' + v;
    a.classList.toggle('on', on); on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current');
  });
  $('#ttl').textContent = TITLES[v]; document.title = TITLES[v] + ' · Fitness';
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
document.addEventListener('change', ev => { if (ev.target.dataset.act === 'bg') { setBg(ev.target.checked); return; } T.onChange(ev); F.onChange(ev); });
document.addEventListener('submit', ev => {
  const f = ev.target.dataset.form;
  if (f && ACT[f]) { ev.preventDefault(); ACT[f](ev.target, ev); }
});
addEventListener('hashchange', () => { render(); scrollTo(0, 0); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') render(); });

T.init(); F.init(); initBg();
render();

// Offline-Fähigkeit und dauerhafter Speicher
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
