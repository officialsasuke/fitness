// Animierter Hintergrund: rotierende Goldringe, Schallwellen, Lichtfunken, Lichtstreif.
// Läuft mit ca. 30 Bildern/s, pausiert im Hintergrund und bleibt bei "Bewegung reduzieren" stehen.
const G = '212,171,90', I = '134,212,232', L = '241,212,148';
const TAU = Math.PI * 2;
let c, x, W = 0, H = 0, parts = [], raf = 0, last = 0, t0 = performance.now(), running = false;

export const bgEnabled = () => { try { return localStorage.getItem('fp-bg') !== 'off'; } catch (e) { return true; } };
const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function mk(init) {
  return {
    x: Math.random() * W, y: init ? Math.random() * H : H + 10,
    r: Math.random() * 1.7 + 0.6, v: Math.random() * 0.22 + 0.06, dx: (Math.random() - 0.5) * 0.12,
    ph: Math.random() * TAU, ice: Math.random() < 0.25, dia: Math.random() < 0.35
  };
}
function size() {
  const D = Math.min(2, devicePixelRatio || 1);
  W = innerWidth; H = innerHeight;
  c.width = Math.round(W * D); c.height = Math.round(H * D);
  x.setTransform(D, 0, 0, D, 0, 0);
  const n = Math.round(Math.min(55, Math.max(18, W * H / 15000)));
  parts = Array.from({ length: n }, () => mk(true));
}
const circle = r => { x.beginPath(); x.arc(0, 0, r, 0, TAU); x.stroke(); };

function rings(cx, cy, R, t, a) {
  x.save(); x.translate(cx, cy); x.lineWidth = 1;
  x.strokeStyle = `rgba(${G},${0.14 * a})`; circle(R);
  x.save(); x.rotate(t * 0.05); x.setLineDash([26, 14]); x.strokeStyle = `rgba(${G},${0.3 * a})`; circle(R * 0.84); x.restore();
  x.save(); x.rotate(-t * 0.08); x.setLineDash([2, 9]); x.strokeStyle = `rgba(${G},${0.34 * a})`; circle(R * 0.64); x.restore();
  x.save(); x.rotate(t * 0.12); x.setLineDash([60, 22, 8, 22]); x.lineWidth = 2; x.strokeStyle = `rgba(${G},${0.26 * a})`; circle(R * 0.44); x.restore();
  // Skalenstriche
  x.save(); x.rotate(-t * 0.02); x.strokeStyle = `rgba(${G},${0.28 * a})`; x.beginPath();
  for (let i = 0; i < 72; i++) {
    const ang = i / 72 * TAU, r0 = R * 0.92, l = i % 6 ? 5 : 12;
    x.moveTo(Math.cos(ang) * r0, Math.sin(ang) * r0); x.lineTo(Math.cos(ang) * (r0 + l), Math.sin(ang) * (r0 + l));
  }
  x.stroke(); x.restore();
  // leuchtendes Bogenstück, das umläuft
  x.save(); x.rotate(t * 0.3); x.lineWidth = 2.5; x.strokeStyle = `rgba(${L},${0.55 * a})`;
  x.shadowColor = `rgba(${L},.8)`; x.shadowBlur = 12; x.beginPath(); x.arc(0, 0, R * 0.84, 0, 0.5); x.stroke(); x.restore();
  // zweites, gegenläufiges Bogenstück in Eisblau
  x.save(); x.rotate(-t * 0.18 + 2); x.lineWidth = 1.6; x.strokeStyle = `rgba(${I},${0.35 * a})`; x.beginPath(); x.arc(0, 0, R * 0.64, 0, 0.35); x.stroke(); x.restore();
  // Fadenkreuz und Rauten
  x.strokeStyle = `rgba(${G},${0.18 * a})`; x.beginPath(); x.moveTo(-R * 0.2, 0); x.lineTo(R * 0.2, 0); x.moveTo(0, -R * 0.2); x.lineTo(0, R * 0.2); x.stroke();
  x.save(); x.rotate(t * 0.05); x.fillStyle = `rgba(${G},${0.5 * a})`;
  for (const ang of [0.6, 2.4, 4.3]) { const px = Math.cos(ang) * R, py = Math.sin(ang) * R; x.beginPath(); x.moveTo(px, py - 5); x.lineTo(px + 5, py); x.lineTo(px, py + 5); x.lineTo(px - 5, py); x.fill(); }
  x.restore();
  x.restore();
}
function waves(t) {
  const base = H * 0.55;
  for (let k = 0; k < 3; k++) {
    const amp = 10 + k * 7, f = 0.008 + k * 0.003, sp = t * (0.6 + k * 0.25), pulse = 0.6 + 0.4 * Math.sin(t * 0.4 + k);
    x.beginPath();
    for (let px = 0; px <= W; px += 6) {
      const env = Math.sin(px / W * Math.PI), y = base + k * 24 + Math.sin(px * f + sp) * amp * env * pulse;
      px ? x.lineTo(px, y) : x.moveTo(px, y);
    }
    x.lineWidth = 1.4; x.strokeStyle = k === 1 ? `rgba(${I},.2)` : `rgba(${G},${0.24 - k * 0.04})`; x.stroke();
  }
}
function streak(t) {
  const p = (t * 0.05) % 1.8; if (p > 1) return;
  const sx = -W * 0.3 + p * W * 1.6, g = x.createLinearGradient(-90, 0, 90, 0);
  g.addColorStop(0, `rgba(${L},0)`); g.addColorStop(0.5, `rgba(${L},.08)`); g.addColorStop(1, `rgba(${L},0)`);
  x.save(); x.translate(sx, 0); x.transform(1, 0, -0.35, 1, 0, 0); x.fillStyle = g; x.fillRect(-90, 0, 180, H); x.restore();
}
function particles(t, move) {
  for (const p of parts) {
    if (move) { p.y -= p.v; p.x += p.dx + Math.sin(t + p.ph) * 0.08; if (p.y < -10 || p.x < -10 || p.x > W + 10) Object.assign(p, mk(false)); }
    const al = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * 2 + p.ph));
    x.fillStyle = `rgba(${p.ice ? I : L},${al})`;
    if (p.dia) { const r = p.r * 1.8; x.beginPath(); x.moveTo(p.x, p.y - r); x.lineTo(p.x + r, p.y); x.lineTo(p.x, p.y + r); x.lineTo(p.x - r, p.y); x.fill(); }
    else { x.beginPath(); x.arc(p.x, p.y, p.r, 0, TAU); x.fill(); }
  }
}

// Eigene, erfundene Kämpferfigur (Silhouette): Mantel weht, Schwert nach oben, Funken steigen auf.
function figure(t) {
  const h = Math.min(H * 0.62, 520), s = h / 260, cx = W * 0.5, cy = H * 0.5 + h * 0.5;
  const w = Math.sin(t * 1.6), w2 = Math.sin(t * 1.6 + 1.2), br = Math.sin(t * 0.9) * 1.2;
  x.save(); x.translate(cx, cy); x.scale(s, s);
  rings(0, -125, 150, t * 0.7, 0.75);
  const body = () => {
    x.beginPath();
    // Kopf
    x.moveTo(9, -178 + br); x.arc(0, -178 + br, 9, 0, TAU);
    // Rumpf
    x.moveTo(-16, -166 + br); x.lineTo(16, -166 + br); x.lineTo(12, -100); x.lineTo(-12, -100); x.closePath();
    // vorderes Bein (angewinkelt) und hinteres Bein (gestreckt)
    x.moveTo(-12, -102); x.lineTo(3, -102); x.lineTo(14, -52); x.lineTo(34, -4); x.lineTo(22, 0); x.lineTo(-2, -48); x.closePath();
    x.moveTo(-3, -102); x.lineTo(12, -102); x.lineTo(-12, -54); x.lineTo(-38, -6); x.lineTo(-48, -2); x.lineTo(-44, -12); x.lineTo(-22, -56); x.closePath();
    // Schwertarm nach oben
    x.moveTo(12, -164 + br); x.lineTo(26, -190); x.lineTo(32, -206); x.lineTo(40, -204); x.lineTo(35, -184); x.lineTo(22, -156); x.closePath();
    // Gegenarm nach hinten
    x.moveTo(-14, -164 + br); x.lineTo(-34, -150); x.lineTo(-56, -138); x.lineTo(-54, -130); x.lineTo(-30, -136); x.lineTo(-12, -148); x.closePath();
    // Schwert
    x.moveTo(34, -204); x.lineTo(40, -206); x.lineTo(76, -262); x.lineTo(70, -256); x.closePath();
    // Mantel, weht nach hinten
    x.moveTo(-16, -166 + br); x.lineTo(-14, -100);
    x.lineTo(-40 - w * 4, -64); x.lineTo(-78 - w * 9, -50 + w * 4); x.lineTo(-112 - w2 * 12, -62 + w2 * 6);
    x.lineTo(-84 - w * 8, -92); x.lineTo(-120 - w2 * 14, -108 + w2 * 5); x.lineTo(-76 - w * 8, -126);
    x.lineTo(-46, -150); x.closePath();
  };
  const g = x.createLinearGradient(0, -260, 0, 0);
  g.addColorStop(0, `rgba(${G},.2)`); g.addColorStop(1, `rgba(${G},.04)`);
  body(); x.fillStyle = g; x.fill();
  x.lineWidth = 1.4; x.lineJoin = 'round'; x.strokeStyle = `rgba(${L},.5)`; x.shadowColor = `rgba(${L},.7)`; x.shadowBlur = 14; x.stroke();
  x.restore();
}
function draw(t, move) {
  x.clearRect(0, 0, W, H);
  const R = Math.min(W, 720) * 0.55;
  streak(t);
  rings(W * 0.88, H * 0.2, R, t, 1.35);
  rings(W * 0.08, H * 0.82, R * 0.75, t * 0.8 + 3, 0.9);
  waves(t);
  figure(t);
  particles(t, move);
}
function frame(ms) {
  raf = requestAnimationFrame(frame);
  if (ms - last < 33) return; last = ms;
  draw((ms - t0) / 1000, true);
}
function start() {
  if (running || !c) return;
  if (reduce()) { draw(8, false); return; }
  running = true; last = 0; raf = requestAnimationFrame(frame);
}
function stop() { running = false; cancelAnimationFrame(raf); }

export function setBg(on) {
  try { localStorage.setItem('fp-bg', on ? 'on' : 'off'); } catch (e) { /* egal */ }
  if (!c) return;
  c.hidden = !on; if (on) start(); else stop();
}
export function initBg() {
  c = document.getElementById('bg'); if (!c || !c.getContext) return;
  x = c.getContext('2d'); size();
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { size(); if (!running) draw(8, false); }, 150); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else if (bgEnabled()) start(); });
  if (bgEnabled()) start(); else c.hidden = true;
}
