// Kalorien-Tracker mit Open Food Facts, Barcode-Scanner und eigenen Lebensmitteln
import { $, S, save, app, toast, esc, ic, today, addDays, fmtD, fmtK, nf, bwRate } from './core.js';

export const MEALS = [['fr', 'Frühstück'], ['mi', 'Mittagessen'], ['ab', 'Abendessen'], ['sn', 'Snacks']];
const ZX_URL = 'https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js';
const OFF_FIELDS = 'code,product_name,product_name_de,brands,nutriments,serving_quantity,quantity,image_small_url,image_front_small_url';

/* Standardwerte pro 100 g (ungefähre Durchschnittswerte aus Nährwerttabellen).
   [Name, kcal, Protein, Kohlenhydrate, Fett, Portion in g, Portionsname] */
const BASIS_RAW = [
  ['Haferflocken', 370, 13.5, 59, 7, 60, 'Schüssel'], ['Reis (roh)', 350, 7, 78, 0.6, 80, 'Portion'], ['Reis (gekocht)', 130, 2.7, 28, 0.3, 200, 'Portion'],
  ['Nudeln (roh)', 355, 12.5, 71, 1.5, 100, 'Portion'], ['Nudeln (gekocht)', 150, 5.5, 30, 0.9, 250, 'Portion'], ['Kartoffeln (gekocht)', 75, 2, 16, 0.1, 250, 'Portion'],
  ['Vollkornbrot', 220, 7, 41, 1.5, 50, 'Scheibe'], ['Toastbrot', 260, 8, 48, 3.5, 25, 'Scheibe'], ['Brötchen (Weizen)', 270, 9, 54, 1.5, 60, 'Stück'],
  ['Wrap (Weizen)', 300, 8, 50, 7, 60, 'Stück'], ['Müsli', 370, 9, 62, 7, 60, 'Schüssel'], ['Cornflakes', 380, 7, 84, 0.9, 40, 'Schüssel'],
  ['Ei (Hühnerei)', 140, 12.5, 0.7, 9.5, 60, 'Stück'], ['Magerquark', 67, 12, 4, 0.3, 250, 'Becher'], ['Skyr natur', 63, 11, 4, 0.2, 150, 'Becher'],
  ['Joghurt 3,5 %', 63, 3.5, 4.5, 3.5, 150, 'Becher'], ['Milch 3,5 %', 64, 3.4, 4.8, 3.6, 250, 'Glas'], ['Milch 1,5 %', 47, 3.4, 4.9, 1.5, 250, 'Glas'],
  ['Hüttenkäse', 100, 12, 3, 4.5, 200, 'Becher'], ['Gouda', 360, 25, 0, 28, 30, 'Scheibe'], ['Frischkäse', 250, 6, 3, 24, 30, 'Portion'],
  ['Hähnchenbrust (roh)', 105, 23.5, 0, 1, 150, 'Stück'], ['Rinderhack (roh)', 220, 19, 0, 16, 125, 'Portion'], ['Putenaufschnitt', 105, 20, 1, 2, 20, 'Scheibe'],
  ['Thunfisch (Dose, Wasser)', 110, 25, 0, 1, 150, 'Dose'], ['Lachs (roh)', 200, 20, 0, 13, 125, 'Stück'], ['Linsen (gekocht)', 115, 9, 20, 0.4, 200, 'Portion'],
  ['Kidneybohnen (Dose)', 95, 7, 13, 0.5, 125, 'Portion'], ['Tofu natur', 125, 13, 2, 7, 100, 'Portion'], ['Whey Proteinpulver', 380, 75, 8, 5, 30, 'Messlöffel'],
  ['Erdnussbutter', 600, 25, 14, 50, 15, 'Esslöffel'], ['Mandeln', 590, 22, 6, 52, 30, 'Handvoll'], ['Olivenöl', 884, 0, 0, 100, 10, 'Esslöffel'],
  ['Butter', 740, 0.7, 0.6, 82, 10, 'Portion'], ['Honig', 305, 0.4, 80, 0, 20, 'Teelöffel'], ['Banane', 90, 1.1, 21, 0.3, 120, 'Stück'],
  ['Apfel', 54, 0.3, 12, 0.4, 150, 'Stück'], ['Beeren (TK)', 45, 1, 8, 0.5, 125, 'Portion'], ['Brokkoli', 34, 2.8, 4, 0.4, 200, 'Portion'],
  ['Tomate', 18, 0.9, 3, 0.2, 80, 'Stück'], ['Gurke', 12, 0.6, 2, 0.1, 200, 'Stück'], ['Paprika', 30, 1, 6, 0.3, 150, 'Stück'],
  ['Avocado', 160, 2, 9, 15, 100, 'halbe'], ['Vollmilchschokolade', 535, 7, 57, 30, 25, 'Riegel'], ['Chips', 535, 6, 50, 34, 50, 'Portion'],
  ['Cola', 42, 0, 10.6, 0, 330, 'Dose'], ['Cola Zero', 0.3, 0, 0, 0, 330, 'Dose'], ['Orangensaft', 45, 0.7, 10, 0.2, 250, 'Glas'],
  ['Pizza Salami (TK)', 260, 10, 28, 11, 350, 'Pizza'], ['Döner Kebab (ca.)', 230, 12, 22, 10, 400, 'Stück'], ['Pommes (frittiert)', 300, 3.5, 37, 15, 150, 'Portion']
];
const slug = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-');
const BASIS = BASIS_RAW.map(a => ({ key: 'b:' + slug(a[0]), name: a[0], brand: 'Standardwert', n: { kcal: a[1], p: a[2], c: a[3], f: a[4] }, serving: a[5] || 0, sl: a[6] || '', src: 'basis' }));
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

let day = today();
let sheet = null;          // offenes Hinzufügen-Fenster
const pool = new Map();    // key -> Produkt, für Klicks in Listen
let searchSeq = 0;

/* ---------- Rechnen ---------- */
export const entries = d => S.food[d] || [];
const amt = (n, g) => ({ kcal: n.kcal * g / 100, p: n.p * g / 100, c: n.c * g / 100, f: n.f * g / 100 });
export function totals(arr) { const t = { kcal: 0, p: 0, c: 0, f: 0 }; for (const e of arr) { const a = amt(e.n, e.g); t.kcal += a.kcal; t.p += a.p; t.c += a.c; t.f += a.f; } return t; }
export function goals() { const g = S.goals; return { kcal: g.kcal, p: g.p, f: g.f, c: Math.max(0, Math.round((g.kcal - g.p * 4 - g.f * 9) / 4)) }; }

/* ---------- Open Food Facts ---------- */
function fromOff(h) {
  if (!h) return null; const n = h.nutriments || {};
  let kcal = n['energy-kcal_100g']; if (kcal == null && n.energy_100g != null) kcal = n.energy_100g / 4.184;
  if (kcal == null || isNaN(+kcal)) return null;
  const name = h.product_name_de || h.product_name || ''; if (!name) return null;
  return {
    key: 'off:' + h.code, code: h.code, name: String(name).trim(),
    brand: Array.isArray(h.brands) ? h.brands.map(s => String(s).trim()).filter(Boolean).slice(0, 2).join(', ') : String(h.brands || '').split(',')[0].trim(),
    n: { kcal: +kcal, p: +(n.proteins_100g || 0), c: +(n.carbohydrates_100g || 0), f: +(n.fat_100g || 0) },
    serving: +h.serving_quantity || 0, sl: h.quantity || '', img: h.image_small_url || h.image_front_small_url || '', src: 'off'
  };
}
async function getJSON(url, ms = 12000) {
  const ac = new AbortController(); const t = setTimeout(() => ac.abort(), ms);
  try { const r = await fetch(url, { signal: ac.signal }); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); }
  finally { clearTimeout(t); }
}
async function searchOff(q) {
  // Klassische Suche (erlaubt Abfragen von fremden Seiten, max. ca. 10 Suchen pro Minute)
  const cgi = host => {
    const u = new URL(`https://${host}.openfoodfacts.org/cgi/search.pl`);
    u.searchParams.set('search_terms', q); u.searchParams.set('search_simple', '1'); u.searchParams.set('action', 'process');
    u.searchParams.set('json', '1'); u.searchParams.set('page_size', '30'); u.searchParams.set('sort_by', 'unique_scans_n');
    u.searchParams.set('fields', OFF_FIELDS); u.searchParams.set('app_name', 'FitnessPlanner');
    return u;
  };
  const clean = list => { const seen = new Set(); return list.map(fromOff).filter(h => h && !seen.has(h.key) && seen.add(h.key)); };
  try { const d = await getJSON(cgi('de'), 20000); return clean(d.products || []); }
  catch (e1) {
    try { const d = await getJSON(cgi('world'), 20000); return clean(d.products || []); }
    catch (e2) {
      const u = new URL('https://search.openfoodfacts.org/search');
      u.searchParams.set('q', q); u.searchParams.set('page_size', '30'); u.searchParams.set('langs', 'de'); u.searchParams.set('fields', OFF_FIELDS);
      const d = await getJSON(u); return clean(d.hits || []);
    }
  }
}
async function byCode(code) {
  const d = await getJSON(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${OFF_FIELDS}&app_name=FitnessPlanner`);
  if (!d || d.status === 0 || !d.product) return null;
  return fromOff({ ...d.product, code: d.code || code });
}

/* ---------- Ernährungs-Ansicht ---------- */
function ring(T, G) {
  const R = 80, C = 2 * Math.PI * R, pc = Math.min(1, T.kcal / Math.max(1, G.kcal)), over = T.kcal > G.kcal, left = G.kcal - T.kcal;
  return `<div class="ring"><svg viewBox="0 0 200 200" aria-hidden="true"><defs><linearGradient id="rg" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#f1d494"/><stop offset="1" stop-color="#b8893a"/></linearGradient></defs>
   <circle cx="100" cy="100" r="96" fill="none" stroke="#3d3e46" stroke-dasharray="1.5 6"/>
   <circle cx="100" cy="100" r="${R}" fill="none" stroke="#25262c" stroke-width="13"/>
   <circle cx="100" cy="100" r="${R}" fill="none" stroke="${over ? '#86d4e8' : 'url(#rg)'}" stroke-width="13" stroke-dasharray="${(pc * C).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 100 100)"/>
   <circle cx="100" cy="100" r="64" fill="none" stroke="#2d2e35" stroke-dasharray="14 6"/></svg>
   <div class="c"><b>${fmtK(T.kcal)}</b><span class="mut small">von ${fmtK(G.kcal)} kcal</span><span class="lab" style="font-size:12px;margin-top:4px;color:${over ? 'var(--ice)' : 'var(--gold)'}">${left >= 0 ? 'Noch ' + fmtK(left) : fmtK(-left) + ' drüber'}</span></div></div>`;
}
const mac = (lab, v, g, cls) => { const pc = Math.min(100, Math.round(v / Math.max(1, g) * 100)); return `<div class="mac"><div class="kv"><p class="lab">${lab}</p><b>${fmtK(v)}<small> / ${fmtK(g)} g</small></b></div><div class="pity ${cls}"><i style="width:${pc}%"></i></div></div>`; };

export function foodView() {
  const E = entries(day), T = totals(E), G = goals(), isT = day === today();
  const meals = MEALS.map(([m, lab]) => {
    const list = E.filter(e => e.meal === m), t = totals(list);
    return `<section class="card meal cut corner"><div class="mh"><div><h3>${lab}</h3><p class="mut small">${list.length ? `${fmtK(t.p)} g Protein` : 'Noch nichts eingetragen'}</p></div><b class="mk">${fmtK(t.kcal)}<small> kcal</small></b></div>
     ${list.map(e => { const a = amt(e.n, e.g); return `<button class="ent" data-act="f-edit" data-id="${e.id}"><span class="nm">${esc(e.name)}</span><span class="am">${nf(e.g)} g${e.brand && e.brand !== 'Standardwert' ? ' · ' + esc(e.brand) : ''} · ${fmtK(a.p)} g P</span><span class="kc">${fmtK(a.kcal)}</span></button>`; }).join('')}
     <button class="lnk" data-act="f-add" data-m="${m}">${ic('plus')}Hinzufügen</button></section>`;
  }).join('');
  const hist = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDays(day, -i), t = totals(entries(d)), pc = Math.min(100, Math.round(t.kcal / G.kcal * 100));
    hist.push(`<li><span class="${d === day ? 'cur' : ''}">${fmtD(d)}</span><div class="pity${t.kcal > G.kcal ? ' ice' : ''}"><i style="width:${pc}%"></i></div><span>${t.kcal ? fmtK(t.kcal) : '–'}</span></li>`);
  }
  const r = bwRate();
  const tip = r === null ? 'Wiege dich 1× pro Woche (Fortschritt → Körpergewicht). Ab 2 Wochen Daten schlage ich dir hier eine Anpassung vor.'
    : r < 0.2 ? `Du nimmst ${nf(r.toFixed(2))} kg pro Woche zu – etwas wenig. Erhöhe das Ziel um ca. 200 kcal.`
    : r > 0.6 ? `Du nimmst ${nf(r.toFixed(2))} kg pro Woche zu – etwas schnell. Senke das Ziel um ca. 200 kcal.`
    : `Du nimmst ${nf(r.toFixed(2))} kg pro Woche zu – passt genau. Ziel so lassen.`;
  return `<div class="datebar"><button class="ibtn" data-act="f-day" data-v="-1" aria-label="Vorheriger Tag">${ic('left')}</button>
   <button class="d" data-act="f-today"><span class="lab" style="font-size:12px;display:block">${isT ? 'Heute' : 'Zu heute springen'}</span>${fmtD(day)}</button>
   <button class="ibtn" data-act="f-day" data-v="1" aria-label="Nächster Tag" ${isT ? 'disabled' : ''}>${ic('right')}</button></div>
  <section class="card hatch cut corner sum">${ring(T, G)}<div>${mac('Protein', T.p, G.p, '')}${mac('Kohlenhydrate', T.c, G.c, 'ice')}${mac('Fett', T.f, G.f, 'dim')}</div></section>
  <div class="sec"><p class="lab">Mahlzeiten</p><p class="hint">Antippen zum Ändern</p></div>
  ${meals}
  <div class="sec"><p class="lab">Letzte 7 Tage</p><p class="hint">kcal im Vergleich zum Ziel</p></div>
  <section class="card cut corner"><ul class="days7">${hist.join('')}</ul></section>
  <div class="sec"><p class="lab">Tagesziel</p></div>
  <section class="card cut corner"><p class="sg">${ic('up')}<span>${tip}</span></p>
   <div class="grid3"><label class="fl"><span class="lab">kcal</span><input id="gK" type="number" inputmode="numeric" value="${S.goals.kcal}"></label><label class="fl"><span class="lab">Protein g</span><input id="gP" type="number" inputmode="numeric" value="${S.goals.p}"></label><label class="fl"><span class="lab">Fett g</span><input id="gF" type="number" inputmode="numeric" value="${S.goals.f}"></label></div>
   <p class="mut small" style="margin:10px 0">Kohlenhydrate ergeben sich aus dem Rest: ${fmtK(G.c)} g.</p>
   <button class="btn ghost" data-act="f-goals">${ic('check')}Ziel speichern</button></section>`;
}

/* ---------- Hinzufügen-Fenster ---------- */
function openSheet(s) { sheet = s; document.body.classList.add('lock'); renderSheet(); }
function closeSheet() { stopScan(); sheet = null; $('#sheet').hidden = true; $('#sheet').innerHTML = ''; document.body.classList.remove('lock'); }
const mealName = m => (MEALS.find(x => x[0] === m) || [, ''])[1];

function item(p) {
  pool.set(p.key, p);
  const img = p.img ? `<img src="${esc(p.img)}" alt="" loading="lazy">` : `<span class="ph0">${ic(p.src === 'basis' ? 'food' : p.src === 'own' ? 'plan' : 'db')}</span>`;
  const tag = p.src === 'off' ? 'OFF' : p.src === 'own' ? 'Eigen' : 'Basis';
  return `<button class="pi" data-act="f-pick" data-k="${esc(p.key)}">${img}<span><span class="nm">${esc(p.name)}</span><span class="br">${esc(p.brand || '')}<span class="src">${tag}</span></span></span><span class="kc">${fmtK(p.n.kcal)}<small>kcal/100 g</small></span></button>`;
}
function localMatches(q) {
  const w = norm(q).split(/\s+/).filter(Boolean); if (!w.length) return [];
  const hit = p => { const t = norm(p.name + ' ' + (p.brand || '')); return w.every(x => t.includes(x)); };
  return [...S.myFoods.filter(hit), ...S.recent.filter(p => p.src === 'off' && hit(p)), ...BASIS.filter(hit)].filter((p, i, a) => a.findIndex(x => x.key === p.key) === i).slice(0, 12);
}
function resultsHTML() {
  const q = sheet.q.trim();
  if (!q) return `<p class="mut small" style="margin-top:12px">Tipp: Marke + Produkt suchen, z. B. „Ehrmann Skyr“ oder „Haferflocken Kölln“. Oder scannen.</p><div class="res-l"><p class="lab" style="margin:14px 0 4px">Häufige Lebensmittel</p>${BASIS.slice(0, 12).map(item).join('')}</div>`;
  const loc = localMatches(q);
  let off = '';
  if (sheet.loading) off = `<p class="mut" style="padding:14px 0">${ic('ring', 'vertical-align:-5px;margin-right:6px')}Suche bei Open Food Facts …</p>`;
  else if (sheet.err) off = `<p class="warn">${ic('warn')}<span>${esc(sheet.err)}</span></p>`;
  else if (sheet.results) off = sheet.results.length ? sheet.results.map(item).join('') : '<p class="mut" style="padding:12px 0">Nichts gefunden. Anders schreiben, scannen oder selbst anlegen.</p>';
  else off = `<button class="btn ghost" data-act="f-search" style="margin-top:6px">${ic('search')}„${esc(q)}“ bei Open Food Facts suchen</button>`;
  return `${loc.length ? `<div class="res-l"><p class="lab" style="margin:14px 0 4px">Deine &amp; Basis</p>${loc.map(item).join('')}</div>` : ''}
   <div class="res-l"><p class="lab" style="margin:14px 0 4px">Open Food Facts</p>${off}</div>`;
}
function selHTML() {
  const p = sheet.sel, g = sheet.g, a = amt(p.n, g || 0), edit = sheet.mode === 'edit';
  const chips = [...(p.serving ? [[p.serving, `${p.sl && p.src !== 'off' ? p.sl : 'Portion'} ${nf(p.serving)} g`]] : []), [50, '50 g'], [100, '100 g'], [150, '150 g'], [200, '200 g'], [250, '250 g']]
    .filter((x, i, arr) => arr.findIndex(y => y[0] === x[0]) === i);
  return `${edit ? '' : `<button class="lnk" data-act="f-back">${ic('left')}Zurück</button>`}
   <div class="selp">${p.img ? `<img src="${esc(p.img)}" alt="">` : `<span class="ph0">${ic('food')}</span>`}<div><h3>${esc(p.name)}</h3><p class="mut small">${esc(p.brand || '')}${p.code ? ' · ' + esc(p.code) : ''}</p>
   <p class="small" style="margin-top:4px">Pro 100 g: <b>${fmtK(p.n.kcal)} kcal</b> · ${nf(p.n.p.toFixed(1))} P · ${nf(p.n.c.toFixed(1))} K · ${nf(p.n.f.toFixed(1))} F</p></div></div>
   <label class="fl" style="margin-top:14px"><span class="lab">Menge in Gramm</span><input id="fG" type="number" inputmode="decimal" min="0" step="1" value="${g || ''}" data-act="f-g"></label>
   <div class="chips">${chips.map(([v, l]) => `<button data-act="f-gset" data-v="${v}" class="${+g === +v ? 'on' : ''}">${l}</button>`).join('')}</div>
   <div class="macro4" id="fPrev">${prevHTML(a)}</div>
   <p class="lab" style="margin:6px 0 8px">Mahlzeit</p>
   <div class="mseg">${MEALS.map(([m, l]) => `<button data-act="f-meal" data-v="${m}" class="${sheet.meal === m ? 'on' : ''}">${l}</button>`).join('')}</div>
   <button class="btn" data-act="f-commit" style="margin-top:16px">${ic(edit ? 'check' : 'plus')}${edit ? 'Speichern' : 'Hinzufügen'}</button>
   ${edit ? `<button class="lnk red" data-act="f-delent" style="margin-top:8px">${ic('x')}Eintrag löschen</button>` : ''}`;
}
const prevHTML = a => `<div><b>${fmtK(a.kcal)}</b><span>kcal</span></div><div><b>${nf(a.p.toFixed(1))}</b><span>Protein</span></div><div><b>${nf(a.c.toFixed(1))}</b><span>Kohlenh.</span></div><div><b>${nf(a.f.toFixed(1))}</b><span>Fett</span></div>`;

function tabHTML() {
  const t = sheet.tab;
  if (t === 'suche') return `<form class="srch" data-form="f-search" role="search"><input id="fQ" type="search" enterkeyhint="search" placeholder="Lebensmittel oder Marke suchen" value="${esc(sheet.q)}" data-act="f-q" autocomplete="off"><button class="ibtn" aria-label="Suchen">${ic('search')}</button></form><div id="fRes">${resultsHTML()}</div>`;
  if (t === 'scan') return `<div id="fScan">${scanHTML()}</div>`;
  if (t === 'zuletzt') {
    const own = S.myFoods, rec = S.recent;
    return `${rec.length ? `<p class="lab" style="margin:4px 0">Zuletzt gegessen</p>${rec.slice(0, 25).map(item).join('')}` : '<p class="mut">Noch nichts – was du einträgst, erscheint hier für schnellen Zugriff.</p>'}
     ${own.length ? `<p class="lab" style="margin:18px 0 4px">Deine Lebensmittel</p>${own.map(item).join('')}` : ''}`;
  }
  const pf = sheet.prefill || {};
  return `<p class="mut small" style="margin-bottom:12px">Werte von der Verpackung abtippen (Nährwerte pro 100 g).</p>
   <form data-form="f-own" class="ownf">
    <label class="fl"><span class="lab">Name</span><input name="name" required value="${esc(pf.name || '')}" placeholder="z. B. Protein-Pudding"></label>
    <label class="fl"><span class="lab">Marke (optional)</span><input name="brand" value="${esc(pf.brand || '')}"></label>
    <div class="grid2"><label class="fl"><span class="lab">kcal / 100 g</span><input name="kcal" type="number" step="0.1" inputmode="decimal" required></label><label class="fl"><span class="lab">Protein g</span><input name="p" type="number" step="0.1" inputmode="decimal" value="0"></label>
    <label class="fl"><span class="lab">Kohlenh. g</span><input name="c" type="number" step="0.1" inputmode="decimal" value="0"></label><label class="fl"><span class="lab">Fett g</span><input name="f" type="number" step="0.1" inputmode="decimal" value="0"></label></div>
    <label class="fl"><span class="lab">Portion in g (optional)</span><input name="serving" type="number" step="1" inputmode="numeric"></label>
    <input type="hidden" name="code" value="${esc(pf.code || '')}">
    <button class="btn" type="submit">${ic('save')}Speichern &amp; auswählen</button></form>`;
}
function renderSheet() {
  const el = $('#sheet'); if (!sheet) { el.hidden = true; return; }
  const edit = sheet.mode === 'edit';
  const tabs = [['suche', 'search', 'Suchen'], ['scan', 'scan', 'Scannen'], ['zuletzt', 'clock', 'Zuletzt'], ['eigen', 'plan', 'Eigenes']];
  el.innerHTML = `<div class="sh" role="dialog" aria-modal="true" aria-label="${edit ? 'Eintrag bearbeiten' : 'Lebensmittel hinzufügen'}">
   <div class="sh-top"><div><p class="lab" style="color:var(--gold)">${edit ? 'Eintrag bearbeiten' : 'Hinzufügen'}</p><h2 style="font-size:28px">${mealName(sheet.meal)}</h2></div><button class="ibtn" data-act="f-close" aria-label="Schließen">${ic('x')}</button></div>
   ${sheet.sel ? selHTML() : `<div class="tabs2">${tabs.map(([k, i, l]) => `<button data-act="f-tab" data-v="${k}" class="${sheet.tab === k ? 'on' : ''}">${ic(i)}${l}</button>`).join('')}</div>${tabHTML()}`}</div>`;
  el.hidden = false;
}
function renderResults() { const r = $('#fRes'); if (r) r.innerHTML = resultsHTML(); }

async function runSearch() {
  const q = sheet && sheet.q.trim(); if (!q || q.length < 2) return;
  const my = ++searchSeq; sheet.loading = true; sheet.err = ''; renderResults();
  try { const res = await searchOff(q); if (!sheet || my !== searchSeq) return; sheet.results = res; }
  catch (e) { if (!sheet || my !== searchSeq) return; sheet.results = null; sheet.err = navigator.onLine ? 'Die Suche von Open Food Facts antwortet gerade nicht (sie ist manchmal überlastet). Versuch es gleich nochmal – Scannen geht meistens trotzdem.' : 'Keine Internetverbindung. Basis- und eigene Lebensmittel gehen trotzdem.'; }
  sheet.loading = false; if (sheet.tab === 'suche' && !sheet.sel) renderResults();
}

/* ---------- Barcode-Scanner ---------- */
let scan = { on: false, stream: null, raf: 0, zx: null, msg: '' };
function scanHTML() {
  return `<div class="scan" ${scan.on ? '' : 'hidden'}><video id="fV" playsinline muted></video></div>
   ${scan.on ? `<button class="btn ghost" data-act="f-scanstop" style="margin-top:10px">${ic('x')}Kamera aus</button>` : `<button class="btn" data-act="f-scanstart">${ic('scan')}Kamera starten</button>`}
   <p class="mut small" id="fScanMsg" style="margin:10px 0">${esc(scan.msg || 'Barcode mittig ins Bild halten, mit etwas Abstand.')}</p>
   <form class="srch" data-form="f-code"><input id="fCode" inputmode="numeric" placeholder="Oder Barcode-Nummer eintippen" autocomplete="off"><button class="ibtn" aria-label="Barcode suchen">${ic('search')}</button></form>`;
}
const setScanMsg = m => { scan.msg = m; const x = $('#fScanMsg'); if (x) x.textContent = m; };
function loadScript(src) { return new Promise((ok, no) => { if (window.ZXing) return ok(); const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); }); }
async function startScan() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { setScanMsg('Dein Browser erlaubt hier keine Kamera. Tipp die Nummer unten ein.'); return; }
  scan.on = true; scan.msg = 'Kamera startet …'; $('#fScan').innerHTML = scanHTML();
  const v = $('#fV');
  try {
    let det = null;
    if ('BarcodeDetector' in window) { try { const f = await BarcodeDetector.getSupportedFormats(); if (f.includes('ean_13')) det = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'].filter(x => f.includes(x)) }); } catch (e) { det = null; } }
    if (det) {
      scan.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }, audio: false });
      v.srcObject = scan.stream; await v.play(); setScanMsg('Suche Barcode …');
      const loop = async () => {
        if (!scan.on) return;
        try { const c = await det.detect(v); if (c && c[0] && c[0].rawValue) { onCode(c[0].rawValue); return; } } catch (e) { /* weiter */ }
        scan.raf = setTimeout(loop, 180);
      };
      loop();
    } else {
      setScanMsg('Lade Scanner …'); await loadScript(ZX_URL); if (!scan.on) return;
      const hints = new Map(); hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [ZXing.BarcodeFormat.EAN_13, ZXing.BarcodeFormat.EAN_8, ZXing.BarcodeFormat.UPC_A, ZXing.BarcodeFormat.UPC_E]);
      scan.zx = new ZXing.BrowserMultiFormatReader(hints);
      await scan.zx.decodeFromConstraints({ video: { facingMode: { ideal: 'environment' } } }, v, res => { if (res && scan.on) onCode(res.getText()); });
      setScanMsg('Suche Barcode …');
    }
  } catch (e) {
    stopScan(); const el = $('#fScan'); if (el) el.innerHTML = scanHTML();
    setScanMsg(e && e.name === 'NotAllowedError' ? 'Kamera-Zugriff wurde abgelehnt. Erlaube ihn in den Browser-Einstellungen oder tipp die Nummer ein.' : 'Kamera konnte nicht starten. Tipp die Nummer unten ein.');
  }
}
function stopScan() {
  scan.on = false; clearTimeout(scan.raf);
  try { scan.zx && scan.zx.reset(); } catch (e) { /* egal */ } scan.zx = null;
  if (scan.stream) { scan.stream.getTracks().forEach(t => t.stop()); scan.stream = null; }
}
async function onCode(code) {
  code = String(code).replace(/\D/g, ''); if (!code) return;
  stopScan(); try { navigator.vibrate && navigator.vibrate(80); } catch (e) { /* egal */ }
  const el = $('#fScan'); if (el) el.innerHTML = scanHTML();
  const local = [...S.myFoods, ...S.recent].find(p => p.code === code);
  if (local) { pick(local); return; }
  setScanMsg('Barcode ' + code + ' – frage Open Food Facts …');
  try {
    const p = await byCode(code); if (!sheet) return;
    if (p) { pick(p); return; }
    sheet.tab = 'eigen'; sheet.prefill = { code }; renderSheet(); toast('Produkt nicht gefunden – leg es kurz selbst an.');
  } catch (e) { setScanMsg('Keine Verbindung zu Open Food Facts. Versuch es nochmal.'); }
}

/* ---------- Auswählen, Speichern ---------- */
function pick(p) { sheet.sel = p; sheet.g = p.serving || 100; renderSheet(); }
function remember(p) {
  const slim = { key: p.key, code: p.code || '', name: p.name, brand: p.brand || '', n: p.n, serving: p.serving || 0, sl: p.sl || '', img: p.img || '', src: p.src };
  S.recent = [slim, ...S.recent.filter(x => x.key !== p.key)].slice(0, 40);
}
function commitEntry() {
  const g = +sheet.g; if (!(g > 0)) { toast('Bitte eine Menge in Gramm eingeben.'); return; }
  const p = sheet.sel, d = sheet.date || day;
  if (!S.food[d]) S.food[d] = [];
  if (sheet.mode === 'edit') {
    const e = S.food[d].find(x => x.id === sheet.id); if (e) { e.g = g; e.meal = sheet.meal; }
  } else {
    S.food[d].push({ id: Date.now(), meal: sheet.meal, key: p.key, name: p.name, brand: p.brand || '', g, n: { ...p.n } });
    if (p.src !== 'basis') remember(p);
  }
  save(); const msg = sheet.mode === 'edit' ? 'Geändert.' : `${p.name} eingetragen.`; closeSheet(); app.render(); toast(msg);
}

/* ---------- Ereignisse ---------- */
export function onInput(ev) {
  const t = ev.target, a = t.dataset.act; if (!sheet) return;
  if (a === 'f-q') { sheet.q = t.value; sheet.results = null; sheet.err = ''; renderResults(); }
  else if (a === 'f-g') { sheet.g = t.value === '' ? '' : +t.value; const pv = $('#fPrev'); if (pv) pv.innerHTML = prevHTML(amt(sheet.sel.n, +sheet.g || 0)); document.querySelectorAll('.chips button').forEach(b => b.classList.toggle('on', +b.dataset.v === +sheet.g)); }
}
export function onChange() { /* nichts */ }
export const actions = {
  'f-add': b => openSheet({ meal: b.dataset.m, tab: 'suche', q: '', results: null, sel: null, g: 100, date: day }),
  'f-edit': b => {
    const e = entries(day).find(x => String(x.id) === b.dataset.id); if (!e) return;
    openSheet({ mode: 'edit', id: e.id, meal: e.meal, date: day, sel: { key: e.key, name: e.name, brand: e.brand, n: e.n, serving: 0, src: '' }, g: e.g });
  },
  'f-close': () => closeSheet(),
  'f-tab': b => { if (sheet.tab === 'scan') stopScan(); sheet.tab = b.dataset.v; scan.msg = ''; renderSheet(); if (sheet.tab === 'suche') { const q = $('#fQ'); q && q.focus(); } },
  'f-back': () => { sheet.sel = null; renderSheet(); },
  'f-pick': b => { const p = pool.get(b.dataset.k); if (p) pick(p); },
  'f-gset': b => { sheet.g = +b.dataset.v; renderSheet(); },
  'f-meal': b => { sheet.meal = b.dataset.v; document.querySelectorAll('.mseg button').forEach(x => x.classList.toggle('on', x === b)); },
  'f-commit': () => commitEntry(),
  'f-delent': () => {
    const d = sheet.date || day, arr = S.food[d] || [], i = arr.findIndex(x => x.id === sheet.id); if (i < 0) return;
    const [rm] = arr.splice(i, 1); save(); closeSheet(); app.render();
    toast(rm.name + ' gelöscht.', () => { (S.food[d] ||= []).push(rm); save(); app.render(); });
  },
  'f-scanstart': () => startScan(),
  'f-scanstop': () => { stopScan(); scan.msg = ''; $('#fScan').innerHTML = scanHTML(); },
  'f-search': () => { const q = $('#fQ'); if (q) q.blur(); runSearch(); },
  'f-code': () => { const v = $('#fCode').value; if (v.replace(/\D/g, '').length >= 6) onCode(v); else toast('Bitte die ganze Barcode-Nummer eingeben.'); },
  'f-own': form => {
    const fd = new FormData(form), num = k => +String(fd.get(k) || '0').replace(',', '.') || 0;
    const name = String(fd.get('name') || '').trim(); if (!name) return;
    const p = { key: 'own:' + Date.now(), code: String(fd.get('code') || ''), name, brand: String(fd.get('brand') || '').trim(), n: { kcal: num('kcal'), p: num('p'), c: num('c'), f: num('f') }, serving: num('serving'), sl: '', img: '', src: 'own' };
    S.myFoods.unshift(p); save(); sheet.prefill = null; pick(p);
  },
  'f-day': b => { const n = addDays(day, +b.dataset.v); if (n > today()) return; day = n; app.render(); },
  'f-today': () => { day = today(); app.render(); },
  'f-goals': () => {
    const k = +$('#gK').value, p = +$('#gP').value, f = +$('#gF').value;
    if (!(k >= 1200 && k <= 6000) || !(p >= 30 && p <= 300) || !(f >= 20 && f <= 250)) { toast('Bitte realistische Werte eintragen.'); return; }
    S.goals = { kcal: Math.round(k), p: Math.round(p), f: Math.round(f) }; save(); app.render(); toast('Ziel gespeichert.');
  }
};
export function init() {
  $('#sheet').addEventListener('click', ev => { if (ev.target.id === 'sheet') closeSheet(); });
  addEventListener('keydown', ev => { if (ev.key === 'Escape' && sheet) closeSheet(); });
  addEventListener('hashchange', () => { if (sheet) closeSheet(); });
}
export const kcalToday = () => totals(entries(today())).kcal;
