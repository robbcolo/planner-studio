const BUILD = 'github';
const SEEDS = {"templates":[],"backgrounds":{}};
// ===================== util =====================
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const DEG = Math.PI / 180;
let _uidN = 0;
const uid = (p = 'x') => p + Date.now().toString(36).slice(-5) + (++_uidN).toString(36) + Math.random().toString(36).slice(2, 5);
const deepClone = (o) => JSON.parse(JSON.stringify(o));
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

const V = {
  add: (a, b) => ({ x: a.x + b.x, y: a.y + b.y }),
  sub: (a, b) => ({ x: a.x - b.x, y: a.y - b.y }),
  mul: (a, s) => ({ x: a.x * s, y: a.y * s }),
  dot: (a, b) => a.x * b.x + a.y * b.y,
  len: (a) => Math.hypot(a.x, a.y),
  dist: (a, b) => Math.hypot(a.x - b.x, a.y - b.y),
  norm: (a) => { const l = Math.hypot(a.x, a.y) || 1; return { x: a.x / l, y: a.y / l }; },
  perp: (a) => ({ x: -a.y, y: a.x }),
  rot: (p, th) => ({ x: p.x * Math.cos(th) - p.y * Math.sin(th), y: p.x * Math.sin(th) + p.y * Math.cos(th) }),
};
function projSeg(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy || 1e-9;
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / L2;
  const tc = clamp(t, 0, 1);
  const x = a.x + tc * dx, y = a.y + tc * dy;
  return { t: tc, traw: t, x, y, d: Math.hypot(p.x - x, p.y - y) };
}
function pointInPoly(p, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
function segsIntersect(p1, p2, p3, p4) {
  const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
  if (Math.abs(d) < 1e-12) return false;
  const u = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / d;
  const v = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / d;
  return u >= 0 && u <= 1 && v >= 0 && v <= 1;
}

// Italian number formatting
const nf2 = new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nf0 = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmtM = (m) => nf2.format(m) + ' m';
const fmtCm = (m) => nf0.format(Math.round(m * 100)) + ' cm';
const fmtA = (a) => nf2.format(a) + ' m²';
const fmtEur = (v) => '€ ' + new Intl.NumberFormat('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(v || 0);
const parseNum = (s) => { if (typeof s === 'number') return s; const v = parseFloat(String(s).replace(/\s/g, '').replace(',', '.')); return isFinite(v) ? v : NaN; };
const fmtDate = (ts) => ts ? new Date(ts).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else if (k === 'html') e.innerHTML = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) {
    if (c == null || c === false) continue;
    if (typeof c === 'string' && c.startsWith('<svg')) { e.insertAdjacentHTML('beforeend', c); continue; }
    e.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return e;
}

// ---------- icons ----------
const ICONS = {
  select: '<path d="M5 3l10 6.5-4.6 1.2 2.6 5-1.9 1-2.6-5L5 15z"/>',
  wall: '<path d="M3 6h14M3 10h14" stroke-width="2.6"/><path d="M3 15h14" opacity=".45"/>',
  door: '<path d="M4 17V4M4 4a13 13 0 0 1 13 13M4 17h13"/>',
  window: '<rect x="3" y="7" width="14" height="6" rx="1"/><path d="M3 10h14M10 7v6"/>',
  room: '<path d="M3 3h14v14H3z" stroke-dasharray="2.5 2"/><path d="M7 12.5V8l3 3 3-3v4.5"/>',
  measure: '<path d="M2.5 13.5l11-11 4 4-11 11z"/><path d="M6 10l1.5 1.5M8.5 7.5l1.5 1.5M11 5l1.5 1.5"/>',
  pipe: '<path d="M3 16V9a3 3 0 0 1 3-3h8"/><path d="M14 3v6M17 6h-3"/><circle cx="3" cy="16" r="1.4" fill="currentColor"/>',
  calibrate: '<path d="M3 15l12-12"/><circle cx="4" cy="14" r="2"/><circle cx="14" cy="4" r="2"/><path d="M9 14h8M15 12l2 2-2 2"/>',
  image: '<rect x="3" y="4" width="14" height="12" rx="1.5"/><path d="M3 13l4-4 3 3 2-2 5 5"/><circle cx="13" cy="8" r="1.3"/>',
  plan: '<path d="M3 3h14v14H3z"/><path d="M3 10h6V3M12 17v-5h5"/>',
  cube: '<path d="M10 2.5l7 4v7l-7 4-7-4v-7z"/><path d="M3 6.5l7 4 7-4M10 10.5v7"/>',
  walk: '<circle cx="11" cy="3.5" r="1.6"/><path d="M8 18l2.5-6 2.5 2.5V18M10.5 12l.8-5.5-3.3 2V12M11.3 6.5l2.7 2.5 2.5.5"/>',
  undo: '<path d="M7 5L3 9l4 4"/><path d="M3 9h9a5 5 0 0 1 0 10H8"/>',
  redo: '<path d="M13 5l4 4-4 4"/><path d="M17 9H8a5 5 0 0 0 0 10h4"/>',
  download: '<path d="M10 3v10M6 9l4 4 4-4M4 16h12"/>',
  panel: '<rect x="2.5" y="3.5" width="15" height="13" rx="2"/><path d="M12.5 3.5v13"/>',
  help: '<circle cx="10" cy="10" r="7.5"/><path d="M7.8 7.8a2.3 2.3 0 1 1 3.2 2.1c-.7.3-1 .8-1 1.5v.4"/><circle cx="10" cy="14.4" r=".6" fill="currentColor"/>',
  plus: '<path d="M10 4v12M4 10h12"/>',
  minus: '<path d="M4 10h12"/>',
  fit: '<path d="M3 7V3h4M13 3h4v4M17 13v4h-4M7 17H3v-4"/>',
  close: '<path d="M5 5l10 10M15 5L5 15"/>',
  trash: '<path d="M4 6h12M8 6V4h4v2M6 6l1 11h6l1-11"/>',
  copy: '<rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M13 7V4.5A1.5 1.5 0 0 0 11.5 3h-7A1.5 1.5 0 0 0 3 4.5v7A1.5 1.5 0 0 0 4.5 13H7"/>',
  rotL: '<path d="M4 4v4h4"/><path d="M4.5 8A6.5 6.5 0 1 1 6 14.5"/>',
  rotR: '<path d="M16 4v4h-4"/><path d="M15.5 8A6.5 6.5 0 1 0 14 14.5"/>',
  camera: '<path d="M3 7h3l1.5-2h5L14 7h3v9H3z"/><circle cx="10" cy="11.5" r="3"/>',
  top: '<rect x="4" y="4" width="12" height="12" rx="1"/><circle cx="10" cy="10" r="2"/>',
  iso: '<path d="M10 3l7 4-7 4-7-4z"/><path d="M3 7v6l7 4 7-4V7"/>',
  side: '<path d="M3 15h14M5 15V7h10v8"/>',
  layers: '<path d="M10 3l8 4-8 4-8-4z"/><path d="M2 11l8 4 8-4"/>',
  folder: '<path d="M2.5 5.5h5l1.5 2h8.5v8.5h-15z"/>',
  warn: '<path d="M10 3l8 14H2z"/><path d="M10 8v4"/><circle cx="10" cy="14.6" r=".6" fill="currentColor"/>',
  check: '<path d="M4 10.5l4 4 8-9"/>',
  flip: '<path d="M10 3v14" stroke-dasharray="2 2"/><path d="M7 6L3 10l4 4zM13 6l4 4-4 4z"/>',
  swing: '<path d="M4 16V4M4 4a12 12 0 0 1 12 12" stroke-dasharray="2 2"/><path d="M14 13l2 3 2-3"/>',
  eye: '<path d="M2 10s3-5.5 8-5.5S18 10 18 10s-3 5.5-8 5.5S2 10 2 10z"/><circle cx="10" cy="10" r="2.4"/>',
  sun: '<circle cx="10" cy="10" r="3.2"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.3 4.3l1.4 1.4M14.3 14.3l1.4 1.4M4.3 15.7l1.4-1.4M14.3 5.7l1.4-1.4"/>',
  cut: '<path d="M3 13h14M3 7h14" stroke-dasharray="2 2"/><path d="M5 17V7M15 17V7"/>',
  zones: '<circle cx="10" cy="10" r="7"/><path d="M10 10V3M10 10l6 3.5M10 10l-6 3.5"/>',
  menu: '<path d="M3 5h14M3 10h14M3 15h14"/>',
};
function icon(name, size = 18) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}
function hydrateIcons(root = document) {
  $$('[data-ico]', root).forEach((s) => { if (!s.firstChild) s.innerHTML = icon(s.dataset.ico); });
}

// theme palette for canvas
const PAL = {};
function readPalette() {
  const cs = getComputedStyle(document.documentElement);
  for (const k of ['paper', 'sheet', 'chrome', 'ink', 'ink-2', 'muted', 'line', 'line-2', 'accent', 'accent-weak', 'wall', 'wall-light', 'demo', 'new', 'ok', 'warn', 'bad', 'grid', 'grid-major', 'scene', 'water', 'drain', 'air', 'suction', 'power']) {
    PAL[k] = cs.getPropertyValue('--' + k).trim() || '#888';
  }
  PAL.dark = isDarkTheme();
}
function isDarkTheme() { return false; } // the app always uses the light palette
function hexA(hex, a) {
  if (!hex || hex[0] !== '#') return hex;
  let h = hex.slice(1);
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
function shade(hex, f) { // f -1..1
  let h = hex.slice(1); if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16); let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (f < 0) { r *= 1 + f; g *= 1 + f; b *= 1 + f; } else { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; }
  return '#' + [r, g, b].map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
}

let _toastT;
function toast(msg, ms = 2600) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(_toastT); _toastT = setTimeout(() => t.classList.remove('show'), ms);
}

function loadScript(src) {
  return new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
    const s = document.createElement('script'); s.src = src; s.async = true;
    s.onload = () => res(); s.onerror = () => rej(new Error('Impossibile caricare ' + src));
    document.head.appendChild(s);
  });
}

// ===================== finishes, textures, materials =====================
function rng(seed) { // mulberry32
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

const WALL_COLORS = [
  ['Bianco', '#F3F3EF'], ['Grigio perla', '#D9DCDB'], ['Salvia', '#C5D1C2'], ['Azzurro polvere', '#C6D6E0'],
  ['Sabbia', '#E2D6C2'], ['Verde ottanio', '#2E6A6D'], ['Blu notte', '#2C3958'], ['Antracite', '#3A3F43'],
];
const UPHOLSTERY = [
  ['Blu oceano', '#2F4B7C'], ['Antracite', '#3A3F44'], ['Grigio chiaro', '#A7AFB4'], ['Salvia', '#7D9A86'],
  ['Turchese', '#2A8C8F'], ['Arancio', '#D9773A'], ['Bordeaux', '#7A2E3A'], ['Sabbia', '#C9B79A'],
];
const FINISHES = [
  ['Bianco lucido', '#F1F1EE'], ['Grigio seta', '#C3C7C8'], ['Rovere', 'wood:oak'], ['Noce', 'wood:walnut'],
  ['Antracite', '#3A3F44'], ['Salvia', '#9DB09F'], ['Blu notte', '#2C3958'],
];
const FABRICS = [
  ['Grigio', '#8E9599'], ['Antracite', '#45494D'], ['Blu', '#3D5A80'], ['Verde bosco', '#4E6E58'],
  ['Senape', '#C79A3A'], ['Terracotta', '#B5644A'], ['Panna', '#E5DDCB'], ['Petrolio', '#235A60'],
];
const METALS = [['Cromo', '#D7DCDF'], ['Nero', '#2B2E31'], ['Bianco', '#F0F0EE'], ['Ottone', '#B8955A']];

const FLOORS = {
  'gres-chiaro': { name: 'Gres chiaro 60×60', tint: '#E6E2DA', size: 1.2 },
  'gres-grigio': { name: 'Gres grigio 60×60', tint: '#B5B9B9', size: 1.2 },
  'gres-bagno': { name: 'Gres bagno 30×30', tint: '#ECEFEF', size: 0.9 },
  'pvc-clinico': { name: 'PVC clinico', tint: '#D3DCE0', size: 1.0 },
  'resina': { name: 'Resina bianca', tint: '#EFEFEC', size: 2.4 },
  'parquet': { name: 'Parquet rovere', tint: '#D3B58E', size: 1.2 },
  'marmo': { name: 'Marmo bianco', tint: '#ECEBE7', size: 1.6 },
  'gres-esterno': { name: 'Cotto esterno', tint: '#C68C6A', size: 0.66 },
};

function drawFloorTexture(key, S = 512) {
  const c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'); const r = rng(hashStr(key));
  const noise = (alpha, n = 2500, size = 2) => { for (let i = 0; i < n; i++) { g.fillStyle = r() < .5 ? `rgba(0,0,0,${alpha * r()})` : `rgba(255,255,255,${alpha * r()})`; g.fillRect(r() * S, r() * S, size, size); } };
  const tiles = (n, base, grout, gw, vary) => {
    g.fillStyle = grout; g.fillRect(0, 0, S, S);
    const t = S / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      g.fillStyle = shade(base, (r() - .5) * vary);
      g.fillRect(i * t + gw / 2, j * t + gw / 2, t - gw, t - gw);
    }
  };
  switch (key) {
    case 'gres-chiaro': tiles(2, '#E3DFD7', '#C9C3B8', 3, .05); noise(.05, 6000); break;
    case 'gres-grigio': tiles(2, '#AEB2B2', '#8E9393', 3, .06); noise(.07, 7000); break;
    case 'gres-bagno': tiles(3, '#EDEFEF', '#C6CBCB', 3, .03); noise(.03, 3000); break;
    case 'gres-esterno': tiles(2, '#C4876A', '#9A6650', 4, .12); noise(.08, 6000, 2); break;
    case 'pvc-clinico': {
      g.fillStyle = '#D2DBDF'; g.fillRect(0, 0, S, S);
      for (let i = 0; i < 9000; i++) { const v = r(); g.fillStyle = v < .33 ? 'rgba(90,110,120,.35)' : v < .66 ? 'rgba(255,255,255,.55)' : 'rgba(150,170,180,.4)'; g.fillRect(r() * S, r() * S, 1 + r() * 2, 1 + r() * 2); }
      break;
    }
    case 'resina': {
      g.fillStyle = '#EEEEEB'; g.fillRect(0, 0, S, S);
      for (let i = 0; i < 60; i++) { const x = r() * S, y = r() * S, rad = 30 + r() * 90; const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, `rgba(${r() < .5 ? '0,0,0' : '255,255,255'},.035)`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, S, S); }
      noise(.02, 2000); break;
    }
    case 'parquet': {
      const pw = S / 8; // 0.15 m planks on 1.2 m
      for (let i = 0; i < 8; i++) {
        let y = -r() * S;
        while (y < S) {
          const len = S * (0.35 + r() * 0.5);
          const base = shade('#C9A374', (r() - .5) * .22);
          g.fillStyle = base; g.fillRect(i * pw, y, pw, len);
          g.strokeStyle = 'rgba(80,50,20,.18)'; g.lineWidth = 1;
          for (let k = 0; k < 7; k++) { const xx = i * pw + 3 + r() * (pw - 6); g.beginPath(); g.moveTo(xx, y); g.bezierCurveTo(xx + (r() - .5) * 6, y + len * .3, xx + (r() - .5) * 6, y + len * .7, xx + (r() - .5) * 4, y + len); g.stroke(); }
          g.fillStyle = 'rgba(70,45,20,.45)'; g.fillRect(i * pw, y, pw, 1.5); g.fillRect(i * pw, y, 1.5, len);
          y += len;
        }
      }
      // wrap vertical seams
      break;
    }
    case 'marmo': {
      g.fillStyle = '#ECEBE6'; g.fillRect(0, 0, S, S);
      for (let v = 0; v < 7; v++) {
        g.strokeStyle = `rgba(110,110,115,${.08 + r() * .18})`; g.lineWidth = .6 + r() * 2.2;
        g.beginPath(); let x = r() * S, y = 0; g.moveTo(x, y);
        while (y < S) { x += (r() - .5) * 40; y += 12 + r() * 20; g.lineTo(x, y); }
        g.stroke();
      }
      noise(.03, 3000); break;
    }
    default: g.fillStyle = '#ddd'; g.fillRect(0, 0, S, S);
  }
  return c;
}
function drawWoodTexture(kind = 'oak', S = 256) {
  const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'); const r = rng(kind === 'oak' ? 11 : 23);
  const base = kind === 'oak' ? '#C8A175' : '#6B4A33';
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 70; i++) {
    g.strokeStyle = kind === 'oak' ? `rgba(90,60,25,${.06 + r() * .12})` : `rgba(30,18,10,${.08 + r() * .18})`;
    g.lineWidth = .5 + r() * 1.5; g.beginPath(); const y0 = r() * S; g.moveTo(0, y0);
    g.bezierCurveTo(S * .3, y0 + (r() - .5) * 14, S * .7, y0 + (r() - .5) * 14, S, y0 + (r() - .5) * 6); g.stroke();
  }
  return c;
}
function drawPaintingTexture(seed, S = 256) {
  const c = document.createElement('canvas'); c.width = S; c.height = Math.round(S * .75); const g = c.getContext('2d'); const r = rng(seed);
  const pals = [['#E9E3D6', '#2E6A6D', '#D9773A', '#2C3958', '#C9B79A'], ['#F2EEE6', '#7A2E3A', '#3D5A80', '#C79A3A', '#8E9599'], ['#EDE8DE', '#4E6E58', '#B5644A', '#E5DDCB', '#235A60']];
  const p = pals[Math.floor(r() * pals.length)];
  g.fillStyle = p[0]; g.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < 7; i++) {
    g.fillStyle = p[1 + Math.floor(r() * 4)]; g.globalAlpha = .75 + r() * .25;
    if (r() < .5) { g.beginPath(); g.arc(r() * c.width, r() * c.height, 12 + r() * 50, 0, Math.PI * 2); g.fill(); }
    else g.fillRect(r() * c.width, r() * c.height, 20 + r() * 90, 10 + r() * 60);
  }
  g.globalAlpha = 1; return c;
}

// ---------- three.js material cache (THREE is loaded lazily) ----------
let THREE = null, OrbitControls = null, RoomEnvironment = null, RoundedBoxGeometry = null;
const MATS = new Map();
const TEX = new Map();
function texFor(key, repeatMeters) {
  if (TEX.has(key)) return TEX.get(key);
  let canvas;
  if (key.startsWith('floor:')) canvas = drawFloorTexture(key.slice(6));
  else if (key.startsWith('wood:')) canvas = drawWoodTexture(key.slice(5));
  else if (key.startsWith('paint:')) canvas = drawPaintingTexture(parseInt(key.slice(6), 10));
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  TEX.set(key, t); return t;
}
function mat(kind, color) {
  const key = kind + '|' + (color || '');
  if (MATS.has(key)) return MATS.get(key);
  let m;
  const C = (c) => new THREE.Color(c);
  switch (kind) {
    case 'plastic': m = new THREE.MeshStandardMaterial({ color: C(color || '#F2F2EF'), roughness: .35, metalness: 0 }); break;
    case 'matte': m = new THREE.MeshStandardMaterial({ color: C(color || '#DDDDDD'), roughness: .85, metalness: 0 }); break;
    case 'lacquer': m = new THREE.MeshStandardMaterial({ color: C(color || '#F1F1EE'), roughness: .25, metalness: 0 }); break;
    case 'uph': m = new THREE.MeshStandardMaterial({ color: C(color || '#2F4B7C'), roughness: .55, metalness: 0 }); break;
    case 'fabric': m = new THREE.MeshStandardMaterial({ color: C(color || '#8E9599'), roughness: .95, metalness: 0 }); break;
    case 'chrome': m = new THREE.MeshStandardMaterial({ color: C(color || '#D9DEE1'), roughness: .18, metalness: 1 }); break;
    case 'steel': m = new THREE.MeshStandardMaterial({ color: C(color || '#B8BEC2'), roughness: .38, metalness: .9 }); break;
    case 'metal': m = new THREE.MeshStandardMaterial({ color: C(color || '#2B2E31'), roughness: .45, metalness: .6 }); break;
    case 'dark': m = new THREE.MeshStandardMaterial({ color: C(color || '#2A2D30'), roughness: .5, metalness: 0 }); break;
    case 'rubber': m = new THREE.MeshStandardMaterial({ color: C('#1E2022'), roughness: .9, metalness: 0 }); break;
    case 'ceramic': m = new THREE.MeshStandardMaterial({ color: C(color || '#FAFAF8'), roughness: .12, metalness: 0 }); break;
    case 'glass': m = new THREE.MeshStandardMaterial({ color: C(color || '#BFDDE3'), roughness: .05, metalness: .1, transparent: true, opacity: .22, depthWrite: false, side: THREE.DoubleSide }); break;
    case 'screen': m = new THREE.MeshStandardMaterial({ color: C('#0E1418'), roughness: .2, metalness: .2, emissive: C('#1b3a48'), emissiveIntensity: .35 }); break;
    case 'emit': m = new THREE.MeshStandardMaterial({ color: C('#FFFFFF'), emissive: C(color || '#FFF7E8'), emissiveIntensity: 1.2 }); break;
    case 'wood': { const t = texFor('wood:' + (color || 'oak')); m = new THREE.MeshStandardMaterial({ map: t, roughness: .6, metalness: 0 }); break; }
    case 'leaf': m = new THREE.MeshStandardMaterial({ color: C(color || '#4F7A45'), roughness: .8, metalness: 0, flatShading: true }); break;
    case 'concrete': m = new THREE.MeshStandardMaterial({ color: C(color || '#B9B8B3'), roughness: .95 }); break;
    case 'wall': m = new THREE.MeshStandardMaterial({ color: C(color || '#F3F3EF'), roughness: .92, metalness: 0 }); break;
    case 'wallcap': m = new THREE.MeshStandardMaterial({ color: C(color || '#3A4246'), roughness: .9 }); break;
    case 'ghost': m = new THREE.MeshStandardMaterial({ color: C(color || '#F0C02E'), roughness: .9, transparent: true, opacity: .38, depthWrite: false }); break;
    case 'zone': m = new THREE.MeshBasicMaterial({ color: C(color || '#0E6B70'), transparent: true, opacity: .22, depthWrite: false, side: THREE.DoubleSide }); break;
    case 'line': m = new THREE.MeshBasicMaterial({ color: C(color || '#0E6B70') }); break;
    case 'floor': { const t = texFor('floor:' + color); m = new THREE.MeshStandardMaterial({ map: t, roughness: color === 'parquet' ? .55 : color === 'marmo' ? .2 : .5, metalness: 0 }); break; }
    case 'paint': { const t = texFor('paint:' + color); m = new THREE.MeshStandardMaterial({ map: t, roughness: .8 }); break; }
    default: m = new THREE.MeshStandardMaterial({ color: C(color || '#cccccc'), roughness: .6 });
  }
  MATS.set(key, m); return m;
}
// finish → material (handles wood:*)
function finishMat(c, kind = 'lacquer') {
  if (typeof c === 'string' && c.startsWith('wood:')) return mat('wood', c.slice(5));
  return mat(kind, c);
}

// ===================== catalog: 2D symbols + 3D builders =====================
const CATS = ['Sala operativa', 'Radiologia', 'Sterilizzazione', 'Sala tecnica', 'Accoglienza e attesa', 'Ufficio e arredo', 'Bagno', 'Impianti', 'Struttura'];

// ---- 2D helpers (local frame in meters, +y = front of the item) ----
function pRect(g, x, y, w, h) { g.beginPath(); g.rect(x, y, w, h); }
function pRRect(g, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); }
function pCirc(g, x, y, r) { g.beginPath(); g.arc(x, y, Math.max(r, 0.001), 0, Math.PI * 2); }
function pEll(g, x, y, rx, ry) { g.beginPath(); g.ellipse(x, y, Math.max(rx, .001), Math.max(ry, .001), 0, 0, Math.PI * 2); }
function pLine(g, x1, y1, x2, y2) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
function fs(g, P, fill = true) { if (fill) { g.fillStyle = P.fill; g.fill(); } g.strokeStyle = P.stroke; g.lineWidth = P.lw; g.stroke(); }
function det(g, P, dashed) { g.strokeStyle = P.detail; g.lineWidth = P.lw * .8; if (dashed) g.setLineDash([P.lw * 4, P.lw * 3]); g.stroke(); g.setLineDash([]); }
function genericPlan(g, it, d, P) { pRRect(g, -d.w / 2, -d.d / 2, d.w, d.d, Math.min(d.w, d.d) * .06); fs(g, P); }
function cabinetPlan(g, it, d, P) { genericPlan(g, it, d, P); pLine(g, -d.w / 2 + .03, d.d / 2 - .05, d.w / 2 - .03, d.d / 2 - .05); g.strokeStyle = P.detail; }
function tallPlan(g, it, d, P) { genericPlan(g, it, d, P); g.beginPath(); g.moveTo(-d.w / 2, -d.d / 2); g.lineTo(d.w / 2, d.d / 2); g.moveTo(d.w / 2, -d.d / 2); g.lineTo(-d.w / 2, d.d / 2); det(g, P); }
function hungPlan(g, it, d, P) { pRect(g, -d.w / 2, -d.d / 2, d.w, d.d); g.fillStyle = P.fillSoft; g.fill(); g.strokeStyle = P.stroke; g.lineWidth = P.lw; g.setLineDash([P.lw * 5, P.lw * 3]); g.stroke(); g.setLineDash([]); }
function sinkInTop(g, x, y, w, h, P) { pRRect(g, x - w / 2, y - h / 2, w, h, .04); g.fillStyle = P.fillSoft; g.fill(); det(g, P); pCirc(g, x, y, .02); det(g, P); }

// ---- 3D helpers ----
function grp() { return new THREE.Group(); }
function add(g, geo, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const mesh = new THREE.Mesh(geo, m); mesh.position.set(x, y, z); mesh.rotation.set(rx, ry, rz);
  mesh.castShadow = true; mesh.receiveShadow = true; g.add(mesh); return mesh;
}
const bx = (w, h, d) => new THREE.BoxGeometry(Math.max(w, .001), Math.max(h, .001), Math.max(d, .001));
const rbx = (w, h, d, r = .02) => { const rr = Math.max(.0005, Math.min(r, w / 2 - .0005, h / 2 - .0005, d / 2 - .0005)); return new RoundedBoxGeometry(Math.max(w, .002), Math.max(h, .002), Math.max(d, .002), 2, rr); };
const cy = (rt, rb, h, s = 24) => new THREE.CylinderGeometry(rt, rb, Math.max(h, .001), s);
const sp = (r, ws = 20, hs = 14) => new THREE.SphereGeometry(r, ws, hs);
function rod(g, a, b, r, m, seg = 12) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b); const L = A.distanceTo(B);
  const mesh = new THREE.Mesh(cy(r, r, L, seg), m); mesh.position.copy(A).add(B).multiplyScalar(.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  mesh.castShadow = true; g.add(mesh); return mesh;
}
function cabinetBody(g, w, d, h, finish, opts = {}) {
  const plinth = opts.plinth ?? .08, top = opts.top ?? .03, doors = opts.doors ?? Math.max(1, Math.round(w / .5));
  const body = finishMat(finish);
  add(g, bx(w - .04, plinth, d - .06), mat('dark', '#2b2f33'), 0, plinth / 2, -.02);
  add(g, bx(w, h - plinth - top, d - .02), body, 0, plinth + (h - plinth - top) / 2, -.01);
  if (opts.drawers) {
    const n = opts.drawers, hh = (h - plinth - top) / n;
    for (let i = 0; i < n; i++) {
      add(g, bx(w - .01, hh - .006, .018), body, 0, plinth + hh * i + hh / 2, d / 2 - .009);
      add(g, bx(Math.min(.2, w * .4), .012, .015), mat('steel'), 0, plinth + hh * i + hh * .75, d / 2 + .006);
    }
  } else {
    const dw = w / doors;
    for (let i = 0; i < doors; i++) {
      add(g, bx(dw - .006, h - plinth - top - .006, .018), body, -w / 2 + dw * i + dw / 2, plinth + (h - plinth - top) / 2, d / 2 - .009);
      const hx = -w / 2 + dw * i + (i % 2 ? .05 : dw - .05);
      add(g, bx(.012, Math.min(.18, h * .3), .015), mat('steel'), hx, h - top - .14, d / 2 + .006);
    }
  }
  if (top > 0) add(g, bx(w + .01, top, d + .01), opts.topMat || mat('plastic', '#E9EAE8'), 0, h - top / 2, 0);
}

// ---------- catalog ----------
const CATALOG = [
  // ---------------- Sala operativa ----------------
  {
    type: 'riunito', name: 'Riunito (tipo Sinius TS, fruste)', cat: 'Sala operativa', w: 1.05, d: 1.95, h: 1.95,
    colorKind: 'uph', color: '#2F4B7C', zones: true, note: 'Ingombro indicativo con poltrona reclinata, unità idrica e lampada. Verifica le quote sul foglio di installazione del tuo modello.',
    plan(g, it, d, P) {
      const sx = d.w / 1.05, sy = d.d / 1.95; g.save(); if (it.hand === 'sx') g.scale(-1, 1); g.scale(sx, sy);
      const a = -0.975, cx = -0.08;
      pRRect(g, cx - .15, a, .30, .27, .06); fs(g, P);
      pRRect(g, cx - .26, a + .24, .52, .64, .07); fs(g, P);
      pRRect(g, cx - .27, a + .86, .54, .52, .06); fs(g, P);
      pRRect(g, cx - .24, a + 1.36, .48, .58, .06); fs(g, P);
      pRRect(g, .25, a + .45, .26, .44, .05); fs(g, P);
      pCirc(g, .30, a + .61, .1); det(g, P);
      pRRect(g, cx - .26, .27, .52, .30, .04); det(g, P, true);
      for (let i = 0; i < 5; i++) { pLine(g, cx - .2 + i * .1, .27, cx - .2 + i * .1, .20); }
      pRect(g, .27, a + .14, .2, .12); det(g, P);
      g.beginPath(); g.moveTo(.42, a + .79); g.lineTo(.10, a + .2); det(g, P, true);
      pEll(g, cx + .06, a + .0, .2, .11); det(g, P, true);
      pCirc(g, cx - .34, .64, .13); det(g, P);
      g.restore();
    },
    build(it, d) {
      const g = grp(); const W = mat('plastic', '#F4F5F3'), U = mat('uph', it.color || '#2F4B7C'), Gr = mat('plastic', '#C7CCCF'), Dk = mat('dark');
      const cx = -.08;
      add(g, rbx(.56, .06, 1.0, .02), W, cx, .03, .12);
      add(g, rbx(.30, .30, .40, .04), Gr, cx, .21, .02);
      add(g, rbx(.50, .07, .50, .03), W, cx, .43, .13);
      add(g, rbx(.54, .10, .50, .045), U, cx, .51, .13);
      add(g, rbx(.48, .05, .60, .02), W, cx, .52, -.42, .14);
      add(g, rbx(.52, .10, .64, .045), U, cx, .585, -.42, .14);
      add(g, rbx(.08, .04, .14, .01), Gr, cx, .64, -.76, .1);
      add(g, rbx(.29, .09, .25, .04), U, cx, .69, -.87, .1);
      add(g, rbx(.46, .05, .58, .02), W, cx, .41, .66, .2);
      add(g, rbx(.50, .10, .60, .045), U, cx, .475, .66, .2);
      add(g, rbx(.40, .06, .10, .02), W, cx, .36, .97);
      // water unit + cuspidor
      add(g, rbx(.26, .86, .44, .05), W, .38, .43, -.30);
      add(g, rbx(.30, .04, .48, .02), Gr, .38, .88, -.30);
      add(g, cy(.115, .07, .11, 28), mat('ceramic'), .30, .86, -.36);
      add(g, cy(.09, .09, .006, 24), mat('dark', '#61707A'), .30, .913, -.36);
      rod(g, [.37, .92, -.44], [.32, .99, -.40], .008, mat('chrome'));
      // assistant element
      add(g, rbx(.05, .04, .30, .01), Gr, .43, .80, -.60);
      add(g, rbx(.22, .06, .12, .02), W, .36, .82, -.77);
      for (let i = 0; i < 3; i++) add(g, cy(.012, .012, .17, 10), Dk, .29 + i * .06, .91, -.77);
      // lamp
      add(g, cy(.035, .035, 1.0, 16), W, .42, 1.38, -.18);
      rod(g, [.42, 1.86, -.18], [.10, 1.80, -.78], .024, W);
      rod(g, [.10, 1.80, -.78], [.02, 1.68, -.93], .02, W);
      const lh = add(g, sp(1, 24, 12), W, -.02, 1.63, -.98); lh.scale.set(.2, .06, .12);
      add(g, cy(.085, .085, .01, 24), mat('emit'), -.02, 1.585, -.98);
      // monitor
      rod(g, [.42, 1.45, -.18], [.50, 1.45, -.02], .015, W);
      const mon = grp(); add(mon, rbx(.52, .32, .03, .01), Dk); add(mon, bx(.48, .28, .002), mat('screen'), 0, 0, .016);
      mon.position.set(.52, 1.45, .02); mon.rotation.y = -.7; g.add(mon);
      // doctor element (over-the-patient, fruste)
      rod(g, [cx - .14, .30, .05], [-.46, .55, .22], .028, Gr);
      rod(g, [-.46, .55, .22], [-.46, .95, .30], .028, W);
      rod(g, [-.46, .95, .30], [cx - .22, .98, .40], .025, W);
      add(g, rbx(.52, .07, .30, .03), W, cx, .99, .42);
      add(g, rbx(.40, .01, .14, .004), Gr, cx, 1.03, .48);
      add(g, bx(.15, .005, .08), mat('screen'), cx + .15, 1.028, .37);
      for (let i = 0; i < 5; i++) {
        const x = cx - .20 + i * .10;
        rod(g, [x, 1.02, .29], [x, 1.30, .22], .009, Gr);
        rod(g, [x, 1.30, .22], [x, 1.19, .37], .013, i === 2 ? mat('steel') : Dk);
      }
      add(g, cy(.13, .14, .04, 24), Dk, cx - .34, .02, .64);
      add(g, rbx(.12, .02, .08, .006), Gr, cx - .34, .05, .64);
      g.scale.set(d.w / 1.05 * (it.hand === 'sx' ? -1 : 1), d.h / 1.95, d.d / 1.95);
      return g;
    },
  },
  {
    type: 'sgabello-operatore', name: 'Sgabello operatore', cat: 'Sala operativa', w: .58, d: .58, h: .9, colorKind: 'uph', color: '#2F4B7C', snap: false,
    plan(g, it, d, P) { pCirc(g, 0, 0, d.w / 2); g.fillStyle = P.fillSoft; g.fill(); det(g, P, true); pCirc(g, 0, 0, .22); fs(g, P); g.beginPath(); g.arc(0, 0, .25, Math.PI * .15, Math.PI * .85); g.strokeStyle = P.stroke; g.lineWidth = P.lw * 2.2; g.stroke(); },
    build(it, d) {
      const g = grp(); const s = d.w / .58;
      for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; add(g, rbx(.27 * s, .035, .05, .012), mat('metal', '#2B2E31'), Math.cos(a) * .135 * s, .07, Math.sin(a) * .135 * s, 0, -a); add(g, sp(.028), mat('rubber'), Math.cos(a) * .27 * s, .028, Math.sin(a) * .27 * s); }
      add(g, cy(.03, .03, .40, 12), mat('chrome'), 0, .30, 0);
      add(g, cy(.23, .22, .08, 28), mat('uph', it.color), 0, .54, 0);
      add(g, rbx(.32, .14, .05, .03), mat('uph', it.color), 0, .76, .22);
      rod(g, [0, .52, .17], [0, .72, .22], .015, mat('chrome'));
      return g;
    },
  },
  {
    type: 'sgabello-assistente', name: 'Sgabello assistente', cat: 'Sala operativa', w: .6, d: .6, h: 1.0, colorKind: 'uph', color: '#2F4B7C', snap: false,
    plan(g, it, d, P) { pCirc(g, 0, 0, d.w / 2); g.fillStyle = P.fillSoft; g.fill(); det(g, P, true); pCirc(g, 0, 0, .2); fs(g, P); pCirc(g, 0, 0, .26); det(g, P); g.beginPath(); g.moveTo(.18, -.1); g.quadraticCurveTo(.32, 0, .18, .12); g.strokeStyle = P.stroke; g.lineWidth = P.lw * 2.2; g.stroke(); },
    build(it, d) {
      const g = grp(); const s = d.w / .6;
      for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; add(g, rbx(.28 * s, .035, .05, .012), mat('metal'), Math.cos(a) * .14 * s, .07, Math.sin(a) * .14 * s, 0, -a); add(g, sp(.028), mat('rubber'), Math.cos(a) * .28 * s, .028, Math.sin(a) * .28 * s); }
      add(g, cy(.03, .03, .55, 12), mat('chrome'), 0, .36, 0);
      const ring = add(g, new THREE.TorusGeometry(.2, .012, 8, 32), mat('chrome'), 0, .38, 0); ring.rotation.x = Math.PI / 2;
      add(g, cy(.2, .19, .08, 28), mat('uph', it.color), 0, .68, 0);
      rod(g, [.12, .70, 0], [.20, .90, 0], .015, mat('chrome'));
      add(g, rbx(.06, .10, .30, .03), mat('uph', it.color), .22, .93, 0);
      return g;
    },
  },
  {
    type: 'mobile-operativo', name: 'Mobile operativo a cassetti', cat: 'Sala operativa', w: .9, d: .5, h: .88, colorKind: 'finish', color: '#F1F1EE', snap: true,
    plan: cabinetPlan, build(it, d) { const g = grp(); cabinetBody(g, d.w, d.d, d.h, it.color, { drawers: 4 }); return g; },
  },
  {
    type: 'mobile-lavello', name: 'Mobile con lavello', cat: 'Sala operativa', w: 1.2, d: .55, h: .9, colorKind: 'finish', color: '#F1F1EE', snap: true,
    plan(g, it, d, P) { cabinetPlan(g, it, d, P); sinkInTop(g, -d.w / 2 + .3, 0, .4, d.d * .6, P); },
    build(it, d) {
      const g = grp(); cabinetBody(g, d.w, d.d, d.h, it.color, { doors: Math.max(2, Math.round(d.w / .45)) });
      const sx = -d.w / 2 + .3; add(g, bx(.40, .012, d.d * .6), mat('steel'), sx, d.h + .001, 0); add(g, bx(.36, .01, d.d * .5), mat('dark', '#5c656b'), sx, d.h + .004, 0);
      rod(g, [sx, d.h, -d.d / 2 + .06], [sx, d.h + .28, -d.d / 2 + .06], .012, mat('chrome')); rod(g, [sx, d.h + .28, -d.d / 2 + .06], [sx, d.h + .26, -d.d / 2 + .2], .011, mat('chrome'));
      return g;
    },
  },
  {
    type: 'carrello', name: 'Carrello / servomobile', cat: 'Sala operativa', w: .45, d: .45, h: .82, colorKind: 'finish', color: '#F1F1EE', snap: false,
    plan(g, it, d, P) { genericPlan(g, it, d, P); pRect(g, -d.w / 2 + .04, -d.d / 2 + .04, d.w - .08, d.d - .08); det(g, P); },
    build(it, d) { const g = grp(); for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) add(g, sp(.025), mat('rubber'), x * (d.w / 2 - .05), .025, z * (d.d / 2 - .05)); add(g, rbx(d.w, d.h - .07, d.d, .03), finishMat(it.color, 'plastic'), 0, .05 + (d.h - .07) / 2, 0); for (let i = 1; i < 4; i++) add(g, bx(d.w - .02, .004, .01), mat('dark'), 0, .05 + (d.h - .07) * i / 4, d.d / 2 + .002); return g; },
  },
  {
    type: 'pensile', name: 'Pensile', cat: 'Sala operativa', w: .9, d: .35, h: .7, elev: 1.45, mount: 'wall', colorKind: 'finish', color: '#F1F1EE', snap: true,
    plan: hungPlan, build(it, d) { const g = grp(); add(g, bx(d.w, d.h, d.d - .02), finishMat(it.color), 0, d.h / 2, -.01); const n = Math.max(1, Math.round(d.w / .45)); for (let i = 0; i < n; i++) add(g, bx(d.w / n - .006, d.h - .006, .018), finishMat(it.color), -d.w / 2 + d.w / n * (i + .5), d.h / 2, d.d / 2 - .009); return g; },
  },
  {
    type: 'monitor-parete', name: 'Monitor a parete', cat: 'Sala operativa', w: .62, d: .08, h: .38, elev: 1.55, mount: 'wall', snap: true,
    plan: hungPlan, build(it, d) { const g = grp(); add(g, rbx(d.w, d.h, .03, .008), mat('dark')); add(g, bx(d.w - .03, d.h - .03, .002), mat('screen'), 0, 0, .016); g.children.forEach((c) => c.position.y += d.h / 2); add(g, bx(.1, .1, d.d - .03), mat('metal'), 0, d.h / 2, -d.d / 2 + .02); return g; },
  },
  {
    type: 'microscopio', name: 'Microscopio su stativo', cat: 'Sala operativa', w: .7, d: .7, h: 1.85, snap: false,
    plan(g, it, d, P) { pCirc(g, 0, 0, d.w / 2); g.fillStyle = P.fillSoft; g.fill(); det(g, P, true); pRect(g, -.12, -.12, .24, .24); fs(g, P); pLine(g, 0, 0, .1, .45); },
    build(it, d) { const g = grp(); for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; add(g, rbx(.33, .05, .07, .015), mat('plastic'), Math.cos(a) * .16, .06, Math.sin(a) * .16, 0, -a); add(g, sp(.03), mat('rubber'), Math.cos(a) * .32, .03, Math.sin(a) * .32); } add(g, cy(.06, .07, 1.4, 16), mat('plastic'), 0, .78, 0); rod(g, [0, 1.48, 0], [.05, 1.62, .42], .03, mat('plastic')); add(g, rbx(.12, .22, .12, .03), mat('plastic', '#E3E6E8'), .05, 1.48, .45); add(g, cy(.03, .03, .14, 12), mat('dark'), .05, 1.40, .52, Math.PI / 2.5); return g; },
  },
  {
    type: 'scanner', name: 'Scanner intraorale (carrello)', cat: 'Sala operativa', w: .5, d: .5, h: 1.3, snap: false,
    plan(g, it, d, P) { pCirc(g, 0, 0, d.w / 2); g.fillStyle = P.fillSoft; g.fill(); det(g, P, true); pRect(g, -.2, -.05, .4, .1); fs(g, P); },
    build(it, d) { const g = grp(); for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; add(g, rbx(.24, .04, .05, .012), mat('plastic'), Math.cos(a) * .11, .05, Math.sin(a) * .11, 0, -a); add(g, sp(.025), mat('rubber'), Math.cos(a) * .22, .025, Math.sin(a) * .22); } add(g, cy(.035, .035, 1.0, 12), mat('plastic', '#D8DCDE'), 0, .56, 0); add(g, rbx(.40, .28, .04, .01), mat('dark'), 0, 1.15, 0, -.2); add(g, bx(.37, .25, .002), mat('screen'), 0, 1.152, .022, -.2); add(g, rbx(.06, .03, .22, .012), mat('plastic'), .22, 1.0, .05); return g; },
  },
  // ---------------- Radiologia ----------------
  {
    type: 'opt', name: 'OPT panoramico', cat: 'Radiologia', w: 1.0, d: 1.25, h: 2.3, snap: false, note: 'Ingombro indicativo: verifica lo spazio richiesto dal produttore e i requisiti di radioprotezione.',
    plan(g, it, d, P) { genericPlan(g, it, d, P); pRect(g, -.15, -d.d / 2 + .05, .3, .32); fs(g, P); pCirc(g, 0, .05, Math.min(d.w, d.d) * .46); det(g, P, true); pLine(g, -.45 * d.w, .05, .45 * d.w, .05); },
    build(it, d) {
      const g = grp(); const W = mat('plastic', '#F2F3F1'); const sx = d.w / 1.0, sz = d.d / 1.25, sh = d.h / 2.3;
      add(g, rbx(.8, .04, .9, .02), mat('plastic', '#D5D9DB'), 0, .02, -.05);
      add(g, rbx(.28, 2.25, .3, .04), W, 0, 1.13, -.45);
      add(g, rbx(.34, .5, .38, .05), W, 0, 1.3, -.3);
      add(g, rbx(.95, .1, .26, .05), W, 0, 1.78, .02);
      add(g, rbx(.18, .38, .22, .04), W, -.40, 1.52, .02);
      add(g, rbx(.1, .32, .18, .03), mat('plastic', '#3A4246'), .41, 1.52, .02);
      add(g, rbx(.22, .04, .1, .02), W, 0, 1.3, .12);
      rod(g, [-.13, 1.25, .12], [-.13, 1.25, .26], .012, mat('chrome')); rod(g, [.13, 1.25, .12], [.13, 1.25, .26], .012, mat('chrome'));
      g.scale.set(sx, sh, sz); return g;
    },
  },
  {
    type: 'rx-endorale', name: 'RX endorale a parete', cat: 'Radiologia', w: .35, d: .25, h: .3, elev: 1.11, mount: 'wall', snap: true,
    note: 'Quota consigliata dell\'adattatore a parete per Heliodent Plus: 1110 mm (requisiti di installazione Sirona).',
    plan(g, it, d, P) { hungPlan(g, it, d, P); pLine(g, 0, 0, .35, .6); pCirc(g, .35, .6, .08); det(g, P, true); },
    build(it, d) { const g = grp(); add(g, rbx(.22, .3, .06, .01), mat('plastic'), 0, .15, -d.d / 2 + .03); rod(g, [0, .2, -d.d / 2 + .06], [.15, .22, .35], .025, mat('plastic')); rod(g, [.15, .22, .35], [.32, .2, .62], .022, mat('plastic')); add(g, cy(.06, .06, .22, 18), mat('plastic', '#E8EAEA'), .32, .2, .68, Math.PI / 2); add(g, cy(.04, .04, .08, 14), mat('dark'), .32, .2, .82, Math.PI / 2); return g; },
  },
  // ---------------- Sterilizzazione ----------------
  {
    type: 'mobile-sterilizzazione', name: 'Banco sterilizzazione con lavello', cat: 'Sterilizzazione', w: 2.0, d: .6, h: .9, colorKind: 'finish', color: '#F1F1EE', snap: true,
    plan(g, it, d, P) { cabinetPlan(g, it, d, P); sinkInTop(g, -d.w / 2 + .3, 0, .42, d.d * .62, P); },
    build(it, d) { const g = grp(); cabinetBody(g, d.w, d.d, d.h, it.color, { doors: Math.max(2, Math.round(d.w / .5)), topMat: mat('steel', '#C9CED1') }); const sx = -d.w / 2 + .3; add(g, bx(.36, .01, d.d * .52), mat('dark', '#5c656b'), sx, d.h + .004, 0); rod(g, [sx, d.h, -d.d / 2 + .06], [sx, d.h + .3, -d.d / 2 + .06], .012, mat('chrome')); rod(g, [sx, d.h + .3, -d.d / 2 + .06], [sx, d.h + .27, -d.d / 2 + .22], .011, mat('chrome')); return g; },
  },
  {
    type: 'autoclave', name: 'Autoclave (da banco)', cat: 'Sterilizzazione', w: .46, d: .6, h: .45, elev: .9, mount: 'counter', snap: true,
    plan(g, it, d, P) { genericPlan(g, it, d, P); pEll(g, 0, d.d / 2 - .04, d.w * .3, .03); det(g, P); },
    build(it, d) { const g = grp(); add(g, rbx(d.w, d.h, d.d, .04), mat('plastic', '#F3F4F2'), 0, d.h / 2, 0); add(g, cy(d.h * .32, d.h * .32, .03, 32), mat('plastic', '#D2D7DA'), -.03, d.h * .52, d.d / 2 + .01, Math.PI / 2); add(g, bx(.08, .05, .005), mat('screen'), d.w / 2 - .07, d.h * .78, d.d / 2 + .003); return g; },
  },
  {
    type: 'termodisinfettore', name: 'Termodisinfettore (sottopiano)', cat: 'Sterilizzazione', w: .6, d: .6, h: .85, snap: true,
    plan(g, it, d, P) { genericPlan(g, it, d, P); pLine(g, -d.w / 2 + .04, d.d / 2 - .06, d.w / 2 - .04, d.d / 2 - .06); },
    build(it, d) { const g = grp(); add(g, rbx(d.w, d.h, d.d, .01), mat('steel', '#D0D5D8'), 0, d.h / 2, 0); add(g, bx(d.w - .04, .1, .006), mat('screen'), 0, d.h - .07, d.d / 2 + .003); add(g, bx(.25, .015, .02), mat('dark'), 0, d.h - .15, d.d / 2 + .01); return g; },
  },
  {
    type: 'termosaldatrice', name: 'Termosaldatrice', cat: 'Sterilizzazione', w: .5, d: .3, h: .22, elev: .9, mount: 'counter', snap: true,
    plan: genericPlan, build(it, d) { const g = grp(); add(g, rbx(d.w, d.h, d.d, .03), mat('plastic', '#EEF0EE'), 0, d.h / 2, 0); add(g, cy(.04, .04, d.w * .8, 16), mat('steel'), 0, d.h + .02, -.05, 0, 0, Math.PI / 2); add(g, bx(d.w * .9, .01, .06), mat('dark'), 0, d.h * .55, d.d / 2); return g; },
  },
  {
    type: 'vasca-ultrasuoni', name: 'Vasca a ultrasuoni', cat: 'Sterilizzazione', w: .35, d: .25, h: .28, elev: .9, mount: 'counter', snap: true,
    plan(g, it, d, P) { genericPlan(g, it, d, P); pRect(g, -d.w / 2 + .04, -d.d / 2 + .04, d.w - .08, d.d - .08); det(g, P); },
    build(it, d) { const g = grp(); add(g, rbx(d.w, d.h, d.d, .02), mat('steel', '#D7DCDF'), 0, d.h / 2, 0); add(g, rbx(d.w * .95, .03, d.d * .95, .01), mat('plastic', '#3A4246'), 0, d.h + .015, 0); return g; },
  },
  {
    type: 'armadio-sterile', name: 'Armadio per materiale sterile', cat: 'Sterilizzazione', w: .9, d: .45, h: 2.0, colorKind: 'finish', color: '#F1F1EE', snap: true,
    plan: tallPlan, build(it, d) { const g = grp(); cabinetBody(g, d.w, d.d, d.h, it.color, { doors: 2, top: 0, plinth: .06 }); return g; },
  },
  // ---------------- Sala tecnica ----------------
  {
    type: 'compressore', name: 'Compressore', cat: 'Sala tecnica', w: .55, d: .5, h: .72, snap: true,
    plan(g, it, d, P) { genericPlan(g, it, d, P); pCirc(g, 0, 0, Math.min(d.w, d.d) * .32); det(g, P); g.fillStyle = P.detail; g.font = `600 ${Math.min(d.w, d.d) * .32}px ${'Barlow Semi Condensed'}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('C', 0, .01); },
    build(it, d) { const g = grp(); add(g, rbx(d.w, d.h, d.d, .02), mat('plastic', '#DCE0E2'), 0, d.h / 2, 0); for (let i = 0; i < 6; i++) add(g, bx(d.w * .6, .008, .004), mat('dark'), 0, d.h * .25 + i * .03, d.d / 2 + .002); add(g, bx(.08, .04, .005), mat('screen'), d.w * .3, d.h * .82, d.d / 2 + .003); return g; },
  },
  {
    type: 'aspiratore', name: 'Aspiratore chirurgico', cat: 'Sala tecnica', w: .45, d: .5, h: .75, snap: true,
    plan(g, it, d, P) { genericPlan(g, it, d, P); g.fillStyle = P.detail; g.font = `600 ${Math.min(d.w, d.d) * .32}px Barlow Semi Condensed`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('A', 0, .01); },
    build(it, d) { const g = grp(); add(g, rbx(d.w, d.h, d.d, .02), mat('plastic', '#E3E6E7'), 0, d.h / 2, 0); add(g, cy(.06, .06, .08, 18), mat('dark'), 0, d.h + .04, 0); return g; },
  },
  // ---------------- Accoglienza e attesa ----------------
  {
    type: 'reception', name: 'Bancone reception', cat: 'Accoglienza e attesa', w: 1.6, d: .75, h: 1.1, colorKind: 'finish', color: '#F1F1EE', snap: true,
    plan(g, it, d, P) { genericPlan(g, it, d, P); pRect(g, -d.w / 2, d.d / 2 - .22, d.w, .22); det(g, P); },
    build(it, d) { const g = grp(); const F = finishMat(it.color); add(g, bx(d.w, .75, d.d - .25), F, 0, .375, -.12); add(g, bx(d.w, .03, d.d - .2), mat('plastic', '#E9EAE8'), 0, .76, -.1); add(g, bx(d.w, d.h, .04), F, 0, d.h / 2, d.d / 2 - .02); add(g, bx(d.w, .03, .3), mat('wood', 'oak'), 0, d.h + .015, d.d / 2 - .1); return g; },
  },
  {
    type: 'sedia-attesa', name: 'Sedia attesa', cat: 'Accoglienza e attesa', w: .5, d: .55, h: .82, colorKind: 'fabric', color: '#45494D', snap: false,
    plan(g, it, d, P) { pRRect(g, -d.w / 2, -d.d / 2 + .08, d.w, d.d - .08, .05); fs(g, P); pRRect(g, -d.w / 2, -d.d / 2, d.w, .07, .03); fs(g, P); },
    build(it, d) { const g = grp(); const M = mat('metal', '#2B2E31'); for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) rod(g, [x * (d.w / 2 - .04), 0, z * (d.d / 2 - .05)], [x * (d.w / 2 - .05), .44, z * (d.d / 2 - .07)], .01, M); add(g, rbx(d.w, .05, d.d - .06, .02), mat('fabric', it.color), 0, .46, .02); add(g, rbx(d.w, .38, .05, .02), mat('fabric', it.color), 0, .66, -d.d / 2 + .04, -.12); return g; },
  },
  {
    type: 'divano-2', name: 'Divano 2 posti', cat: 'Accoglienza e attesa', w: 1.5, d: .85, h: .8, colorKind: 'fabric', color: '#8E9599', snap: true,
    plan: sofaPlan, build: sofaBuild,
  },
  {
    type: 'divano-3', name: 'Divano 3 posti', cat: 'Accoglienza e attesa', w: 2.1, d: .88, h: .8, colorKind: 'fabric', color: '#3D5A80', snap: true,
    plan: sofaPlan, build: sofaBuild,
  },
  {
    type: 'poltrona', name: 'Poltroncina', cat: 'Accoglienza e attesa', w: .75, d: .78, h: .78, colorKind: 'fabric', color: '#C79A3A', snap: false,
    plan: sofaPlan, build: sofaBuild,
  },
  {
    type: 'tavolino', name: 'Tavolino', cat: 'Accoglienza e attesa', w: .6, d: .6, h: .45, colorKind: 'finish', color: 'wood:oak', snap: false,
    plan(g, it, d, P) { pEll(g, 0, 0, d.w / 2, d.d / 2); fs(g, P); },
    build(it, d) { const g = grp(); add(g, cy(1, 1, .03, 36), finishMat(it.color), 0, d.h - .015, 0).scale.set(d.w / 2, 1, d.d / 2); add(g, cy(.03, .03, d.h - .03, 12), mat('metal'), 0, (d.h - .03) / 2, 0); add(g, cy(.2, .2, .015, 24), mat('metal'), 0, .008, 0); return g; },
  },
  {
    type: 'appendiabiti', name: 'Appendiabiti', cat: 'Accoglienza e attesa', w: .45, d: .45, h: 1.8, snap: false,
    plan(g, it, d, P) { pCirc(g, 0, 0, d.w / 2); g.fillStyle = P.fillSoft; g.fill(); det(g, P, true); pCirc(g, 0, 0, .03); fs(g, P); },
    build(it, d) { const g = grp(); const M = mat('metal'); add(g, cy(.2, .2, .02, 24), M, 0, .01, 0); add(g, cy(.015, .015, d.h, 10), M, 0, d.h / 2, 0); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; rod(g, [0, d.h - .1, 0], [Math.cos(a) * .12, d.h - .02, Math.sin(a) * .12], .008, M); } return g; },
  },
  {
    type: 'pianta', name: 'Pianta in vaso', cat: 'Accoglienza e attesa', w: .5, d: .5, h: 1.3, snap: false,
    plan(g, it, d, P) { pCirc(g, 0, 0, d.w / 2); g.fillStyle = hexA('#5E8A55', .25); g.fill(); g.strokeStyle = P.stroke; g.lineWidth = P.lw; g.stroke(); for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; pLine(g, 0, 0, Math.cos(a) * d.w * .45, Math.sin(a) * d.w * .45); } },
    build(it, d) { const g = grp(); add(g, cy(.17, .13, .36, 20), mat('matte', '#D6D2CB'), 0, .18, 0); const r = rng(hashStr(it.id || 'p')); for (let i = 0; i < 9; i++) { const s = .13 + r() * .1; const m = add(g, new THREE.IcosahedronGeometry(s, 0), mat('leaf', i % 2 ? '#4F7A45' : '#5F8C50'), (r() - .5) * d.w * .5, .45 + r() * (d.h - .6), (r() - .5) * d.d * .5); m.rotation.set(r() * 3, r() * 3, 0); } return g; },
  },
  {
    type: 'quadro', name: 'Quadro', cat: 'Accoglienza e attesa', w: .8, d: .04, h: .6, elev: 1.3, mount: 'wall', snap: true,
    plan(g, it, d, P) { pRect(g, -d.w / 2, -d.d / 2, d.w, Math.max(d.d, .03)); fs(g, P); },
    build(it, d) { const g = grp(); add(g, bx(d.w, d.h, .03), mat('metal', '#2B2E31'), 0, d.h / 2, -d.d / 2 + .015); add(g, bx(d.w - .04, d.h - .04, .004), mat('paint', String(hashStr(it.id || 'q') % 9973)), 0, d.h / 2, -d.d / 2 + .032); return g; },
  },
  {
    type: 'tv', name: 'TV a parete', cat: 'Accoglienza e attesa', w: 1.1, d: .06, h: .64, elev: 1.5, mount: 'wall', snap: true,
    plan: hungPlan, build(it, d) { const g = grp(); add(g, rbx(d.w, d.h, .03, .006), mat('dark', '#16191B'), 0, d.h / 2, 0); add(g, bx(d.w - .02, d.h - .02, .002), mat('screen'), 0, d.h / 2, .016); return g; },
  },
  // ---------------- Ufficio e arredo ----------------
  {
    type: 'scrivania', name: 'Scrivania', cat: 'Ufficio e arredo', w: 1.4, d: .7, h: .75, colorKind: 'finish', color: 'wood:oak', snap: true,
    plan(g, it, d, P) { genericPlan(g, it, d, P); },
    build(it, d) { const g = grp(); add(g, bx(d.w, .03, d.d), finishMat(it.color), 0, d.h - .015, 0); const M = mat('metal'); for (const s of [-1, 1]) { add(g, bx(.04, d.h - .03, d.d - .1), M, s * (d.w / 2 - .06), (d.h - .03) / 2, 0); } add(g, bx(d.w - .16, .2, .015), finishMat(it.color), 0, d.h - .14, -d.d / 2 + .08); return g; },
  },
  {
    type: 'sedia-ufficio', name: 'Sedia da ufficio', cat: 'Ufficio e arredo', w: .62, d: .62, h: 1.0, colorKind: 'fabric', color: '#45494D', snap: false,
    plan(g, it, d, P) { pCirc(g, 0, 0, d.w / 2); g.fillStyle = P.fillSoft; g.fill(); det(g, P, true); pRRect(g, -.24, -.2, .48, .44, .08); fs(g, P); pRRect(g, -.22, -.3, .44, .08, .04); fs(g, P); },
    build(it, d) { const g = grp(); for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; add(g, rbx(.29, .035, .05, .012), mat('metal'), Math.cos(a) * .145, .07, Math.sin(a) * .145, 0, -a); add(g, sp(.028), mat('rubber'), Math.cos(a) * .29, .028, Math.sin(a) * .29); } add(g, cy(.028, .028, .34, 12), mat('chrome'), 0, .26, 0); add(g, rbx(.5, .08, .48, .04), mat('fabric', it.color), 0, .48, .02); add(g, rbx(.46, .5, .06, .04), mat('fabric', it.color), 0, .8, -.24, -.12); return g; },
  },
  {
    type: 'armadio', name: 'Mobile alto / armadio', cat: 'Ufficio e arredo', w: 1.0, d: .55, h: 2.1, colorKind: 'finish', color: '#F1F1EE', snap: true,
    plan: tallPlan, build(it, d) { const g = grp(); cabinetBody(g, d.w, d.d, d.h, it.color, { doors: Math.max(1, Math.round(d.w / .5)), top: 0, plinth: .06 }); return g; },
  },
  {
    type: 'libreria', name: 'Libreria', cat: 'Ufficio e arredo', w: .9, d: .35, h: 2.0, colorKind: 'finish', color: 'wood:oak', snap: true,
    plan(g, it, d, P) { genericPlan(g, it, d, P); pLine(g, -d.w / 2, 0, d.w / 2, 0); },
    build(it, d) { const g = grp(); const F = finishMat(it.color); add(g, bx(.02, d.h, d.d), F, -d.w / 2 + .01, d.h / 2, 0); add(g, bx(.02, d.h, d.d), F, d.w / 2 - .01, d.h / 2, 0); add(g, bx(d.w, d.h, .01), F, 0, d.h / 2, -d.d / 2 + .005); const n = 5; const r = rng(hashStr(it.id || 'l')); for (let i = 0; i <= n; i++) { const y = .02 + i * (d.h - .04) / n; add(g, bx(d.w - .04, .02, d.d - .01), F, 0, y, .005); if (i < n) { let x = -d.w / 2 + .04; while (x < d.w / 2 - .08) { const bw = .025 + r() * .03, bh = .2 + r() * .1; add(g, bx(bw, bh, d.d * .7), mat('matte', ['#7A2E3A', '#2C3958', '#C79A3A', '#4E6E58', '#E5DDCB', '#45494D'][Math.floor(r() * 6)]), x + bw / 2, y + .01 + bh / 2, .02); x += bw + .004; if (r() < .12) x += .08; } } } return g; },
  },
  {
    type: 'mobile-basso', name: 'Mobile basso', cat: 'Ufficio e arredo', w: 1.2, d: .45, h: .8, colorKind: 'finish', color: '#C3C7C8', snap: true,
    plan: cabinetPlan, build(it, d) { const g = grp(); cabinetBody(g, d.w, d.d, d.h, it.color, { doors: Math.max(2, Math.round(d.w / .5)), topMat: finishMat(it.color) }); return g; },
  },
  {
    type: 'tavolo', name: 'Tavolo riunioni', cat: 'Ufficio e arredo', w: 1.6, d: .9, h: .75, colorKind: 'finish', color: 'wood:oak', snap: false,
    plan: genericPlan, build(it, d) { const g = grp(); add(g, bx(d.w, .03, d.d), finishMat(it.color), 0, d.h - .015, 0); for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) add(g, bx(.05, d.h - .03, .05), mat('metal'), x * (d.w / 2 - .08), (d.h - .03) / 2, z * (d.d / 2 - .08)); return g; },
  },
  {
    type: 'termosifone', name: 'Termosifone', cat: 'Ufficio e arredo', w: .8, d: .1, h: .6, elev: .12, mount: 'wall', snap: true,
    plan(g, it, d, P) { pRect(g, -d.w / 2, -d.d / 2, d.w, d.d); fs(g, P); const n = Math.max(2, Math.round(d.w / .08)); for (let i = 1; i < n; i++) pLine(g, -d.w / 2 + d.w * i / n, -d.d / 2, -d.w / 2 + d.w * i / n, d.d / 2); },
    build(it, d) { const g = grp(); const n = Math.max(2, Math.round(d.w / .08)); const fw = d.w / n; for (let i = 0; i < n; i++) add(g, rbx(fw - .01, d.h, d.d - .03, .012), mat('plastic', '#F4F4F2'), -d.w / 2 + fw * (i + .5), d.h / 2, .01); return g; },
  },
  {
    type: 'climatizzatore', name: 'Climatizzatore split', cat: 'Ufficio e arredo', w: .85, d: .24, h: .3, elev: 2.25, mount: 'wall', snap: true,
    plan: hungPlan, build(it, d) { const g = grp(); add(g, rbx(d.w, d.h, d.d, .05), mat('plastic', '#F6F6F4'), 0, d.h / 2, 0); add(g, bx(d.w * .85, .02, .06), mat('plastic', '#D9DDDF'), 0, .04, d.d / 2 - .03, .4); return g; },
  },
  // ---------------- Bagno ----------------
  {
    type: 'wc', name: 'WC', cat: 'Bagno', w: .38, d: .55, h: .78, snap: true,
    plan(g, it, d, P) { pRRect(g, -d.w / 2, -d.d / 2, d.w, .17, .03); fs(g, P); pEll(g, 0, .07, d.w * .45, d.d * .36); fs(g, P); pEll(g, 0, .08, d.w * .28, d.d * .24); det(g, P); },
    build(it, d) { const g = grp(); const C = mat('ceramic'); add(g, cy(.13, .11, .3, 24), C, 0, .15, .05).scale.set(1, 1, 1.3); add(g, cy(.18, .16, .1, 28), C, 0, .35, .07).scale.set(1, 1, 1.35); add(g, rbx(d.w, .38, .16, .03), C, 0, .59, -d.d / 2 + .08); add(g, cy(.18, .18, .02, 28), mat('plastic', '#FBFBF9'), 0, .41, .07).scale.set(1, 1, 1.35); return g; },
  },
  {
    type: 'bidet', name: 'Bidet', cat: 'Bagno', w: .38, d: .55, h: .42, snap: true,
    plan(g, it, d, P) { pEll(g, 0, .03, d.w * .47, d.d * .44); fs(g, P); pEll(g, 0, .06, d.w * .28, d.d * .26); det(g, P); pCirc(g, 0, -d.d * .32, .02); det(g, P); },
    build(it, d) { const g = grp(); const C = mat('ceramic'); add(g, cy(.13, .11, .3, 24), C, 0, .15, .03).scale.set(1, 1, 1.3); add(g, cy(.18, .16, .1, 28), C, 0, .35, .04).scale.set(1, 1, 1.4); rod(g, [0, .4, -.17], [0, .48, -.17], .012, mat('chrome')); rod(g, [0, .48, -.17], [0, .47, -.08], .01, mat('chrome')); return g; },
  },
  {
    type: 'lavabo', name: 'Lavabo', cat: 'Bagno', w: .6, d: .48, h: .85, snap: true,
    plan(g, it, d, P) { pRRect(g, -d.w / 2, -d.d / 2, d.w, d.d, .08); fs(g, P); pEll(g, 0, .04, d.w * .36, d.d * .32); det(g, P); pCirc(g, 0, -d.d * .33, .02); det(g, P); },
    build(it, d) { const g = grp(); const C = mat('ceramic'); add(g, rbx(d.w, .16, d.d, .06), C, 0, d.h - .08, 0); add(g, cy(.19, .19, .01, 28), mat('ceramic', '#E9ECEC'), 0, d.h + .002, .03).scale.set(d.w / .6, 1, d.d / .55); add(g, cy(.08, .06, d.h - .16, 18), C, 0, (d.h - .16) / 2, -d.d / 2 + .12); rod(g, [0, d.h, -d.d / 2 + .06], [0, d.h + .16, -d.d / 2 + .06], .013, mat('chrome')); rod(g, [0, d.h + .16, -d.d / 2 + .06], [0, d.h + .14, -d.d / 2 + .17], .011, mat('chrome')); return g; },
  },
  {
    type: 'lavabo-disabili', name: 'Lavabo per disabili', cat: 'Bagno', w: .7, d: .57, h: .8, snap: true,
    plan(g, it, d, P) { pRRect(g, -d.w / 2, -d.d / 2, d.w, d.d, .1); fs(g, P); pEll(g, 0, .02, d.w * .34, d.d * .28); det(g, P); },
    build(it, d) { const g = grp(); add(g, rbx(d.w, .14, d.d, .06), mat('ceramic'), 0, d.h - .07, 0); add(g, cy(.2, .2, .01, 28), mat('ceramic', '#E9ECEC'), 0, d.h + .002, 0); rod(g, [0, d.h, -d.d / 2 + .06], [0, d.h + .14, -d.d / 2 + .06], .013, mat('chrome')); rod(g, [0, d.h + .14, -d.d / 2 + .06], [0, d.h + .12, -d.d / 2 + .18], .011, mat('chrome')); return g; },
  },
  {
    type: 'lavandino', name: 'Lavandino con mobile', cat: 'Bagno', w: .8, d: .5, h: .88, colorKind: 'finish', color: '#F1F1EE', snap: true,
    plan(g, it, d, P) { cabinetPlan(g, it, d, P); sinkInTop(g, 0, 0, d.w * .55, d.d * .6, P); },
    build(it, d) { const g = grp(); cabinetBody(g, d.w, d.d, d.h, it.color, { doors: 2 }); add(g, bx(d.w * .55, .01, d.d * .55), mat('dark', '#5c656b'), 0, d.h + .004, 0); rod(g, [0, d.h, -d.d / 2 + .06], [0, d.h + .26, -d.d / 2 + .06], .012, mat('chrome')); rod(g, [0, d.h + .26, -d.d / 2 + .06], [0, d.h + .24, -d.d / 2 + .2], .011, mat('chrome')); return g; },
  },
  {
    type: 'doccia', name: 'Doccia', cat: 'Bagno', w: .8, d: .8, h: 2.0, snap: true,
    plan(g, it, d, P) { pRect(g, -d.w / 2, -d.d / 2, d.w, d.d); fs(g, P); g.beginPath(); g.moveTo(-d.w / 2, -d.d / 2); g.lineTo(d.w / 2, d.d / 2); g.moveTo(d.w / 2, -d.d / 2); g.lineTo(-d.w / 2, d.d / 2); det(g, P); pCirc(g, 0, 0, .04); fs(g, P); },
    build(it, d) { const g = grp(); add(g, bx(d.w, .05, d.d), mat('ceramic'), 0, .025, 0); add(g, bx(d.w, d.h - .05, .008), mat('glass'), 0, .025 + d.h / 2, d.d / 2 - .004); add(g, bx(.008, d.h - .05, d.d), mat('glass'), d.w / 2 - .004, .025 + d.h / 2, 0); add(g, bx(d.w, .02, .02), mat('chrome'), 0, d.h, d.d / 2 - .01); rod(g, [-d.w / 2 + .1, .9, -d.d / 2 + .04], [-d.w / 2 + .1, 1.95, -d.d / 2 + .04], .012, mat('chrome')); add(g, cy(.1, .1, .015, 24), mat('chrome'), -d.w / 2 + .2, 1.95, -d.d / 2 + .14); rod(g, [-d.w / 2 + .1, 1.95, -d.d / 2 + .04], [-d.w / 2 + .2, 1.95, -d.d / 2 + .14], .01, mat('chrome')); return g; },
  },
  {
    type: 'wc-disabili', name: 'WC per disabili con maniglioni', cat: 'Bagno', w: .7, d: .7, h: .8, snap: true,
    plan(g, it, d, P) { pRRect(g, -.2, -d.d / 2, .4, .16, .03); fs(g, P); pEll(g, 0, .02, .18, .26); fs(g, P); g.beginPath(); g.moveTo(-d.w / 2 + .02, -d.d / 2 + .1); g.lineTo(-d.w / 2 + .02, d.d / 2 - .05); g.moveTo(d.w / 2 - .02, -d.d / 2 + .1); g.lineTo(d.w / 2 - .02, d.d / 2 - .05); g.strokeStyle = P.stroke; g.lineWidth = P.lw * 2; g.stroke(); },
    build(it, d) { const g = grp(); const C = mat('ceramic'); add(g, cy(.14, .12, .32, 24), C, 0, .16, .0).scale.set(1, 1, 1.3); add(g, cy(.19, .17, .1, 28), C, 0, .37, .02).scale.set(1, 1, 1.35); add(g, rbx(.4, .38, .16, .03), C, 0, .6, -d.d / 2 + .08); for (const s of [-1, 1]) { rod(g, [s * (d.w / 2 - .02), .75, -d.d / 2 + .05], [s * (d.w / 2 - .02), .75, d.d / 2 - .05], .016, mat('chrome')); rod(g, [s * (d.w / 2 - .02), .75, -d.d / 2 + .05], [s * (d.w / 2 - .02), .75, -d.d / 2 + .0], .016, mat('chrome')); } return g; },
  },
  {
    type: 'specchio', name: 'Specchio', cat: 'Bagno', w: .6, d: .02, h: .8, elev: 1.1, mount: 'wall', snap: true,
    plan: hungPlan, build(it, d) { const g = grp(); add(g, bx(d.w, d.h, .01), mat('chrome', '#E5EEF2'), 0, d.h / 2, 0); return g; },
  },
  // ---------------- Impianti ----------------
  {
    type: 'scatola-allacciamento', name: 'Scatola di allacciamento riunito', cat: 'Impianti', w: .3, d: .3, h: .03, snap: false, obstacle: false, utility: true,
    note: 'Posizione dell\'allacciamento a pavimento: va presa dalla dima del produttore del riunito.',
    plan(g, it, d, P) { pRect(g, -d.w / 2, -d.d / 2, d.w, d.d); g.fillStyle = hexA(PAL.water, .18); g.fill(); g.strokeStyle = PAL.water; g.lineWidth = P.lw * 1.4; g.stroke(); g.beginPath(); g.moveTo(-d.w / 2, -d.d / 2); g.lineTo(d.w / 2, d.d / 2); g.moveTo(d.w / 2, -d.d / 2); g.lineTo(-d.w / 2, d.d / 2); g.stroke(); },
    build(it, d) { const g = grp(); add(g, bx(d.w, .012, d.d), mat('steel', '#9AA3A8'), 0, .006, 0); add(g, bx(d.w - .04, .004, d.d - .04), mat('dark', '#4A5258'), 0, .013, 0); return g; },
  },
  utilPoint('punto-acqua', 'Punto acqua', 'water', .35, 'wall'),
  utilPoint('scarico', 'Scarico', 'drain', 0, 'floor'),
  utilPoint('punto-aria', 'Aria compressa', 'air', .3, 'wall'),
  utilPoint('punto-aspirazione', 'Aspirazione', 'suction', .3, 'wall'),
  utilPoint('presa-elettrica', 'Presa elettrica', 'power', .3, 'wall'),
  utilPoint('presa-rete', 'Presa di rete / dati', 'ink-2', .3, 'wall'),
  // ---------------- Struttura ----------------
  {
    type: 'pilastro', name: 'Pilastro', cat: 'Struttura', w: .3, d: .3, h: 2.7, snap: false, structural: true,
    plan(g, it, d, P) {
      pRect(g, -d.w / 2, -d.d / 2, d.w, d.d); g.fillStyle = P.sheet; g.fill(); g.save(); g.clip();
      g.strokeStyle = P.stroke; g.lineWidth = P.lw; const s = .06; for (let k = -d.w - d.d; k < d.w + d.d; k += s) pLine(g, -d.w / 2 + k, d.d / 2, -d.w / 2 + k + d.d, -d.d / 2);
      g.restore(); pRect(g, -d.w / 2, -d.d / 2, d.w, d.d); g.strokeStyle = P.stroke; g.lineWidth = P.lw * 1.4; g.stroke();
    },
    build(it, d, ctx) { const g = grp(); add(g, bx(d.w, ctx?.wallH || d.h, d.d), mat('wall', '#ECECE8'), 0, (ctx?.wallH || d.h) / 2, 0); return g; },
  },
];
function utilPoint(type, name, colorTok, elev, mount) {
  return {
    type, name, cat: 'Impianti', w: .12, d: .06, h: .1, elev, mount, snap: mount === 'wall', obstacle: false, utility: true, util: colorTok,
    plan(g, it, d, P) { const c = PAL[colorTok] || P.stroke; pCirc(g, 0, 0, .07); g.fillStyle = hexA(c, .2); g.fill(); g.strokeStyle = c; g.lineWidth = P.lw * 1.6; g.stroke(); pCirc(g, 0, 0, .025); g.fillStyle = c; g.fill(); },
    build(it, d) { const g = grp(); const c = PAL[colorTok] || '#888'; if (mount === 'floor') { add(g, cy(.06, .06, .01, 18), mat('plastic', c), 0, .005, 0); } else { add(g, rbx(.1, .1, .02, .01), mat('plastic', '#F4F4F2'), 0, .05, -d.d / 2 + .01); add(g, cy(.025, .025, .01, 14), mat('plastic', c), 0, .05, -d.d / 2 + .025, Math.PI / 2); } return g; },
  };
}
function sofaPlan(g, it, d, P) {
  pRRect(g, -d.w / 2, -d.d / 2, d.w, d.d, .06); fs(g, P);
  const arm = Math.min(.16, d.w * .15);
  pRRect(g, -d.w / 2 + arm, -d.d / 2, d.w - arm * 2, d.d * .25, .03); det(g, P);
  const n = Math.max(1, Math.round((d.w - arm * 2) / .65));
  for (let i = 1; i < n; i++) { const x = -d.w / 2 + arm + (d.w - arm * 2) * i / n; pLine(g, x, -d.d / 2 + d.d * .25, x, d.d / 2 - .03); }
  pLine(g, -d.w / 2 + arm, -d.d / 2 + d.d * .25, -d.w / 2 + arm, d.d / 2); pLine(g, d.w / 2 - arm, -d.d / 2 + d.d * .25, d.w / 2 - arm, d.d / 2);
}
function sofaBuild(it, d) {
  const g = grp(); const F = mat('fabric', it.color); const arm = Math.min(.16, d.w * .15);
  for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) add(g, cy(.02, .015, .08, 10), mat('metal'), x * (d.w / 2 - .06), .04, z * (d.d / 2 - .06));
  add(g, rbx(d.w, .2, d.d, .03), F, 0, .18, 0);
  const n = Math.max(1, Math.round((d.w - arm * 2) / .65)); const cw = (d.w - arm * 2) / n;
  for (let i = 0; i < n; i++) {
    add(g, rbx(cw - .01, .14, d.d - .22, .05), F, -d.w / 2 + arm + cw * (i + .5), .35, .08);
    add(g, rbx(cw - .02, d.h - .38, .18, .06), F, -d.w / 2 + arm + cw * (i + .5), .28 + (d.h - .38) / 2 + .06, -d.d / 2 + .12, -.12);
  }
  for (const s of [-1, 1]) add(g, rbx(arm, d.h * .78, d.d, .04), F, s * (d.w / 2 - arm / 2), d.h * .39, 0);
  return g;
}
const CAT_BY_TYPE = Object.fromEntries(CATALOG.map((c) => [c.type, c]));
function catOf(it) { return CAT_BY_TYPE[it.type] || CATALOG[0]; }
function dimsOf(it) { const c = catOf(it); const d = it.dims || {}; return { w: d.w ?? c.w, d: d.d ?? c.d, h: d.h ?? c.h }; }
function elevOf(it) { const c = catOf(it); return it.elev ?? c.elev ?? 0; }
function colorOf(it) { const c = catOf(it); return it.color ?? c.color; }
function paletteFor(kind) { return kind === 'uph' ? UPHOLSTERY : kind === 'finish' ? FINISHES : kind === 'fabric' ? FABRICS : kind === 'metal' ? METALS : null; }

// ===================== state & model =====================
const S = {
  project: null, sel: null, tool: 'select', view: '2d', hover: null,
  undo: [], redo: [], rev: 0, saveState: 'unsaved', projects: [],
  placing: null,      // catalog type being placed
  bgImages: new Map(), // src key -> HTMLImageElement
  bgData: new Map(),   // 'img:<pid>' -> dataURL
  tab: 'lib', panelOpen: true, libCat: 'Tutti', libQuery: '',
  wallOpts: { t: .10, type: 'cartongesso' },
  openOpts: { kind: 'porta', w: .8 }, winOpts: { kind: 'finestra', w: 1.0 },
  pipeOpts: { kind: 'acqua' },
  view3d: { walls: 'full', zones: true, utilities: true, shadows: true },
  walk: { eye: 1.65 },
};
const PHASES = { fatto: 'Stato di fatto', confronto: 'Gialli e rossi', progetto: 'Progetto' };
const PIPE_KINDS = { acqua: ['Acqua', 'water'], scarico: ['Scarico', 'drain'], aria: ['Aria compressa', 'air'], aspirazione: ['Aspirazione', 'suction'], elettrico: ['Elettrico', 'power'] };
const OPEN_KINDS = { porta: 'Porta a battente', scorrevole: 'Porta scorrevole esterna', scomparsa: 'Porta a scomparsa', varco: 'Varco', finestra: 'Finestra', portafinestra: 'Portafinestra' };
const WALL_TYPES = { muratura: 'Muratura', cartongesso: 'Cartongesso', parapetto: 'Parapetto' };

const phase = () => S.project?.settings?.phase || 'progetto';
function wallVisible(w, ph = phase()) { return ph === 'fatto' ? w.status !== 'nuovo' : ph === 'progetto' ? w.status !== 'demolito' : true; }
function openingVisible(o, ph = phase()) { return ph === 'fatto' ? o.status !== 'nuovo' : ph === 'progetto' ? o.status !== 'chiuso' : true; }
function itemVisible(it, ph = phase()) { const p = it.phase || 'esistente'; return ph === 'fatto' ? p !== 'nuovo' : ph === 'progetto' ? p !== 'rimosso' : true; }
function pipeVisible(p, ph = phase()) { return ph !== 'fatto' || p.status === 'esistente'; }

function normalizeProject(p) {
  p.walls ||= []; p.openings ||= []; p.items ||= []; p.rooms ||= []; p.pipes ||= []; p.dims ||= [];
  p.settings = Object.assign({ wallH: 2.7, bgOpacity: .55, showBg: true, phase: 'progetto', grid: true, autoDims: true, prices: {} }, p.settings || {});
  p.settings.prices ||= {};
  p.bg ||= null; p.kind = 'project'; p.version = 1;
  for (const w of p.walls) { w.status ||= 'esistente'; w.type ||= 'muratura'; }
  for (const o of p.openings) { o.status ||= 'esistente'; o.hinge ||= 'start'; o.swing ||= 1; }
  for (const it of p.items) { it.phase ||= 'esistente'; it.rot ||= 0; }
  return p;
}

// ---------- wall geometry ----------
const wallById = (id) => S.project.walls.find((w) => w.id === id);
const wallLen = (w) => Math.hypot(w.b.x - w.a.x, w.b.y - w.a.y);
const wallDir = (w) => V.norm(V.sub(w.b, w.a));
const wallNrm = (w) => { const d = wallDir(w); return { x: -d.y, y: d.x }; };
const wallH = (w) => w.h ?? (w.type === 'parapetto' ? 1.0 : S.project.settings.wallH);
function openingsOf(w, ph = phase()) { return S.project.openings.filter((o) => o.wallId === w.id && openingVisible(o, ph)); }
function openingSpan(o, w) { const L = wallLen(w); const c = o.t * L; return [c - o.w / 2, c + o.w / 2]; }
function openingCenter(o, w) { return { x: lerp(w.a.x, w.b.x, o.t), y: lerp(w.a.y, w.b.y, o.t) }; }
// extensions at connected endpoints so corners close
function wallExt(w, walls) {
  let ea = 0, eb = 0;
  for (const o of walls) {
    if (o === w) continue;
    for (const p of [o.a, o.b]) {
      if (V.dist(p, w.a) < .015) ea = Math.max(ea, o.t / 2);
      if (V.dist(p, w.b) < .015) eb = Math.max(eb, o.t / 2);
    }
  }
  return [ea, eb];
}
function wallQuad(w, ea = 0, eb = 0, inset = 0) {
  const d = wallDir(w), n = wallNrm(w), h = w.t / 2 - inset;
  const A = V.sub(w.a, V.mul(d, ea)), B = V.add(w.b, V.mul(d, eb));
  return [V.add(A, V.mul(n, h)), V.add(B, V.mul(n, h)), V.sub(B, V.mul(n, h)), V.sub(A, V.mul(n, h))];
}
// solid spans along wall excluding openings with sill below `maxSill`
function solidSpans(w, ops, maxSill = 99) {
  const L = wallLen(w);
  const cuts = ops.filter((o) => (o.sill || 0) < maxSill && o.status !== 'chiuso').map((o) => openingSpan(o, w)).sort((a, b) => a[0] - b[0]);
  const out = []; let s = 0;
  for (const [a, b] of cuts) { if (a > s) out.push([s, Math.min(a, L)]); s = Math.max(s, b); }
  if (s < L) out.push([s, L]);
  return out.filter(([a, b]) => b - a > .005);
}

// ---------- rooms (raster flood fill) ----------
let ROOMCACHE = { key: '', res: null };
function invalidateRooms() { ROOMCACHE.key = ''; }
function roomsKey(ph) {
  const p = S.project; let k = ph + '|';
  for (const w of p.walls) if (wallVisible(w, ph)) k += `${w.a.x.toFixed(3)},${w.a.y.toFixed(3)},${w.b.x.toFixed(3)},${w.b.y.toFixed(3)},${w.t};`;
  for (const it of p.items) if (it.type === 'pilastro' && itemVisible(it, ph)) { const d = dimsOf(it); k += `P${it.x.toFixed(3)},${it.y.toFixed(3)},${d.w},${d.d},${it.rot};`; }
  for (const r of p.rooms) k += `R${r.id}${r.seed.x.toFixed(2)},${r.seed.y.toFixed(2)};`;
  return k;
}
function computeRooms(ph = phase()) {
  const key = roomsKey(ph);
  if (ROOMCACHE.key === key && ROOMCACHE.res) return ROOMCACHE.res;
  const p = S.project;
  const walls = p.walls.filter((w) => wallVisible(w, ph));
  const pillars = p.items.filter((it) => it.type === 'pilastro' && itemVisible(it, ph));
  const res = { rooms: new Map(), grid: null };
  if (!walls.length) { ROOMCACHE = { key, res }; return res; }
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const w of walls) for (const q of [w.a, w.b]) { x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y); }
  for (const r of p.rooms) { x0 = Math.min(x0, r.seed.x); y0 = Math.min(y0, r.seed.y); x1 = Math.max(x1, r.seed.x); y1 = Math.max(y1, r.seed.y); }
  x0 -= .6; y0 -= .6; x1 += .6; y1 += .6;
  const cell = Math.max(.025, Math.sqrt((x1 - x0) * (y1 - y0) / 700000));
  const W = Math.ceil((x1 - x0) / cell), H = Math.ceil((y1 - y0) / cell);
  const solid = new Uint8Array(W * H);
  for (const w of walls) {
    const ht = w.t / 2;
    const bx0 = Math.max(0, Math.floor((Math.min(w.a.x, w.b.x) - ht - x0) / cell)), bx1 = Math.min(W - 1, Math.ceil((Math.max(w.a.x, w.b.x) + ht - x0) / cell));
    const by0 = Math.max(0, Math.floor((Math.min(w.a.y, w.b.y) - ht - y0) / cell)), by1 = Math.min(H - 1, Math.ceil((Math.max(w.a.y, w.b.y) + ht - y0) / cell));
    const dx = w.b.x - w.a.x, dy = w.b.y - w.a.y, L2 = dx * dx + dy * dy || 1e-9;
    for (let j = by0; j <= by1; j++) {
      const py = y0 + (j + .5) * cell;
      for (let i = bx0; i <= bx1; i++) {
        const px = x0 + (i + .5) * cell;
        let t = ((px - w.a.x) * dx + (py - w.a.y) * dy) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t;
        const ex = px - (w.a.x + t * dx), ey = py - (w.a.y + t * dy);
        if (ex * ex + ey * ey <= ht * ht + 1e-9) solid[j * W + i] = 1;
      }
    }
  }
  for (const it of pillars) {
    const d = dimsOf(it), th = it.rot * DEG, c = Math.cos(-th), s = Math.sin(-th), R = Math.hypot(d.w, d.d) / 2;
    const bx0 = Math.max(0, Math.floor((it.x - R - x0) / cell)), bx1 = Math.min(W - 1, Math.ceil((it.x + R - x0) / cell));
    const by0 = Math.max(0, Math.floor((it.y - R - y0) / cell)), by1 = Math.min(H - 1, Math.ceil((it.y + R - y0) / cell));
    for (let j = by0; j <= by1; j++) for (let i = bx0; i <= bx1; i++) {
      const px = x0 + (i + .5) * cell - it.x, py = y0 + (j + .5) * cell - it.y;
      const lx = px * c - py * s, ly = px * s + py * c;
      if (Math.abs(lx) <= d.w / 2 && Math.abs(ly) <= d.d / 2) solid[j * W + i] = 1;
    }
  }
  const reg = new Int32Array(W * H);
  const queue = new Int32Array(W * H);
  let nextReg = 0; const regInfo = [];
  for (const r of p.rooms) {
    let ci = Math.floor((r.seed.x - x0) / cell), cj = Math.floor((r.seed.y - y0) / cell);
    let found = -1;
    for (let rad = 0; rad < 6 && found < 0; rad++) for (let dj = -rad; dj <= rad && found < 0; dj++) for (let di = -rad; di <= rad; di++) {
      const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= W || j >= H) continue;
      if (!solid[j * W + i]) { found = j * W + i; break; }
    }
    if (found < 0) { res.rooms.set(r.id, { open: true, area: 0, rects: [], reg: -1 }); continue; }
    if (reg[found]) { const info = regInfo[reg[found] - 1]; res.rooms.set(r.id, { ...info.stats, shared: true }); continue; }
    const id = ++nextReg; let qh = 0, qt = 0; queue[qt++] = found; reg[found] = id;
    let count = 0, border = false, mi = W, ma = 0, mj = H, mb = 0;
    while (qh < qt) {
      const c = queue[qh++]; count++; const i = c % W, j = (c / W) | 0;
      if (i < mi) mi = i; if (i > ma) ma = i; if (j < mj) mj = j; if (j > mb) mb = j;
      if (i === 0 || j === 0 || i === W - 1 || j === H - 1) border = true;
      if (i > 0 && !solid[c - 1] && !reg[c - 1]) { reg[c - 1] = id; queue[qt++] = c - 1; }
      if (i < W - 1 && !solid[c + 1] && !reg[c + 1]) { reg[c + 1] = id; queue[qt++] = c + 1; }
      if (j > 0 && !solid[c - W] && !reg[c - W]) { reg[c - W] = id; queue[qt++] = c - W; }
      if (j < H - 1 && !solid[c + W] && !reg[c + W]) { reg[c + W] = id; queue[qt++] = c + W; }
    }
    const stats = { open: border, area: border ? 0 : count * cell * cell, reg: id, rects: [], label: null, bbox: null };
    if (!border) {
      // merge runs into rectangles
      let prev = new Map();
      for (let j = mj; j <= mb + 1; j++) {
        const cur = new Map();
        if (j <= mb) {
          let i = mi;
          while (i <= ma) {
            if (reg[j * W + i] === id) { const s = i; while (i <= ma && reg[j * W + i] === id) i++; cur.set(s + ':' + i, { i0: s, i1: i, j0: j }); }
            else i++;
          }
        }
        for (const [k, r0] of prev) { if (cur.has(k)) cur.get(k).j0 = r0.j0; else stats.rects.push({ x: x0 + r0.i0 * cell, y: y0 + r0.j0 * cell, w: (r0.i1 - r0.i0) * cell, h: (j - r0.j0) * cell }); }
        prev = cur;
      }
      // label point: max chamfer distance inside region
      const bw = ma - mi + 1, bh = mb - mj + 1; const dist = new Float32Array(bw * bh);
      for (let j = 0; j < bh; j++) for (let i = 0; i < bw; i++) dist[j * bw + i] = reg[(j + mj) * W + i + mi] === id ? 1e9 : 0;
      for (let j = 0; j < bh; j++) for (let i = 0; i < bw; i++) { const k = j * bw + i; if (!dist[k]) continue; let v = dist[k]; if (i > 0) v = Math.min(v, dist[k - 1] + 1); else v = Math.min(v, 1); if (j > 0) v = Math.min(v, dist[k - bw] + 1); else v = Math.min(v, 1); dist[k] = v; }
      let best = 0, bk = 0;
      for (let j = bh - 1; j >= 0; j--) for (let i = bw - 1; i >= 0; i--) { const k = j * bw + i; if (!dist[k]) continue; let v = dist[k]; if (i < bw - 1) v = Math.min(v, dist[k + 1] + 1); else v = Math.min(v, 1); if (j < bh - 1) v = Math.min(v, dist[k + bw] + 1); else v = Math.min(v, 1); dist[k] = v; if (v > best) { best = v; bk = k; } }
      stats.label = { x: x0 + ((bk % bw) + mi + .5) * cell, y: y0 + (((bk / bw) | 0) + mj + .5) * cell };
      stats.bbox = { x0: x0 + mi * cell, y0: y0 + mj * cell, x1: x0 + (ma + 1) * cell, y1: y0 + (mb + 1) * cell };
    }
    regInfo.push({ stats });
    res.rooms.set(r.id, stats);
  }
  res.grid = { x0, y0, cell, W, H, reg, solid };
  ROOMCACHE = { key, res };
  return res;
}
function roomAtPoint(pt, ph = phase()) {
  const res = computeRooms(ph); if (!res.grid) return null;
  const { x0, y0, cell, W, H, reg } = res.grid;
  const i = Math.floor((pt.x - x0) / cell), j = Math.floor((pt.y - y0) / cell);
  if (i < 0 || j < 0 || i >= W || j >= H) return null;
  const r = reg[j * W + i]; if (!r) return null;
  for (const room of S.project.rooms) { const st = res.rooms.get(room.id); if (st && st.reg === r && !st.open) return room; }
  return null;
}
// flood test for a new room at a point (without saving)
function regionOpenAt(pt) {
  const tmp = { id: '__probe', seed: { x: pt.x, y: pt.y } };
  S.project.rooms.push(tmp); invalidateRooms();
  const st = computeRooms().rooms.get('__probe');
  S.project.rooms.pop(); invalidateRooms();
  return st;
}

// ---------- items geometry ----------
function itemCorners(it, pad = 0) {
  const d = dimsOf(it), th = it.rot * DEG;
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => V.add({ x: it.x, y: it.y }, V.rot({ x: sx * (d.w / 2 + pad), y: sy * (d.d / 2 + pad) }, th)));
}
function itemLocal(it, p) { return V.rot(V.sub(p, it), -it.rot * DEG); }
function itemContains(it, p, pad = 0) { const d = dimsOf(it); const l = itemLocal(it, p); return Math.abs(l.x) <= d.w / 2 + pad && Math.abs(l.y) <= d.d / 2 + pad; }

// ---------- dental working zones (clock concept) ----------
const ZONE_DEF = {
  dx: [['operatore', 7, 12], ['statica', 12, 14], ['assistente', 14, 16], ['trasferimento', 16, 19]],
  sx: [['operatore', 12, 17], ['statica', 10, 12], ['assistente', 8, 10], ['trasferimento', 17, 20]],
};
const ZONE_LABEL = { operatore: 'Operatore', statica: 'Statica', assistente: 'Assistente', trasferimento: 'Trasferimento' };
function zoneColor(k) { return { operatore: PAL.accent, statica: PAL.muted, assistente: PAL.water, trasferimento: PAL.warn }[k]; }
function zonesOf(it) {
  const d = dimsOf(it), th = it.rot * DEG;
  const mouthLocal = { x: (it.hand === 'sx' ? 1 : -1) * .08 * d.w / 1.05, y: -d.d / 2 + .30 * d.d / 1.95 };
  const c = V.add({ x: it.x, y: it.y }, V.rot(mouthLocal, th));
  const R = it.zoneR ?? 1.2;
  // clock hours → angles measured clockwise from the head direction (12 o'clock = 0)
  const sectors = ZONE_DEF[it.hand === 'sx' ? 'sx' : 'dx'].map(([k, h0, h1]) => ({ kind: k, a0: h0 * 30 * DEG, a1: h1 * 30 * DEG }));
  return { c, R, th, sectors };
}
function clockAngle(z, p) {
  const v = V.rot(V.sub(p, z.c), -z.th);
  let a = Math.atan2(v.x, -v.y); if (a < 0) a += Math.PI * 2; return a;
}
function inSector(z, s, p) {
  if (V.dist(p, z.c) > z.R) return false;
  let a = clockAngle(z, p);
  const a0 = s.a0 % (Math.PI * 2); let a1 = s.a1 % (Math.PI * 2); if (a1 <= a0) a1 += Math.PI * 2;
  if (a < a0) a += Math.PI * 2;
  return a >= a0 && a <= a1;
}
const ZONE_IGNORE = new Set(['sgabello-operatore', 'sgabello-assistente', 'riunito']);
function zoneConflicts(ph = phase()) {
  const out = []; const p = S.project; if (!p) return out;
  const chairs = p.items.filter((it) => it.type === 'riunito' && itemVisible(it, ph) && it.zones !== false);
  for (const ch of chairs) {
    const z = zonesOf(ch); const hard = z.sectors.filter((s) => s.kind !== 'statica');
    for (const it of p.items) {
      if (it === ch || !itemVisible(it, ph) || ZONE_IGNORE.has(it.type)) continue;
      const c = catOf(it); if (c.obstacle === false) continue;
      const e = elevOf(it); if (e >= 1.5) continue;
      if (V.dist(it, z.c) > z.R + Math.hypot(dimsOf(it).w, dimsOf(it).d)) continue;
      const d = dimsOf(it); const pts = [];
      for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) pts.push(V.add({ x: it.x, y: it.y }, V.rot({ x: (i / 4 - .5) * d.w, y: (j / 4 - .5) * d.d }, it.rot * DEG)));
      const hit = hard.find((s) => pts.some((q) => inSector(z, s, q)));
      if (hit) out.push({ chair: ch.id, item: it.id, zone: hit.kind, name: it.label || c.name });
    }
    let minWall = Infinity; const wallHits = new Set();
    for (const w of p.walls) {
      if (!wallVisible(w, ph) || w.type === 'parapetto') continue;
      const pr = projSeg(z.c, w.a, w.b); const dd = pr.d - w.t / 2; if (dd < minWall) minWall = dd;
      if (dd > z.R) continue;
      const L = wallLen(w), n = wallNrm(w);
      for (let s = 0; s <= L; s += .05) {
        const q = { x: lerp(w.a.x, w.b.x, s / L), y: lerp(w.a.y, w.b.y, s / L) };
        for (const sg of [1, -1]) { const f = V.add(q, V.mul(n, sg * w.t / 2)); const hit = hard.find((sc) => inSector(z, sc, f)); if (hit) wallHits.add(hit.kind); }
      }
    }
    for (const k of wallHits) out.push({ chair: ch.id, wall: true, zone: k, name: 'Parete' });
    ch._minWall = minWall;
  }
  return out;
}

// ---------- quantities ----------
function quantities() {
  const p = S.project; const q = { nuoveMur: 0, nuoveCart: 0, demol: 0, tamp: 0, nuoveAperture: 0, pipes: {}, floors: {} };
  for (const w of p.walls) {
    if (w.type === 'parapetto') continue;
    const L = wallLen(w), H = wallH(w);
    const ops = p.openings.filter((o) => o.wallId === w.id);
    const opArea = ops.filter((o) => w.status === 'nuovo' ? o.status !== 'chiuso' : true).reduce((s, o) => s + o.w * Math.min(o.h, H - (o.sill || 0)), 0);
    if (w.status === 'nuovo') { if (w.type === 'cartongesso') q.nuoveCart += L * H - opArea; else q.nuoveMur += L * H - opArea; }
    if (w.status === 'demolito') q.demol += L * H - opArea;
    if (w.status !== 'demolito') for (const o of ops) { if (o.status === 'chiuso') q.tamp += o.w * o.h; if (o.status === 'nuovo' && w.status === 'esistente') q.nuoveAperture++; }
  }
  for (const pp of p.pipes) { let L = 0; for (let i = 1; i < pp.pts.length; i++) L += V.dist(pp.pts[i - 1], pp.pts[i]); q.pipes[pp.kind] = (q.pipes[pp.kind] || 0) + L; }
  const rr = computeRooms('progetto');
  for (const r of p.rooms) { const st = rr.rooms.get(r.id); if (st && !st.open && !st.shared) q.floors[r.floor || 'gres-chiaro'] = (q.floors[r.floor || 'gres-chiaro'] || 0) + st.area; }
  return q;
}

// ---------- history ----------
function snapshot() {
  const p = S.project;
  return JSON.stringify({ name: p.name, walls: p.walls, openings: p.openings, items: p.items, rooms: p.rooms, pipes: p.pipes, dims: p.dims, settings: p.settings, bg: p.bg });
}
function restoreSnap(s) { const o = JSON.parse(s); Object.assign(S.project, o); normalizeProject(S.project); }
function pushUndo() { S.undo.push(snapshot()); if (S.undo.length > 120) S.undo.shift(); S.redo.length = 0; }
function commit(fn, opts = {}) { pushUndo(); fn(S.project); changed(opts); }
function changed(opts = {}) {
  S.rev++; invalidateRooms(); markDirty();
  if (!opts.noRender) requestRender();
  schedule3D(); if (!opts.keepPanel) refreshPanel(); updateUndoButtons();
}
function undo() { if (!S.undo.length) return; S.redo.push(snapshot()); restoreSnap(S.undo.pop()); validateSel(); changed(); }
function redo() { if (!S.redo.length) return; S.undo.push(snapshot()); restoreSnap(S.redo.pop()); validateSel(); changed(); }
function validateSel() { if (S.sel && !findSel(S.sel)) S.sel = null; }
function findSel(sel) {
  if (!sel) return null; const p = S.project;
  const arr = { wall: p.walls, opening: p.openings, item: p.items, room: p.rooms, pipe: p.pipes, dim: p.dims }[sel.kind];
  return arr ? arr.find((x) => x.id === sel.id) : null;
}

// ===================== persistence =====================
const Store = {
  mode: 'memory', db: null, uid: null, idb: null, _dl: undefined, mem: new Map(), queues: new Map(),
  async init() {
    const c = window.claude;
    if (c && typeof c.use === 'function') {
      try {
        const [db, user] = await Promise.all([c.use('db'), c.use('user')]);
        if (db && user) {
          const id = await user.id();
          if (id) { this.db = db; this.uid = id; this.mode = 'cloud'; return; }
        }
      } catch (e) { console.warn('db non disponibile', e); }
    }
    await this.openIdb();
    if (this.idb) this.mode = 'local';
    const cfg = syncConfig();
    if (cfg) { try { await FB.connect(cfg); this.mode = 'firebase'; } catch (e) { console.warn(e); toast('Sincronizzazione non disponibile ora: uso i dati di questo dispositivo', 4500); } }
  },
  label() { return this.mode === 'cloud' ? 'Sincronizzato con il tuo account claude.ai (Mac e iPad)' : this.mode === 'firebase' ? 'Sincronizzato tra i tuoi dispositivi con Firebase' : this.mode === 'local' ? 'Salvato in questo browser' : 'Solo in memoria: esporta il file progetto per conservarlo'; },
  openIdb() {
    return new Promise((res) => {
      try {
        const r = indexedDB.open('planner-studio-dentistico', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('kv');
        r.onsuccess = () => { this.idb = r.result; res(); };
        r.onerror = () => res();
        setTimeout(res, 3000);
      } catch { res(); }
    });
  },
  _tx(mode, fn) {
    return new Promise((res, rej) => {
      try { const tx = this.idb.transaction('kv', mode); const st = tx.objectStore('kv'); const out = fn(st); tx.oncomplete = () => res(out && out.result !== undefined ? out.result : out); tx.onerror = () => rej(tx.error); }
      catch (e) { rej(e); }
    });
  },
  idbGet(k) { return new Promise((res, rej) => { try { const r = this.idb.transaction('kv').objectStore('kv').get(k); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); } catch (e) { rej(e); } }); },
  idbSet(k, v) { return this._tx('readwrite', (st) => { st.put(v, k); }); },
  idbDel(k) { return this._tx('readwrite', (st) => { st.delete(k); }); },
  idbAll() { return new Promise((res, rej) => { try { const out = []; const r = this.idb.transaction('kv').objectStore('kv').openCursor(); r.onsuccess = () => { const c = r.result; if (c) { out.push([c.key, c.value]); c.continue(); } else res(out); }; r.onerror = () => rej(r.error); } catch (e) { rej(e); } }); },
  col() { return this.db.collection('data/users/' + this.uid); },
  serialize(p) { return JSON.stringify(p, (k, v) => (k.startsWith('_') ? undefined : v)); },
  queue(key, fn) { const prev = this.queues.get(key) || Promise.resolve(); const next = prev.catch(() => { }).then(fn); this.queues.set(key, next); return next; },
  async list() {
    if (this.mode === 'firebase') return FB.list();
    if (this.mode === 'cloud') {
      const snap = await this.col().where('kind', '==', 'project').get();
      return snap.docs.map((d) => { const x = d.data(); return { id: x.pid, name: x.name, origin: x.origin || null, updatedAt: x.updatedAt }; });
    }
    if (this.mode === 'local') { const all = await this.idbAll(); return all.filter(([k]) => String(k).startsWith('p:')).map(([, v]) => ({ id: v.pid, name: v.name, origin: v.origin || null, updatedAt: v.updatedAt })); }
    return [...this.mem.values()].filter((v) => v.kind === 'project').map((v) => ({ id: v.pid, name: v.name, origin: v.origin || null, updatedAt: v.updatedAt }));
  },
  async load(pid) {
    let rec;
    if (this.mode === 'firebase') rec = await FB.load(pid);
    else if (this.mode === 'cloud') { const d = await this.col().doc('p_' + pid).get(); rec = d.exists ? d.data() : null; }
    else if (this.mode === 'local') rec = await this.idbGet('p:' + pid);
    else rec = this.mem.get('p:' + pid);
    return rec ? normalizeProject(JSON.parse(rec.json)) : null;
  },
  async save(p) {
    const json = this.serialize(p);
    const rec = { kind: 'project', pid: p.id, name: p.name, origin: p.origin || null, updatedAt: p.updatedAt || Date.now(), json };
    if (this.mode === 'firebase') { if (json.length > 1000000) throw new Error('Progetto troppo grande per la sincronizzazione'); return this.queue('fb:' + p.id, () => FB.save(rec)); }
    if (this.mode === 'cloud') {
      if (json.length > 250000) throw new Error('Progetto troppo grande per il salvataggio online');
      return this.queue('p_' + p.id, () => this.col().doc('p_' + p.id).set(rec));
    }
    if (this.mode === 'local') return this.queue('p:' + p.id, () => this.idbSet('p:' + p.id, rec));
    this.mem.set('p:' + p.id, rec);
  },
  async saveBg(pid, dataUrl) {
    if (this.mode === 'firebase') return this.queue('fbbg:' + pid, () => FB.saveBg(pid, dataUrl));
    if (this.mode === 'cloud') {
      if (!dataUrl) return this.queue('bg_' + pid, () => this.col().doc('bg_' + pid).delete());
      return this.queue('bg_' + pid, () => this.col().doc('bg_' + pid).set({ kind: 'bg', pid, dataUrl }));
    }
    if (this.mode === 'local') return dataUrl ? this.idbSet('bg:' + pid, dataUrl) : this.idbDel('bg:' + pid);
    if (dataUrl) this.mem.set('bg:' + pid, dataUrl); else this.mem.delete('bg:' + pid);
  },
  async loadBg(pid) {
    if (this.mode === 'firebase') return FB.loadBg(pid);
    if (this.mode === 'cloud') { const d = await this.col().doc('bg_' + pid).get(); return d.exists ? d.data().dataUrl : null; }
    if (this.mode === 'local') return (await this.idbGet('bg:' + pid)) || null;
    return this.mem.get('bg:' + pid) || null;
  },
  async remove(pid) {
    if (this.mode === 'firebase') return FB.remove(pid);
    if (this.mode === 'cloud') { await this.col().doc('p_' + pid).delete(); await this.col().doc('bg_' + pid).delete(); return; }
    if (this.mode === 'local') { await this.idbDel('p:' + pid); await this.idbDel('bg:' + pid); return; }
    this.mem.delete('p:' + pid); this.mem.delete('bg:' + pid);
  },
  maxBgChars() { return this.mode === 'cloud' ? 235000 : this.mode === 'firebase' ? 900000 : 6000000; },
  async downloads() {
    if (this._dl !== undefined) return this._dl;
    try { this._dl = window.claude && typeof window.claude.use === 'function' ? await window.claude.use('downloads') : null; } catch { this._dl = null; }
    return this._dl;
  },
};

const VIEWER_EXT = new Set(['gif', 'png', 'jpg', 'jpeg', 'webp', 'mp4', 'webm', 'txt', 'json', 'md', 'docx', 'pptx', 'epub', 'csv', 'ttf', 'html', 'svg', 'pdf', 'xlsx', 'zip']);
async function offerFile(filename, blob) {
  const dl = await Store.downloads();
  const ext = filename.split('.').pop().toLowerCase();
  if (dl && !VIEWER_EXT.has(ext)) { // the claude.ai viewer saves only some formats: wrap the file in a zip
    const data = new Uint8Array(await blob.arrayBuffer()); blob = makeZip([{ name: filename, data }]); filename = filename.replace(/\.[^.]+$/, '') + '.zip';
  }
  if (!dl && isTouchDevice() && navigator.canShare) {
    try { const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' }); if (navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: filename }); return; } }
    catch (e) { if (e && e.name === 'AbortError') return; }
  }
  if (dl) {
    try { await dl.save({ filename, data: blob }); toast('File pronto: ' + filename); }
    catch (e) { if (e && e.code === 'declined') return; toast('Download non riuscito' + (e && e.message ? ': ' + e.message : '')); }
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: filename }); document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  toast('File scaricato: ' + filename);
}

// ---------- autosave ----------
function setSaveState(st, msg) {
  S.saveState = st; const n = $('#saveState'); if (!n) return;
  n.dataset.state = st;
  const txt = { saved: 'Salvato', saving: 'Salvataggio…', error: 'Errore di salvataggio', unsaved: 'Modifiche non salvate' }[st];
  n.querySelector('.txt').textContent = txt;
  n.title = st === 'error' ? (msg || 'Riprova') : Store.label();
}
const scheduleSave = debounce(() => saveNow(), 1100);
function markDirty() { if (!S.project) return; S.project._dirty = true; setSaveState('unsaved'); scheduleSave(); }
async function saveNow(p = S.project, force = false) {
  if (!p) return; if (!force && !p._dirty && !p._bgDirty) return;
  p._dirty = false;
  const isCur = p === S.project; if (isCur) setSaveState('saving');
  try {
    p.updatedAt = Date.now();
    if (p._bgDirty) { await Store.saveBg(p.id, S.bgData.get('img:' + p.id) || null); p._bgDirty = false; }
    await Store.save(p);
    p._unsaved = false;
    if (p === S.project && !p._dirty) setSaveState('saved');
    const row = S.projects.find((x) => x.id === p.id);
    if (row) { row.name = p.name; row.updatedAt = p.updatedAt; } else S.projects.push({ id: p.id, name: p.name, updatedAt: p.updatedAt });
  } catch (e) { console.error(e); p._dirty = true; if (p === S.project) setSaveState('error', e && e.message); }
}

// compress an image to a data URL within a character budget
async function imageToDataUrl(img, maxChars, maxSide = 3000) {
  let w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
  let f = Math.min(1, maxSide / Math.max(w, h));
  const c = document.createElement('canvas'); const g = c.getContext('2d');
  for (let attempt = 0; attempt < 10; attempt++) {
    c.width = Math.round(w * f); c.height = Math.round(h * f);
    g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
    const q = attempt < 3 ? .82 : attempt < 6 ? .7 : .6;
    const url = maxChars > 2e6 ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', q);
    if (url.length <= maxChars) return { url, w: c.width, h: c.height, f };
    if (maxChars > 2e6) { const u2 = c.toDataURL('image/jpeg', .85); if (u2.length <= maxChars) return { url: u2, w: c.width, h: c.height, f }; }
    f *= .82;
  }
  return { url: c.toDataURL('image/jpeg', .5), w: c.width, h: c.height, f };
}

// ===================== optional Firebase sync (GitHub Pages build) =====================
const FIREBASE_VER = '10.12.5';
function isTouchDevice() { return window.matchMedia && window.matchMedia('(pointer: coarse)').matches; }
function syncConfig() { try { const v = JSON.parse(localStorage.getItem('ps-sync') || 'null'); return v && v.config && v.space ? v : null; } catch { return null; } }
function randomSpace() { const a = new Uint8Array(20); crypto.getRandomValues(a); return Array.from(a, (b) => 'abcdefghijkmnpqrstuvwxyz23456789'[b % 32]).join('').replace(/(.{5})(?!$)/g, '$1-'); }
// accept the snippet as copied from the Firebase console (JS object literal) or plain JSON
function parseFirebaseConfig(txt) {
  const m = String(txt).match(/\{[\s\S]*\}/); if (!m) throw new Error('Non trovo l\'oggetto firebaseConfig');
  let body = m[0].replace(/\/\/.*$/gm, '').replace(/,\s*}/g, '}');
  body = body.replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '$1"$2":').replace(/'([^']*)'/g, '"$1"');
  const cfg = JSON.parse(body);
  if (!cfg.apiKey || !cfg.projectId) throw new Error('Mancano apiKey o projectId');
  return cfg;
}
const FB = {
  fs: null, space: null,
  async connect(sc, verify = false) {
    if (BUILD === 'artifact') throw new Error('Non disponibile qui');
    await loadScript(`https://www.gstatic.com/firebasejs/${FIREBASE_VER}/firebase-app-compat.js`);
    await loadScript(`https://www.gstatic.com/firebasejs/${FIREBASE_VER}/firebase-firestore-compat.js`);
    const fb = window.firebase; const name = 'planner-studio';
    const app = fb.apps.find((a) => a.name === name) || fb.initializeApp(sc.config, name);
    const fs = app.firestore();
    if (!FB._persist) { FB._persist = true; try { await fs.enablePersistence({ synchronizeTabs: true }); } catch (e) { /* another tab or unsupported */ } }
    this.fs = fs; this.space = sc.space;
    if (verify) { // must reach the server: catches a wrong configuration or missing Firestore rules
      await Promise.race([this.root().collection('projects').limit(1).get({ source: 'server' }), new Promise((_, rej) => setTimeout(() => rej(new Error('Firebase non risponde')), 15000))]);
    }
  },
  root() { return this.fs.collection('planner').doc(this.space); },
  async list() { const s = await this.root().collection('projects').get(); return s.docs.map((d) => { const x = d.data(); return { id: x.pid || d.id, name: x.name, origin: x.origin || null, updatedAt: x.updatedAt }; }); },
  async load(pid) { const d = await this.root().collection('projects').doc(pid).get(); return d.exists ? d.data() : null; },
  async meta(pid) { const d = await this.root().collection('projects').doc(pid).get({ source: 'server' }); return d.exists ? { updatedAt: d.data().updatedAt } : null; },
  async save(rec) { await this.root().collection('projects').doc(rec.pid).set(rec); },
  async saveBg(pid, url) { const ref = this.root().collection('bg').doc(pid); if (url) await ref.set({ pid, dataUrl: url }); else await ref.delete(); },
  async loadBg(pid) { const d = await this.root().collection('bg').doc(pid).get(); return d.exists ? d.data().dataUrl : null; },
  async remove(pid) { await this.root().collection('projects').doc(pid).delete(); await this.root().collection('bg').doc(pid).delete(); },
};

// turn sync on: connect, copy this device's projects up (newest wins), switch storage
async function enableSync(configText, space) {
  let cfg; try { cfg = parseFirebaseConfig(configText); } catch (e) { toast('Configurazione non valida: ' + e.message, 5000); return false; }
  space = (space || '').trim(); if (space.length < 20 || /[^A-Za-z0-9_-]/.test(space)) { toast('Il codice spazio deve avere almeno 20 caratteri tra lettere, numeri e trattini', 4500); return false; }
  toast('Mi collego a Firebase…', 6000);
  try { await FB.connect({ config: cfg, space }, true); }
  catch (e) { console.error(e); toast('Collegamento non riuscito: controlla configurazione e regole di Firestore (' + (e.code || e.message) + ')', 7000); return false; }
  // migrate local projects
  const prevMode = Store.mode; let up = 0;
  try {
    const remote = new Map((await FB.list()).map((r) => [r.id, r]));
    if (prevMode === 'local' || prevMode === 'memory') {
      const locals = await Store.list();
      for (const r of locals) {
        const rem = remote.get(r.id); if (rem && (rem.updatedAt || 0) >= (r.updatedAt || 0)) continue;
        const p = await Store.load(r.id); if (!p) continue;
        const bg = p.bg && p.bg.src && p.bg.src.startsWith('img:') ? await Store.loadBg(r.id) : null;
        Store.mode = 'firebase';
        if (bg) { const img = await loadImg(bg); const c = await imageToDataUrl(img, 900000); p.bg.mpp *= p.bg.w / c.w; p.bg.w = c.w; p.bg.h = c.h; await FB.saveBg(p.id, c.url); S.bgData.set('img:' + p.id, c.url); S.bgImages.delete('img:' + p.id); }
        p.updatedAt = r.updatedAt || Date.now(); await Store.save(p); up++;
        Store.mode = prevMode;
      }
    }
  } catch (e) { console.error(e); Store.mode = prevMode; toast('Copia dei progetti non completata: ' + (e.code || e.message), 6000); return false; }
  Store.mode = 'firebase';
  try { localStorage.setItem('ps-sync', JSON.stringify({ config: cfg, space })); } catch { }
  S.projects = await Store.list();
  if (S.project && !S.project._unsaved) { S.project._dirty = true; await saveNow(S.project); if (S.project.bg && S.project.bg.src && S.project.bg.src.startsWith('img:')) { S.project._bgDirty = true; await saveNow(S.project, true); } }
  setSaveState('saved'); refreshPanel(true);
  toast(up ? `Sincronizzazione attiva: ${up} progett${up === 1 ? 'o copiato' : 'i copiati'} su Firebase` : 'Sincronizzazione attiva', 4500);
  return true;
}
async function disableSync() {
  try { localStorage.removeItem('ps-sync'); } catch { }
  Store.mode = Store.idb ? 'local' : 'memory'; S.projects = await Store.list();
  if (S.project) { S.project._dirty = true; await saveNow(S.project); }
  refreshPanel(true); toast('Sincronizzazione disattivata: da ora salvo solo su questo dispositivo', 4500);
}
// when the app comes back to the foreground, pick up changes made on the other device
async function refreshFromRemote() {
  if (Store.mode !== 'firebase' || !S.project || S.project._unsaved || S.project._dirty || S.saveState === 'saving') return;
  try {
    const m = await FB.meta(S.project.id); if (!m) return;
    if ((m.updatedAt || 0) > (S.project.updatedAt || 0) + 500) {
      const view = { scale: Plan.scale, ox: Plan.ox, oy: Plan.oy };
      const p = await Store.load(S.project.id); if (!p) return;
      S.bgData.delete('img:' + p.id); await openProject(p); Object.assign(Plan, view); requestRender();
      toast('Progetto aggiornato con le modifiche fatte sull\'altro dispositivo');
    }
  } catch (e) { console.warn(e); }
}

function renderSyncSection(body) {
  if (Store.mode === 'cloud' || BUILD === 'artifact') return;
  const sc = syncConfig();
  const sec = el('div', { class: 'sec' }, el('div', { class: 'sec-title' }, 'Sincronizzazione Mac ↔ iPad'));
  if (Store.mode === 'firebase' && sc) {
    const code = el('input', { class: 'inp', type: 'text', readonly: true, value: sc.space, id: 'syncCode', 'aria-label': 'Codice spazio' });
    sec.append(el('div', { class: 'ok-box' }, `Attiva sul progetto Firebase “${sc.config.projectId}”. I progetti si aggiornano quando riapri l'app sull'altro dispositivo.`));
    sec.append(field('Codice spazio (usa lo stesso sull\'altro dispositivo)', el('div', { class: 'row' }, el('div', { style: { flex: '1' } }, code), el('button', { class: 'btn small', type: 'button', onclick: async () => { try { await navigator.clipboard.writeText(sc.space); toast('Codice copiato'); } catch { code.select(); } } }, 'Copia'))));
    sec.append(el('div', { class: 'row' }, el('button', { class: 'btn small', type: 'button', onclick: () => refreshFromRemote().then(() => toast('Controllo completato')) }, 'Controlla aggiornamenti'), el('button', { class: 'btn small danger', type: 'button', onclick: () => confirmSheet('Disattivare la sincronizzazione?', 'I progetti restano su Firebase; questo dispositivo torna a salvare solo in locale.', 'Disattiva', disableSync) }, 'Disattiva')));
  } else {
    const ta = el('textarea', { class: 'inp', rows: '5', id: 'fbConfig', placeholder: 'const firebaseConfig = {\n  apiKey: "…",\n  authDomain: "…",\n  projectId: "…",\n  …\n};', style: { fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '12px' } }, sc ? JSON.stringify(sc.config, null, 2) : '');
    const sp = el('input', { class: 'inp', type: 'text', id: 'fbSpace', value: sc?.space || randomSpace(), 'aria-label': 'Codice spazio' });
    ta.addEventListener('keydown', (e) => e.stopPropagation()); sp.addEventListener('keydown', (e) => e.stopPropagation());
    sec.append(el('p', { class: 'note' }, 'Per avere gli stessi progetti su Mac e iPad incolla la configurazione web del tuo progetto Firebase (puoi riusare quello del magazzino) e scegli un codice spazio. Sull\'altro dispositivo incolla la stessa configurazione e lo stesso codice.'));
    sec.append(field('Configurazione Firebase', ta));
    sec.append(field('Codice spazio', el('div', { class: 'row' }, el('div', { style: { flex: '1' } }, sp), el('button', { class: 'btn small', type: 'button', onclick: () => { sp.value = randomSpace(); } }, 'Genera'))));
    sec.append(el('button', { class: 'btn primary', type: 'button', onclick: async (e) => { const btn = e.currentTarget; btn.disabled = true; const ok = await enableSync(ta.value, sp.value); if (!ok) btn.disabled = false; } }, 'Attiva sincronizzazione'));
    sec.append(el('p', { class: 'note' }, 'Il codice funziona come una password: chi ha sia la configurazione sia il codice può leggere e modificare i progetti. Le regole Firestore da aggiungere sono nel file README del repository.'));
  }
  body.append(sec);
}

// ===================== 2D plan editor =====================
const LIGHT_PAL = {
  paper: '#EEF2F1', sheet: '#FFFFFF', chrome: '#FFFFFF', ink: '#1B2427', 'ink-2': '#46555A', muted: '#728287', line: '#D8DFDE', 'line-2': '#C3CDCC',
  accent: '#0E6B70', 'accent-weak': '#DCEDED', wall: '#283134', 'wall-light': '#8D989B', demo: '#DDA400', new: '#CC3A2B', ok: '#2D7A4E', warn: '#A86500', bad: '#BF3628',
  grid: '#E3E8E7', 'grid-major': '#CCD5D4', scene: '#E6ECEC', water: '#2F7FD0', drain: '#8A6A4E', air: '#1FA5A0', suction: '#8452C4', power: '#D08A14', dark: false,
};
const Plan = {
  cv: null, g: null, dpr: 1, W: 0, H: 0, scale: 50, ox: 0, oy: 0, pending: false,
  pointers: new Map(), pinch: null, pan: null, drag: null, cursor: null, snap: null, spaceDown: false,
  chain: [], measureA: null, calA: null, lenBuf: '', lastTap: 0, conflictsRev: -1, conflicts: [],

  init() {
    this.cv = $('#plan'); this.g = this.cv.getContext('2d');
    new ResizeObserver(() => this.resize()).observe($('#stage'));
    const cv = this.cv;
    cv.addEventListener('pointerdown', (e) => this.onDown(e));
    cv.addEventListener('pointermove', (e) => this.onMove(e));
    cv.addEventListener('pointerup', (e) => this.onUp(e));
    cv.addEventListener('pointercancel', (e) => this.onUp(e, true));
    cv.addEventListener('pointerleave', () => { if (!this.pointers.size) { this.cursor = null; this.snap = null; requestRender(); } });
    cv.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    cv.addEventListener('dblclick', (e) => { e.preventDefault(); this.finishChain(); });
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    // Safari trackpad pinch
    let gs = 1; cv.addEventListener('gesturestart', (e) => { e.preventDefault(); gs = 1; });
    cv.addEventListener('gesturechange', (e) => { e.preventDefault(); const r = cv.getBoundingClientRect(); this.zoomAt(e.scale / gs, e.clientX - r.left, e.clientY - r.top); gs = e.scale; });
  },
  resize() {
    const r = this.cv.getBoundingClientRect(); if (!r.width) return;
    const first = !this.W;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2); this.W = r.width; this.H = r.height;
    this.cv.width = Math.round(r.width * this.dpr); this.cv.height = Math.round(r.height * this.dpr);
    if (first && S.project) this.fit(); else requestRender();
  },
  w2s(p) { return { x: this.ox + p.x * this.scale, y: this.oy + p.y * this.scale }; },
  s2w(x, y) { return { x: (x - this.ox) / this.scale, y: (y - this.oy) / this.scale }; },
  evW(e) { const r = this.cv.getBoundingClientRect(); return this.s2w(e.clientX - r.left, e.clientY - r.top); },
  evS(e) { const r = this.cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; },
  zoomAt(f, sx, sy) {
    const ns = clamp(this.scale * f, 6, 900); f = ns / this.scale;
    this.ox = sx - (sx - this.ox) * f; this.oy = sy - (sy - this.oy) * f; this.scale = ns; requestRender();
  },
  bounds() {
    const p = S.project; let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const addp = (q) => { x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y); };
    for (const w of p.walls) { addp(w.a); addp(w.b); }
    for (const it of p.items) addp(it);
    if (!isFinite(x0) && p.bg) { addp({ x: p.bg.x, y: p.bg.y }); addp({ x: p.bg.x + p.bg.w * p.bg.mpp, y: p.bg.y + p.bg.h * p.bg.mpp }); }
    if (!isFinite(x0)) return { x0: -3, y0: -3, x1: 7, y1: 6 };
    return { x0, y0, x1, y1 };
  },
  fit() {
    if (!this.W) return; const b = this.bounds(); const m = 48;
    const topPad = 56;
    const s = Math.min((this.W - m * 2) / Math.max(b.x1 - b.x0, 1), (this.H - m * 2 - topPad) / Math.max(b.y1 - b.y0, 1));
    this.scale = clamp(s, 6, 400);
    this.ox = this.W / 2 - (b.x0 + b.x1) / 2 * this.scale; this.oy = topPad / 2 + this.H / 2 - (b.y0 + b.y1) / 2 * this.scale;
    requestRender();
  },

  // ---------------- rendering ----------------
  render() {
    const g = this.g; if (!g || !S.project) return;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    renderPlan(g, { scale: this.scale, ox: this.ox, oy: this.oy, W: this.W, H: this.H }, { interactive: true });
    $('#scaleRead').textContent = Math.round(this.scale / 50 * 100) + '%';
  },

  // ---------------- input ----------------
  onWheel(e) {
    e.preventDefault(); const s = this.evS(e);
    if (e.ctrlKey || e.metaKey) this.zoomAt(Math.exp(-e.deltaY * .01), s.x, s.y);
    else if (e.deltaMode === 1 || (Math.abs(e.deltaY) >= 40 && Math.abs(e.deltaX) < 1 && Number.isInteger(e.deltaY) && !e.shiftKey && this.isMouseWheel(e))) this.zoomAt(Math.exp(-e.deltaY * .0025), s.x, s.y);
    else { this.ox -= e.deltaX; this.oy -= e.deltaY; requestRender(); }
  },
  _wheelHist: [],
  isMouseWheel(e) { // heuristic: discrete large steps → mouse wheel
    const now = performance.now(); this._wheelHist = this._wheelHist.filter((t) => now - t < 300); this._wheelHist.push(now);
    return Math.abs(e.deltaY) % 1 === 0 && Math.abs(e.deltaY) >= 50 && this._wheelHist.length <= 3;
  },
  onDown(e) {
    this.cv.setPointerCapture(e.pointerId);
    this.pointers.set(e.pointerId, this.evS(e));
    if (this.pointers.size === 2) {
      // start pinch: abort any tool action
      if (this.drag && this.drag.moved) { this.drag = null; changed(); } else this.drag = null;
      this.pan = null;
      const [a, b] = [...this.pointers.values()];
      this.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), m: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, scale: this.scale, ox: this.ox, oy: this.oy };
      return;
    }
    if (this.pointers.size > 2) return;
    const w = this.evW(e); this.cursor = w;
    if (!S.hintSeen) { S.hintSeen = true; setTimeout(refreshToolOpts, 0); }
    if (e.button === 1 || e.button === 2 || this.spaceDown) { this.startPan(e); return; }
    if (S.placing) { this.placeItem(w, e); return; }
    const T = TOOLS[S.tool]; if (T && T.down) T.down.call(this, e, w);
  },
  onMove(e) {
    if (this.pointers.has(e.pointerId)) this.pointers.set(e.pointerId, this.evS(e));
    if (this.pinch && this.pointers.size >= 2) {
      const [a, b] = [...this.pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y), m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const ns = clamp(this.pinch.scale * d / this.pinch.d, 6, 900);
      const wx = (this.pinch.m.x - this.pinch.ox) / this.pinch.scale, wy = (this.pinch.m.y - this.pinch.oy) / this.pinch.scale;
      this.scale = ns; this.ox = m.x - wx * ns; this.oy = m.y - wy * ns; requestRender(); return;
    }
    const w = this.evW(e); this.cursor = w;
    if (this.pan) { const s = this.evS(e); this.ox = this.pan.ox + s.x - this.pan.sx; this.oy = this.pan.oy + s.y - this.pan.sy; requestRender(); return; }
    if (S.placing) { this.snap = placeSnap(S.placing, w); requestRender(); return; }
    const T = TOOLS[S.tool]; if (T && T.move) T.move.call(this, e, w); else requestRender();
  },
  onUp(e, cancel) {
    this.pointers.delete(e.pointerId);
    if (this.pinch) { if (this.pointers.size < 2) this.pinch = null; return; }
    if (this.pan) { this.pan = null; this.cv.classList.remove('panning'); return; }
    const T = TOOLS[S.tool]; if (T && T.up) T.up.call(this, e, this.evW(e), cancel);
  },
  startPan(e) { const s = this.evS(e); this.pan = { sx: s.x, sy: s.y, ox: this.ox, oy: this.oy }; this.cv.classList.add('panning'); },
  placeItem(w, e) {
    const type = S.placing; const c = CAT_BY_TYPE[type]; const sn = placeSnap(type, w);
    const it = { id: uid('i'), type, x: sn.x, y: sn.y, rot: sn.rot ?? 0, phase: phase() === 'fatto' ? 'esistente' : 'nuovo' };
    if (c.mount === 'wall' || c.mount === 'counter') it.elev = c.elev;
    commit((p) => p.items.push(it));
    S.sel = { kind: 'item', id: it.id };
    if (!(e && e.shiftKey)) { S.placing = null; refreshLibrary(); }
    setTab('props'); toast(c.name + ' aggiunto' + (S.placing ? ' · tocca ancora per aggiungerne un altro' : ''));
    requestRender();
  },
  finishChain() {
    const T = TOOLS[S.tool]; if (T && T.finish) T.finish.call(this);
  },
};

// ---------- snapping ----------
function snapPoint(p, opt = {}) {
  const tol = 12 / Plan.scale; const pr = S.project; let best = null, bd = tol;
  const walls = pr.walls.filter((w) => wallVisible(w));
  if (opt.endpoints !== false) for (const w of walls) for (const q of [w.a, w.b]) { if (opt.skip && opt.skip.includes(q)) continue; const d = V.dist(p, q); if (d < bd) { bd = d; best = { x: q.x, y: q.y, kind: 'end' }; } }
  if (!best && opt.items) for (const it of pr.items) { if (!catOf(it).utility && it.type !== 'riunito') continue; const d = V.dist(p, it); if (d < tol * 1.2) { best = { x: it.x, y: it.y, kind: 'item' }; break; } }
  if (!best && opt.from && opt.angle !== false) {
    const v = V.sub(p, opt.from); const L = V.len(v);
    if (L > 1e-3) {
      let a = Math.atan2(v.y, v.x); const step = Math.PI / 4; const na = Math.round(a / step) * step;
      if (Math.abs(a - na) < 7 * DEG) { const Lr = Math.round(L * 100) / 100; best = { x: opt.from.x + Math.cos(na) * Lr, y: opt.from.y + Math.sin(na) * Lr, kind: 'angle' }; }
    }
  }
  if (!best && opt.edges !== false) {
    let ed = tol * .8;
    for (const w of walls) { const r = projSeg(p, w.a, w.b); if (r.d < ed) { ed = r.d; best = { x: r.x, y: r.y, kind: 'edge', wall: w }; } }
  }
  const out = best || { x: p.x, y: p.y, kind: 'free' };
  // alignment guides
  out.guides = [];
  if (out.kind === 'free' || out.kind === 'angle') {
    let gx = null, gy = null, dxm = tol * .6, dym = tol * .6;
    for (const w of walls) for (const q of [w.a, w.b]) {
      if (Math.abs(q.x - out.x) < dxm) { dxm = Math.abs(q.x - out.x); gx = q; }
      if (Math.abs(q.y - out.y) < dym) { dym = Math.abs(q.y - out.y); gy = q; }
    }
    if (out.kind === 'free') { if (gx) { out.x = gx.x; out.guides.push({ a: gx, b: { x: gx.x, y: out.y } }); } if (gy) { out.y = gy.y; out.guides.push({ a: gy, b: { x: out.x, y: gy.y } }); } }
  }
  if (out.kind === 'free') { out.x = Math.round(out.x * 100) / 100; out.y = Math.round(out.y * 100) / 100; }
  return out;
}
// item placement snap (back against the nearest wall face for wall/cabinet items)
function placeSnap(type, p, it) {
  const c = CAT_BY_TYPE[type]; const d = it ? dimsOf(it) : { w: c.w, d: c.d, h: c.h };
  const out = { x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100, rot: it ? it.rot : 0, wall: null };
  if (!c.snap && c.mount !== 'wall') return out;
  const range = c.mount === 'wall' ? .6 : .35;
  let best = null;
  for (const w of S.project.walls) {
    if (!wallVisible(w) || w.type === 'parapetto') continue;
    const r = projSeg(p, w.a, w.b); if (r.traw < -.02 || r.traw > 1.02) continue;
    const n = wallNrm(w); const side = Math.sign(V.dot(V.sub(p, r), n)) || 1;
    const face = r.d - w.t / 2;
    const backDist = face - d.d / 2;
    if (Math.abs(backDist) < range && (!best || Math.abs(backDist) < Math.abs(best.bd))) best = { w, r, n, side, bd: backDist };
  }
  if (best) {
    const { w, r, n, side } = best; const nn = V.mul(n, side);
    const center = V.add({ x: r.x, y: r.y }, V.mul(nn, w.t / 2 + d.d / 2 + .002));
    // keep position along the wall from pointer
    out.x = Math.round(center.x * 1000) / 1000; out.y = Math.round(center.y * 1000) / 1000;
    // item front (+y local) must point along nn: rot such that (−sinθ, cosθ) = nn
    out.rot = Math.round(Math.atan2(-nn.x, nn.y) / DEG * 10) / 10; out.wall = w;
  }
  return out;
}

// ---------- hit testing ----------
function hitTest(w) {
  const p = S.project; const tol = 7 / Plan.scale;
  const items = p.items.filter((it) => itemVisible(it)).sort((a, b) => (elevOf(b) + dimsOf(b).h * .01) - (elevOf(a) + dimsOf(a).h * .01));
  // prefer smaller items on top when overlapping
  const hitItems = items.filter((it) => itemContains(it, w, tol * .5)).sort((a, b) => dimsOf(a).w * dimsOf(a).d - dimsOf(b).w * dimsOf(b).d);
  if (hitItems.length) return { kind: 'item', id: hitItems[0].id };
  for (const o of p.openings) {
    if (!openingVisible(o)) continue; const wl = wallById(o.wallId); if (!wl || !wallVisible(wl)) continue;
    const L = wallLen(wl); const [s0, s1] = openingSpan(o, wl); const a = V.add(wl.a, V.mul(wallDir(wl), s0)), b = V.add(wl.a, V.mul(wallDir(wl), s1));
    if (projSeg(w, a, b).d < wl.t / 2 + tol) return { kind: 'opening', id: o.id };
  }
  for (const wl of p.walls) { if (!wallVisible(wl)) continue; if (projSeg(w, wl.a, wl.b).d < Math.max(wl.t / 2, tol)) return { kind: 'wall', id: wl.id }; }
  for (const pp of p.pipes) { if (!pipeVisible(pp)) continue; for (let i = 1; i < pp.pts.length; i++) if (projSeg(w, pp.pts[i - 1], pp.pts[i]).d < tol) return { kind: 'pipe', id: pp.id }; }
  for (const dm of p.dims) if (projSeg(w, dm.a, dm.b).d < tol) return { kind: 'dim', id: dm.id };
  const room = roomAtPoint(w); if (room) return { kind: 'room', id: room.id };
  return null;
}
function handleAt(sp) {
  const sel = S.sel; if (!sel) return null; const o = findSel(sel); if (!o) return null;
  const near = (q, r = 12) => { const s = Plan.w2s(q); return Math.hypot(s.x - sp.x, s.y - sp.y) < r; };
  if (sel.kind === 'wall') { if (near(o.a)) return { h: 'a' }; if (near(o.b)) return { h: 'b' }; }
  if (sel.kind === 'item') { const rh = rotHandlePos(o); if (near(rh, 14)) return { h: 'rot' }; }
  if (sel.kind === 'pipe' || sel.kind === 'dim') { const pts = sel.kind === 'pipe' ? o.pts : [o.a, o.b]; for (let i = 0; i < pts.length; i++) if (near(pts[i])) return { h: 'v', i }; }
  return null;
}
function rotHandlePos(it) { const d = dimsOf(it); const off = d.d / 2 + Math.max(.25, 28 / Plan.scale); return V.add({ x: it.x, y: it.y }, V.rot({ x: 0, y: off }, it.rot * DEG)); }
function coincidentEnds(pt, exceptWall) {
  const out = [];
  for (const w of S.project.walls) { if (w === exceptWall) continue; if (V.dist(w.a, pt) < .015) out.push(w.a); if (V.dist(w.b, pt) < .015) out.push(w.b); }
  return out;
}

// ---------------- tools ----------------
const TOOLS = {
  select: {
    label: 'Seleziona', icon: 'select', key: 'V',
    down(e, w) {
      const sp = this.evS(e); const h = handleAt(sp);
      if (h) {
        const o = findSel(S.sel);
        if (S.sel.kind === 'wall') { const pt = o[h.h]; this.drag = { type: 'wallEnd', wall: o, end: h.h, linked: coincidentEnds(pt, o), start: { ...pt } }; }
        else if (S.sel.kind === 'item') this.drag = { type: 'rot', item: o };
        else this.drag = { type: 'vertex', obj: o, i: h.i, isDim: S.sel.kind === 'dim' };
        this.drag.sx = sp.x; this.drag.sy = sp.y; return;
      }
      const hit = hitTest(w);
      if (!hit) {
        if (S.sel) { S.sel = null; refreshPanel(); requestRender(); }
        this.startPan(e); return;
      }
      if (!S.sel || S.sel.kind !== hit.kind || S.sel.id !== hit.id) { S.sel = hit; selectionChanged(); }
      const o = findSel(hit);
      const d = { sx: sp.x, sy: sp.y, w0: w };
      if (hit.kind === 'item') Object.assign(d, { type: 'item', item: o, p0: { x: o.x, y: o.y }, rot0: o.rot });
      else if (hit.kind === 'wall') Object.assign(d, { type: 'wall', wall: o, a0: { ...o.a }, b0: { ...o.b }, la: coincidentEnds(o.a, o).map((q) => [q, { ...q }]), lb: coincidentEnds(o.b, o).map((q) => [q, { ...q }]) });
      else if (hit.kind === 'opening') Object.assign(d, { type: 'opening', op: o });
      else if (hit.kind === 'pipe') Object.assign(d, { type: 'pipe', pipe: o, pts0: o.pts.map((q) => ({ ...q })) });
      else if (hit.kind === 'dim') Object.assign(d, { type: 'dimmove', dim: o, a0: { ...o.a }, b0: { ...o.b } });
      else d.type = 'none';
      this.drag = d; requestRender();
    },
    move(e, w) {
      const d = this.drag;
      if (!d) { const h = hitTest(w); const key = h ? h.kind + h.id : ''; if (key !== (S.hover ? S.hover.kind + S.hover.id : '')) { S.hover = h; requestRender(); } return; }
      const sp = this.evS(e);
      if (!d.moved) { if (Math.hypot(sp.x - d.sx, sp.y - d.sy) < 4 || d.type === 'none') return; d.moved = true; pushUndo(); }
      if (d.type === 'item') {
        const it = d.item; const target = V.add(d.p0, V.sub(w, d.w0));
        const sn = placeSnap(it.type, target, it);
        it.x = sn.x; it.y = sn.y; if (sn.wall) it.rot = sn.rot;
        this.snap = sn.wall ? { x: sn.x, y: sn.y, kind: 'wall' } : null;
      } else if (d.type === 'rot') {
        const it = d.item; let a = Math.atan2(w.y - it.y, w.x - it.x) / DEG - 90;
        a = e.altKey ? Math.round(a) : Math.round(a / 15) * 15; it.rot = ((a % 360) + 360) % 360;
      } else if (d.type === 'wall') {
        const wl = d.wall; const n = wallNrm({ a: d.a0, b: d.b0 }); const delta = V.sub(w, d.w0);
        let k = V.dot(delta, n); k = Math.round(k * 100) / 100;
        const off = V.mul(n, k);
        wl.a.x = d.a0.x + off.x; wl.a.y = d.a0.y + off.y; wl.b.x = d.b0.x + off.x; wl.b.y = d.b0.y + off.y;
        for (const [q, q0] of d.la) { q.x = q0.x + off.x; q.y = q0.y + off.y; }
        for (const [q, q0] of d.lb) { q.x = q0.x + off.x; q.y = q0.y + off.y; }
      } else if (d.type === 'wallEnd') {
        const wl = d.wall; const other = d.end === 'a' ? wl.b : wl.a;
        const sn = snapPoint(w, { from: other, skip: [wl.a, wl.b, ...d.linked] }); this.snap = sn;
        wl[d.end].x = sn.x; wl[d.end].y = sn.y;
        for (const q of d.linked) { q.x = sn.x; q.y = sn.y; }
      } else if (d.type === 'opening') {
        const o = d.op; const wl = wallById(o.wallId); const L = wallLen(wl); const r = projSeg(w, wl.a, wl.b);
        const half = o.w / 2 / L; o.t = clamp(r.t, half + .02 / L, 1 - half - .02 / L);
      } else if (d.type === 'pipe') {
        const delta = V.sub(w, d.w0); d.pipe.pts.forEach((q, i) => { q.x = d.pts0[i].x + delta.x; q.y = d.pts0[i].y + delta.y; });
      } else if (d.type === 'vertex') {
        const pts = d.isDim ? [d.obj.a, d.obj.b] : d.obj.pts; const from = pts[d.i - 1] || pts[d.i + 1];
        const sn = snapPoint(w, { from, items: !d.isDim, skip: [] }); this.snap = sn; pts[d.i].x = sn.x; pts[d.i].y = sn.y;
      } else if (d.type === 'dimmove') {
        const delta = V.sub(w, d.w0); d.dim.a.x = d.a0.x + delta.x; d.dim.a.y = d.a0.y + delta.y; d.dim.b.x = d.b0.x + delta.x; d.dim.b.y = d.b0.y + delta.y;
      }
      invalidateRooms(); requestRender();
      if (d.type === 'item' || d.type === 'rot') liveUpdateItem3D(d.item);
    },
    up(e, w) {
      const d = this.drag; this.drag = null; this.snap = null;
      if (d && d.moved) changed();
      requestRender();
    },
  },
  wall: {
    label: 'Muro', icon: 'wall', key: 'W', draw: true,
    down(e, w) {
      const from = this.chain[this.chain.length - 1];
      const sn = snapPoint(w, { from }); const p = { x: sn.x, y: sn.y };
      if (!from) { this.chain = [p]; requestRender(); return; }
      if (this.chain.length > 1 && V.dist(p, this.chain[0]) < 14 / Plan.scale) { addWall(from, this.chain[0]); this.chain = []; requestRender(); return; }
      if (V.dist(p, from) < .02) return;
      addWall(from, p); this.chain.push(p);
      const now = performance.now(); this.lastTap = now;
    },
    move(e, w) { const from = this.chain[this.chain.length - 1]; this.snap = snapPoint(w, { from }); requestRender(); },
    finish() { this.chain = []; this.lenBuf = ''; refreshToolOpts(); requestRender(); },
  },
  door: {
    label: 'Porta', icon: 'door', key: 'D', draw: true,
    move(e, w) { this.snap = openingPreview(w, 'door'); requestRender(); },
    down(e, w) { const pv = openingPreview(w, 'door'); if (pv) addOpening(pv, 'door'); else toast('Avvicinati a un muro per inserire la porta'); },
  },
  window: {
    label: 'Finestra', icon: 'window', key: 'F', draw: true,
    move(e, w) { this.snap = openingPreview(w, 'window'); requestRender(); },
    down(e, w) { const pv = openingPreview(w, 'window'); if (pv) addOpening(pv, 'window'); else toast('Avvicinati a un muro per inserire la finestra'); },
  },
  room: {
    label: 'Stanza', icon: 'room', key: 'R', draw: true,
    move(e, w) { this.snap = null; requestRender(); },
    down(e, w) {
      const ex = roomAtPoint(w); if (ex) { S.sel = { kind: 'room', id: ex.id }; selectionChanged(); return; }
      const st = regionOpenAt(w);
      if (!st || st.open || !st.area) { toast('Quest\'area non è chiusa: completa i muri o tocca dentro una stanza'); return; }
      const n = S.project.rooms.length + 1;
      const r = { id: uid('r'), name: 'Stanza ' + n, seed: { x: w.x, y: w.y }, floor: 'gres-chiaro' };
      commit((p) => p.rooms.push(r)); S.sel = { kind: 'room', id: r.id }; selectionChanged();
      toast(`${r.name}: ${fmtA(st.area)}`);
    },
  },
  measure: {
    label: 'Misura', icon: 'measure', key: 'M', draw: true,
    down(e, w) {
      const sn = snapPoint(w, { from: this.measureA }); const p = { x: sn.x, y: sn.y };
      if (!this.measureA) { this.measureA = p; return; }
      const dm = { id: uid('d'), a: this.measureA, b: p }; this.measureA = null;
      if (V.dist(dm.a, dm.b) > .01) commit((pr) => pr.dims.push(dm));
    },
    move(e, w) { this.snap = snapPoint(w, { from: this.measureA }); requestRender(); },
    finish() { this.measureA = null; requestRender(); },
  },
  pipe: {
    label: 'Tubazione', icon: 'pipe', key: 'T', draw: true,
    down(e, w) {
      const from = this.chain[this.chain.length - 1];
      const sn = snapPoint(w, { from, items: true }); const p = { x: sn.x, y: sn.y };
      if (from && V.dist(p, from) < .02) { this.finishChain(); return; }
      this.chain.push(p); requestRender();
    },
    move(e, w) { const from = this.chain[this.chain.length - 1]; this.snap = snapPoint(w, { from, items: true }); requestRender(); },
    finish() {
      if (this.chain.length >= 2) {
        const pp = { id: uid('p'), kind: S.pipeOpts.kind, pts: this.chain.map((q) => ({ ...q })), status: phase() === 'fatto' ? 'esistente' : 'nuovo' };
        commit((p) => p.pipes.push(pp)); S.sel = { kind: 'pipe', id: pp.id }; selectionChanged();
      }
      this.chain = []; refreshToolOpts(); requestRender();
    },
  },
  calibrate: {
    label: 'Calibra scala', icon: 'calibrate', key: 'C', draw: true,
    down(e, w) {
      const sn = snapPoint(w, { from: this.calA, edges: false }); const p = { x: sn.x, y: sn.y };
      if (!this.calA) { this.calA = p; refreshToolOpts(); return; }
      const a = this.calA; this.calA = null; refreshToolOpts();
      if (V.dist(a, p) < .02) return;
      openCalibrate(a, p);
    },
    move(e, w) { this.snap = snapPoint(w, { from: this.calA, edges: false }); requestRender(); },
    finish() { this.calA = null; refreshToolOpts(); requestRender(); },
  },
  bg: {
    label: 'Planimetria di sfondo', icon: 'image', key: 'B',
    down(e, w) { const bg = S.project.bg; if (!bg) { this.startPan(e); return; } this.drag = { type: 'bg', w0: w, x0: bg.x, y0: bg.y, sx: e.clientX, sy: e.clientY }; },
    move(e, w) {
      const d = this.drag; if (!d) return;
      if (!d.moved) { if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 4) return; d.moved = true; pushUndo(); }
      const bg = S.project.bg; bg.x = d.x0 + w.x - d.w0.x; bg.y = d.y0 + w.y - d.w0.y; requestRender();
    },
    up() { const d = this.drag; this.drag = null; if (d && d.moved) changed(); },
  },
};
function addWall(a, b) {
  const w = { id: uid('w'), a: { ...a }, b: { ...b }, t: S.wallOpts.t, type: S.wallOpts.type, status: phase() === 'fatto' ? 'esistente' : 'nuovo' };
  commit((p) => {
    // split existing walls where the new wall starts or ends in their middle (T-junction)
    for (const q of [w.a, w.b]) {
      for (const o of [...p.walls]) { if (!wallVisible(o)) continue; splitWallAt(p, o, q); }
    }
    p.walls.push(w);
  }, { keepPanel: true });
  return w;
}
function splitWallAt(p, w, pt) {
  const L = wallLen(w); if (L < .1) return null;
  const r = projSeg(pt, w.a, w.b); if (r.d > .02 || r.t <= .02 || r.t >= .98) return null;
  const ops = p.openings.filter((o) => o.wallId === w.id);
  if (ops.some((o) => Math.abs(o.t * L - r.t * L) < o.w / 2 + .02)) return null;
  const m = { x: r.x, y: r.y }; const t = r.t;
  const w2 = { ...deepClone(w), id: uid('w'), a: { ...m }, b: { ...w.b } }; w.b = { ...m };
  for (const o of ops) { if (o.t > t) { o.wallId = w2.id; o.t = (o.t - t) / (1 - t); } else o.t = o.t / t; }
  p.walls.push(w2); return w2;
}
function openingPreview(w, tool) {
  const opts = tool === 'door' ? S.openOpts : S.winOpts;
  let best = null;
  for (const wl of S.project.walls) {
    if (!wallVisible(wl) || wl.type === 'parapetto') continue;
    const r = projSeg(w, wl.a, wl.b); const lim = wl.t / 2 + .5;
    if (r.d < lim && (!best || r.d < best.r.d)) best = { wl, r };
  }
  if (!best) return null;
  const { wl, r } = best; const L = wallLen(wl); if (L < opts.w + .06) return null;
  const half = opts.w / 2 / L; const t = clamp(r.t, half + .03 / L, 1 - half - .03 / L);
  const side = Math.sign(V.dot(V.sub(w, r), wallNrm(wl))) || 1;
  return { wall: wl, t, w: opts.w, kind: opts.kind, swing: side, hinge: r.t < t ? 'start' : 'end' };
}
function addOpening(pv, tool) {
  const isWin = tool === 'window';
  const o = {
    id: uid('o'), wallId: pv.wall.id, t: Math.round(pv.t * 10000) / 10000, kind: pv.kind, w: pv.w,
    h: pv.kind === 'finestra' ? 1.3 : pv.kind === 'portafinestra' ? 2.3 : 2.1, sill: pv.kind === 'finestra' ? .9 : 0,
    hinge: pv.hinge, swing: pv.swing, status: phase() === 'fatto' ? 'esistente' : 'nuovo',
  };
  commit((p) => p.openings.push(o)); S.sel = { kind: 'opening', id: o.id }; selectionChanged();
}

// ---------------- the renderer (shared by screen, minimap and export) ----------------
function renderPlan(g, view, opt = {}) {
  const p = S.project; const { scale, ox, oy, W, H } = view;
  const ph = opt.phase || phase();
  const w2s = (q) => ({ x: ox + q.x * scale, y: oy + q.y * scale });
  const K = opt.k || 1; const px = K / scale; // one css pixel in meters (×K for print)
  g.save();
  g.fillStyle = opt.export ? '#FFFFFF' : PAL.sheet; g.fillRect(0, 0, W, H);
  // world transform
  g.translate(ox, oy); g.scale(scale, scale);
  const vx0 = -ox / scale, vy0 = -oy / scale, vx1 = (W - ox) / scale, vy1 = (H - oy) / scale;

  // background plan
  if (p.bg && p.settings.showBg && !opt.mini && !opt.noBg) {
    let img = bgImage(p.bg.src);
    if (img && img.complete && img.naturalWidth) {
      if (PAL.dark && !opt.export) img = invertedBg(p.bg.src, img);
      g.save(); g.globalAlpha = p.settings.bgOpacity ?? .55;
      const bw = p.bg.w * p.bg.mpp, bh = p.bg.h * p.bg.mpp;
      if (p.bg.rot) { g.translate(p.bg.x + bw / 2, p.bg.y + bh / 2); g.rotate(p.bg.rot * DEG); g.drawImage(img, -bw / 2, -bh / 2, bw, bh); }
      else g.drawImage(img, p.bg.x, p.bg.y, bw, bh);
      g.restore();
    }
  }
  // grid
  if (p.settings.grid && !opt.mini && !opt.export) {
    const minor = scale >= 90 ? .1 : scale >= 28 ? .5 : 1, major = scale < 12 ? 5 : 1;
    g.lineWidth = px;
    const drawLines = (step, color) => {
      g.strokeStyle = color; g.beginPath();
      for (let x = Math.floor(vx0 / step) * step; x <= vx1; x += step) { g.moveTo(x, vy0); g.lineTo(x, vy1); }
      for (let y = Math.floor(vy0 / step) * step; y <= vy1; y += step) { g.moveTo(vx0, y); g.lineTo(vx1, y); }
      g.stroke();
    };
    if (minor < major) drawLines(minor, hexA(PAL.grid, PAL.dark ? .9 : .9));
    drawLines(major, PAL['grid-major']);
  }
  // rooms
  const rr = computeRooms(ph);
  if (!opt.mini) for (const r of p.rooms) {
    const st = rr.rooms.get(r.id); if (!st || st.open || !st.rects) continue;
    const sel = S.sel && S.sel.kind === 'room' && S.sel.id === r.id && opt.interactive;
    g.fillStyle = hexA((FLOORS[r.floor] || FLOORS['gres-chiaro']).tint, opt.export ? .5 : PAL.dark ? .14 : .5);
    for (const q of st.rects) g.fillRect(q.x, q.y, q.w + px * .6, q.h + px * .6);
    if (sel) { g.fillStyle = hexA(PAL.accent, .12); for (const q of st.rects) g.fillRect(q.x, q.y, q.w + px * .6, q.h + px * .6); }
  }
  // pipes
  if (!opt.mini) for (const pp of p.pipes) {
    if (!pipeVisible(pp, ph) || pp.pts.length < 2) continue;
    const [, tok] = PIPE_KINDS[pp.kind] || ['', 'water']; const col = PAL[tok];
    const sel = S.sel && S.sel.kind === 'pipe' && S.sel.id === pp.id && opt.interactive;
    g.strokeStyle = col; g.lineWidth = (sel ? 5 : 3.2) * px; g.lineCap = 'round'; g.lineJoin = 'round';
    g.setLineDash(pp.kind === 'scarico' ? [10 * px, 5 * px] : pp.kind === 'elettrico' ? [3 * px, 4 * px] : pp.kind === 'aspirazione' ? [12 * px, 4 * px, 2 * px, 4 * px] : []);
    g.beginPath(); g.moveTo(pp.pts[0].x, pp.pts[0].y); for (const q of pp.pts.slice(1)) g.lineTo(q.x, q.y); g.stroke(); g.setLineDash([]);
    if (ph === 'confronto' && pp.status === 'nuovo') { g.strokeStyle = hexA(PAL.new, .35); g.lineWidth = 8 * px; g.stroke(); }
  }
  // walls
  const visWalls = p.walls.filter((w) => wallVisible(w, ph));
  const drawWall = (w) => {
    const [ea, eb] = wallExt(w, visWalls); const q = wallQuad(w, ea, eb);
    let fill = w.type === 'cartongesso' ? PAL['wall-light'] : PAL.wall, outline = null, dash = null;
    if (w.type === 'parapetto') { fill = hexA(PAL.wall, .18); outline = PAL.wall; }
    if (ph === 'confronto') { if (w.status === 'demolito') { fill = hexA(PAL.demo, .9); outline = shade(PAL.demo, -.35); dash = [5 * px, 3 * px]; } else if (w.status === 'nuovo') fill = PAL.new; }
    if (opt.mini) fill = PAL['ink-2'];
    g.beginPath(); g.moveTo(q[0].x, q[0].y); for (let i = 1; i < 4; i++) g.lineTo(q[i].x, q[i].y); g.closePath();
    g.fillStyle = fill; g.fill();
    if (outline) { g.strokeStyle = outline; g.lineWidth = px; if (dash) g.setLineDash(dash); g.stroke(); g.setLineDash([]); }
    if (w.type === 'cartongesso' && !opt.mini && ph !== 'confronto') { g.strokeStyle = PAL.wall; g.lineWidth = px * .9; g.beginPath(); g.moveTo(q[0].x, q[0].y); g.lineTo(q[1].x, q[1].y); g.moveTo(q[3].x, q[3].y); g.lineTo(q[2].x, q[2].y); g.stroke(); }
  };
  // draw existing first, then demolished/new on top in confronto
  for (const w of visWalls.filter((w) => !(ph === 'confronto' && w.status !== 'esistente'))) drawWall(w);
  for (const w of visWalls.filter((w) => ph === 'confronto' && w.status !== 'esistente')) drawWall(w);
  // openings
  for (const o of p.openings) {
    const wl = p.walls.find((w) => w.id === o.wallId); if (!wl || !wallVisible(wl, ph) || !openingVisible(o, ph)) continue;
    drawOpening(g, o, wl, px, ph, opt);
  }
  // working zones
  const showZones = opt.zones ?? (S.view3d.zones && !opt.mini);
  if (showZones) for (const it of p.items) {
    if (it.type !== 'riunito' || !itemVisible(it, ph) || it.zones === false) continue;
    drawZones(g, it, px, opt);
  }
  // items
  if (!opt.mini) {
    if (opt.interactive && Plan.conflictsRev !== S.rev + ph) { Plan.conflicts = zoneConflicts(ph); Plan.conflictsRev = S.rev + ph; }
    const conflictIds = new Set((opt.interactive ? Plan.conflicts : zoneConflicts(ph)).filter((c) => c.item).map((c) => c.item));
    const items = p.items.filter((it) => itemVisible(it, ph)).sort((a, b) => (elevOf(a) > 1.2 ? 1 : 0) - (elevOf(b) > 1.2 ? 1 : 0) || (elevOf(a) - elevOf(b)));
    for (const it of items) drawItem(g, it, px, ph, opt, conflictIds.has(it.id));
  } else {
    g.fillStyle = PAL['wall-light'];
    for (const it of p.items) { if (!itemVisible(it, ph) || catOf(it).utility) continue; const c = itemCorners(it); g.beginPath(); g.moveTo(c[0].x, c[0].y); c.slice(1).forEach((q) => g.lineTo(q.x, q.y)); g.closePath(); g.globalAlpha = .5; g.fill(); g.globalAlpha = 1; }
  }
  g.restore(); // back to screen space

  // ---- screen-space overlays ----
  g.save();
  const fontL = (sz, w = 500) => `${w} ${sz * K}px "Barlow Semi Condensed", "Barlow", system-ui, sans-serif`;
  // auto wall lengths
  if (!opt.mini && p.settings.autoDims && scale > 26) {
    g.font = fontL(clamp(scale * .17, 10, 12.5)); g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const w of visWalls) {
      if (w.type === 'parapetto') continue; const L = wallLen(w); if (L * scale < 46 * K) continue;
      const m = { x: (w.a.x + w.b.x) / 2, y: (w.a.y + w.b.y) / 2 }, n = wallNrm(w), d = wallDir(w);
      const off = w.t / 2 + 9 * K / scale; const pos = w2s(V.add(m, V.mul(n, off)));
      let ang = Math.atan2(d.y, d.x); if (ang > Math.PI / 2) ang -= Math.PI; if (ang < -Math.PI / 2) ang += Math.PI;
      g.save(); g.translate(pos.x, pos.y); g.rotate(ang);
      const txt = nf2.format(L); const tw = g.measureText(txt).width + 6 * K;
      g.fillStyle = hexA(opt.export ? '#ffffff' : PAL.sheet, .85); g.fillRect(-tw / 2, -7 * K, tw, 14 * K);
      g.fillStyle = ph === 'confronto' && w.status === 'nuovo' ? PAL.new : ph === 'confronto' && w.status === 'demolito' ? shade(PAL.demo, -.3) : (opt.export ? '#46555A' : PAL['ink-2']);
      g.fillText(txt, 0, .5); g.restore();
    }
  }
  // dimension lines
  if (!opt.mini) for (const dm of p.dims) drawDim(g, dm, w2s, scale, S.sel && S.sel.kind === 'dim' && S.sel.id === dm.id && opt.interactive, opt, K);
  // room labels
  if (!opt.mini) {
    const blocked = (q) => p.items.some((it) => itemVisible(it, ph) && !catOf(it).utility && elevOf(it) < 1.2 && itemContains(it, q, .22));
    const inReg = (q, reg) => { const G = rr.grid; if (!G) return false; const i = Math.floor((q.x - G.x0) / G.cell), j = Math.floor((q.y - G.y0) / G.cell); return i >= 0 && j >= 0 && i < G.W && j < G.H && G.reg[j * G.W + i] === reg; };
    const roomy = (q, reg) => inReg(q, reg) && inReg({ x: q.x - .45, y: q.y }, reg) && inReg({ x: q.x + .45, y: q.y }, reg) && inReg({ x: q.x, y: q.y - .22 }, reg) && inReg({ x: q.x, y: q.y + .22 }, reg);
    if (!renderPlan._lc || renderPlan._lcKey !== S.rev + ph) { renderPlan._lc = new Map(); renderPlan._lcKey = S.rev + ph; }
    const labelPos = (r, st) => {
      if (renderPlan._lc.has(r.id) && !(Plan.drag && Plan.drag.moved)) return renderPlan._lc.get(r.id);
      const v = labelPos0(r, st); renderPlan._lc.set(r.id, v); return v;
    };
    const labelPos0 = (r, st) => {
      let at = st && st.label ? st.label : r.seed;
      if (!st || st.open || !blocked(at)) return at;
      for (const rad of [.5, .8, 1.1, 1.5, 2.0, 2.6]) for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; const q = { x: at.x + Math.cos(a) * rad, y: at.y + Math.sin(a) * rad }; if (roomy(q, st.reg) && !blocked(q)) return q; }
      return at;
    };
    for (const r of p.rooms) {
      const st = rr.rooms.get(r.id); if (st && st.shared) continue; const at = labelPos(r, st); const s = w2s(at);
      if (s.x < -80 || s.y < -40 || s.x > W + 80 || s.y > H + 40) continue;
      const big = clamp(scale * .2, 10.5, 15);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = fontL(big, 600); g.fillStyle = opt.export ? '#1B2427' : PAL.ink;
      const area = st && !st.open ? fmtA(st.area) : 'area aperta';
      const nameW = g.measureText(r.name).width; g.font = fontL(big * .85, 500); const areaW = g.measureText(area).width;
      const bw = Math.max(nameW, areaW) + 12 * K; const bk = big * K;
      g.fillStyle = hexA(opt.export ? '#ffffff' : PAL.sheet, .78); g.fillRect(s.x - bw / 2, s.y - bk - 2 * K, bw, bk * 2.1 + 4 * K);
      g.font = fontL(big, 600); g.fillStyle = opt.export ? '#1B2427' : PAL.ink; g.fillText(r.name, s.x, s.y - bk * .45);
      g.font = fontL(big * .85, 500); g.fillStyle = st && st.open ? PAL.warn : (opt.export ? '#46555A' : PAL['ink-2']); g.fillText(area, s.x, s.y + bk * .6);
    }
  }
  // pipe lengths
  if (!opt.mini && scale > 20) for (const pp of p.pipes) {
    if (!pipeVisible(pp, ph) || pp.pts.length < 2) continue; let L = 0, bi = 1, bl = 0;
    for (let i = 1; i < pp.pts.length; i++) { const l = V.dist(pp.pts[i - 1], pp.pts[i]); L += l; if (l > bl) { bl = l; bi = i; } }
    const m = w2s({ x: (pp.pts[bi - 1].x + pp.pts[bi].x) / 2, y: (pp.pts[bi - 1].y + pp.pts[bi].y) / 2 });
    const [, tok] = PIPE_KINDS[pp.kind]; g.font = fontL(11, 600); g.textAlign = 'center'; g.textBaseline = 'middle';
    const txt = nf2.format(L) + ' m'; const tw = g.measureText(txt).width + 8 * K;
    g.fillStyle = PAL[tok]; g.beginPath(); g.roundRect ? g.roundRect(m.x - tw / 2, m.y - 15 * K, tw, 14 * K, 4 * K) : g.rect(m.x - tw / 2, m.y - 15 * K, tw, 14 * K); g.fill();
    g.fillStyle = '#fff'; g.fillText(txt, m.x, m.y - 7.5 * K);
  }
  if (opt.interactive) drawInteractive(g, w2s, scale, fontL);
  // scale bar
  if (!opt.mini) {
    const target = 90 * K / scale; const steps = [.1, .2, .25, .5, 1, 2, 5, 10, 20]; const L = steps.find((s) => s >= target) || 20;
    const bw = L * scale, x = W - bw - 16 * K, y = H - 18 * K;
    g.fillStyle = opt.export ? '#1B2427' : PAL.ink; g.fillRect(x, y, bw, 3 * K); g.fillRect(x, y - 4 * K, 1.5 * K, 7 * K); g.fillRect(x + bw - 1.5 * K, y - 4 * K, 1.5 * K, 7 * K);
    g.font = fontL(11, 600); g.textAlign = 'center'; g.textBaseline = 'bottom'; g.fillText((L < 1 ? Math.round(L * 100) + ' cm' : nf0.format(L) + ' m'), x + bw / 2, y - 3 * K);
  }
  if (opt.miniCam) opt.miniCam(g, w2s);
  g.restore();
}

function drawOpening(g, o, wl, px, ph, opt) {
  const d = wallDir(wl), n = wallNrm(wl), L = wallLen(wl);
  const [s0, s1] = openingSpan(o, wl); const a = V.add(wl.a, V.mul(d, s0)), b = V.add(wl.a, V.mul(d, s1));
  const ht = wl.t / 2;
  const col = ph === 'confronto' && o.status === 'nuovo' ? PAL.new : ph === 'confronto' && o.status === 'chiuso' ? shade(PAL.demo, -.3) : (opt.mini ? PAL['ink-2'] : PAL.ink);
  const sel = S.sel && S.sel.kind === 'opening' && S.sel.id === o.id && opt.interactive;
  const corner = (p, s) => V.add(p, V.mul(n, s * (ht + px * .6)));
  // closed opening in confronto: red infill
  if (o.status === 'chiuso') {
    if (ph === 'confronto') { g.beginPath(); const q = [corner(a, 1), corner(b, 1), corner(b, -1), corner(a, -1)]; g.moveTo(q[0].x, q[0].y); q.slice(1).forEach((r) => g.lineTo(r.x, r.y)); g.closePath(); g.fillStyle = PAL.new; g.fill(); }
    return;
  }
  // cut the wall
  g.beginPath(); const q = [corner(a, 1), corner(b, 1), corner(b, -1), corner(a, -1)]; g.moveTo(q[0].x, q[0].y); q.slice(1).forEach((r) => g.lineTo(r.x, r.y)); g.closePath();
  g.fillStyle = opt.export ? '#ffffff' : PAL.sheet; g.fill();
  if (ph === 'confronto' && o.status === 'nuovo') { g.fillStyle = hexA(PAL.new, .15); g.fill(); }
  g.strokeStyle = col; g.lineWidth = px * (sel ? 2.2 : 1.1); g.lineCap = 'butt';
  // jambs
  g.beginPath(); g.moveTo(corner(a, 1).x, corner(a, 1).y); g.lineTo(corner(a, -1).x, corner(a, -1).y); g.moveTo(corner(b, 1).x, corner(b, 1).y); g.lineTo(corner(b, -1).x, corner(b, -1).y); g.stroke();
  if (opt.mini) return;
  const sw = o.swing >= 0 ? 1 : -1;
  if (o.kind === 'finestra' || o.kind === 'portafinestra') {
    g.beginPath();
    for (const s of [-.35, 0, .35]) { const oa = V.add(a, V.mul(n, s * wl.t)), ob = V.add(b, V.mul(n, s * wl.t)); g.moveTo(oa.x, oa.y); g.lineTo(ob.x, ob.y); }
    g.stroke();
    if (o.kind === 'portafinestra') {
      const leaves = o.w > 1 ? 2 : 1; const lw = o.w / leaves; g.lineWidth = px * .8; g.setLineDash([3 * px, 2 * px]);
      for (let i = 0; i < leaves; i++) {
        const hinge = i === 0 ? a : b; const dirAlong = i === 0 ? d : V.mul(d, -1); const face = V.add(hinge, V.mul(n, sw * ht));
        const tip = V.add(face, V.mul(n, sw * lw)); g.beginPath(); g.moveTo(face.x, face.y); g.lineTo(tip.x, tip.y);
        const st = Math.atan2(n.y * sw, n.x * sw), en = Math.atan2(dirAlong.y, dirAlong.x);
        let delta = en - st; while (delta > Math.PI) delta -= 2 * Math.PI; while (delta < -Math.PI) delta += 2 * Math.PI;
        g.arc(face.x, face.y, lw, st, st + delta, delta < 0); g.stroke();
      }
      g.setLineDash([]);
    }
  } else if (o.kind === 'porta') {
    const hingeAtStart = o.hinge !== 'end';
    const hp = hingeAtStart ? a : b, other = hingeAtStart ? b : a;
    const face = V.add(hp, V.mul(n, sw * ht)); const tip = V.add(face, V.mul(n, sw * o.w));
    const closed = V.add(other, V.mul(n, sw * ht));
    g.lineWidth = px * (sel ? 2.4 : 1.6); g.beginPath(); g.moveTo(face.x, face.y); g.lineTo(tip.x, tip.y); g.stroke();
    const st = Math.atan2(tip.y - face.y, tip.x - face.x), en = Math.atan2(closed.y - face.y, closed.x - face.x);
    let delta = en - st; while (delta > Math.PI) delta -= 2 * Math.PI; while (delta < -Math.PI) delta += 2 * Math.PI;
    g.lineWidth = px * .9; g.beginPath(); g.arc(face.x, face.y, o.w, st, st + delta, delta < 0); g.stroke();
  } else if (o.kind === 'scorrevole') {
    const off = V.mul(n, sw * (ht + .03)); const shift = V.mul(d, o.hinge === 'end' ? o.w * .6 : -o.w * .6);
    const la = V.add(V.add(a, off), shift), lb = V.add(V.add(b, off), shift);
    g.lineWidth = px * 2.2; g.beginPath(); g.moveTo(la.x, la.y); g.lineTo(lb.x, lb.y); g.stroke();
  } else if (o.kind === 'scomparsa') {
    const shift = V.mul(d, o.hinge === 'end' ? o.w : -o.w);
    const la = V.add(a, shift), lb = V.add(b, shift);
    g.lineWidth = px * 1.4; g.setLineDash([4 * px, 3 * px]); g.beginPath(); g.moveTo(la.x, la.y); g.lineTo(lb.x, lb.y); g.stroke(); g.setLineDash([]);
  } else if (o.kind === 'varco') {
    g.setLineDash([2 * px, 3 * px]); g.lineWidth = px * .8; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); g.setLineDash([]);
  }
  if (sel) { g.strokeStyle = PAL.accent; g.lineWidth = px * 2; g.beginPath(); g.moveTo(q[0].x, q[0].y); q.slice(1).forEach((r) => g.lineTo(r.x, r.y)); g.closePath(); g.stroke(); }
}

function drawZones(g, it, px, opt) {
  const z = zonesOf(it);
  const head = V.rot({ x: 0, y: -1 }, z.th);
  const base = Math.atan2(head.y, head.x); // canvas angle of 12 o'clock
  for (const s of z.sectors) {
    const col = zoneColor(s.kind);
    g.beginPath(); g.moveTo(z.c.x, z.c.y); g.arc(z.c.x, z.c.y, z.R, base + s.a0, base + s.a1); g.closePath();
    g.fillStyle = hexA(col, s.kind === 'statica' ? .07 : .12); g.fill();
    g.strokeStyle = hexA(col, .55); g.lineWidth = px; g.stroke();
    if (Plan.scale > 30 && !opt.export) {
      const am = base + (s.a0 + s.a1) / 2; const lp = { x: z.c.x + Math.cos(am) * z.R * .74, y: z.c.y + Math.sin(am) * z.R * .74 };
      g.save(); g.translate(lp.x, lp.y); g.scale(px, px); g.font = '600 10.5px "Barlow Semi Condensed", system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = hexA(col, .95); g.fillText(ZONE_LABEL[s.kind], 0, 0); g.restore();
    }
  }
  // clock ticks
  g.strokeStyle = hexA(PAL.ink, .35); g.lineWidth = px;
  for (let h = 0; h < 12; h++) { const a = base + h * 30 * DEG; g.beginPath(); g.moveTo(z.c.x + Math.cos(a) * z.R * .94, z.c.y + Math.sin(a) * z.R * .94); g.lineTo(z.c.x + Math.cos(a) * z.R, z.c.y + Math.sin(a) * z.R); g.stroke(); }
  pCirc(g, z.c.x, z.c.y, .03); g.fillStyle = PAL.ink; g.fill();
}

function drawItem(g, it, px, ph, opt, conflict) {
  const c = catOf(it), d = dimsOf(it);
  const sel = S.sel && S.sel.kind === 'item' && S.sel.id === it.id && opt.interactive;
  const hov = S.hover && S.hover.kind === 'item' && S.hover.id === it.id && opt.interactive && !sel;
  g.save(); g.translate(it.x, it.y); g.rotate(it.rot * DEG);
  const isOp = ['Sala operativa', 'Radiologia', 'Sterilizzazione'].includes(c.cat);
  const P = {
    fill: opt.export ? (isOp ? '#E6F1F1' : '#FFFFFF') : (isOp ? hexA(PAL.accent, PAL.dark ? .22 : .10) : PAL.chrome),
    fillSoft: opt.export ? '#F3F6F6' : hexA(PAL.ink, .04),
    stroke: opt.export ? '#283134' : PAL.ink, detail: opt.export ? '#728287' : PAL.muted, lw: px * 1.15, sheet: opt.export ? '#fff' : PAL.sheet,
  };
  if (ph === 'confronto') { if (it.phase === 'nuovo') { P.stroke = PAL.new; P.detail = hexA(PAL.new, .7); } else if (it.phase === 'rimosso') { P.stroke = shade(PAL.demo, -.3); P.fill = hexA(PAL.demo, .35); P.detail = shade(PAL.demo, -.3); } }
  if (conflict) { P.stroke = PAL.bad; P.fill = hexA(PAL.bad, .14); }
  if (sel) { P.stroke = PAL.accent; P.lw = px * 2; }
  if (hov) P.lw = px * 1.8;
  try { (c.plan || genericPlan)(g, it, d, P); } catch (e) { genericPlan(g, it, d, P); }
  if (it.type !== 'pilastro' && c.mount !== 'wall' && elevOf(it) > 1.2) { /* high item */ }
  g.restore();
}

function drawDim(g, dm, w2s, scale, sel, opt, K = 1) {
  const a = w2s(dm.a), b = w2s(dm.b); const L = V.dist(dm.a, dm.b);
  const d = V.norm(V.sub(b, a)), n = { x: -d.y, y: d.x };
  g.strokeStyle = sel ? PAL.accent : (opt.export ? '#0E6B70' : PAL.accent); g.fillStyle = g.strokeStyle; g.lineWidth = (sel ? 2 : 1.2) * K;
  g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y);
  for (const q of [a, b]) { g.moveTo(q.x + (n.x * 6 - d.x * 4) * K, q.y + (n.y * 6 - d.y * 4) * K); g.lineTo(q.x + (-n.x * 6 + d.x * 4) * K, q.y + (-n.y * 6 + d.y * 4) * K); }
  g.stroke();
  const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; let ang = Math.atan2(d.y, d.x); if (ang > Math.PI / 2) ang -= Math.PI; if (ang < -Math.PI / 2) ang += Math.PI;
  g.save(); g.translate(m.x, m.y); g.rotate(ang); g.font = `600 ${12 * K}px "Barlow Semi Condensed", system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'bottom';
  const txt = nf2.format(L) + ' m'; const tw = g.measureText(txt).width + 8 * K;
  g.fillStyle = hexA(opt.export ? '#ffffff' : PAL.sheet, .9); g.fillRect(-tw / 2, -17 * K, tw, 15 * K); g.fillStyle = opt.export ? '#0E6B70' : PAL.accent; g.fillText(txt, 0, -3 * K); g.restore();
}

function drawInteractive(g, w2s, scale, fontL) {
  const p = S.project; const P = Plan;
  const handle = (q, r = 6) => { const s = w2s(q); g.beginPath(); g.arc(s.x, s.y, r, 0, Math.PI * 2); g.fillStyle = PAL.chrome; g.fill(); g.strokeStyle = PAL.accent; g.lineWidth = 2; g.stroke(); };
  // selection overlays
  const o = findSel(S.sel);
  if (o && S.sel.kind === 'wall') {
    const q = wallQuad(o).map(w2s); g.beginPath(); g.moveTo(q[0].x, q[0].y); q.slice(1).forEach((r) => g.lineTo(r.x, r.y)); g.closePath();
    g.strokeStyle = PAL.accent; g.lineWidth = 2; g.stroke(); handle(o.a); handle(o.b);
    const m = w2s({ x: (o.a.x + o.b.x) / 2, y: (o.a.y + o.b.y) / 2 });
    g.font = fontL(12.5, 600); g.textAlign = 'center'; g.textBaseline = 'middle'; const txt = `${nf2.format(wallLen(o))} m · sp. ${Math.round(o.t * 100)} cm`;
    const tw = g.measureText(txt).width + 12; g.fillStyle = PAL.accent; g.beginPath(); g.roundRect ? g.roundRect(m.x - tw / 2, m.y - 30, tw, 20, 6) : g.rect(m.x - tw / 2, m.y - 30, tw, 20); g.fill(); g.fillStyle = PAL['accent-weak'] && PAL.dark ? '#052527' : '#fff'; g.fillText(txt, m.x, m.y - 20);
  }
  if (o && S.sel.kind === 'item') {
    const c = itemCorners(o).map(w2s); g.strokeStyle = PAL.accent; g.lineWidth = 1; g.setLineDash([4, 3]); g.beginPath(); g.moveTo(c[0].x, c[0].y); c.slice(1).forEach((q) => g.lineTo(q.x, q.y)); g.closePath(); g.stroke(); g.setLineDash([]);
    const rh = rotHandlePos(o); const cs = w2s(o); const rs = w2s(rh);
    g.strokeStyle = PAL.accent; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cs.x, cs.y); g.lineTo(rs.x, rs.y); g.stroke();
    g.beginPath(); g.arc(rs.x, rs.y, 9, 0, Math.PI * 2); g.fillStyle = PAL.accent; g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 1.6; g.beginPath(); g.arc(rs.x, rs.y, 4.5, -Math.PI * .9, Math.PI * .5); g.stroke();
    const d = dimsOf(o); g.font = fontL(12, 600); g.textAlign = 'center'; g.textBaseline = 'middle';
    const txt = `${Math.round(d.w * 100)} × ${Math.round(d.d * 100)} cm`; const top = c.reduce((m, q) => q.y < m.y ? q : m, c[0]);
    const tw = g.measureText(txt).width + 12; g.fillStyle = PAL.ink; g.beginPath(); g.roundRect ? g.roundRect(cs.x - tw / 2, Math.min(...c.map((q) => q.y)) - 28, tw, 19, 6) : g.rect(cs.x - tw / 2, Math.min(...c.map((q) => q.y)) - 28, tw, 19); g.fill();
    g.fillStyle = PAL.chrome; g.fillText(txt, cs.x, Math.min(...c.map((q) => q.y)) - 18.5);
  }
  if (o && (S.sel.kind === 'pipe')) for (const q of o.pts) handle(q, 5);
  if (o && (S.sel.kind === 'dim')) { handle(o.a, 5); handle(o.b, 5); }
  // hover wall outline
  if (S.hover && S.hover.kind === 'wall' && !(S.sel && S.sel.id === S.hover.id)) { const w = wallById(S.hover.id); if (w) { const q = wallQuad(w).map(w2s); g.beginPath(); g.moveTo(q[0].x, q[0].y); q.slice(1).forEach((r) => g.lineTo(r.x, r.y)); g.closePath(); g.strokeStyle = hexA(PAL.accent, .6); g.lineWidth = 1.5; g.stroke(); } }
  // tool previews
  const sn = P.snap; const tool = S.tool;
  const label = (pos, txt, color = PAL.ink) => { g.font = fontL(12.5, 600); const tw = g.measureText(txt).width + 12; g.fillStyle = color; g.beginPath(); g.roundRect ? g.roundRect(pos.x + 12, pos.y + 10, tw, 20, 6) : g.rect(pos.x + 12, pos.y + 10, tw, 20); g.fill(); g.fillStyle = PAL.chrome; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(txt, pos.x + 18, pos.y + 20); };
  if (sn && sn.guides) { g.strokeStyle = hexA(PAL.accent, .7); g.lineWidth = 1; g.setLineDash([4, 4]); for (const gd of sn.guides) { const a = w2s(gd.a), b = w2s(gd.b); g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); } g.setLineDash([]); }
  if ((tool === 'wall' || tool === 'pipe') && P.chain.length) {
    const pts = P.chain.map(w2s); const cur = sn ? w2s(sn) : null;
    if (tool === 'pipe') { const [, tok] = PIPE_KINDS[S.pipeOpts.kind]; g.strokeStyle = PAL[tok]; g.lineWidth = 3; } else { g.strokeStyle = PAL.new; g.lineWidth = Math.max(2, S.wallOpts.t * scale); g.globalAlpha = .55; }
    g.lineCap = 'round'; g.beginPath(); g.moveTo(pts[0].x, pts[0].y); pts.slice(1).forEach((q) => g.lineTo(q.x, q.y)); if (cur) g.lineTo(cur.x, cur.y); g.stroke(); g.globalAlpha = 1;
    if (cur && sn) { const last = P.chain[P.chain.length - 1]; const L = V.dist(last, sn); const ang = Math.round(((Math.atan2(-(sn.y - last.y), sn.x - last.x) / DEG) + 360) % 360); label(cur, (P.lenBuf ? P.lenBuf + ' m ↵' : nf2.format(L) + ' m') + ' · ' + ang + '°', tool === 'pipe' ? PAL[PIPE_KINDS[S.pipeOpts.kind][1]] : PAL.ink); }
    if (tool === 'wall' && P.chain.length > 1) { const f = w2s(P.chain[0]); g.beginPath(); g.arc(f.x, f.y, 8, 0, Math.PI * 2); g.strokeStyle = PAL.new; g.lineWidth = 2; g.stroke(); }
  }
  if (tool === 'measure' && P.measureA && sn) { const a = w2s(P.measureA), b = w2s(sn); g.strokeStyle = PAL.accent; g.lineWidth = 1.5; g.setLineDash([5, 4]); g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); g.setLineDash([]); label(b, fmtM(V.dist(P.measureA, sn)), PAL.accent); }
  if (tool === 'calibrate' && P.calA && sn) { const a = w2s(P.calA), b = w2s(sn); g.strokeStyle = PAL.warn; g.lineWidth = 2; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); handle(P.calA, 5); label(b, 'Misura attuale ' + fmtM(V.dist(P.calA, sn)), PAL.warn); }
  if ((tool === 'door' || tool === 'window') && sn && sn.wall) {
    const wl = sn.wall; const L = wallLen(wl); const fake = { id: '__pv', wallId: wl.id, t: sn.t, w: sn.w, kind: sn.kind, hinge: sn.hinge, swing: sn.swing, status: 'nuovo', h: 2.1, sill: 0 };
    g.save(); g.translate(Plan.ox, Plan.oy); g.scale(scale, scale); g.globalAlpha = .9; drawOpening(g, fake, wl, 1 / scale, 'confronto', { interactive: false }); g.restore();
    label(w2s(openingCenter(fake, wl)), `${OPEN_KINDS[sn.kind]} ${Math.round(sn.w * 100)} cm`, PAL.new);
  }
  if (S.placing && sn) {
    const c = CAT_BY_TYPE[S.placing]; const fake = { id: '__ghost', type: S.placing, x: sn.x, y: sn.y, rot: sn.rot || 0, phase: 'nuovo' };
    g.save(); g.translate(Plan.ox, Plan.oy); g.scale(scale, scale); g.globalAlpha = .65; drawItem(g, fake, 1 / scale, 'progetto', { interactive: false }, false); g.restore();
    label(w2s(sn), c.name, PAL.accent);
  }
  if (sn && sn.kind && sn.kind !== 'free' && (tool === 'wall' || tool === 'measure' || tool === 'pipe' || tool === 'calibrate' || (Plan.drag && (Plan.drag.type === 'wallEnd' || Plan.drag.type === 'vertex')))) {
    const s = w2s(sn); g.strokeStyle = PAL.accent; g.lineWidth = 1.6;
    if (sn.kind === 'end' || sn.kind === 'item') g.strokeRect(s.x - 5, s.y - 5, 10, 10); else if (sn.kind === 'edge') { g.beginPath(); g.moveTo(s.x - 6, s.y + 5); g.lineTo(s.x, s.y - 5); g.lineTo(s.x + 6, s.y + 5); g.closePath(); g.stroke(); } else { g.beginPath(); g.arc(s.x, s.y, 4, 0, Math.PI * 2); g.stroke(); }
  }
  if (tool === 'wall' && !P.chain.length && sn) { const s = w2s(sn); g.strokeStyle = PAL.new; g.lineWidth = 1.5; g.beginPath(); g.moveTo(s.x - 8, s.y); g.lineTo(s.x + 8, s.y); g.moveTo(s.x, s.y - 8); g.lineTo(s.x, s.y + 8); g.stroke(); }
}

// background images cache
const _inv = new Map();
function invertedBg(src, img) {
  const key = src + '|' + img.src.length;
  if (_inv.has(key)) return _inv.get(key);
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  try {
    const d = g.getImageData(0, 0, c.width, c.height); const a = d.data;
    for (let i = 0; i < a.length; i += 4) { // invert lightness, keep hue roughly
      const r = a[i], gg = a[i + 1], b = a[i + 2]; const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b); const sh = 255 - mx - mn;
      a[i] = clamp((r + sh) * .82, 0, 255); a[i + 1] = clamp((gg + sh) * .82, 0, 255); a[i + 2] = clamp((b + sh) * .82, 0, 255);
    }
    g.putImageData(d, 0, 0);
  } catch (e) { return img; }
  _inv.set(key, c); return c;
}
function bgImage(src) {
  if (!src) return null;
  if (S.bgImages.has(src)) return S.bgImages.get(src);
  let url = null;
  if (src.startsWith('seed:')) url = SEEDS.backgrounds[src];
  else if (src.startsWith('img:')) url = S.bgData.get(src);
  if (!url) return null;
  const img = new Image(); img.onload = () => requestRender(); img.src = url; S.bgImages.set(src, img); return img;
}

let _raf = 0;
function requestRender() {
  if (_raf) return;
  _raf = requestAnimationFrame(() => { _raf = 0; if (S.view === '2d') Plan.render(); else if (S.view === 'walk') drawMinimap(); });
}

// ===================== 3D view (orbit + walk) =====================
const View3D = {
  ready: false, loading: null, renderer: null, scene: null, cam: null, controls: null, world: null, itemsG: null,
  itemMap: new Map(), selBox: null, dirty: true, mode: 'orbit', bounds: null, sun: null, hemi: null, roomLights: [],
  walk: { x: 0, z: 0, yaw: 0, pitch: -.05, keys: new Set(), joy: null, look: null, last: 0 },
  drag: null, down: null, q: null, losses: 0, lost: false, stage: 'avvio', envRT: null, amb: null, compiling: false,

  async ensure() {
    if (this.ready) return true;
    if (this.loading) return this.loading;
    hide3DError();
    this.loading = (async () => {
      $('#loading3d').hidden = false;
      try {
        let T, oc, re, rb;
        if (BUILD === 'github') { // same-origin copies: no CDN, no import map, works offline
          T = await import('./vendor/three.module.min.js');
          [oc, re, rb] = await Promise.all([import('./vendor/OrbitControls.js'), import('./vendor/RoomEnvironment.js'), import('./vendor/RoundedBoxGeometry.js')]);
        } else {
          const base = 'https://cdn.jsdelivr.net/npm/three@0.169.0/';
          try { // jsDelivr ESM bundles: addons point at the same three instance, no import map needed
            T = await import(base + '+esm');
            [oc, re, rb] = await Promise.all([
              import(base + 'examples/jsm/controls/OrbitControls.js/+esm'),
              import(base + 'examples/jsm/environments/RoomEnvironment.js/+esm'),
              import(base + 'examples/jsm/geometries/RoundedBoxGeometry.js/+esm'),
            ]);
          } catch (e1) { // fallback: plain module files resolved through the page import map
            console.warn('+esm non disponibile, uso i file del pacchetto', e1);
            T = await import(base + 'build/three.module.js');
            [oc, re, rb] = await Promise.all([
              import(base + 'examples/jsm/controls/OrbitControls.js'),
              import(base + 'examples/jsm/environments/RoomEnvironment.js'),
              import(base + 'examples/jsm/geometries/RoundedBoxGeometry.js'),
            ]);
          }
        }
        THREE = T; OrbitControls = oc.OrbitControls; RoomEnvironment = re.RoomEnvironment; RoundedBoxGeometry = rb.RoundedBoxGeometry;
      } catch (e) {
        console.error(e); this.loading = null;
        show3DError('Non riesco a caricare il motore 3D. Controlla la connessione e riprova.', e); return false;
      } finally { $('#loading3d').hidden = true; }
      try { this.setup(); }
      catch (e) {
        console.error(e); this.loading = null;
        show3DError('Il browser non riesce ad avviare la grafica 3D (WebGL).', e); return false;
      }
      this.ready = true; return true;
    })();
    return this.loading;
  },
  setup() {
    this.q = loadQuality();
    const sc = new THREE.Scene(); this.scene = sc;
    this.hemi = new THREE.HemisphereLight(0xeef3ff, 0xb9b0a3, .7); sc.add(this.hemi);
    this.amb = new THREE.AmbientLight(0xffffff, 0); sc.add(this.amb);
    const sun = new THREE.DirectionalLight(0xfff3e4, 2.6); sun.castShadow = true; sun.shadow.bias = -.0004; sun.shadow.normalBias = .02;
    sc.add(sun); sc.add(sun.target); this.sun = sun;
    this.cam = new THREE.PerspectiveCamera(45, 1, .05, 300);
    this.world = new THREE.Group(); sc.add(this.world);
    this.createRenderer();
    new ResizeObserver(() => this.resize()).observe($('#stage'));
    window.addEventListener('keydown', (e) => { if (S.view === 'walk' && !isTyping(e)) { this.walk.keys.add(e.code); if (e.code.startsWith('Arrow')) e.preventDefault(); } });
    window.addEventListener('keyup', (e) => this.walk.keys.delete(e.code));
    window.addEventListener('blur', () => this.walk.keys.clear());
    this.setupJoystick(); this.setupMinimap();
  },
  // one WebGL renderer per quality level; recreated after a context loss or a quality change
  createRenderer() {
    const Q = QUALITY[this.q]; this.stage = 'creazione grafica';
    const r = new THREE.WebGLRenderer({ antialias: Q.aa, alpha: false, preserveDrawingBuffer: false, powerPreference: 'default' });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, Q.pr));
    r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = .82;
    r.shadowMap.enabled = Q.shadows > 0 && S.view3d.shadows; r.shadowMap.type = Q.soft ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    const el3 = r.domElement; el3.style.touchAction = 'none';
    el3.addEventListener('webglcontextlost', (e) => this.onLost(e));
    el3.addEventListener('webglcontextrestored', () => this.onRestored());
    // our pointer handlers come first so they can disable orbit when dragging an item
    el3.addEventListener('pointerdown', (e) => this.onDown(e));
    el3.addEventListener('pointermove', (e) => this.onMove(e));
    el3.addEventListener('pointerup', (e) => this.onUp(e));
    el3.addEventListener('pointercancel', (e) => this.onUp(e));
    $('#view3d').appendChild(el3); this.renderer = r;
    try { const gl = r.getContext(); const ext = gl.getExtension('WEBGL_debug_renderer_info'); this.gpu = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); } catch { this.gpu = '?'; }
    const target = this.controls ? this.controls.target.clone() : null; const enabled = this.controls ? this.controls.enabled : true;
    if (this.controls) this.controls.dispose();
    this.controls = new OrbitControls(this.cam, el3);
    this.controls.enableDamping = true; this.controls.dampingFactor = .09; this.controls.screenSpacePanning = false;
    this.controls.maxPolarAngle = Math.PI / 2 - .03; this.controls.minDistance = .6; this.controls.maxDistance = 80;
    this.controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
    if (target) { this.controls.target.copy(target); this.controls.update(); }
    this.controls.enabled = enabled;
    this.applyEnv(); this.resize();
    this.dirty = true; this.stage = 'primo disegno';
    r.setAnimationLoop((t) => this.frame(t));
  },
  applyEnv() {
    const Q = QUALITY[this.q];
    if (this.envRT) { try { this.envRT.dispose(); } catch { } this.envRT = null; }
    if (Q.env) {
      this.stage = 'ambiente';
      const pm = new THREE.PMREMGenerator(this.renderer); this.envRT = pm.fromScene(new RoomEnvironment(), .04); pm.dispose();
      this.scene.environment = this.envRT.texture; this.scene.environmentIntensity = .3; this.amb.intensity = 0;
    } else { this.scene.environment = null; this.amb.intensity = .5; }
    for (const m of MATS.values()) { // without an environment map pure metals render almost black
      if (!('metalness' in m)) continue;
      if (m.userData.metal0 === undefined) m.userData.metal0 = m.metalness;
      m.metalness = Q.env ? m.userData.metal0 : Math.min(m.userData.metal0, .35);
    }
    const ms = Q.shadows || 512; this.sun.shadow.mapSize.set(ms, ms);
    if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; }
  },
  onLost(e) {
    e.preventDefault(); if (this.lost) return;
    this.lost = true; this.losses++; console.warn('WebGL context lost', this.stage, this.q);
    const ld = $('#loading3d'); ld.textContent = 'Riavvio la grafica 3D…'; ld.hidden = false;
    clearTimeout(this.lostTimer); this.lostTimer = setTimeout(() => this.recover(), 2200);
  },
  onRestored() {
    if (!this.lost) return; clearTimeout(this.lostTimer);
    if (this.losses >= 2) { this.recover(); return; } // lost again: step down instead of retrying the same settings
    this.lost = false; $('#loading3d').hidden = true; $('#loading3d').textContent = 'Preparo la vista 3D…';
    try { this.applyEnv(); } catch (err) { console.warn(err); }
    this.dirty = true;
  },
  // throw the lost renderer away and start a lighter one
  recover(nextQ) {
    clearTimeout(this.lostTimer);
    const order = ['alta', 'media', 'leggera']; const i = order.indexOf(this.q);
    if (!nextQ && i === order.length - 1 && this.losses > 3) {
      this.failed = true; $('#loading3d').hidden = true;
      show3DError('Safari continua a interrompere la grafica 3D anche in qualità leggera.'); return;
    }
    this.q = nextQ || order[Math.min(i + 1, order.length - 1)]; saveQuality(this.q);
    const old = this.renderer;
    try { old.setAnimationLoop(null); } catch { }
    this.clearWorld(); // free geometry while the old renderer still tracks it; the scene is rebuilt for the new one
    this.envRT = null; this.sun.shadow.map = null; // both belonged to the old context
    try { old.dispose(); } catch { }
    old.domElement.remove();
    this.lost = false; this.failed = false;
    try { this.createRenderer(); }
    catch (err) { console.error(err); this.failed = true; show3DError('Non riesco a riavviare la grafica 3D.', err); return; }
    $('#loading3d').hidden = true; $('#loading3d').textContent = 'Preparo la vista 3D…';
    if (!nextQ) toast('Ho riavviato il 3D in qualità ' + QUALITY[this.q].label.toLowerCase() + ' per stabilità', 4500);
    refreshHud3D();
  },
  setQuality(q) { if (q === this.q || !this.renderer) return; this.losses = 0; this.recover(q); },
  diag() { return `Qualità ${this.q} · interruzioni ${this.losses} · fase: ${this.stage} · GPU: ${this.gpu || '?'}`; },
  resize() {
    if (!this.renderer) return; const st = $('#stage').getBoundingClientRect(); if (!st.width) return;
    this.renderer.setSize(st.width, st.height, false); this.cam.aspect = st.width / st.height; this.cam.updateProjectionMatrix();
    this.renderer.domElement.style.width = '100%'; this.renderer.domElement.style.height = '100%';
    if (S.view === 'walk') drawMinimap();
  },
  frame(t) {
    if (S.view !== '3d' && S.view !== 'walk') return;
    if (this.failed || this.lost) return;
    try {
      if (this.dirty) { this.stage = 'costruzione scena'; this.rebuild(); this.precompile(); }
      const dt = Math.min(.05, (t - (this.walk.last || t)) / 1000); this.walk.last = t;
      if (S.view === 'walk') this.walkStep(dt); else this.controls.update();
      if (this.compiling) return;
      this.renderer.render(this.scene, this.cam);
      if (this.stage !== 'in uso' && this.stage !== 'passeggiata') this.stage = S.view === 'walk' ? 'passeggiata' : 'in uso';
    } catch (e) {
      console.error(e); this.failed = true;
      show3DError('Si è verificato un errore mentre disegnavo il 3D.', e);
    }
  },

  // compile shaders without blocking the GPU in one long frame (Safari drops the context on long stalls)
  precompile() {
    const r = this.renderer; if (!r.compileAsync) return;
    this.compiling = true; this.stage = 'compilazione materiali'; const done = () => { this.compiling = false; };
    Promise.race([r.compileAsync(this.scene, this.cam), new Promise((res) => setTimeout(res, 6000))]).then(done, done);
  },

  // ---------------- scene build ----------------
  clearWorld() {
    const disposeGeo = (o) => { o.traverse((c) => { if (c.geometry && !c.geometry._keep) c.geometry.dispose(); }); };
    for (const c of [...this.world.children]) { disposeGeo(c); this.world.remove(c); }
    for (const l of this.roomLights) this.scene.remove(l); this.roomLights = [];
    this.itemMap.clear(); this.clearSelBox();
  },
  rebuild() {
    this.dirty = false; if (!S.project) return;
    readPalette(); this.clearWorld();
    const p = S.project, ph = phase(); const walk = S.view === 'walk';
    this.scene.background = new THREE.Color(PAL.scene);
    this.renderer.shadowMap.enabled = !!S.view3d.shadows && QUALITY[this.q].shadows > 0;
    // bounds
    let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    for (const w of p.walls) for (const q of [w.a, w.b]) { x0 = Math.min(x0, q.x); z0 = Math.min(z0, q.y); x1 = Math.max(x1, q.x); z1 = Math.max(z1, q.y); }
    for (const it of p.items) { x0 = Math.min(x0, it.x); z0 = Math.min(z0, it.y); x1 = Math.max(x1, it.x); z1 = Math.max(z1, it.y); }
    if (!isFinite(x0)) { x0 = -3; z0 = -3; x1 = 3; z1 = 3; }
    this.bounds = { x0, z0, x1, z1, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, size: Math.max(x1 - x0, z1 - z0, 4) };
    const B = this.bounds;
    // ground slab
    const slab = new THREE.Mesh(bx(B.x1 - B.x0 + 2, .08, B.z1 - B.z0 + 2), mat('matte', PAL.dark ? '#3a4144' : '#D4D8D6'));
    slab.position.set(B.cx, -.041, B.cz); slab.receiveShadow = true; this.world.add(slab);
    // floors
    const rr = computeRooms(ph);
    for (const r of p.rooms) {
      const st = rr.rooms.get(r.id); if (!st || st.open || st.shared || !st.rects.length) continue;
      const key = r.floor || 'gres-chiaro'; const size = (FLOORS[key] || FLOORS['gres-chiaro']).size;
      const geo = rectsGeometry(st.rects, 0, size, false);
      const m = new THREE.Mesh(geo, mat('floor', key)); m.receiveShadow = true; this.world.add(m);
      if (walk) {
        const cg = rectsGeometry(st.rects, null, 1, true);
        const ceilH = Math.max(...p.walls.filter((w) => wallVisible(w, ph) && w.type !== 'parapetto').map((w) => wallH(w)), p.settings.wallH);
        cg.translate(0, ceilH, 0);
        const ce = new THREE.Mesh(cg, mat('matte', '#F7F7F4')); ce.receiveShadow = true; this.world.add(ce);
        if (st.label && this.roomLights.length < QUALITY[this.q].lights) { const L = new THREE.PointLight(0xfff1df, clamp(st.area * .35, 2.5, 7), 0, 2); L.position.set(st.label.x, ceilH - .25, st.label.y); this.scene.add(L); this.roomLights.push(L); }
      }
    }
    // walls
    const cut = S.view === '3d' && S.view3d.walls === 'cut' ? 1.15 : null;
    const visWalls = p.walls.filter((w) => wallVisible(w, ph));
    visWalls.forEach((w, idx) => this.buildWall(w, visWalls, ph, cut, idx));
    // items
    this.itemsG = new THREE.Group(); this.world.add(this.itemsG);
    const conflicts = new Set(zoneConflicts(ph).filter((c) => c.item).map((c) => c.item));
    for (const it of p.items) {
      if (!itemVisible(it, ph)) continue; if (catOf(it).utility && !S.view3d.utilities) continue;
      const g = this.buildItem(it); if (!g) continue;
      if (ph === 'confronto' && it.phase === 'rimosso') { const d = dimsOf(it); const gh = new THREE.Mesh(bx(d.w + .04, d.h + .02, d.d + .04), mat('ghost', PAL.demo)); gh.position.y = d.h / 2; g.add(gh); }
      if (conflicts.has(it.id)) { const d = dimsOf(it); const fp = new THREE.Mesh(bx(d.w + .06, .006, d.d + .06), mat('zone', PAL.bad)); fp.position.y = .004 - elevOf(it); g.add(fp); }
      this.itemsG.add(g);
    }
    // zones
    if (S.view3d.zones) for (const it of p.items) {
      if (it.type !== 'riunito' || !itemVisible(it, ph) || it.zones === false) continue;
      const z = zonesOf(it); const head = V.rot({ x: 0, y: -1 }, z.th); const base = Math.atan2(head.y, head.x);
      for (const s of z.sectors) {
        const f0 = base + s.a0, f1 = base + s.a1;
        const geo = new THREE.RingGeometry(.02, z.R, 40, 1, -f1, f1 - f0);
        const m = new THREE.Mesh(geo, mat('zone', zoneColor(s.kind))); m.rotation.x = -Math.PI / 2; m.position.set(z.c.x, .006, z.c.y); m.renderOrder = 2; this.world.add(m);
      }
    }
    // pipes
    if (S.view3d.utilities) for (const pp of p.pipes) {
      if (!pipeVisible(pp, ph)) continue; const col = PAL[PIPE_KINDS[pp.kind]?.[1] || 'water']; const g = new THREE.Group();
      for (let i = 1; i < pp.pts.length; i++) rod(g, [pp.pts[i - 1].x, .025, pp.pts[i - 1].y], [pp.pts[i].x, .025, pp.pts[i].y], .018, mat('plastic', col), 8);
      for (const q of pp.pts) add(g, sp(.022, 10, 8), mat('plastic', col), q.x, .025, q.y);
      this.world.add(g);
    }
    // light rig sized to the plan
    const s = B.size; this.sun.position.set(B.cx - s * .6, s * 1.3 + 4, B.cz + s * .8); this.sun.target.position.set(B.cx, 0, B.cz);
    const sc = this.sun.shadow.camera; sc.left = -s; sc.right = s; sc.top = s; sc.bottom = -s; sc.near = .5; sc.far = s * 4 + 20; sc.updateProjectionMatrix();
    this.sun.intensity = walk ? 1.2 : 2.6; this.hemi.intensity = (walk ? .55 : .7) + (QUALITY[this.q].lights ? 0 : walk ? .45 : 0);
    this.updateSelection();
  },
  buildWall(w, visWalls, ph, cut, idx) {
    const L = wallLen(w); if (L < .005) return; const d = wallDir(w); const H0 = wallH(w) + (idx % 6) * .0007;
    const H = cut && w.type !== 'parapetto' ? Math.min(cut, H0) : H0;
    const [ea, eb] = wallExt(w, visWalls);
    let side = mat('wall', w.color || '#F3F3EF'), cap = mat('wallcap', cut ? (PAL.dark ? '#59646A' : '#3A4246') : shade(w.color || '#F3F3EF', -.12));
    if (w.type === 'cartongesso' && !w.color) side = mat('wall', '#F1F2EF');
    if (ph === 'confronto') { if (w.status === 'demolito') { side = mat('ghost', PAL.demo); cap = side; } else if (w.status === 'nuovo') { side = mat('wall', '#E9A79F'); cap = mat('wallcap', PAL.new); } }
    const mats = [side, side, cap, side, side, side];
    const ops = openingsOf(w, ph);
    const g = new THREE.Group();
    const piece = (s0, s1, y0, y1, mm = mats) => {
      if (s1 - s0 < .002 || y1 - y0 < .002) return;
      const m = new THREE.Mesh(bx(s1 - s0, y1 - y0, w.t), mm); m.position.set((s0 + s1) / 2, (y0 + y1) / 2, 0); m.castShadow = true; m.receiveShadow = true; g.add(m);
    };
    const spans = solidSpans(w, ops);
    for (const [s0, s1] of spans) piece(s0 <= .001 ? -ea : s0, s1 >= L - .001 ? L + eb : s1, 0, H);
    if (!spans.length && L > 0) { /* fully opened wall */ }
    for (const o of ops) {
      const [s0, s1] = openingSpan(o, w);
      if (o.status === 'chiuso') { // only shown in confronto/fatto
        if (ph === 'confronto') piece(s0, s1, 0, H, [mat('wall', '#E9A79F'), mat('wall', '#E9A79F'), mat('wallcap', PAL.new), side, mat('wall', '#E9A79F'), mat('wall', '#E9A79F')]);
        else { piece(s0, s1, 0, Math.min(H, o.sill || 0)); piece(s0, s1, Math.min(H, (o.sill || 0) + o.h), H); this.buildOpening(o, w, g, ph, H); }
        continue;
      }
      const sill = o.sill || 0, top = Math.min(H, sill + o.h);
      if (sill > 0) piece(s0, s1, 0, Math.min(sill, H));
      if (top < H) piece(s0, s1, top, H);
      if (sill < H) this.buildOpening(o, w, g, ph, H);
    }
    g.position.set(w.a.x, 0, w.a.y); g.rotation.y = -Math.atan2(d.y, d.x); g.userData.wallId = w.id;
    this.world.add(g);
  },
  // opening parts are built in the wall's local frame: x along wall, z = wall normal (plan normal maps to −z? see below)
  buildOpening(o, w, g, ph, H) {
    const L = wallLen(w); const [s0, s1] = openingSpan(o, w); const t = w.t; const sill = o.sill || 0; const top = Math.min(H, sill + o.h);
    // In wall-local space: plan normal n = (−d.y, d.x). After rotation.y = −atan2(d), local +z maps to plan (−sinα·…) → local +z == plan normal n.
    const frameM = ph === 'confronto' && o.status === 'nuovo' ? mat('lacquer', '#E46A5D') : mat('lacquer', '#F4F4F1');
    const sw = o.swing >= 0 ? 1 : -1;
    if (o.kind === 'finestra' || o.kind === 'portafinestra') {
      const fw = .055, fd = .07, cx = (s0 + s1) / 2, wdt = s1 - s0, hh = top - sill;
      const fm = mat('plastic', '#E9EBEA');
      add(g, bx(wdt, fw, fd), fm, cx, top - fw / 2, 0); if (o.kind === 'finestra') add(g, bx(wdt, fw, fd), fm, cx, sill + fw / 2, 0);
      add(g, bx(fw, hh, fd), fm, s0 + fw / 2, sill + hh / 2, 0); add(g, bx(fw, hh, fd), fm, s1 - fw / 2, sill + hh / 2, 0);
      const leaves = wdt > .9 ? 2 : 1; if (leaves === 2) add(g, bx(fw * .8, hh, fd), fm, cx, sill + hh / 2, 0);
      const gm = add(g, bx(wdt - fw * 2, hh - fw * (o.kind === 'finestra' ? 2 : 1), .012), mat('glass'), cx, sill + (o.kind === 'finestra' ? hh / 2 : (hh - fw) / 2), 0); gm.castShadow = false;
      if (o.kind === 'finestra') add(g, bx(wdt + .06, .03, t + .06), mat('ceramic', '#E8E6E1'), cx, sill - .015, 0);
      return;
    }
    // door frame
    const fw = .05, fd = t + .02;
    add(g, bx(fw, top, fd), frameM, s0 + fw / 2, top / 2, 0); add(g, bx(fw, top, fd), frameM, s1 - fw / 2, top / 2, 0);
    if (top < H - .01) add(g, bx(s1 - s0, fw, fd), frameM, (s0 + s1) / 2, top - fw / 2, 0);
    const lw = s1 - s0 - fw * 2, lh = top - fw - .01; if (lw <= .05 || o.kind === 'varco') return;
    const leafM = ph === 'confronto' && o.status === 'nuovo' ? mat('lacquer', '#E46A5D') : mat('lacquer', '#FAFAF8');
    if (o.kind === 'porta') {
      const atStart = o.hinge !== 'end'; const hx = atStart ? s0 + fw : s1 - fw; const dirX = atStart ? 1 : -1;
      const pivot = new THREE.Group(); pivot.position.set(hx, 0, sw * (t / 2)); g.add(pivot);
      const ang = 72 * DEG * (atStart ? -1 : 1) * sw; pivot.rotation.y = ang;
      add(pivot, bx(lw, lh, .04), leafM, dirX * lw / 2, lh / 2 + .005, sw * .02);
      add(pivot, cy(.01, .01, .12, 8), mat('chrome'), dirX * (lw - .07), 1.0, sw * .07, Math.PI / 2);
    } else if (o.kind === 'scorrevole') {
      const shift = o.hinge === 'end' ? lw * .6 : -lw * .6;
      add(g, bx(lw, lh, .04), leafM, (s0 + s1) / 2 + shift, lh / 2 + .005, sw * (t / 2 + .03));
      add(g, bx(lw * 2 + .1, .04, .04), mat('steel'), (s0 + s1) / 2 + shift / 2, top + .02, sw * (t / 2 + .03));
    } else if (o.kind === 'scomparsa') {
      const shift = o.hinge === 'end' ? lw * .82 : -lw * .82;
      add(g, bx(lw, lh, .035), leafM, (s0 + s1) / 2 + shift, lh / 2 + .005, 0);
    }
  },
  buildItem(it) {
    const c = catOf(it); const d = dimsOf(it);
    let g;
    try { g = c.build({ ...it, color: colorOf(it) }, d, { wallH: S.project.settings.wallH }); }
    catch (e) { console.warn('build', it.type, e); g = grp(); add(g, bx(d.w, d.h, d.d), mat('plastic'), 0, d.h / 2, 0); }
    const wrap = new THREE.Group(); wrap.add(g);
    wrap.position.set(it.x, elevOf(it), it.y); wrap.rotation.y = -it.rot * DEG; wrap.userData.itemId = it.id;
    this.itemMap.set(it.id, wrap); return wrap;
  },
  clearSelBox() { // remove every selection outline, including any left over by an earlier rebuild
    if (!this.scene) return;
    for (const o of this.scene.children.filter((c) => c.userData.selHelper)) { this.scene.remove(o); o.geometry?.dispose(); o.material?.dispose(); }
    this.selBox = null;
  },
  updateSelection() {
    this.clearSelBox();
    if (!S.sel || S.sel.kind !== 'item') return; const g = this.itemMap.get(S.sel.id); if (!g) return;
    const box = new THREE.Box3().setFromObject(g); this.selBox = new THREE.Box3Helper(box, new THREE.Color(PAL.accent));
    this.selBox.userData.selHelper = true; this.scene.add(this.selBox);
  },
  liveItem(it) {
    const g = this.itemMap.get(it.id); if (!g) return;
    g.position.set(it.x, elevOf(it), it.y); g.rotation.y = -it.rot * DEG; this.updateSelection();
  },

  // ---------------- cameras ----------------
  preset(kind) {
    if (!this.bounds) this.rebuild(); const B = this.bounds; const s = B.size; const c = new THREE.Vector3(B.cx, 0, B.cz);
    if (kind === 'top') this.cam.position.set(B.cx, s * 1.55 + 2, B.cz + .01);
    else if (kind === 'front') this.cam.position.set(B.cx, s * .42 + 1.2, B.cz + s * 1.15 + 1.5);
    else this.cam.position.set(B.cx - s * .42, s * 1.05 + 2.5, B.cz + s * .78 + 1);
    this.controls.target.copy(c); this.cam.lookAt(c); this.controls.update();
  },
  focusItem(it) {
    if (!it) return; const c = new THREE.Vector3(it.x, .6, it.y);
    const off = this.cam.position.clone().sub(this.controls.target).normalize().multiplyScalar(3.4);
    this.controls.target.copy(c); this.cam.position.copy(c.clone().add(off)); this.controls.update();
  },

  // ---------------- picking & dragging (orbit) ----------------
  ray(e) {
    const r = this.renderer.domElement.getBoundingClientRect();
    const v = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    const rc = new THREE.Raycaster(); rc.setFromCamera(v, this.cam); return rc;
  },
  pick(e) {
    if (!this.itemsG) return null; const rc = this.ray(e);
    const hits = rc.intersectObjects(this.itemsG.children, true);
    for (const h of hits) { let o = h.object; while (o && !o.userData.itemId) o = o.parent; if (o) return { id: o.userData.itemId, point: h.point }; }
    return null;
  },
  onDown(e) {
    if (S.view !== '3d') { this.walkDown(e); return; }
    if (e.pointerType === 'touch' && this._touches > 0) { this._touches++; return; }
    this._touches = (this._touches || 0) + (e.pointerType === 'touch' ? 1 : 0);
    const hit = this.pick(e); this.down = { x: e.clientX, y: e.clientY, hit, id: e.pointerId };
    if (hit && S.sel && S.sel.kind === 'item' && S.sel.id === hit.id && e.button === 0) {
      const it = findSel(S.sel); const y = elevOf(it);
      this.controls.enabled = false;
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -y); const pt = new THREE.Vector3(); this.ray(e).ray.intersectPlane(plane, pt);
      this.drag = { it, plane, off: { x: it.x - pt.x, z: it.y - pt.z }, moved: false, id: e.pointerId };
      this.renderer.domElement.setPointerCapture(e.pointerId);
    }
  },
  onMove(e) {
    if (S.view === 'walk') { this.walkMove(e); return; }
    const d = this.drag; if (!d || d.id !== e.pointerId) return;
    const pt = new THREE.Vector3(); if (!this.ray(e).ray.intersectPlane(d.plane, pt)) return;
    if (!d.moved) { d.moved = true; pushUndo(); }
    const target = { x: pt.x + d.off.x, y: pt.z + d.off.z }; const sn = placeSnap(d.it.type, target, d.it);
    d.it.x = sn.x; d.it.y = sn.y; if (sn.wall) d.it.rot = sn.rot; this.liveItem(d.it);
  },
  onUp(e) {
    if (e.pointerType === 'touch') this._touches = Math.max(0, (this._touches || 1) - 1);
    if (S.view === 'walk') { this.walkUp(e); return; }
    const d = this.drag; this.drag = null; this.controls.enabled = true;
    if (d) { if (d.moved) { changed({ noRender: true }); this.dirty = true; } return; }
    const dn = this.down; this.down = null;
    if (dn && dn.id === e.pointerId && Math.hypot(e.clientX - dn.x, e.clientY - dn.y) < 6) {
      S.sel = dn.hit ? { kind: 'item', id: dn.hit.id } : null; selectionChanged(); this.updateSelection();
    }
  },

  // ---------------- walk ----------------
  enterWalk() {
    const p = S.project; const rr = computeRooms(); let best = null;
    const sel = findSel(S.sel);
    if (sel && S.sel.kind === 'room') { const st = rr.rooms.get(sel.id); if (st && st.label) best = st.label; }
    if (!best) { const ch = p.items.find((it) => it.type === 'riunito' && itemVisible(it)); const room = ch && roomAtPoint(ch); const st = room && rr.rooms.get(room.id); if (st && st.label) best = st.label; }
    if (!best) { let ba = 0; for (const r of p.rooms) { const st = rr.rooms.get(r.id); if (st && !st.open && !st.shared && st.area > ba && st.label) { ba = st.area; best = st.label; } } }
    if (!best && this.bounds) best = { x: this.bounds.cx, y: this.bounds.cz };
    if (!best) best = { x: 0, y: 0 };
    const busy = (q) => p.items.some((it) => itemVisible(it) && !catOf(it).utility && elevOf(it) < 1.5 && itemContains(it, q, .35));
    if (busy(best)) {
      const room0 = roomAtPoint(best); let found = null;
      for (const rad of [.6, .9, 1.2, 1.6, 2.0]) { for (let k = 0; k < 16 && !found; k++) { const a = k / 16 * Math.PI * 2; const q = { x: best.x + Math.cos(a) * rad, y: best.y + Math.sin(a) * rad }; if (!busy(q) && roomAtPoint(q) === room0) found = q; } if (found) break; }
      if (found) best = found;
    }
    this.walk.x = best.x; this.walk.z = best.y;
    // face the direction with the most free space
    let by = 0, bd = -1;
    for (let k = 0; k < 36; k++) {
      const yaw = k / 36 * Math.PI * 2; let sc = 0;
      for (const off of [-.42, -.21, 0, .21, .42]) { const y2 = yaw + off; sc += Math.min(7, freeDistance(best.x, best.y, -Math.sin(y2), -Math.cos(y2))); }
      if (sc > bd) { bd = sc; by = yaw; }
    }
    // step back a little so the room is in view
    const back = Math.min(1.0, freeDistance(best.x, best.y, Math.sin(by), Math.cos(by)) - .35);
    if (back > 0) { const q = { x: this.walk.x + Math.sin(by) * back, y: this.walk.z + Math.cos(by) * back }; if (!busy(q)) { this.walk.x = q.x; this.walk.z = q.y; } }
    this.walk.yaw = by; this.walk.pitch = -.08;
  },
  walkStep(dt) {
    const W = this.walk; const k = W.keys; let f = 0, s = 0;
    if (k.has('KeyW') || k.has('ArrowUp')) f += 1; if (k.has('KeyS') || k.has('ArrowDown')) f -= 1;
    if (k.has('KeyA')) s -= 1; if (k.has('KeyD')) s += 1;
    if (k.has('ArrowLeft')) W.yaw += 1.6 * dt; if (k.has('ArrowRight')) W.yaw -= 1.6 * dt;
    if (W.joy) { f += -W.joy.y; s += W.joy.x; }
    const sp = (k.has('ShiftLeft') || k.has('ShiftRight') ? 2.6 : 1.35) * dt;
    if (f || s) {
      const fx = -Math.sin(W.yaw), fz = -Math.cos(W.yaw), rx = Math.cos(W.yaw), rz = -Math.sin(W.yaw);
      let nx = W.x + (fx * f + rx * s) * sp, nz = W.z + (fz * f + rz * s) * sp;
      [nx, nz] = collideWalls(nx, nz, .22); W.x = nx; W.z = nz; drawMinimap();
    }
    this.cam.position.set(W.x, S.walk.eye, W.z); this.cam.rotation.set(W.pitch, W.yaw, 0, 'YXZ');
  },
  walkDown(e) { if (e.target !== this.renderer.domElement) return; this.walk.look = { x: e.clientX, y: e.clientY, id: e.pointerId }; this.renderer.domElement.setPointerCapture(e.pointerId); },
  walkMove(e) { const L = this.walk.look; if (!L || L.id !== e.pointerId) return; const dx = e.clientX - L.x, dy = e.clientY - L.y; L.x = e.clientX; L.y = e.clientY; this.walk.yaw += dx * .0045; this.walk.pitch = clamp(this.walk.pitch + dy * .0035, -1.2, 1.1); drawMinimap(); },
  walkUp(e) { if (this.walk.look && this.walk.look.id === e.pointerId) this.walk.look = null; },
  setupJoystick() {
    const j = $('#joystick'), k = $('#knob'); let id = null; const R = () => j.getBoundingClientRect();
    const set = (e) => { const r = R(); const cx = r.left + r.width / 2, cy = r.top + r.height / 2; let dx = e.clientX - cx, dy = e.clientY - cy; const m = r.width / 2 - 14; const l = Math.hypot(dx, dy); if (l > m) { dx *= m / l; dy *= m / l; } k.style.transform = `translate(${dx}px,${dy}px)`; this.walk.joy = { x: dx / m, y: dy / m }; };
    j.addEventListener('pointerdown', (e) => { id = e.pointerId; j.setPointerCapture(id); set(e); e.stopPropagation(); });
    j.addEventListener('pointermove', (e) => { if (e.pointerId === id) set(e); });
    const end = (e) => { if (e.pointerId !== id) return; id = null; this.walk.joy = null; k.style.transform = ''; };
    j.addEventListener('pointerup', end); j.addEventListener('pointercancel', end);
  },
  setupMinimap() {
    const m = $('#minimap');
    m.addEventListener('pointerdown', (e) => { const v = miniView(); if (!v) return; const r = m.getBoundingClientRect(); const x = (e.clientX - r.left - v.ox) / v.scale, y = (e.clientY - r.top - v.oy) / v.scale; this.walk.x = x; this.walk.z = y; drawMinimap(); e.stopPropagation(); });
  },
  async snapshotPNG(scale = 2) {
    const r = this.renderer; const cv = r.domElement; const st = $('#stage').getBoundingClientRect();
    const w = cv.clientWidth || st.width || 1200, h = cv.clientHeight || st.height || 800; const pr = r.getPixelRatio();
    if (this.dirty) this.rebuild(); if (!this._presetDone) { this.preset('iso'); this._presetDone = true; }
    this.cam.aspect = w / h; this.cam.updateProjectionMatrix();
    r.setPixelRatio(scale); r.setSize(w, h, false); this.renderer.render(this.scene, this.cam);
    const url = cv.toDataURL('image/png'); r.setPixelRatio(pr); r.setSize(w, h, false); cv.style.width = '100%'; cv.style.height = '100%';
    this.resize(); return url;
  },
};
function rectsGeometry(rects, y = 0, size = 1, down = false) {
  const pos = [], uv = [], idx = []; let n = 0;
  for (const q of rects) {
    const xs = [q.x, q.x + q.w], zs = [q.y, q.y + q.h];
    const v = [[xs[0], zs[0]], [xs[1], zs[0]], [xs[1], zs[1]], [xs[0], zs[1]]];
    for (const [x, z] of v) { pos.push(x, y || 0, z); uv.push(x / size, -z / size); }
    if (!down) idx.push(n, n + 2, n + 1, n, n + 3, n + 2); else idx.push(n, n + 1, n + 2, n, n + 2, n + 3);
    n += 4;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
function freeDistance(x, z, dx, dz) {
  const p = S.project; const ph = phase(); let best = 30;
  for (const w of p.walls) {
    if (!wallVisible(w, ph)) continue; const d = wallDir(w); const n = wallNrm(w);
    for (const [s0, s1] of solidSpans(w, openingsOf(w, ph), .4)) {
      const a = V.add(w.a, V.mul(d, s0)), b = V.add(w.a, V.mul(d, s1));
      for (const sg of [1, -1]) {
        const fa = V.add(a, V.mul(n, sg * w.t / 2)), fb = V.add(b, V.mul(n, sg * w.t / 2));
        const ex = fb.x - fa.x, ez = fb.y - fa.y; const den = dx * ez - dz * ex; if (Math.abs(den) < 1e-9) continue;
        const t = ((fa.x - x) * ez - (fa.y - z) * ex) / den, u = ((fa.x - x) * dz - (fa.y - z) * dx) / den;
        if (t > 0 && u >= 0 && u <= 1 && t < best) best = t;
      }
    }
  }
  return best;
}
function collideWalls(x, z, r) {
  const p = S.project; const ph = phase();
  for (let iter = 0; iter < 3; iter++) {
    for (const w of p.walls) {
      if (!wallVisible(w, ph)) continue; const L = wallLen(w); if (L < .01) continue; const d = wallDir(w);
      const spans = solidSpans(w, openingsOf(w, ph), .4);
      for (const [s0, s1] of spans) {
        const a = V.add(w.a, V.mul(d, s0)), b = V.add(w.a, V.mul(d, s1));
        const pr = projSeg({ x, y: z }, a, b); const lim = w.t / 2 + r;
        if (pr.d < lim) { const nx = (x - pr.x) / (pr.d || 1), nz = (z - pr.y) / (pr.d || 1); x = pr.x + nx * lim; z = pr.y + nz * lim; }
      }
    }
  }
  return [x, z];
}
function miniView() {
  const cv = $('#miniCanvas'); const r = cv.getBoundingClientRect(); if (!r.width || !S.project) return null;
  const b = Plan.bounds(); const m = 10; const s = Math.min((r.width - m * 2) / Math.max(b.x1 - b.x0, 1), (r.height - m * 2) / Math.max(b.y1 - b.y0, 1));
  return { scale: s, ox: r.width / 2 - (b.x0 + b.x1) / 2 * s, oy: r.height / 2 - (b.y0 + b.y1) / 2 * s, W: r.width, H: r.height };
}
function drawMinimap() {
  if (S.view !== 'walk') return; const cv = $('#miniCanvas'); const v = miniView(); if (!v) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2); const cw = Math.round(v.W * dpr), ch = Math.round(v.H * dpr); if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; } const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  renderPlan(g, v, { mini: true, miniCam: (gg, w2s) => {
    const W = View3D.walk; const c = w2s({ x: W.x, y: W.z }); const a = Math.atan2(-Math.cos(W.yaw), -Math.sin(W.yaw));
    gg.fillStyle = hexA(PAL.accent, .25); gg.beginPath(); gg.moveTo(c.x, c.y); gg.arc(c.x, c.y, 34, a - .45, a + .45); gg.closePath(); gg.fill();
    gg.fillStyle = PAL.accent; gg.beginPath(); gg.arc(c.x, c.y, 5, 0, Math.PI * 2); gg.fill(); gg.strokeStyle = '#fff'; gg.lineWidth = 1.5; gg.stroke();
  } });
}
function schedule3D() { View3D.dirty = true; }
function liveUpdateItem3D(it) { if (View3D.ready && S.view !== '2d') View3D.liveItem(it); }
function isTyping(e) { const t = e.target; return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable); }

// ---------- visible error card for the 3D view ----------
function show3DError(msg, err) {
  const box = $('#err3d'); if (!box) { toast(msg, 6000); return; }
  const detail = err ? String(err && (err.message || err)).slice(0, 300) : '';
  box.innerHTML = '';
  box.append(
    el('div', { class: 'err3d-card' },
      el('b', {}, 'La vista 3D non si è avviata'),
      el('p', {}, msg),
      detail ? el('code', {}, detail) : null,
      el('p', { class: 'note' }, (View3D.renderer ? View3D.diag() + ' · ' : '') + navigator.userAgent.replace(/\s+/g, ' ').slice(0, 160)),
      el('div', { class: 'row' },
        el('button', { class: 'btn primary', type: 'button', onclick: async () => { hide3DError(); if (View3D.renderer) { View3D.losses = 0; View3D.recover('leggera'); return; } View3D.failed = false; const v = S.view === '2d' ? '3d' : S.view; S.view = '2d'; await setView(v); } }, View3D.renderer ? 'Riprova in qualità leggera' : 'Riprova'),
        el('button', { class: 'btn', type: 'button', onclick: () => { hide3DError(); setView('2d'); } }, 'Torna alla pianta'))));
  box.hidden = false;
}
function hide3DError() { const box = $('#err3d'); if (box) box.hidden = true; }

// ---------- 3D quality levels ----------
const IS_WEBKIT = /AppleWebKit/.test(navigator.userAgent) && !/Chrome|Chromium|CriOS|FxiOS|Firefox|Edg\//.test(navigator.userAgent);
const QUALITY = {
  alta: { label: 'Alta', pr: 2, shadows: 2048, soft: true, env: true, aa: true, lights: 12 },
  media: { label: 'Media', pr: 1.5, shadows: 1024, soft: false, env: false, aa: true, lights: 4 },
  leggera: { label: 'Leggera', pr: 1, shadows: 0, soft: false, env: false, aa: false, lights: 0 },
};
function loadQuality() { let q = null; try { q = localStorage.getItem('ps-3d-q'); } catch { } return QUALITY[q] ? q : (IS_WEBKIT ? 'media' : 'alta'); }
function saveQuality(q) { try { localStorage.setItem('ps-3d-q', q); } catch { } }

// ===================== UI: rail, options, panels, sheets =====================
const RAIL = ['select', 'wall', 'door', 'window', 'room', 'measure', 'pipe', '|', 'calibrate', 'bg'];
function buildRail() {
  const r = $('#rail'); r.innerHTML = '';
  for (const k of RAIL) {
    if (k === '|') { r.append(el('div', { class: 'sep' })); continue; }
    const T = TOOLS[k];
    const b = el('button', { class: 'tool', type: 'button', 'data-tool': k, 'aria-label': T.label, 'aria-pressed': String(S.tool === k), html: icon(T.icon, 20) + `<span class="tip">${T.label}<kbd>${T.key}</kbd></span>` });
    b.addEventListener('click', () => setTool(k));
    r.append(b);
  }
}
function setTool(k) {
  if (S.tool === k && k !== 'select') k = 'select';
  const prev = TOOLS[S.tool]; if (prev && prev.finish) prev.finish.call(Plan);
  S.tool = k; S.placing = null; Plan.chain = []; Plan.measureA = null; Plan.calA = null; Plan.snap = null; Plan.lenBuf = '';
  $$('#rail .tool').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tool === k)));
  Plan.cv.classList.toggle('tool-draw', !!TOOLS[k].draw);
  refreshToolOpts(); refreshLibrary(); requestRender();
}

// ---------- tool options bar ----------
function chip(label, pressed, onClick, extra = {}) { return el('button', { class: 'chip', type: 'button', 'aria-pressed': String(!!pressed), onclick: onClick, ...extra }, ...(Array.isArray(label) ? label : [label])); }
function optGroup(title, ...kids) { return el('div', { class: 'opt-group' }, title ? el('span', { class: 'opt-label' }, title) : null, ...kids); }
function refreshToolOpts() {
  const box = $('#toolOpts'); box.innerHTML = '';
  if (S.view !== '2d') return;
  const t = S.tool; const ph = phase();
  const phaseNote = ph === 'fatto' ? 'Stai disegnando lo stato di fatto' : 'Le nuove opere compaiono in rosso nella vista Gialli e rossi';
  if (S.placing) {
    const c = CAT_BY_TYPE[S.placing];
    box.append(el('div', { class: 'hint' }, `Tocca la pianta per posizionare: ${c.name}. Vicino a un muro si aggancia da solo.`), el('button', { class: 'btn small', type: 'button', onclick: () => { S.placing = null; refreshLibrary(); refreshToolOpts(); requestRender(); } }, 'Annulla'));
    return;
  }
  if (t === 'select') {
    if (!S.sel && !S.hintSeen) box.append(el('div', { class: 'hint' }, 'Tocca un elemento per modificarlo · trascina per spostarlo · scegli un arredo dal pannello per aggiungerlo'));
  } else if (t === 'wall') {
    box.append(optGroup('Spessore', ...[.075, .10, .125, .15, .25, .30].map((v) => chip(nf1.format(v * 100).replace(',0', '') + ' cm', Math.abs(S.wallOpts.t - v) < .001, () => { S.wallOpts.t = v; refreshToolOpts(); }))));
    box.append(optGroup('Tipo', chip('Cartongesso', S.wallOpts.type === 'cartongesso', () => { S.wallOpts.type = 'cartongesso'; refreshToolOpts(); }), chip('Muratura', S.wallOpts.type === 'muratura', () => { S.wallOpts.type = 'muratura'; refreshToolOpts(); })));
    if (Plan.chain.length) {
      const inp = el('input', { class: 'len-input', id: 'lenInput', type: 'text', inputmode: 'decimal', placeholder: 'm', 'aria-label': 'Lunghezza in metri' });
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { applyLength(inp.value); inp.value = ''; } e.stopPropagation(); });
      box.append(optGroup('Lunghezza', inp, el('button', { class: 'btn small', type: 'button', onclick: () => { applyLength(inp.value); inp.value = ''; } }, 'Applica')));
      box.append(el('button', { class: 'btn small primary', type: 'button', onclick: () => Plan.finishChain() }, 'Fine'));
    } else box.append(el('div', { class: 'hint' }, 'Tocca per iniziare il muro, poi tocca ogni angolo. Tocca il primo punto per chiudere. ' + phaseNote + '.'));
  } else if (t === 'door' || t === 'window') {
    const o = t === 'door' ? S.openOpts : S.winOpts;
    const kinds = t === 'door' ? ['porta', 'scorrevole', 'scomparsa', 'varco'] : ['finestra', 'portafinestra'];
    const widths = t === 'door' ? [.7, .8, .9, 1.0, 1.2] : [.6, .8, 1.0, 1.2, 1.5, 2.0];
    box.append(optGroup('Tipo', ...kinds.map((k) => chip(OPEN_KINDS[k].replace('Porta ', '').replace(/^a /, 'A ').replace(/^./, (c) => c.toUpperCase()), o.kind === k, () => { o.kind = k; refreshToolOpts(); }))));
    box.append(optGroup('Larghezza', ...widths.map((v) => chip(Math.round(v * 100) + ' cm', Math.abs(o.w - v) < .001, () => { o.w = v; refreshToolOpts(); }))));
    box.append(el('div', { class: 'hint' }, 'Tocca un muro. Il lato del muro su cui tocchi decide il verso di apertura.'));
  } else if (t === 'room') {
    box.append(el('div', { class: 'hint' }, 'Tocca dentro uno spazio chiuso da muri per creare la stanza e calcolarne la superficie.'));
  } else if (t === 'measure') {
    box.append(el('div', { class: 'hint' }, Plan.measureA ? 'Tocca il secondo punto' : 'Tocca due punti per aggiungere una quota'));
    if (S.project.dims.length) box.append(el('button', { class: 'btn small', type: 'button', onclick: () => commit((p) => { p.dims = []; }) }, 'Cancella tutte le quote'));
  } else if (t === 'pipe') {
    box.append(optGroup('Impianto', ...Object.entries(PIPE_KINDS).map(([k, [lab, tok]]) => chip([el('span', { class: 'swatch-dot', style: { background: PAL[tok] } }), lab], S.pipeOpts.kind === k, () => { S.pipeOpts.kind = k; refreshToolOpts(); requestRender(); }))));
    if (Plan.chain.length) box.append(el('button', { class: 'btn small primary', type: 'button', onclick: () => Plan.finishChain() }, 'Fine percorso'));
    else box.append(el('div', { class: 'hint' }, 'Tocca i punti del percorso (si aggancia a scatole e punti impianto). Doppio tocco o Fine per chiudere.'));
  } else if (t === 'calibrate') {
    box.append(el('div', { class: 'hint' }, Plan.calA ? 'Ora tocca il secondo punto' : 'Tocca due punti di cui conosci la distanza reale (per esempio i due estremi di un muro quotato)'));
  } else if (t === 'bg') {
    const p = S.project; const bg = p.bg;
    box.append(el('button', { class: 'btn small primary', type: 'button', onclick: () => $('#fileBg').click() }, icon('image', 16), bg ? 'Sostituisci planimetria' : 'Carica planimetria (PDF o immagine)'));
    if (bg) {
      const range = el('input', { type: 'range', min: '0.1', max: '1', step: '0.05', value: String(p.settings.bgOpacity), id: 'bgOpacity', 'aria-label': 'Opacità sfondo', style: { width: '110px' } });
      range.addEventListener('input', () => { p.settings.bgOpacity = parseFloat(range.value); requestRender(); });
      range.addEventListener('change', () => markDirty());
      box.append(optGroup('Opacità', range));
      box.append(optGroup(null, chip(p.settings.showBg ? 'Visibile' : 'Nascosta', p.settings.showBg, () => { p.settings.showBg = !p.settings.showBg; markDirty(); refreshToolOpts(); requestRender(); }), chip('Ruota 90°', false, () => commit((pp) => { pp.bg.rot = ((pp.bg.rot || 0) + 90) % 360; })), chip('Calibra', false, () => setTool('calibrate')), chip('Rimuovi', false, () => confirmSheet('Rimuovere la planimetria di sfondo?', 'I muri disegnati restano dove sono.', 'Rimuovi', () => { commit((pp) => { pp.bg = null; }); S.bgData.delete('img:' + p.id); p._bgDirty = true; markDirty(); refreshToolOpts(); }))));
      box.append(el('div', { class: 'hint' }, 'Trascina per spostare la planimetria sotto i muri.'));
    }
  }
}
function applyLength(v) {
  const L = parseNum(v); if (!isFinite(L) || L <= 0) { toast('Scrivi una lunghezza in metri, per esempio 3,25'); return; }
  const from = Plan.chain[Plan.chain.length - 1]; if (!from) return;
  const to = Plan.snap || Plan.cursor || { x: from.x + 1, y: from.y };
  let dir = V.sub(to, from); if (V.len(dir) < 1e-6) dir = { x: 1, y: 0 }; dir = V.norm(dir);
  const p = V.add(from, V.mul(dir, L));
  if (S.tool === 'wall') addWall(from, p); Plan.chain.push(p); Plan.lenBuf = ''; requestRender(); refreshToolOpts();
  const inp = $('#lenInput'); if (inp) inp.focus();
}

// ---------- tabs & panel ----------
function setTab(t) {
  S.tab = t; $$('#tabs [data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === t)));
  if (window.matchMedia('(max-width: 1000px)').matches && t === 'props' && !S.panelOpen) { /* keep closed on small screens unless user opens */ }
  refreshPanel(true);
}
function togglePanel(force) {
  S.panelOpen = force ?? !S.panelOpen; $('#main').classList.toggle('panel-closed', !S.panelOpen);
  try { localStorage.setItem('ps-panel', S.panelOpen ? '1' : '0'); } catch { }
  setTimeout(() => { Plan.resize(); View3D.resize(); }, 30);
}
function selectionChanged() {
  if (S.sel) { setTab('props'); if (window.matchMedia('(max-width: 1000px)').matches && S.tool === 'select' && !S.panelOpen) { /* don't force open */ } }
  else refreshPanel();
  refreshToolOpts(); requestRender(); if (View3D.ready) View3D.updateSelection();
}
let _panelLock = false;
function refreshPanel(force) {
  const body = $('#panelBody'); if (!body || !S.project) return;
  if (!force && document.activeElement && body.contains(document.activeElement) && document.activeElement.matches('input[type=text],input[type=number],textarea')) { _panelLock = true; return; }
  const scroll = body.scrollTop; body.innerHTML = '';
  const t = S.tab;
  if (t === 'lib') renderLibrary(body);
  else if (t === 'props') renderProps(body);
  else if (t === 'rooms') renderRooms(body);
  else if (t === 'budget') renderBudget(body);
  else if (t === 'project') renderProjectTab(body);
  body.scrollTop = scroll;
}
function refreshLibrary() { if (S.tab === 'lib') refreshPanel(true); }

// ---------- library ----------
function renderLibrary(body) {
  const q = S.libQuery.trim().toLowerCase();
  const search = el('input', { class: 'inp', id: 'libSearch', type: 'search', placeholder: 'Cerca: riunito, autoclave, divano…', value: S.libQuery, 'aria-label': 'Cerca negli arredi' });
  search.addEventListener('input', () => { S.libQuery = search.value; const pos = search.selectionStart; refreshPanel(true); const s2 = $('#libSearch'); s2.focus(); try { s2.setSelectionRange(pos, pos); } catch { } });
  body.append(el('div', { class: 'lib-search' }, search));
  const cats = ['Tutti', ...CATS];
  body.append(el('div', { class: 'lib-cats' }, ...cats.map((c) => chip(c, S.libCat === c, () => { S.libCat = c; refreshPanel(true); }))));
  const list = CATALOG.filter((c) => (S.libCat === 'Tutti' || c.cat === S.libCat) && (!q || (c.name + ' ' + c.cat).toLowerCase().includes(q)));
  if (!list.length) { body.append(el('div', { class: 'empty' }, 'Nessun elemento trovato')); return; }
  const groups = S.libCat === 'Tutti' && !q ? CATS : [null];
  for (const gname of groups) {
    const items = gname ? list.filter((c) => c.cat === gname) : list;
    if (!items.length) continue;
    if (gname) body.append(el('div', { class: 'lib-cat-title' }, gname));
    const grid = el('div', { class: 'lib-grid' });
    for (const c of items) {
      const cv = el('img', { src: thumbURL(c), alt: '', width: '192', height: '192', 'aria-hidden': 'true', draggable: 'false' });
      const card = el('button', { class: 'lib-card', type: 'button', 'aria-pressed': String(S.placing === c.type), title: c.note || c.name }, cv, el('span', { class: 'nm' }, c.name), el('span', { class: 'dm' }, `${Math.round(c.w * 100)}×${Math.round(c.d * 100)} cm`));
      card.addEventListener('click', () => {
        if (S.view !== '2d') { addItemAtCenter(c.type); return; }
        if (S.tool !== 'select') setTool('select');
        S.placing = S.placing === c.type ? null : c.type; S.sel = null; refreshLibrary(); refreshToolOpts(); requestRender();
        if (S.placing && window.matchMedia('(max-width: 1000px)').matches) togglePanel(false);
      });
      grid.append(card);
    }
    body.append(grid);
  }
  body.append(el('p', { class: 'note' }, 'Le dimensioni sono indicative e si modificano dopo il posizionamento. Per riunito e OPT verifica gli ingombri sui fogli di installazione del produttore.'));
}
const THUMBS = new Map(); let _thumbCv = null;
function thumbURL(c) { // drawn once per item type: images are far lighter than one canvas per card
  if (THUMBS.has(c.type)) return THUMBS.get(c.type);
  _thumbCv ||= document.createElement('canvas'); _thumbCv.width = _thumbCv.height = 192;
  drawThumb(_thumbCv, c); const u = _thumbCv.toDataURL('image/png'); THUMBS.set(c.type, u); return u;
}
function drawThumb(cv, c) {
  const g = cv.getContext('2d'); const S0 = cv.width; g.clearRect(0, 0, S0, S0);
  const s = S0 * .78 / Math.max(c.w, c.d, .25);
  g.save(); g.translate(S0 / 2, S0 / 2); g.scale(s, s);
  try { drawItem(g, { id: 'thumb_' + c.type, type: c.type, x: 0, y: 0, rot: 0, phase: 'esistente' }, 1.4 / s * (S0 / 96), 'progetto', { interactive: false }, false); } catch (e) { }
  if (c.type === 'riunito') { g.globalAlpha = .9; drawZones(g, { type: 'riunito', x: 0, y: 0, rot: 0, dims: { w: c.w, d: c.d } }, 1 / s * 2, { export: true }); }
  g.restore();
}
function addItemAtCenter(type) {
  const c = CAT_BY_TYPE[type]; let x, y;
  if (View3D.ready && S.view === '3d') { x = View3D.controls.target.x; y = View3D.controls.target.z; } else if (S.view === 'walk') { const W = View3D.walk; x = W.x - Math.sin(W.yaw) * 1.5; y = W.z - Math.cos(W.yaw) * 1.5; } else { const b = Plan.bounds(); x = (b.x0 + b.x1) / 2; y = (b.y0 + b.y1) / 2; }
  const sn = placeSnap(type, { x, y });
  const it = { id: uid('i'), type, x: sn.x, y: sn.y, rot: sn.rot || 0, phase: phase() === 'fatto' ? 'esistente' : 'nuovo' };
  if (c.mount === 'wall' || c.mount === 'counter') it.elev = c.elev;
  commit((p) => p.items.push(it)); S.sel = { kind: 'item', id: it.id }; selectionChanged(); toast(c.name + ' aggiunto: trascinalo dove serve');
}

// ---------- form helpers ----------
function field(label, control, extra) { return el('div', { class: 'field' }, el('label', {}, label), control, extra || null); }
let _fid = 0;
function numInput(value, onCommit, { unit = 'cm', factor = 100, step = 1, min = null, digits = 0, placeholder = '' } = {}) {
  const id = 'f' + (++_fid);
  const inp = el('input', { class: 'inp', id, type: 'text', inputmode: 'decimal', value: value == null ? '' : (digits ? nf1.format(value * factor) : String(Math.round(value * factor * 10) / 10).replace('.', ',')), placeholder });
  inp.addEventListener('change', () => { const v = parseNum(inp.value); if (!isFinite(v)) { if (inp.value.trim() === '' && placeholder) onCommit(null); return; } if (min != null && v < min) { toast('Valore troppo piccolo'); return; } onCommit(v / factor); });
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') inp.blur(); e.stopPropagation(); });
  return el('div', { class: 'unit-inp' }, inp, el('span', {}, unit));
}
function textInput(value, onCommit, ph = '') {
  const inp = el('input', { class: 'inp', type: 'text', value: value || '', placeholder: ph, id: 'f' + (++_fid) });
  inp.addEventListener('change', () => onCommit(inp.value.trim())); inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') inp.blur(); e.stopPropagation(); }); return inp;
}
function segPick(options, value, onPick, cls = () => '') {
  return el('div', { class: 'seg-sm' }, ...options.map(([v, lab]) => el('button', { type: 'button', class: cls(v), 'aria-pressed': String(v === value), onclick: () => onPick(v) }, lab)));
}
function swatchPick(pal, value, onPick, custom = true) {
  const box = el('div', { class: 'swatches' });
  for (const [name, c] of pal) {
    const bg = c.startsWith('wood:') ? (c === 'wood:oak' ? 'linear-gradient(135deg,#c9a374,#a87f52)' : 'linear-gradient(135deg,#6b4a33,#4a3222)') : c;
    box.append(el('button', { class: 'swatch', type: 'button', title: name, 'aria-label': name, 'aria-pressed': String(value === c), style: { background: bg }, onclick: () => onPick(c) }));
  }
  if (custom) {
    const ci = el('input', { type: 'color', value: value && value[0] === '#' ? value : '#888888', 'aria-label': 'Colore personalizzato' });
    ci.addEventListener('change', () => onPick(ci.value));
    box.append(el('label', { class: 'swatch custom', title: 'Colore personalizzato' }, ci));
  }
  return box;
}
function actionRow(...btns) { return el('div', { class: 'row' }, ...btns); }
function upd(fn) { commit(fn); }

// ---------- properties ----------
function renderProps(body) {
  const o = findSel(S.sel);
  if (!o) {
    body.append(el('h2', { class: 'ptitle' }, 'Nessuna selezione'), el('p', { class: 'note' }, 'Tocca un muro, una porta, un arredo o una stanza nella pianta o nel 3D per modificarne misure, colore, fase e prezzo.'));
    const conf = zoneConflicts();
    if (conf.length) body.append(conflictBox(conf));
    return;
  }
  const k = S.sel.kind;
  if (k === 'item') return renderItemProps(body, o);
  if (k === 'wall') return renderWallProps(body, o);
  if (k === 'opening') return renderOpeningProps(body, o);
  if (k === 'room') return renderRoomProps(body, o);
  if (k === 'pipe') return renderPipeProps(body, o);
  if (k === 'dim') { body.append(el('h2', { class: 'ptitle' }, 'Quota'), el('div', { class: 'kv' }, 'Lunghezza', el('b', {}, fmtM(V.dist(o.a, o.b)))), actionRow(delBtn())); }
}
function delBtn(label = 'Elimina') { return el('button', { class: 'btn danger', type: 'button', onclick: () => smartDelete() }, icon('trash', 16), label); }
function hardDelBtn() { return el('button', { class: 'btn small danger', type: 'button', onclick: () => smartDelete(true) }, 'Elimina definitivamente'); }
function conflictBox(conf) {
  const box = el('div', { class: 'warn-box bad' }, el('b', {}, 'Ingombri nelle zone di lavoro'));
  for (const c of conf) box.append(el('div', {}, `${c.name} invade la zona ${ZONE_LABEL[c.zone].toLowerCase()}`));
  box.append(el('div', { class: 'note' }, 'Le zone seguono lo schema a orologio (FDI/ISO) con un raggio di lavoro regolabile: sono un aiuto alla disposizione, non un requisito normativo.'));
  return box;
}
function renderItemProps(body, it) {
  const c = catOf(it), d = dimsOf(it);
  body.append(el('h2', { class: 'ptitle' }, it.label || c.name), el('div', { class: 'psub' }, c.cat));
  const s1 = el('div', { class: 'sec' });
  s1.append(field('Nome', textInput(it.label, (v) => upd(() => { it.label = v || undefined; }), c.name)));
  s1.append(el('div', { class: 'grid3' },
    field('Larghezza', numInput(d.w, (v) => upd(() => { it.dims = { ...(it.dims || {}), w: Math.max(.02, v) }; }))),
    field('Profondità', numInput(d.d, (v) => upd(() => { it.dims = { ...(it.dims || {}), d: Math.max(.02, v) }; }))),
    field('Altezza', numInput(d.h, (v) => upd(() => { it.dims = { ...(it.dims || {}), h: Math.max(.01, v) }; }))),
  ));
  const showElev = c.mount === 'wall' || c.mount === 'counter' || elevOf(it) > 0;
  s1.append(el('div', { class: 'grid2' },
    field('Rotazione', numInput(it.rot, (v) => upd(() => { it.rot = ((Math.round(v) % 360) + 360) % 360; }), { unit: '°', factor: 1 })),
    showElev ? field('Quota da terra', numInput(elevOf(it), (v) => upd(() => { it.elev = Math.max(0, v); }))) : el('div'),
  ));
  s1.append(actionRow(
    el('button', { class: 'btn small', type: 'button', onclick: () => upd(() => { it.rot = (it.rot + 270) % 360; }) }, icon('rotL', 16), '90°'),
    el('button', { class: 'btn small', type: 'button', onclick: () => upd(() => { it.rot = (it.rot + 90) % 360; }) }, icon('rotR', 16), '90°'),
    el('button', { class: 'btn small', type: 'button', onclick: () => upd(() => { it.rot = (it.rot + 345) % 360; }) }, '−15°'),
    el('button', { class: 'btn small', type: 'button', onclick: () => upd(() => { it.rot = (it.rot + 15) % 360; }) }, '+15°'),
  ));
  body.append(s1);
  const pal = paletteFor(c.colorKind);
  if (pal) body.append(el('div', { class: 'sec' }, el('div', { class: 'sec-title' }, c.colorKind === 'uph' ? 'Tappezzeria' : c.colorKind === 'fabric' ? 'Tessuto' : 'Finitura'), swatchPick(pal, colorOf(it), (v) => upd(() => { it.color = v; }), !String(colorOf(it)).startsWith('wood:') || true)));
  if (it.type === 'riunito') {
    const sz = el('div', { class: 'sec' }, el('div', { class: 'sec-title' }, 'Zone di lavoro'));
    sz.append(segPick([['dx', 'Destrimane'], ['sx', 'Mancino']], it.hand === 'sx' ? 'sx' : 'dx', (v) => upd(() => { it.hand = v; })));
    sz.append(el('div', { class: 'grid2' },
      field('Raggio zone', numInput(it.zoneR ?? 1.2, (v) => upd(() => { it.zoneR = clamp(v, .5, 3); }))),
      field('Mostra', segPick([[true, 'Sì'], [false, 'No']], it.zones !== false, (v) => upd(() => { it.zones = v; }))),
    ));
    const zk = el('div', { class: 'zone-key' }); for (const k of ['operatore', 'statica', 'assistente', 'trasferimento']) zk.append(el('i', { style: { background: hexA(zoneColor(k), .6) } }), el('span', {}, ZONE_LABEL[k] + (k === 'statica' ? ' (mobili e carrelli ammessi)' : ' (da tenere libera)')));
    sz.append(zk);
    const conf = zoneConflicts().filter((x) => x.chair === it.id);
    if (conf.length) sz.append(conflictBox(conf)); else sz.append(el('div', { class: 'ok-box' }, 'Nessun ingombro nelle zone operatore, assistente e trasferimento.'));
    if (isFinite(it._minWall)) sz.append(el('div', { class: 'kv' }, 'Distanza bocca – parete più vicina', el('b', {}, fmtM(Math.max(0, it._minWall)))));
    body.append(sz);
  }
  body.append(el('div', { class: 'sec' }, el('div', { class: 'sec-title' }, 'Fase'), segPick([['esistente', 'Esistente'], ['nuovo', 'Nuovo'], ['rimosso', 'Da rimuovere']], it.phase || 'esistente', (v) => upd(() => { it.phase = v; }), (v) => 'st-' + v)));
  body.append(el('div', { class: 'grid2' }, field('Prezzo', numInput(it.price ?? null, (v) => upd(() => { it.price = v == null ? undefined : Math.max(0, v); }), { unit: '€', factor: 1, placeholder: '—' })), el('div')));
  body.append(field('Note', (() => { const ta = el('textarea', { class: 'inp', rows: '2', id: 'f' + (++_fid) }, it.notes || ''); ta.addEventListener('change', () => upd(() => { it.notes = ta.value; })); return ta; })()));
  if (c.note) body.append(el('p', { class: 'note' }, c.note));
  body.append(actionRow(
    el('button', { class: 'btn', type: 'button', onclick: () => duplicateSel() }, icon('copy', 16), 'Duplica'),
    S.view === '3d' ? el('button', { class: 'btn', type: 'button', onclick: () => View3D.focusItem(it) }, icon('eye', 16), 'Inquadra') : null,
    delBtn(it.phase === 'esistente' && phase() !== 'fatto' ? 'Da rimuovere' : 'Elimina'),
  ));
  if (it.phase === 'esistente' && phase() !== 'fatto') body.append(actionRow(hardDelBtn()));
}
function renderWallProps(body, w) {
  body.append(el('h2', { class: 'ptitle' }, WALL_TYPES[w.type] + (w.status === 'nuovo' ? ' · nuovo' : w.status === 'demolito' ? ' · da demolire' : '')), el('div', { class: 'psub' }, `Lunghezza ${fmtM(wallLen(w))}`));
  const s = el('div', { class: 'sec' });
  s.append(el('div', { class: 'grid3' },
    field('Lunghezza', numInput(wallLen(w), (v) => upd(() => setWallLength(w, v)))),
    field('Spessore', numInput(w.t, (v) => upd(() => { w.t = clamp(v, .03, 1); }))),
    field('Altezza', numInput(w.h ?? null, (v) => upd(() => { w.h = v == null ? undefined : clamp(v, .2, 6); }), { placeholder: String(Math.round(wallH(w) * 100)) })),
  ));
  s.append(field('Tipo', segPick(Object.entries(WALL_TYPES), w.type, (v) => upd(() => { w.type = v; if (v === 'parapetto' && !w.h) w.h = 1.0; if (v !== 'parapetto' && w.h === 1.0) delete w.h; }))));
  s.append(field('Stato', segPick([['esistente', 'Esistente'], ['demolito', 'Da demolire'], ['nuovo', 'Nuovo']], w.status, (v) => upd(() => { w.status = v; }), (v) => 'st-' + v)));
  body.append(s);
  body.append(el('div', { class: 'sec' }, el('div', { class: 'sec-title' }, 'Colore pareti (entrambi i lati)'), swatchPick(WALL_COLORS, w.color || '#F3F3EF', (v) => upd(() => { w.color = v; }))));
  body.append(actionRow(
    el('button', { class: 'btn', type: 'button', onclick: () => splitWall(w) }, icon('cut', 16), 'Dividi a metà'),
    w.status === 'demolito' ? el('button', { class: 'btn', type: 'button', onclick: () => upd(() => { w.status = 'esistente'; }) }, 'Ripristina') : delBtn(w.status === 'esistente' && phase() !== 'fatto' ? 'Demolisci' : 'Elimina'),
  ));
  if (w.status !== 'nuovo' && phase() !== 'fatto') body.append(actionRow(hardDelBtn()));
  body.append(el('p', { class: 'note' }, 'Per demolire solo un tratto, dividi il muro e segna da demolire la parte che serve. Trascina gli estremi per allungarlo o spostarlo.'));
}
function setWallLength(w, L) {
  L = Math.max(.05, L); const d = wallDir(w); const old = { ...w.b };
  const nb = V.add(w.a, V.mul(d, L)); const linked = coincidentEnds(old, w);
  w.b.x = nb.x; w.b.y = nb.y; for (const q of linked) { q.x = nb.x; q.y = nb.y; }
}
function splitWall(w) {
  const L = wallLen(w); if (L < .2) { toast('Muro troppo corto per dividerlo'); return; }
  commit((p) => {
    const m = { x: (w.a.x + w.b.x) / 2, y: (w.a.y + w.b.y) / 2 };
    const w2 = { ...deepClone(w), id: uid('w'), a: { ...m }, b: { ...w.b } }; w.b = { ...m };
    for (const o of p.openings.filter((o) => o.wallId === w.id)) { if (o.t > .5) { o.wallId = w2.id; o.t = (o.t - .5) * 2; } else o.t = o.t * 2; }
    p.walls.push(w2);
  });
  toast('Muro diviso in due tratti');
}
function renderOpeningProps(body, o) {
  const w = wallById(o.wallId);
  body.append(el('h2', { class: 'ptitle' }, OPEN_KINDS[o.kind]), el('div', { class: 'psub' }, `${Math.round(o.w * 100)} × ${Math.round(o.h * 100)} cm`));
  const s = el('div', { class: 'sec' });
  s.append(field('Tipo', segPick(Object.entries(OPEN_KINDS).map(([k, v]) => [k, v.replace('Porta a ', '').replace('Porta ', '').replace(/^./, (c) => c.toUpperCase())]), o.kind, (v) => upd(() => { o.kind = v; if (v === 'finestra') { o.sill = o.sill || .9; o.h = Math.min(o.h, 1.5); } else { o.sill = 0; o.h = v === 'portafinestra' ? 2.3 : 2.1; } }))));
  s.append(el('div', { class: 'grid3' },
    field('Larghezza', numInput(o.w, (v) => upd(() => { const L = wallLen(w); o.w = clamp(v, .3, L - .04); const half = o.w / 2 / L; o.t = clamp(o.t, half, 1 - half); }))),
    field('Altezza', numInput(o.h, (v) => upd(() => { o.h = clamp(v, .3, 3); }))),
    field('Davanzale', numInput(o.sill || 0, (v) => upd(() => { o.sill = clamp(v, 0, 2.5); }))),
  ));
  if (['porta', 'scorrevole', 'scomparsa', 'portafinestra'].includes(o.kind)) s.append(actionRow(
    el('button', { class: 'btn small', type: 'button', onclick: () => upd(() => { o.hinge = o.hinge === 'end' ? 'start' : 'end'; }) }, icon('flip', 16), o.kind === 'porta' ? 'Inverti cerniera' : 'Inverti lato'),
    el('button', { class: 'btn small', type: 'button', onclick: () => upd(() => { o.swing = -(o.swing || 1); }) }, icon('swing', 16), 'Inverti verso'),
  ));
  s.append(field('Stato', segPick([['esistente', 'Esistente'], ['nuovo', 'Nuova'], ['chiuso', 'Da chiudere']], o.status, (v) => upd(() => { o.status = v; }), (v) => 'st-' + v)));
  body.append(s);
  body.append(actionRow(delBtn(o.status === 'esistente' && phase() !== 'fatto' ? 'Chiudi apertura' : 'Elimina')));
  if (o.status !== 'nuovo' && phase() !== 'fatto') body.append(actionRow(hardDelBtn()));
}
function renderRoomProps(body, r) {
  const st = computeRooms().rooms.get(r.id);
  body.append(el('h2', { class: 'ptitle' }, r.name), el('div', { class: 'psub' }, st && !st.open ? `Superficie ${fmtA(st.area)}` : 'Area non chiusa nella fase attuale'));
  body.append(field('Nome', textInput(r.name, (v) => upd(() => { r.name = v || r.name; }))));
  const fl = el('div', { class: 'sec' }, el('div', { class: 'sec-title' }, 'Pavimento'));
  const grid = el('div', { class: 'seg-sm' });
  for (const [k, f] of Object.entries(FLOORS)) grid.append(el('button', { type: 'button', 'aria-pressed': String((r.floor || 'gres-chiaro') === k), onclick: () => upd(() => { r.floor = k; }) }, el('span', { class: 'swatch-dot', style: { background: f.tint, marginRight: '6px' } }), f.name));
  fl.append(grid); body.append(fl);
  if (st && st.shared) body.append(el('div', { class: 'warn-box' }, 'Questa stanza occupa lo stesso spazio di un\'altra: eliminane una o separa con un muro.'));
  const items = S.project.items.filter((it) => itemVisible(it) && roomAtPoint(it) === r);
  if (items.length) body.append(el('div', { class: 'sec' }, el('div', { class: 'sec-title' }, 'Contenuto', el('span', { class: 'count' }, String(items.length))), el('div', { class: 'list' }, ...items.map((it) => el('button', { class: 'list-row', type: 'button', onclick: () => { S.sel = { kind: 'item', id: it.id }; selectionChanged(); } }, el('span', { class: 'k' }, it.label || catOf(it).name), el('span', { class: 'v' }, `${Math.round(dimsOf(it).w * 100)}×${Math.round(dimsOf(it).d * 100)}`))))));
  body.append(el('p', { class: 'note' }, 'Trascinare non serve: la stanza segue i muri. Per spostare l\'etichetta crea la stanza toccando il punto dove la vuoi.'));
  body.append(actionRow(delBtn()));
}
function renderPipeProps(body, pp) {
  let L = 0; for (let i = 1; i < pp.pts.length; i++) L += V.dist(pp.pts[i - 1], pp.pts[i]);
  body.append(el('h2', { class: 'ptitle' }, 'Tubazione · ' + PIPE_KINDS[pp.kind][0]), el('div', { class: 'psub' }, `Lunghezza ${fmtM(L)} · ${pp.pts.length} punti`));
  body.append(field('Impianto', segPick(Object.entries(PIPE_KINDS).map(([k, v]) => [k, v[0]]), pp.kind, (v) => upd(() => { pp.kind = v; }))));
  body.append(field('Stato', segPick([['esistente', 'Esistente'], ['nuovo', 'Nuovo']], pp.status || 'nuovo', (v) => upd(() => { pp.status = v; }), (v) => 'st-' + v)));
  body.append(el('p', { class: 'note' }, 'Trascina i punti per correggere il percorso. Il tracciato è schematico: quote e pendenze degli scarichi vanno verificate con l\'impiantista.'));
  body.append(actionRow(delBtn()));
}
function smartDelete(hard = false) {
  const o = findSel(S.sel); if (!o) return; const k = S.sel.kind; const ph = phase();
  commit((p) => {
    if (k === 'wall') {
      if (!hard && ph !== 'fatto' && o.status === 'esistente') { o.status = 'demolito'; toast('Muro da demolire: lo vedi in giallo nella vista Gialli e rossi'); return; }
      p.walls = p.walls.filter((w) => w !== o); p.openings = p.openings.filter((x) => x.wallId !== o.id);
    } else if (k === 'opening') {
      if (!hard && ph !== 'fatto' && o.status === 'esistente') { o.status = 'chiuso'; toast('Apertura da chiudere (tamponamento)'); return; }
      p.openings = p.openings.filter((x) => x !== o);
    } else if (k === 'item') {
      if (!hard && ph !== 'fatto' && o.phase === 'esistente') { o.phase = 'rimosso'; toast('Segnato da rimuovere'); return; }
      p.items = p.items.filter((x) => x !== o);
    } else if (k === 'room') p.rooms = p.rooms.filter((x) => x !== o);
    else if (k === 'pipe') p.pipes = p.pipes.filter((x) => x !== o);
    else if (k === 'dim') p.dims = p.dims.filter((x) => x !== o);
    S.sel = null;
  });
  validateSel();
  const left = findSel(S.sel); // an element just marked as demolished or removed disappears from the current view: deselect it
  if (left && ((S.sel.kind === 'item' && !itemVisible(left)) || (S.sel.kind === 'wall' && !wallVisible(left)) || (S.sel.kind === 'opening' && !openingVisible(left)))) S.sel = null;
  selectionChanged();
}
function duplicateSel() {
  const o = findSel(S.sel); if (!o || S.sel.kind !== 'item') return;
  const c = deepClone(o); c.id = uid('i'); const off = V.rot({ x: .3, y: .3 }, 0); c.x += off.x; c.y += off.y; c.phase = phase() === 'fatto' ? 'esistente' : 'nuovo';
  commit((p) => p.items.push(c)); S.sel = { kind: 'item', id: c.id }; selectionChanged();
}

// ---------- rooms tab ----------
function renderRooms(body) {
  const rr = computeRooms(); const p = S.project;
  body.append(el('h2', { class: 'ptitle' }, 'Stanze e superfici'), el('div', { class: 'psub' }, PHASES[phase()]));
  if (!p.rooms.length) { body.append(el('div', { class: 'empty' }, 'Nessuna stanza. Usa lo strumento Stanza e tocca dentro uno spazio chiuso.')); return; }
  const list = el('div', { class: 'list' }); let tot = 0; const open = [], merged = [];
  const ownerOf = (st) => p.rooms.find((x) => { const s2 = rr.rooms.get(x.id); return s2 && s2.reg === st.reg && !s2.shared; });
  for (const r of p.rooms) {
    const st = rr.rooms.get(r.id); const ok = st && !st.open && !st.shared; if (ok) tot += st.area;
    else if (st && st.shared) merged.push([r.name, ownerOf(st)?.name]); else open.push(r.name);
    list.append(el('button', { class: 'list-row', type: 'button', onclick: () => { S.sel = { kind: 'room', id: r.id }; selectionChanged(); } }, el('span', { class: 'k' }, r.name, el('span', { class: 'sub' }, st && st.shared ? 'Unita a ' + (ownerOf(st)?.name || 'un\'altra stanza') : (FLOORS[r.floor] || FLOORS['gres-chiaro']).name)), el('span', { class: 'v' }, ok ? fmtA(st.area) : st && st.shared ? '—' : 'aperta')));
  }
  list.append(el('div', { class: 'list-row total' }, el('span', { class: 'k' }, 'Totale calpestabile'), el('span', { class: 'v' }, fmtA(tot))));
  body.append(list);
  if (open.length) body.append(el('div', { class: 'warn-box' }, `Aree non chiuse in questa fase: ${open.join(', ')}. Controlla che i muri si tocchino.`));
  if (merged.length) body.append(el('div', { class: 'warn-box' }, `Con le demolizioni ${merged.map((m) => m[0]).join(', ')} ${merged.length > 1 ? 'fanno' : 'fa'} parte dello stesso spazio di ${merged[0][1] || 'un\'altra stanza'}: la superficie è conteggiata una volta sola. Elimina o rinomina le stanze in più.`));
  body.append(el('p', { class: 'note' }, 'Superfici nette calcolate dai muri disegnati (risoluzione di pochi centimetri). I pilastri sono esclusi.'));
}

// ---------- budget tab ----------
function renderBudget(body) {
  const p = S.project; const pr = p.settings.prices; const q = quantities();
  body.append(el('h2', { class: 'ptitle' }, 'Budget'), el('div', { class: 'psub' }, 'Prezzi inseriti da te: nessun prezzo è precompilato'));
  const items = p.items.filter((it) => (it.phase === 'nuovo') && !catOf(it).utility);
  const sec = el('div', { class: 'sec' }, el('div', { class: 'sec-title' }, 'Arredi e attrezzature nuove', el('span', { class: 'count' }, String(items.length))));
  const list = el('div', { class: 'list' }); let tItems = 0;
  if (!items.length) list.append(el('div', { class: 'list-row' }, el('span', { class: 'k note' }, 'Gli elementi in fase “Nuovo” compaiono qui'), el('span')));
  for (const it of items) {
    tItems += it.price || 0;
    const inp = el('input', { class: 'price-inp', type: 'text', inputmode: 'decimal', value: it.price != null ? String(it.price).replace('.', ',') : '', placeholder: '€', id: 'f' + (++_fid), 'aria-label': 'Prezzo ' + (it.label || catOf(it).name) });
    inp.addEventListener('change', () => { const v = parseNum(inp.value); upd(() => { it.price = isFinite(v) ? Math.max(0, v) : undefined; }); });
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') inp.blur(); e.stopPropagation(); });
    list.append(el('div', { class: 'list-row' }, el('button', { class: 'k', type: 'button', style: { background: 'none', border: 0, padding: 0, textAlign: 'left' }, onclick: () => { S.sel = { kind: 'item', id: it.id }; selectionChanged(); } }, it.label || catOf(it).name, el('span', { class: 'sub' }, catOf(it).cat)), inp));
  }
  sec.append(list); body.append(sec);
  // works
  const works = [];
  if (q.nuoveCart > .01) works.push(['cartongesso', 'Pareti in cartongesso', q.nuoveCart, 'm²']);
  if (q.nuoveMur > .01) works.push(['muratura', 'Pareti in muratura', q.nuoveMur, 'm²']);
  if (q.demol > .01) works.push(['demolizione', 'Demolizioni', q.demol, 'm²']);
  if (q.tamp > .01) works.push(['tamponamento', 'Chiusura aperture', q.tamp, 'm²']);
  if (q.nuoveAperture) works.push(['apertura', 'Nuove aperture in muri esistenti', q.nuoveAperture, 'cad.']);
  for (const [k, L] of Object.entries(q.pipes)) works.push(['tubo_' + k, 'Linea ' + PIPE_KINDS[k][0].toLowerCase(), L, 'm']);
  for (const [k, A] of Object.entries(q.floors)) works.push(['pav_' + k, 'Pavimento ' + FLOORS[k].name.toLowerCase(), A, 'm²']);
  const ws = el('div', { class: 'sec' }, el('div', { class: 'sec-title' }, 'Lavori (quantità dal disegno)'));
  const wl = el('div', { class: 'list' }); let tWorks = 0;
  if (!works.length) wl.append(el('div', { class: 'list-row' }, el('span', { class: 'k note' }, 'Disegna muri nuovi, demolizioni o tubazioni per vedere le quantità'), el('span')));
  for (const [key, label, qty, unit] of works) {
    const up = pr[key]; const sub = up ? qty * up : 0; tWorks += sub;
    const inp = el('input', { class: 'price-inp', type: 'text', inputmode: 'decimal', value: up != null ? String(up).replace('.', ',') : '', placeholder: '€/' + unit, id: 'f' + (++_fid), 'aria-label': 'Prezzo unitario ' + label });
    inp.addEventListener('change', () => { const v = parseNum(inp.value); upd(() => { if (isFinite(v)) pr[key] = Math.max(0, v); else delete pr[key]; }); });
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') inp.blur(); e.stopPropagation(); });
    wl.append(el('div', { class: 'list-row' }, el('span', { class: 'k' }, label, el('span', { class: 'sub' }, `${unit === 'cad.' ? qty : nf2.format(qty)} ${unit}${up ? ' · ' + fmtEur(sub) : ''}`)), inp));
  }
  ws.append(wl); body.append(ws);
  body.append(el('div', { class: 'list' },
    el('div', { class: 'list-row' }, el('span', { class: 'k' }, 'Arredi e attrezzature'), el('span', { class: 'v' }, fmtEur(tItems))),
    el('div', { class: 'list-row' }, el('span', { class: 'k' }, 'Lavori'), el('span', { class: 'v' }, fmtEur(tWorks))),
    el('div', { class: 'list-row total' }, el('span', { class: 'k' }, 'Totale stimato'), el('span', { class: 'v' }, fmtEur(tItems + tWorks))),
  ));
  body.append(el('p', { class: 'note' }, 'Il totale è una stima per confrontare le varianti: IVA, progettazione, pratiche e impianti non disegnati sono esclusi.'));
}

// ---------- project tab ----------
function renderProjectTab(body) {
  const p = S.project;
  body.append(el('h2', { class: 'ptitle' }, 'Progetto'));
  body.append(field('Nome', textInput(p.name, (v) => { if (!v) return; upd(() => { p.name = v; }); $('#projName').textContent = v; })));
  body.append(field('Note', (() => { const ta = el('textarea', { class: 'inp', rows: '2', id: 'f' + (++_fid) }, p.note || ''); ta.addEventListener('change', () => upd(() => { p.note = ta.value; })); return ta; })()));
  body.append(el('div', { class: 'grid2' }, field('Altezza muri', numInput(p.settings.wallH, (v) => upd(() => { p.settings.wallH = clamp(v, 2, 5); }))), el('div')));
  const vis = el('div', { class: 'sec' }, el('div', { class: 'sec-title' }, 'Visualizzazione'));
  vis.append(el('div', { class: 'row' },
    chip('Griglia', p.settings.grid, () => { p.settings.grid = !p.settings.grid; markDirty(); refreshPanel(true); requestRender(); }),
    chip('Lunghezze muri', p.settings.autoDims, () => { p.settings.autoDims = !p.settings.autoDims; markDirty(); refreshPanel(true); requestRender(); }),
    chip('Zone di lavoro', S.view3d.zones, () => { S.view3d.zones = !S.view3d.zones; schedule3D(); refreshPanel(true); requestRender(); refreshHud3D(); }),
    chip('Planimetria di sfondo', p.settings.showBg, () => { p.settings.showBg = !p.settings.showBg; markDirty(); refreshPanel(true); requestRender(); }),
  ));
  vis.append(el('div', { class: 'legend' }, el('span', {}, el('i', { style: { background: PAL.wall } }), 'Esistente'), el('span', {}, el('i', { style: { background: PAL.demo } }), 'Da demolire'), el('span', {}, el('i', { style: { background: PAL.new } }), 'Nuovo'), el('span', {}, el('i', { style: { background: PAL['wall-light'] } }), 'Cartongesso')));
  body.append(vis);
  const bgs = el('div', { class: 'sec' }, el('div', { class: 'sec-title' }, 'Planimetria e scala'));
  bgs.append(el('div', { class: 'row' },
    el('button', { class: 'btn small', type: 'button', onclick: () => { setTool('bg'); } }, icon('image', 16), p.bg ? 'Gestisci sfondo' : 'Carica planimetria'),
    el('button', { class: 'btn small', type: 'button', onclick: () => setTool('calibrate') }, icon('calibrate', 16), 'Calibra scala'),
  ));
  if (p.note) bgs.append(el('p', { class: 'note' }, p.note));
  body.append(bgs);
  renderSyncSection(body);
  const io = el('div', { class: 'sec' }, el('div', { class: 'sec-title' }, 'File e varianti'));
  io.append(el('div', { class: 'row' },
    el('button', { class: 'btn small', type: 'button', onclick: () => duplicateProject() }, icon('copy', 16), 'Duplica come variante'),
    el('button', { class: 'btn small', type: 'button', onclick: () => exportJSON() }, icon('download', 16), 'Esporta file progetto'),
    el('button', { class: 'btn small', type: 'button', onclick: () => $('#fileJson').click() }, 'Importa file progetto'),
  ));
  io.append(el('p', { class: 'note' }, Store.label() + '.'));
  body.append(io);
}

// ---------- 3D HUD ----------
function refreshHud3D() {
  const h = $('#hud3d'); h.innerHTML = ''; const hb = $('#hud3dBottom'); hb.innerHTML = '';
  if (S.view === '3d') {
    h.append(optGroup(null, chip([el('span', { html: icon('iso', 16) }), 'Prospettiva'], false, () => View3D.preset('iso')), chip([el('span', { html: icon('top', 16) }), 'Dall\'alto'], false, () => View3D.preset('top')), chip([el('span', { html: icon('side', 16) }), 'Frontale'], false, () => View3D.preset('front'))));
    h.append(optGroup('Muri', chip('Pieni', S.view3d.walls === 'full', () => { S.view3d.walls = 'full'; schedule3D(); refreshHud3D(); }), chip('Tagliati a 1,15 m', S.view3d.walls === 'cut', () => { S.view3d.walls = 'cut'; schedule3D(); refreshHud3D(); })));
    h.append(optGroup('Qualità', ...Object.entries(QUALITY).map(([k, q]) => chip(q.label, View3D.q === k, () => { View3D.setQuality(k); refreshHud3D(); }))));
    h.append(optGroup(null, chip('Zone di lavoro', S.view3d.zones, () => { S.view3d.zones = !S.view3d.zones; schedule3D(); refreshHud3D(); }), chip('Impianti', S.view3d.utilities, () => { S.view3d.utilities = !S.view3d.utilities; schedule3D(); refreshHud3D(); }), chip('Ombre', S.view3d.shadows, () => { S.view3d.shadows = !S.view3d.shadows; schedule3D(); refreshHud3D(); })));
    hb.append(el('div', { class: 'hint' }, 'Trascina per ruotare · pizzica o scorri per lo zoom · due dita (o ⇧ + trascina) per spostarti · tocca un arredo per selezionarlo e trascinalo'));
  }
  if (S.view === 'walk') {
    const wt = $('#walkTop'); wt.innerHTML = '';
    wt.append(optGroup('Altezza occhi', chip('In piedi 1,65 m', S.walk.eye === 1.65, () => { S.walk.eye = 1.65; refreshHud3D(); }), chip('Seduto 1,20 m', S.walk.eye === 1.2, () => { S.walk.eye = 1.2; refreshHud3D(); })));
    wt.append(el('button', { class: 'btn small', type: 'button', onclick: () => setView('3d') }, icon('cube', 16), 'Torna al 3D'));
  }
}

// ---------- views & phase ----------
async function setView(v) {
  if (v !== '2d') { const ok = await View3D.ensure(); if (!ok) { if (S.view === '2d') return; v = '2d'; } }
  const prev = S.view; S.view = v;
  $$('#viewSeg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === v)));
  $('#plan').hidden = v !== '2d'; $('#zoomCtl').hidden = v !== '2d'; $('#toolOpts').hidden = v !== '2d';
  $('#view3d').hidden = v === '2d'; $('#hud3d').hidden = v !== '3d'; $('#hud3dBottom').hidden = v !== '3d'; $('#walkHud').hidden = v !== 'walk';
  $('#main').classList.toggle('no-rail', v !== '2d');
  if (v !== '2d') {
    if (S.tool !== 'select') setTool('select'); S.placing = null;
    View3D.resize(); View3D.dirty = true;
    View3D.controls.enabled = v === '3d';
    try {
      if (v === '3d' && !View3D._presetDone) { View3D.rebuild(); View3D.preset('iso'); View3D._presetDone = true; }
      if (v === '3d' && prev === 'walk') { View3D.controls.update(); }
      if (v === 'walk') { View3D.rebuild(); View3D.enterWalk(); setTimeout(drawMinimap, 50); }
    } catch (e) { console.error(e); View3D.failed = true; show3DError('Si è verificato un errore mentre costruivo la scena 3D.', e); }
    $('#joystick').hidden = false;
  } else { setTimeout(() => Plan.resize(), 0); }
  refreshToolOpts(); refreshHud3D(); refreshPanel(); requestRender();
  try { localStorage.setItem('ps-view', v === 'walk' ? '3d' : v); } catch { }
}
function setPhase(ph) {
  if (!S.project) return; S.project.settings.phase = ph; invalidateRooms();
  $$('#phaseSeg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.phase === ph)));
  markDirty(); schedule3D(); refreshPanel(); refreshToolOpts(); requestRender();
}
function updateUndoButtons() { $('#undoBtn').disabled = !S.undo.length; $('#redoBtn').disabled = !S.redo.length; }

// ---------- sheets ----------
function openSheet(build) {
  const back = $('#sheetBack'), sh = $('#sheet'); sh.innerHTML = ''; build(sh); hydrateIcons(sh); back.hidden = false;
  const f = sh.querySelector('input,button'); if (f) setTimeout(() => f.focus(), 30);
}
function closeSheet() { $('#sheetBack').hidden = true; $('#sheet').innerHTML = ''; }
function sheetHead(title, sub) { return el('div', { class: 'sheet-head' }, el('div', {}, el('h3', {}, title), sub ? el('p', { style: { marginTop: '4px' } }, sub) : null), el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Chiudi', onclick: closeSheet, html: icon('close') })); }
function chooseSheet(title, text, options) {
  return new Promise((resolve) => {
    let done = false; const finish = (v) => { if (done) return; done = true; closeSheet(); resolve(v); };
    openSheet((sh) => {
      sh.append(el('div', { class: 'sheet-head' }, el('div', {}, el('h3', {}, title), text ? el('p', { style: { marginTop: '4px' } }, text) : null), el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Annulla', onclick: () => finish(null), html: icon('close') })));
      sh.append(el('div', { class: 'proj-list' }, ...options.map(([v, label, sub, primary]) => el('button', { class: 'proj-item', type: 'button', style: { textAlign: 'left', cursor: 'pointer', width: '100%', borderColor: primary ? 'var(--accent)' : undefined }, onclick: () => finish(v) }, el('div', {}, el('div', { class: 'nm' }, label), sub ? el('div', { class: 'meta' }, sub) : null), el('span', { html: icon('check') })))));
    });
    const back = $('#sheetBack'); const obs = new MutationObserver(() => { if (back.hidden) { obs.disconnect(); finish(null); } }); obs.observe(back, { attributes: true, attributeFilter: ['hidden'] });
  });
}
function confirmSheet(title, text, label, onOk) {
  openSheet((sh) => { sh.append(sheetHead(title), el('p', {}, text), el('div', { class: 'row', style: { justifyContent: 'flex-end' } }, el('button', { class: 'btn', type: 'button', onclick: closeSheet }, 'Annulla'), el('button', { class: 'btn primary', type: 'button', onclick: () => { closeSheet(); onOk(); } }, label))); });
}
function openCalibrate(a, b) {
  const meas = V.dist(a, b); const p = S.project; const hasGeom = p.walls.length > 0;
  let scope = hasGeom ? 'all' : 'bg';
  openSheet((sh) => {
    const inp = el('input', { class: 'inp', id: 'calInput', type: 'text', inputmode: 'decimal', placeholder: 'es. 3,40' });
    const pick = () => el('div', { class: 'seg-sm' }, el('button', { type: 'button', 'aria-pressed': String(scope === 'all'), onclick: (e) => { scope = 'all'; e.currentTarget.parentNode.replaceWith(pick()); } }, 'Tutto il progetto'), el('button', { type: 'button', 'aria-pressed': String(scope === 'bg'), onclick: (e) => { scope = 'bg'; e.currentTarget.parentNode.replaceWith(pick()); } }, 'Solo la planimetria di sfondo'));
    const go = () => {
      const real = parseNum(inp.value); if (!isFinite(real) || real <= 0) { toast('Scrivi la distanza reale in metri'); return; }
      const f = real / meas; closeSheet();
      commit((pp) => {
        const sc = (q) => { q.x = a.x + (q.x - a.x) * f; q.y = a.y + (q.y - a.y) * f; };
        if (pp.bg) { pp.bg.x = a.x + (pp.bg.x - a.x) * f; pp.bg.y = a.y + (pp.bg.y - a.y) * f; pp.bg.mpp *= f; }
        if (scope === 'all') {
          for (const w of pp.walls) { sc(w.a); sc(w.b); w.t = Math.round(w.t * f * 1000) / 1000; }
          for (const o of pp.openings) o.w = Math.round(o.w * f * 1000) / 1000;
          for (const it of pp.items) { sc(it); if (it.type === 'pilastro' || it.type === 'termosifone') { const d = dimsOf(it); it.dims = { ...(it.dims || {}), w: d.w * f, d: it.type === 'pilastro' ? d.d * f : d.d }; } }
          for (const r of pp.rooms) sc(r.seed);
          for (const pq of pp.pipes) pq.pts.forEach(sc);
          for (const dm of pp.dims) { sc(dm.a); sc(dm.b); }
        }
        if (pp.note && /stimata|ricalibr/i.test(pp.note)) pp.note = `Scala calibrata il ${new Date().toLocaleDateString('it-IT')}.`;
      });
      setTool('select'); Plan.fit(); toast(`Scala aggiornata: fattore ${nf2.format(f)}`);
    };
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); e.stopPropagation(); });
    sh.append(sheetHead('Calibra la scala', `La distanza misurata sul disegno è ${fmtM(meas)}. Qual è la distanza reale?`),
      field('Distanza reale (m)', inp),
      p.bg && hasGeom ? field('Cosa ridimensionare', pick()) : null,
      el('p', { class: 'note' }, 'Ridimensionando tutto il progetto si scalano muri, aperture, posizioni degli arredi e lo sfondo. Le dimensioni degli arredi restano invariate.'),
      el('div', { class: 'row', style: { justifyContent: 'flex-end' } }, el('button', { class: 'btn', type: 'button', onclick: closeSheet }, 'Annulla'), el('button', { class: 'btn primary', type: 'button', onclick: go }, 'Applica')));
    setTimeout(() => inp.focus(), 50);
  });
}
async function openProjects() {
  try { S.projects = await Store.list(); } catch (e) { console.warn(e); }
  openSheet((sh) => {
    sh.append(sheetHead('Progetti', Store.label() + '.'));
    const list = el('div', { class: 'proj-list' });
    const rows = [...S.projects].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    if (S.project && S.project._unsaved && !rows.find((r) => r.id === S.project.id)) rows.unshift({ id: S.project.id, name: S.project.name, updatedAt: null, unsaved: true });
    for (const r of rows) {
      const cur = S.project && r.id === S.project.id;
      const acts = el('div', { class: 'acts' });
      if (!cur) acts.append(el('button', { class: 'btn small', type: 'button', onclick: async () => { closeSheet(); await openProjectById(r.id); } }, 'Apri'));
      acts.append(el('button', { class: 'btn small', type: 'button', onclick: async () => { closeSheet(); if (!cur) await openProjectById(r.id); duplicateProject(); } }, 'Duplica'));
      if (!r.unsaved) acts.append(el('button', { class: 'btn small danger', type: 'button', onclick: () => confirmSheet(`Eliminare “${r.name}”?`, 'Il progetto viene cancellato in modo definitivo.', 'Elimina', async () => { await Store.remove(r.id); S.projects = S.projects.filter((x) => x.id !== r.id); if (cur) { const next = S.projects[0]; if (next) await openProjectById(next.id); else openFallback(); } toast('Progetto eliminato'); }) }, 'Elimina'));
      list.append(el('div', { class: 'proj-item' + (cur ? ' current' : '') }, el('div', {}, el('div', { class: 'nm' }, r.name, cur ? el('span', { class: 'tag' }, 'aperto') : null), el('div', { class: 'meta' }, r.unsaved ? 'Non ancora salvato: si salva alla prima modifica' : 'Modificato ' + fmtDate(r.updatedAt))), acts));
    }
    sh.append(list);
    sh.append(el('div', { class: 'sec-title' }, 'Nuovo progetto'));
    sh.append(el('div', { class: 'row' },
      ...SEEDS.templates.map((t) => el('button', { class: 'btn small', type: 'button', onclick: () => { closeSheet(); openTemplate(t.id, true); } }, t.name)),
      el('button', { class: 'btn small', type: 'button', onclick: () => { closeSheet(); newEmptyProject(true); } }, 'Da planimetria'),
      el('button', { class: 'btn small', type: 'button', onclick: () => { closeSheet(); newEmptyProject(false); } }, 'Vuoto'),
      el('button', { class: 'btn small', type: 'button', onclick: () => { closeSheet(); $('#fileJson').click(); } }, 'Importa file progetto'),
    ));
    sh.append(el('p', { class: 'note' }, 'Per confrontare idee diverse sullo stesso locale usa “Duplica”: ogni variante ha il suo budget e le sue stanze.'));
  });
}
function openHelp() {
  openSheet((sh) => {
    const rows = [['V', 'Seleziona e sposta'], ['W', 'Muro (scrivi la lunghezza e premi Invio)'], ['D / F', 'Porta / Finestra'], ['R', 'Stanza (calcola i m²)'], ['M', 'Quota'], ['T', 'Tubazione'], ['C', 'Calibra la scala'], ['B', 'Planimetria di sfondo'], ['1 · 2 · 3', 'Pianta · 3D · Passeggiata'], ['⌫', 'Elimina o segna da demolire'], ['⌘D', 'Duplica arredo'], ['[ ]', 'Ruota di 15°'], ['Frecce', 'Sposta di 1 cm (⇧ 10 cm)'], ['⌘Z · ⇧⌘Z', 'Annulla · Ripeti'], ['Esc', 'Annulla l\'azione in corso'], ['Spazio + trascina', 'Sposta la vista']];
    sh.append(sheetHead('Comandi', 'Su iPad: un dito per disegnare e spostare, due dita per zoom e spostamento della vista. Apple Pencil funziona come il dito.'));
    sh.append(el('div', { class: 'help-grid' }, ...rows.flatMap(([k, v]) => [el('kbd', {}, k), el('span', {}, v)])));
    sh.append(el('p', { class: 'note' }, 'Passeggiata: WASD o frecce per muoverti, trascina per guardarti intorno; su iPad usa il joystick in basso a sinistra e tocca la mappa per spostarti.'));
  });
}

// ===================== export / import =====================
const JSPDF_URL = BUILD === 'github' ? 'vendor/jspdf.umd.min.js' : 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
const PDFJS_URL = BUILD === 'github' ? 'vendor/pdf.min.js' : 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER_URL = BUILD === 'github' ? new URL('vendor/pdf.worker.min.js', document.baseURI).href : 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
const safeName = (s) => (s || 'progetto').replace(/[^\p{L}\p{N} _.-]+/gu, '').replace(/\s+/g, ' ').trim().slice(0, 80) || 'progetto';

function withLightPalette(fn) {
  const saved = { ...PAL }; Object.assign(PAL, LIGHT_PAL);
  try { return fn(); } finally { Object.assign(PAL, saved); }
}
function planCanvas(Wpx, Hpx, scale, b, k, extra = {}) {
  const cv = document.createElement('canvas'); cv.width = Math.round(Wpx); cv.height = Math.round(Hpx);
  const g = cv.getContext('2d');
  const ox = Wpx / 2 - (b.x0 + b.x1) / 2 * scale, oy = Hpx / 2 - (b.y0 + b.y1) / 2 * scale;
  withLightPalette(() => renderPlan(g, { scale, ox, oy, W: Wpx, H: Hpx }, { export: true, k, zones: S.view3d.zones, ...extra }));
  return cv;
}
function exportBounds() { const b = Plan.bounds(); const m = .8; return { x0: b.x0 - m, y0: b.y0 - m, x1: b.x1 + m, y1: b.y1 + m }; }

function openExport() {
  let paper = 'a3', with3d = View3D.ready;
  openSheet((sh) => {
    const paperPick = () => segPick([['a4', 'A4'], ['a3', 'A3']], paper, (v) => { paper = v; sh.querySelector('#paperPick').replaceChildren(paperPick()); });
    const box3d = () => segPick([[true, 'Sì'], [false, 'No']], with3d, (v) => { with3d = v; sh.querySelector('#pick3d').replaceChildren(box3d()); });
    sh.append(sheetHead('Esporta', `Fase: ${PHASES[phase()]}. Cambia fase in alto per esportare stato di fatto, gialli e rossi o progetto.`));
    sh.append(el('div', { class: 'sec' }, el('div', { class: 'sec-title' }, 'PDF della pianta'),
      el('p', { class: 'note' }, 'Pianta quotata in scala con stanze e superfici, legenda, elenco attrezzature, quantità dei lavori e budget.'),
      el('div', { class: 'grid2' }, field('Formato', el('div', { id: 'paperPick' }, paperPick())), View3D.ready ? field('Aggiungi la vista 3D attuale', el('div', { id: 'pick3d' }, box3d())) : el('div')),
      el('button', { class: 'btn primary', type: 'button', onclick: async () => { closeSheet(); await exportPDF(paper, with3d && View3D.ready); } }, icon('download', 16), 'Crea PDF')));
    sh.append(el('div', { class: 'sec' }, el('div', { class: 'sec-title' }, 'Immagine PNG'),
      el('p', { class: 'note' }, S.view === '2d' ? 'Pianta ad alta risoluzione su fondo bianco.' : 'La vista 3D così come la vedi ora, ad alta risoluzione.'),
      el('button', { class: 'btn', type: 'button', onclick: async () => { closeSheet(); await exportPNG(); } }, icon('camera', 16), S.view === '2d' ? 'Esporta la pianta' : 'Esporta la vista 3D')));
    sh.append(el('div', { class: 'sec' }, el('div', { class: 'sec-title' }, 'Per l\'architetto e la realtà aumentata'),
      el('p', { class: 'note' }, 'DXF: pianta in metri con layer separati (muri esistenti, da demolire, nuovi, aperture, attrezzature, impianti, stanze) da aprire in AutoCAD o simili. USDZ: modello 3D da aprire su iPad o iPhone per vedere lo studio in scala reale con la realtà aumentata.'),
      el('div', { class: 'row' },
        el('button', { class: 'btn', type: 'button', onclick: async () => { closeSheet(); await downloadDXF(); } }, icon('download', 16), 'Esporta DXF'),
        el('button', { class: 'btn', type: 'button', onclick: async () => { closeSheet(); await exportUSDZ(); } }, icon('cube', 16), 'Esporta USDZ (AR)'))));
    sh.append(el('div', { class: 'sec' }, el('div', { class: 'sec-title' }, 'File progetto'),
      el('p', { class: 'note' }, 'Copia completa e modificabile, sfondo incluso: utile come backup o per aprirla su un altro dispositivo.'),
      el('button', { class: 'btn', type: 'button', onclick: async () => { closeSheet(); await exportJSON(); } }, icon('download', 16), 'Esporta .json')));
  });
}

async function exportPNG() {
  if (S.view === '2d') {
    const b = exportBounds(); const maxPx = 3600; const scale = Math.min(maxPx / (b.x1 - b.x0), maxPx / (b.y1 - b.y0), 260);
    const cv = planCanvas((b.x1 - b.x0) * scale, (b.y1 - b.y0) * scale, scale, b, clamp(scale / 60, 1.4, 3.2));
    const blob = await new Promise((r) => cv.toBlob(r, 'image/png'));
    await offerFile(safeName(S.project.name) + ' - pianta.png', blob);
  } else {
    const url = await View3D.snapshotPNG(2.5); const blob = dataUrlToBlob(url);
    await offerFile(safeName(S.project.name) + ' - vista 3D.png', blob);
  }
}

async function exportJSON() {
  const p = S.project; const out = { format: 'planner-studio-dentistico', version: 1, exportedAt: new Date().toISOString(), project: JSON.parse(Store.serialize(p)) };
  if (p.bg && p.bg.src && p.bg.src.startsWith('img:')) out.bgData = S.bgData.get(p.bg.src) || null;
  await offerFile(safeName(p.name) + '.json', new Blob([JSON.stringify(out)], { type: 'application/json' }));
}
async function importJSONFile(file) {
  try {
    const txt = await file.text(); const data = JSON.parse(txt);
    const proj = data.project || data; if (!proj.walls) throw new Error('Il file non contiene un progetto');
    const p = normalizeProject(deepClone(proj)); p.origin = proj.origin || proj.id; p.id = uid('p'); p.name = p.name || 'Progetto importato';
    let list = []; try { list = await Store.list(); } catch { }
    const same = list.find((x) => x.origin && x.origin === p.origin) || list.find((x) => x.name === p.name);
    if (same) {
      const choice = await chooseSheet(`“${p.name}” è già tra i tuoi progetti`, 'Scegli cosa fare con il file che stai importando.', [
        data.bgData ? ['bg', 'Aggiorna solo la planimetria di sfondo', 'Muri, arredi e misure restano come li hai lasciati.', true] : null,
        ['replace', 'Sostituisci tutto il progetto', 'Il progetto esistente viene sovrascritto con quello del file.'],
        ['new', 'Aggiungi come nuovo progetto', 'Tieni entrambi: quello importato avrà “(importato)” nel nome.'],
      ].filter(Boolean));
      if (!choice) return;
      if (choice === 'bg') { await replaceBackground(same.id, p, data.bgData); return; }
      if (choice === 'replace') { p.id = same.id; S.bgData.delete('img:' + same.id); S.bgImages.delete('img:' + same.id); }
      else p.name += ' (importato)';
    }
    if (data.bgData && p.bg) { p.bg.src = 'img:' + p.id; const img = await loadImg(data.bgData); const c = await imageToDataUrl(img, Store.maxBgChars()); p.bg.mpp *= (p.bg.w / c.w); p.bg.w = c.w; p.bg.h = c.h; S.bgData.set(p.bg.src, c.url); S.bgImages.delete(p.bg.src); p._bgDirty = true; }
    else if (p.bg && p.bg.src && p.bg.src.startsWith('img:')) p.bg = null;
    await openProject(p); await saveNow(p, true); toast(same ? 'Progetto aggiornato' : 'Progetto importato');
  } catch (e) { console.error(e); toast('Importazione non riuscita: ' + e.message, 4000); }
}
// swap the background image of a saved project, keeping its walls, items and calibration
async function replaceBackground(pid, incoming, bgData) {
  const p = S.project && S.project.id === pid ? S.project : await Store.load(pid);
  if (!p) throw new Error('Progetto non trovato');
  const img = await loadImg(bgData); const c = await imageToDataUrl(img, Store.maxBgChars());
  const src = 'img:' + p.id;
  if (p.bg) { const k = p.bg.w / c.w; p.bg = { ...p.bg, src, mpp: p.bg.mpp * k, w: c.w, h: c.h }; }
  else { p.bg = { ...incoming.bg, src, mpp: incoming.bg.mpp * (incoming.bg.w / c.w), w: c.w, h: c.h }; }
  p.origin = p.origin || incoming.origin;
  S.bgData.set(src, c.url); S.bgImages.delete(src); p._bgDirty = true; p._dirty = true;
  if (S.project !== p) await openProject(p); else { requestRender(); refreshPanel(true); }
  await saveNow(p, true); toast('Planimetria di sfondo aggiornata');
}
function dataUrlToBlob(u) { const [h, b64] = u.split(','); const mime = (h.match(/data:([^;]+)/) || [])[1] || 'application/octet-stream'; const bin = atob(b64); const a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return new Blob([a], { type: mime }); }
function loadImg(url) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Immagine non leggibile')); i.src = url; }); }

async function exportPDF(paper = 'a3', with3d = false) {
  toast('Preparo il PDF…', 6000);
  try { await loadScript(JSPDF_URL); } catch (e) { toast('Non riesco a caricare il generatore PDF: controlla la connessione', 4000); return; }
  const { jsPDF } = window.jspdf; const p = S.project; const ph = phase();
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: paper, compress: true });
  // standard PDF fonts lack '²': write square metres the Italian way
  const _text = doc.text.bind(doc); const fix = (v) => (Array.isArray(v) ? v.map(fix) : typeof v === 'string' ? v.replace(/m²/g, 'mq').replace(/²/g, '2') : v);
  doc.text = (t, ...a) => _text(fix(t), ...a); const _split = doc.splitTextToSize.bind(doc); doc.splitTextToSize = (t, ...a) => _split(fix(t), ...a);
  const PW = doc.internal.pageSize.getWidth(), PH = doc.internal.pageSize.getHeight();
  const M = 10, side = paper === 'a3' ? 92 : 74; const areaW = PW - M * 2 - side - 6, areaH = PH - M * 2;
  const b = exportBounds(); const bw = b.x1 - b.x0, bh = b.y1 - b.y0;
  const dens = [20, 25, 50, 75, 100, 125, 150, 200, 250, 500]; let den = dens.find((d) => bw * 1000 / d <= areaW && bh * 1000 / d <= areaH) || 500;
  const mmPerM = 1000 / den; const pxPerMm = 8; const scale = mmPerM * pxPerMm;
  const cv = planCanvas(areaW * pxPerMm, areaH * pxPerMm, scale, b, 1.9);
  doc.addImage(cv.toDataURL('image/png'), 'PNG', M, M, areaW, areaH, undefined, 'FAST');
  doc.setDrawColor(200, 207, 206); doc.setLineWidth(.2); doc.rect(M, M, areaW, areaH);
  // title block
  const X = PW - M - side; let y = M + 2;
  const txt = (s, size = 9, style = 'normal', color = [27, 36, 39], opts = {}) => { doc.setFont('helvetica', style); doc.setFontSize(size); doc.setTextColor(...color); const lines = doc.splitTextToSize(String(s), side); doc.text(lines, X, y, opts); y += lines.length * size * .42 + 1.2; };
  doc.setFillColor(14, 107, 112); doc.rect(X, M, side, 1.6, 'F'); y += 3;
  txt('PLANIMETRIA · ' + PHASES[ph].toUpperCase(), 7.5, 'bold', [114, 130, 135]);
  txt(p.name, 15, 'bold'); y += 1;
  txt(`Scala 1:${den} se stampata al 100% su ${paper.toUpperCase()} orizzontale`, 8.5, 'normal', [70, 85, 90]);
  txt(new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' }), 8.5, 'normal', [70, 85, 90]);
  if (p.note) txt(p.note, 7.5, 'italic', [114, 130, 135]);
  y += 2;
  // legend
  txt('LEGENDA', 7.5, 'bold', [114, 130, 135]);
  const leg = [[[40, 49, 52], 'Muratura esistente'], [[141, 152, 155], 'Cartongesso'], [[221, 164, 0], 'Da demolire'], [[204, 58, 43], 'Nuove opere']];
  for (const [c, l] of leg) { doc.setFillColor(...c); doc.rect(X, y - 2.4, 6, 2.8, 'F'); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(27, 36, 39); doc.text(l, X + 8, y); y += 4.2; }
  if (S.view3d.zones && p.items.some((it) => it.type === 'riunito')) { doc.setFontSize(7.5); doc.setTextColor(114, 130, 135); const l = doc.splitTextToSize('Settori attorno ai riuniti: zone operatore, statica, assistente e trasferimento (schema a orologio).', side); doc.text(l, X, y); y += l.length * 3.2 + 1; }
  y += 2;
  // rooms table
  const rr = computeRooms(ph); let tot = 0;
  txt('STANZE', 7.5, 'bold', [114, 130, 135]);
  doc.setFontSize(8.5);
  for (const r of p.rooms) {
    const st = rr.rooms.get(r.id); if (!st || st.open || st.shared) continue; tot += st.area;
    if (y > PH - M - 18) break;
    doc.setFont('helvetica', 'normal'); doc.setTextColor(27, 36, 39); doc.text(doc.splitTextToSize(r.name, side - 24)[0], X, y); doc.text(fmtA(st.area), X + side, y, { align: 'right' }); y += 4;
  }
  doc.setDrawColor(200, 207, 206); doc.line(X, y - 2.6, X + side, y - 2.6);
  doc.setFont('helvetica', 'bold'); doc.text('Totale calpestabile', X, y + 1); doc.text(fmtA(tot), X + side, y + 1, { align: 'right' }); y += 7;
  // scale bar in mm
  const barM = den <= 50 ? 2 : den <= 100 ? 5 : 10; const barMm = barM * mmPerM;
  const by = PH - M - 4; doc.setFillColor(27, 36, 39);
  for (let i = 0; i < barM; i++) { if (i % 2 === 0) doc.rect(X + i * mmPerM, by, mmPerM, 1.6, 'F'); }
  doc.setDrawColor(27, 36, 39); doc.setLineWidth(.2); doc.rect(X, by, barMm, 1.6);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.text('0', X, by - 1.2); doc.text(barM + ' m', X + barMm, by - 1.2, { align: 'right' });

  // ---- page 2: list & budget ----
  doc.addPage(paper, 'landscape'); y = M + 4;
  const colX = [M, M + 92, M + 150, M + 205, PW - M];
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(27, 36, 39); doc.text('Attrezzature, arredi e budget', M, y); y += 6;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(114, 130, 135); doc.text(`${p.name} · ${PHASES[ph]} · prezzi inseriti dall'utente, IVA esclusa`, M, y); y += 7;
  const head = (cols) => { doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(114, 130, 135); cols.forEach((c, i) => doc.text(c, i === cols.length - 1 ? colX[4] : colX[i], y, i === cols.length - 1 ? { align: 'right' } : undefined)); y += 1.8; doc.setDrawColor(200, 207, 206); doc.line(M, y, PW - M, y); y += 4; };
  const row = (cols, bold = false) => {
    if (y > PH - M - 8) { doc.addPage(paper, 'landscape'); y = M + 6; }
    doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(8.5); doc.setTextColor(27, 36, 39);
    cols.forEach((c, i) => { const last = i === cols.length - 1; const w = last ? 40 : (colX[i + 1] - colX[i] - 3); const s = doc.splitTextToSize(String(c ?? ''), w)[0] || ''; doc.text(s, last ? colX[4] : colX[i], y, last ? { align: 'right' } : undefined); });
    y += 4.6;
  };
  const visItems = p.items.filter((it) => itemVisible(it, ph) && !catOf(it).utility && it.type !== 'pilastro');
  head(['Elemento', 'Dimensioni (cm)', 'Stanza', 'Fase', 'Prezzo']);
  let tItems = 0;
  const order = (it) => CATS.indexOf(catOf(it).cat);
  for (const it of [...visItems].sort((a, b2) => order(a) - order(b2))) {
    const d = dimsOf(it); const room = roomAtPoint(it, ph);
    const price = it.phase === 'nuovo' && it.price ? it.price : null; if (price) tItems += price;
    row([it.label || catOf(it).name, `${Math.round(d.w * 100)} × ${Math.round(d.d * 100)} × h ${Math.round(d.h * 100)}`, room ? room.name : '—', { esistente: 'Esistente', nuovo: 'Nuovo', rimosso: 'Da rimuovere' }[it.phase || 'esistente'], price ? fmtEur(price) : '—']);
  }
  y += 3;
  const q = quantities(); const pr = p.settings.prices; let tWorks = 0;
  const works = [];
  if (q.nuoveCart > .01) works.push(['cartongesso', 'Pareti in cartongesso', q.nuoveCart, 'm²']);
  if (q.nuoveMur > .01) works.push(['muratura', 'Pareti in muratura', q.nuoveMur, 'm²']);
  if (q.demol > .01) works.push(['demolizione', 'Demolizioni', q.demol, 'm²']);
  if (q.tamp > .01) works.push(['tamponamento', 'Chiusura aperture', q.tamp, 'm²']);
  if (q.nuoveAperture) works.push(['apertura', 'Nuove aperture in muri esistenti', q.nuoveAperture, 'cad.']);
  for (const [k, L] of Object.entries(q.pipes)) works.push(['tubo_' + k, 'Linea ' + PIPE_KINDS[k][0].toLowerCase(), L, 'm']);
  for (const [k, A] of Object.entries(q.floors)) works.push(['pav_' + k, 'Pavimento ' + FLOORS[k].name.toLowerCase(), A, 'm²']);
  if (works.length) {
    head(['Lavori', 'Quantità', 'Prezzo unitario', '', 'Importo']);
    for (const [k, l, qty, u] of works) { const up = pr[k]; const sub = up ? up * qty : 0; tWorks += sub; row([l, `${u === 'cad.' ? qty : nf2.format(qty)} ${u}`, up ? fmtEur(up) + '/' + u : '—', '', up ? fmtEur(sub) : '—']); }
    y += 3;
  }
  doc.setDrawColor(14, 107, 112); doc.setLineWidth(.4); doc.line(M, y - 3, PW - M, y - 3);
  row(['Arredi e attrezzature nuove', '', '', '', fmtEur(tItems)]); row(['Lavori', '', '', '', fmtEur(tWorks)]); row(['Totale stimato', '', '', '', fmtEur(tItems + tWorks)], true);
  const conf = zoneConflicts(ph);
  if (conf.length) { y += 4; doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(191, 54, 40); doc.text('Ingombri nelle zone di lavoro dei riuniti', M, y); y += 5; doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); for (const c of conf) row([`${c.name}: zona ${ZONE_LABEL[c.zone].toLowerCase()}`, '', '', '', '']); }
  // ---- page 3: 3D ----
  if (with3d) {
    try {
      const url = await View3D.snapshotPNG(2); const img = await loadImg(url);
      doc.addPage(paper, 'landscape'); doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(27, 36, 39); doc.text('Vista 3D', M, M + 4);
      const r = Math.min((PW - M * 2) / img.width, (PH - M * 2 - 10) / img.height); const w = img.width * r, h = img.height * r;
      doc.addImage(url, 'PNG', (PW - w) / 2, M + 10, w, h, undefined, 'FAST');
    } catch (e) { console.warn(e); }
  }
  const blob = doc.output('blob');
  await offerFile(`${safeName(p.name)} - ${PHASES[ph].toLowerCase()}.pdf`, blob);
}

// ---------- background loading ----------
async function loadBackgroundFile(file) {
  const p = S.project; if (!file) return;
  toast('Carico la planimetria…', 4000);
  try {
    let img;
    if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
      await loadScript(PDFJS_URL);
      const lib = window.pdfjsLib; lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
      const pdf = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise;
      const page = await pdf.getPage(1); const vp0 = page.getViewport({ scale: 1 });
      const sc = 2600 / Math.max(vp0.width, vp0.height); const vp = page.getViewport({ scale: sc });
      const cv = document.createElement('canvas'); cv.width = Math.round(vp.width); cv.height = Math.round(vp.height);
      const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height);
      await page.render({ canvasContext: g, viewport: vp }).promise;
      img = await loadImg(cv.toDataURL('image/png'));
    } else {
      const url = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = () => rej(fr.error); fr.readAsDataURL(file); });
      img = await loadImg(url);
    }
    const c = await imageToDataUrl(img, Store.maxBgChars());
    const src = 'img:' + p.id; S.bgData.set(src, c.url); S.bgImages.delete(src);
    const keepScale = p.bg && p.bg.src === src;
    commit((pp) => {
      const worldW = 14; // initial guess: 14 m wide, then calibrate
      const mpp = worldW / c.w;
      const b = Plan.bounds(); const cx = pp.walls.length ? (b.x0 + b.x1) / 2 : Plan.s2w(Plan.W / 2, Plan.H / 2).x, cy = pp.walls.length ? (b.y0 + b.y1) / 2 : Plan.s2w(Plan.W / 2, Plan.H / 2).y;
      pp.bg = { src, x: cx - c.w * mpp / 2, y: cy - c.h * mpp / 2, mpp, w: c.w, h: c.h, rot: 0 };
      pp.settings.showBg = true;
    });
    p._bgDirty = true; markDirty();
    if (!p.walls.length) Plan.fit();
    setTool('calibrate'); toast('Ora calibra la scala: tocca i due estremi di una misura nota', 5000);
  } catch (e) { console.error(e); toast('Non riesco a leggere il file: ' + (e.message || 'formato non supportato'), 5000); }
}

// ===================== DXF / USDZ export and a tiny zip writer =====================
const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(u8) { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC_T[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function makeZip(files) { // stored (no compression), enough for one or two files
  const enc = new TextEncoder(); const parts = []; const central = []; let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name); const data = f.data; const crc = crc32(data);
    const h = new DataView(new ArrayBuffer(30)); h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
    h.setUint16(10, 0, true); h.setUint16(12, 0x21, true); h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
    parts.push(new Uint8Array(h.buffer), name, data);
    const c = new DataView(new ArrayBuffer(46)); c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
    c.setUint16(12, 0, true); c.setUint16(14, 0x21, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, name.length, true);
    c.setUint32(42, offset, true); central.push(new Uint8Array(c.buffer), name);
    offset += 30 + name.length + data.length;
  }
  const csize = central.reduce((s, a) => s + a.length, 0);
  const e = new DataView(new ArrayBuffer(22)); e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, csize, true); e.setUint32(16, offset, true);
  return new Blob([...parts, ...central, new Uint8Array(e.buffer)], { type: 'application/zip' });
}

// ---------- DXF (R12 ASCII, metres, one layer per meaning) ----------
const DXF_LAYERS = [
  ['MURI_ESISTENTI', 7], ['MURI_DA_DEMOLIRE', 2], ['MURI_NUOVI', 1], ['CARTONGESSO', 8], ['APERTURE', 5], ['ARREDI', 3], ['ATTREZZATURE_DENTALI', 4],
  ['STANZE', 6], ['QUOTE', 30], ['IMP_ACQUA', 150], ['IMP_SCARICO', 34], ['IMP_ARIA', 130], ['IMP_ASPIRAZIONE', 200], ['IMP_ELETTRICO', 40], ['ZONE_LAVORO', 9],
];
function exportDXF() {
  const p = S.project; const ph = phase(); const out = [];
  const n = (v) => (Math.round(v * 10000) / 10000).toString();
  const Y = (y) => -y; // DXF has Y up
  const line = (layer, a, b) => out.push('0', 'LINE', '8', layer, '10', n(a.x), '20', n(Y(a.y)), '30', '0', '11', n(b.x), '21', n(Y(b.y)), '31', '0');
  const poly = (layer, pts, closed = true) => { for (let i = 0; i < pts.length - (closed ? 0 : 1); i++) line(layer, pts[i], pts[(i + 1) % pts.length]); };
  const arc = (layer, c, r, a0, a1) => out.push('0', 'ARC', '8', layer, '10', n(c.x), '20', n(Y(c.y)), '30', '0', '40', n(r), '50', n(a0), '51', n(a1));
  const text = (layer, at, h, s, center = true) => { const t = String(s).replace(/²/g, '2').replace(/[^\x20-\x7EÀ-ÿ]/g, ''); out.push('0', 'TEXT', '8', layer, '10', n(at.x), '20', n(Y(at.y)), '30', '0', '40', n(h), '1', t); if (center) out.push('72', '1', '73', '2', '11', n(at.x), '21', n(Y(at.y)), '31', '0'); };
  const visWalls = p.walls.filter((w) => wallVisible(w, ph));
  for (const w of visWalls) {
    const layer = w.status === 'demolito' ? 'MURI_DA_DEMOLIRE' : w.status === 'nuovo' ? 'MURI_NUOVI' : w.type === 'cartongesso' ? 'CARTONGESSO' : 'MURI_ESISTENTI';
    const [ea, eb] = wallExt(w, visWalls); const d = wallDir(w), nn = wallNrm(w), L = wallLen(w), h = w.t / 2;
    const ops = openingsOf(w, ph).filter((o) => o.status !== 'chiuso' || ph === 'fatto');
    const spans = solidSpans(w, ops);
    const at = (s, side) => V.add(V.add(w.a, V.mul(d, s)), V.mul(nn, side * h));
    for (const [s0r, s1r] of spans) {
      const s0 = s0r <= .001 ? -ea : s0r, s1 = s1r >= L - .001 ? L + eb : s1r;
      line(layer, at(s0, 1), at(s1, 1)); line(layer, at(s0, -1), at(s1, -1));
      if (s0r > .001) line(layer, at(s0, 1), at(s0, -1)); if (s1r < L - .001) line(layer, at(s1, 1), at(s1, -1));
    }
    if (!spans.length) { line(layer, at(-ea, 1), at(L + eb, 1)); line(layer, at(-ea, -1), at(L + eb, -1)); }
    if (spans.length && spans[0][0] > .001) line(layer, at(-ea, 1), at(-ea, -1));
    if (spans.length && spans[spans.length - 1][1] < L - .001) line(layer, at(L + eb, 1), at(L + eb, -1));
    for (const o of ops) {
      const [s0, s1] = openingSpan(o, w); const a = V.add(w.a, V.mul(d, s0)), b = V.add(w.a, V.mul(d, s1)); const sw = o.swing >= 0 ? 1 : -1;
      if (o.kind === 'finestra' || o.kind === 'portafinestra') { for (const k of [-.35, 0, .35]) line('APERTURE', V.add(a, V.mul(nn, k * w.t)), V.add(b, V.mul(nn, k * w.t))); }
      else if (o.kind === 'porta') {
        const hp = o.hinge !== 'end' ? a : b, other = o.hinge !== 'end' ? b : a; const face = V.add(hp, V.mul(nn, sw * h)); const tip = V.add(face, V.mul(nn, sw * o.w)); const closed = V.add(other, V.mul(nn, sw * h));
        line('APERTURE', face, tip);
        const angDeg = (q) => Math.atan2(-(q.y - face.y), q.x - face.x) / DEG; let a0 = angDeg(tip), a1 = angDeg(closed);
        let delta = a1 - a0; while (delta > 180) delta -= 360; while (delta < -180) delta += 360; if (delta < 0) [a0, a1] = [a1, a0];
        arc('APERTURE', face, o.w, (a0 + 360) % 360, (a1 + 360) % 360);
      } else if (o.kind === 'scorrevole' || o.kind === 'scomparsa') { const off = o.kind === 'scorrevole' ? V.mul(nn, sw * (h + .03)) : { x: 0, y: 0 }; const sh = V.mul(d, (o.hinge === 'end' ? 1 : -1) * o.w * (o.kind === 'scorrevole' ? .6 : 1)); line('APERTURE', V.add(V.add(a, off), sh), V.add(V.add(b, off), sh)); }
    }
  }
  for (const it of p.items) {
    if (!itemVisible(it, ph)) continue; const c = catOf(it);
    const layer = ['Sala operativa', 'Radiologia', 'Sterilizzazione', 'Sala tecnica'].includes(c.cat) ? 'ATTREZZATURE_DENTALI' : c.utility ? 'IMP_' + ({ water: 'ACQUA', drain: 'SCARICO', air: 'ARIA', suction: 'ASPIRAZIONE', power: 'ELETTRICO' }[c.util] || 'ELETTRICO') : 'ARREDI';
    poly(layer, itemCorners(it)); const d = dimsOf(it);
    text(layer, { x: it.x, y: it.y }, Math.min(.12, Math.max(.05, Math.min(d.w, d.d) * .18)), it.label || c.name);
  }
  if (S.view3d.zones) for (const it of p.items) {
    if (it.type !== 'riunito' || !itemVisible(it, ph) || it.zones === false) continue;
    const z = zonesOf(it); const head = V.rot({ x: 0, y: -1 }, z.th); const base = Math.atan2(head.y, head.x);
    for (const s of z.sectors) { const f0 = base + s.a0, f1 = base + s.a1; arc('ZONE_LAVORO', z.c, z.R, (-f1 / DEG + 720) % 360, (-f0 / DEG + 720) % 360); for (const f of [f0, f1]) line('ZONE_LAVORO', z.c, { x: z.c.x + Math.cos(f) * z.R, y: z.c.y + Math.sin(f) * z.R }); }
  }
  const rr = computeRooms(ph);
  for (const r of p.rooms) { const st = rr.rooms.get(r.id); if (!st || st.open || st.shared) continue; const at = st.label || r.seed; text('STANZE', { x: at.x, y: at.y - .12 }, .16, r.name); text('STANZE', { x: at.x, y: at.y + .12 }, .12, nf2.format(st.area) + ' mq'); }
  for (const pp of p.pipes) { if (!pipeVisible(pp, ph)) continue; const layer = 'IMP_' + ({ acqua: 'ACQUA', scarico: 'SCARICO', aria: 'ARIA', aspirazione: 'ASPIRAZIONE', elettrico: 'ELETTRICO' }[pp.kind]); poly(layer, pp.pts, false); }
  for (const dm of p.dims) { line('QUOTE', dm.a, dm.b); text('QUOTE', { x: (dm.a.x + dm.b.x) / 2, y: (dm.a.y + dm.b.y) / 2 - .1 }, .1, nf2.format(V.dist(dm.a, dm.b))); }
  const head = ['0', 'SECTION', '2', 'HEADER', '9', '$ACADVER', '1', 'AC1009', '9', '$INSUNITS', '70', '6', '0', 'ENDSEC',
    '0', 'SECTION', '2', 'TABLES', '0', 'TABLE', '2', 'LAYER', '70', String(DXF_LAYERS.length)];
  for (const [nm, col] of DXF_LAYERS) head.push('0', 'LAYER', '2', nm, '70', '0', '62', String(col), '6', 'CONTINUOUS');
  head.push('0', 'ENDTAB', '0', 'ENDSEC', '0', 'SECTION', '2', 'ENTITIES');
  const txt = [...head, ...out, '0', 'ENDSEC', '0', 'EOF'].join('\r\n') + '\r\n';
  return new Blob([new TextEncoder().encode(txt)], { type: 'application/dxf' });
}
async function downloadDXF() {
  try { const blob = exportDXF(); await offerFile(`${safeName(S.project.name)} - ${PHASES[phase()].toLowerCase()}.dxf`, blob); }
  catch (e) { console.error(e); toast('Export DXF non riuscito: ' + e.message, 4000); }
}

// ---------- USDZ for AR Quick Look (iPhone / iPad) ----------
async function exportUSDZ() {
  const ok = await View3D.ensure(); if (!ok) return;
  toast('Preparo il modello per la realtà aumentata…', 6000);
  try {
    const base = 'https://cdn.jsdelivr.net/npm/three@0.169.0/';
    let mod; if (BUILD === 'github') mod = await import('./vendor/USDZExporter.js'); else { try { mod = await import(base + 'examples/jsm/exporters/USDZExporter.js/+esm'); } catch { mod = await import(base + 'examples/jsm/exporters/USDZExporter.js'); } }
    const prevView = S.view, prevWalls = S.view3d.walls, prevZones = S.view3d.zones;
    S.view3d.walls = 'full'; S.view3d.zones = false; if (S.view === 'walk') S.view = '3d';
    View3D.rebuild(); S.view = prevView;
    const root = new THREE.Group();
    const src = View3D.world; const box = new THREE.Box3().setFromObject(src); const c = box.getCenter(new THREE.Vector3());
    src.updateMatrixWorld(true);
    src.traverse((o) => {
      if (!o.isMesh) return; let m = Array.isArray(o.material) ? o.material[0] : o.material;
      if (!m || !m.isMeshStandardMaterial) return; if (m.transparent && m.opacity < .3 && m !== MATS.get('glass|')) return;
      const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); g.applyMatrix4(o.matrixWorld); g.translate(-c.x, -box.min.y, -c.z);
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      if (!g.attributes.normal) g.computeVertexNormals();
      root.add(new THREE.Mesh(g, m));
    });
    S.view3d.walls = prevWalls; S.view3d.zones = prevZones; View3D.dirty = true;
    const exp = new mod.USDZExporter();
    const data = exp.parseAsync ? await exp.parseAsync(root, { quickLookCompatible: true }) : await new Promise((res, rej) => exp.parse(root, res, rej, { quickLookCompatible: true }));
    root.traverse((o) => o.geometry && o.geometry.dispose());
    const blob = new Blob([data], { type: 'model/vnd.usdz+zip' }); const name = `${safeName(S.project.name)} - AR.usdz`;
    if (/iP(ad|hone)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
      if (!(await Store.downloads())) { // open AR Quick Look directly when Safari allows it
        const a = document.createElement('a'); a.rel = 'ar'; a.href = URL.createObjectURL(blob); a.download = name; a.appendChild(document.createElement('img'));
        document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 60000);
        toast('Se la realtà aumentata non si apre, salva il file e aprilo da File', 5000); return;
      }
    }
    await offerFile(name, blob);
  } catch (e) { console.error(e); toast('Export USDZ non riuscito: ' + e.message, 5000); View3D.dirty = true; }
}

// ===================== project lifecycle & boot =====================
async function openProject(p) {
  if (S.project && S.project !== p && (S.project._dirty || S.project._bgDirty)) { try { await saveNow(S.project); } catch (e) { console.warn(e); } }
  normalizeProject(p);
  S.project = p; S.sel = null; S.undo = []; S.redo = []; S.placing = null; S.rev++;
  invalidateRooms(); View3D._presetDone = false; View3D.dirty = true;
  if (p.bg && p.bg.src && p.bg.src.startsWith('img:') && !S.bgData.has(p.bg.src)) {
    try { const url = await Store.loadBg(p.id); if (url) { S.bgData.set(p.bg.src, url); S.bgImages.delete(p.bg.src); } } catch (e) { console.warn(e); }
  }
  $('#projName').textContent = p.name;
  $$('#phaseSeg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.phase === phase())));
  try { localStorage.setItem('ps-last', p.id); } catch { }
  setSaveState(p._unsaved ? 'unsaved' : 'saved');
  if (p._unsaved) $('#saveState .txt').textContent = 'Modello non salvato';
  updateUndoButtons(); setTool('select'); Plan.fit(); refreshPanel(true); refreshHud3D();
  if (S.view === 'walk') { View3D.rebuild(); View3D.enterWalk(); }
  else if (S.view === '3d' && View3D.ready) { View3D.rebuild(); View3D.preset('iso'); View3D._presetDone = true; }
}
async function openProjectById(id) {
  try { const p = await Store.load(id); if (!p) { toast('Progetto non trovato'); return; } await openProject(p); }
  catch (e) { console.error(e); toast('Non riesco ad aprire il progetto: ' + e.message, 4000); }
}
function openFallback() {
  if (SEEDS.templates.length) { openTemplate(SEEDS.templates[0].id); return; }
  const p = normalizeProject({ id: uid('p'), name: 'Il mio studio', walls: [], openings: [], items: [], rooms: [], pipes: [], dims: [], settings: {}, bg: null });
  p._unsaved = true; return openProject(p);
}
function openWelcome() {
  openSheet((sh) => {
    sh.append(sheetHead('Benvenuto nel Planner', 'Scegli da dove partire. Potrai sempre aggiungere altri progetti dal menu Progetti.'));
    const big = (title, sub, fn, primary) => el('button', { class: 'proj-item', type: 'button', style: { textAlign: 'left', cursor: 'pointer', width: '100%', borderColor: primary ? 'var(--accent)' : undefined }, onclick: () => { closeSheet(); fn(); } }, el('div', {}, el('div', { class: 'nm' }, title), el('div', { class: 'meta' }, sub)), el('span', { html: icon('plus') }));
    sh.append(el('div', { class: 'proj-list' },
      big('Importa i file dei tuoi locali', 'Seleziona insieme i file .json dello studio attuale e del nuovo locale: arrivano con planimetria, muri e arredi già pronti.', () => $('#fileJson').click(), true),
      big('Carica una planimetria', 'PDF o immagine: la calibri con una misura nota e ricalchi i muri.', () => newEmptyProject(true)),
      big('Inizia da zero', 'Disegna i muri a mano.', () => newEmptyProject(false)),
    ));
    if (BUILD !== 'artifact' && Store.mode !== 'firebase') sh.append(el('p', { class: 'note' }, 'Hai già attivato la sincronizzazione sull\'altro dispositivo? Vai in Progetto › Sincronizzazione e inserisci la stessa configurazione e lo stesso codice.'));
  });
}
function openTemplate(tplId, save = false) {
  const t = SEEDS.templates.find((x) => x.id === tplId) || SEEDS.templates[0];
  const p = deepClone(t); p.id = uid('p'); p._unsaved = !save;
  openProject(p).then(() => { if (save) saveNow(p, true); });
}
function newEmptyProject(withPlan) {
  if (withPlan) $('#fileBg').click(); // open the picker inside the tap, as iPad Safari requires
  const p = normalizeProject({ id: uid('p'), name: withPlan ? 'Nuovo locale' : 'Progetto vuoto', walls: [], openings: [], items: [], rooms: [], pipes: [], dims: [], settings: {}, bg: null });
  openProject(p).then(() => { saveNow(p, true); setTool(withPlan ? 'bg' : 'wall'); });
}
async function duplicateProject() {
  const src = S.project; const p = deepClone(JSON.parse(Store.serialize(src)));
  p.id = uid('p'); p.name = src.name.replace(/ · variante \d+$/, '') + ' · variante ' + (S.projects.filter((x) => x.name.startsWith(src.name.replace(/ · variante \d+$/, ''))).length + 1);
  if (src.bg && src.bg.src && src.bg.src.startsWith('img:')) { const data = S.bgData.get(src.bg.src); p.bg.src = 'img:' + p.id; if (data) { S.bgData.set(p.bg.src, data); p._bgDirty = true; } }
  await openProject(p); await saveNow(p, true); toast('Variante creata: ' + p.name);
}

function onKey(e) {
  if (isTyping(e)) return;
  if (!$('#sheetBack').hidden) { if (e.key === 'Escape') closeSheet(); return; }
  const mod = e.metaKey || e.ctrlKey; const k = e.key;
  if (mod && (k === 'z' || k === 'Z')) { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
  if (mod && (k === 'y')) { e.preventDefault(); redo(); return; }
  if (mod && (k === 'd' || k === 'D')) { e.preventDefault(); duplicateSel(); return; }
  if (mod) return;
  if (S.view === 'walk') { if (k === '1' || k === '2') setView(k === '1' ? '2d' : '3d'); return; }
  if (k === ' ') { Plan.spaceDown = true; e.preventDefault(); return; }
  // numeric length typing while drawing walls / pipes
  if ((S.tool === 'wall' || S.tool === 'pipe') && Plan.chain.length && /^[0-9.,]$/.test(k)) { Plan.lenBuf += k; requestRender(); e.preventDefault(); return; }
  if ((S.tool === 'wall' || S.tool === 'pipe') && Plan.chain.length && k === 'Backspace' && Plan.lenBuf) { Plan.lenBuf = Plan.lenBuf.slice(0, -1); requestRender(); e.preventDefault(); return; }
  if (k === 'Enter') { if (Plan.lenBuf) { applyLength(Plan.lenBuf); Plan.lenBuf = ''; } else Plan.finishChain(); return; }
  if (k === 'Escape') {
    if (Plan.lenBuf) { Plan.lenBuf = ''; requestRender(); return; }
    if (S.placing) { S.placing = null; refreshLibrary(); refreshToolOpts(); requestRender(); return; }
    if (Plan.chain.length || Plan.measureA || Plan.calA) { Plan.finishChain(); return; }
    if (S.tool !== 'select') { setTool('select'); return; }
    if (S.sel) { S.sel = null; selectionChanged(); }
    return;
  }
  if (k === 'Delete' || k === 'Backspace') { if (S.sel) { e.preventDefault(); smartDelete(); } return; }
  if (k === '1') return setView('2d'); if (k === '2') return setView('3d'); if (k === '3') return setView('walk');
  if (k === '0') { Plan.fit(); return; }
  if (k === '+' || k === '=') { Plan.zoomAt(1.2, Plan.W / 2, Plan.H / 2); return; }
  if (k === '-') { Plan.zoomAt(1 / 1.2, Plan.W / 2, Plan.H / 2); return; }
  const it = S.sel && S.sel.kind === 'item' ? findSel(S.sel) : null;
  if (it && (k === '[' || k === ']')) { commit(() => { it.rot = ((it.rot + (k === ']' ? 15 : -15)) % 360 + 360) % 360; }); return; }
  if (it && k.startsWith('Arrow')) {
    e.preventDefault(); const st = e.shiftKey ? .1 : .01; const dv = { ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, -st], ArrowDown: [0, st] }[k];
    commit(() => { it.x = Math.round((it.x + dv[0]) * 1000) / 1000; it.y = Math.round((it.y + dv[1]) * 1000) / 1000; }); return;
  }
  if (S.view !== '2d') return;
  const map = { v: 'select', w: 'wall', d: 'door', f: 'window', r: 'room', m: 'measure', t: 'pipe', c: 'calibrate', b: 'bg' };
  const tl = map[k.toLowerCase()]; if (tl) setTool(tl);
}

async function boot() {
  let last = null; try { last = localStorage.getItem('ps-last'); } catch { }
  hydrateIcons(); readPalette();
  const onTheme = () => { readPalette(); requestRender(); schedule3D(); refreshPanel(); refreshToolOpts(); };
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', onTheme);
  new MutationObserver(onTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  buildRail(); Plan.init();
  const tb = document.querySelector('.topbar'); new ResizeObserver(() => document.documentElement.style.setProperty('--topbar-h', tb.getBoundingClientRect().height + 'px')).observe(tb);
  $$('#viewSeg button').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
  $$('#phaseSeg button').forEach((b) => b.addEventListener('click', () => setPhase(b.dataset.phase)));
  $$('#tabs [data-tab]').forEach((b) => b.addEventListener('click', () => { setTab(b.dataset.tab); if (!S.panelOpen) togglePanel(true); }));
  $('#undoBtn').addEventListener('click', undo); $('#redoBtn').addEventListener('click', redo);
  $('#exportBtn').addEventListener('click', openExport); $('#helpBtn').addEventListener('click', openHelp);
  $('#panelBtn').addEventListener('click', () => togglePanel()); $('#panelClose').addEventListener('click', () => togglePanel(false));
  $('#projBtn').addEventListener('click', openProjects);
  $('#fabLib').addEventListener('click', () => { setTab(S.sel ? 'props' : 'lib'); togglePanel(true); });
  $('#zoomIn').addEventListener('click', () => Plan.zoomAt(1.25, Plan.W / 2, Plan.H / 2));
  $('#zoomOut').addEventListener('click', () => Plan.zoomAt(1 / 1.25, Plan.W / 2, Plan.H / 2));
  $('#zoomFit').addEventListener('click', () => Plan.fit());
  $('#sheetBack').addEventListener('pointerdown', (e) => { if (e.target === e.currentTarget) closeSheet(); });
  $('#fileBg').addEventListener('change', (e) => { const f = e.target.files[0]; e.target.value = ''; loadBackgroundFile(f); });
  $('#fileJson').addEventListener('change', async (e) => { const files = [...e.target.files]; e.target.value = ''; for (const f of files) await importJSONFile(f); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refreshFromRemote(); else if (S.project && S.project._dirty) saveNow(S.project); });
  if (BUILD === 'github' && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch((e) => console.warn('service worker', e));
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', (e) => { if (e.key === ' ') Plan.spaceDown = false; });
  // panel default: closed on narrow screens
  let pref = null; try { pref = localStorage.getItem('ps-panel'); } catch { }
  togglePanel(pref ? pref === '1' : !window.matchMedia('(max-width: 1000px)').matches);
  // first paint with the template while storage connects
  if (SEEDS.templates.length) { const tpl = deepClone(SEEDS.templates[0]); tpl.id = uid('p'); tpl._unsaved = true; await openProject(tpl); }
  else await openFallback();
  document.fonts && document.fonts.ready.then(() => { requestRender(); refreshPanel(true); });
  await Store.init();
  try { S.projects = await Store.list(); } catch (e) { console.warn(e); S.projects = []; }
  const pick = S.projects.find((x) => x.id === last) || [...S.projects].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];
  if (pick && S.project._unsaved && S.undo.length === 0) await openProjectById(pick.id);
  else setSaveState(S.project._unsaved ? 'unsaved' : 'saved');
  if (S.project._unsaved) { $('#saveState .txt').textContent = 'Modello non salvato'; $('#saveState').title = 'Si salva alla prima modifica. ' + Store.label(); }
  if (!S.projects.length && !SEEDS.templates.length) openWelcome();
}
window.__planner = { S, Plan, View3D, commit, setView, setPhase, setTool, Store, parseFirebaseConfig };
boot();

