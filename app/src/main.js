// Neon Coast Cover Studio — editor wiring: photos, panels, caption, sizes, export.
// Photos are read on this machine and never uploaded. Everything runs offline.
import { LAYOUTS, GRADES, SIZES, drawCover, defaultState, panelsForLayout } from './cover.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const previewWrap = $('previewWrap');
const SAMPLES = [
  { name: 'Boulevard', url: 'samples/boulevard.jpg' },
  { name: 'Pier', url: 'samples/pier.jpg' },
];

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

const photos = []; // {name, img}
const state = defaultState(0);
let selectedPanel = 0;
let drag = null;

function layoutPanelRects() {
  const layout = LAYOUTS[state.layout];
  const w = canvas.width;
  const h = canvas.height;
  const bandH = h * layout.titleBand;
  const bandY = h - bandH;
  return layout.panels.map((p) => {
    const ph = state.layout === 'strip' ? p.h * h : Math.min(p.h * h, bandY - p.y * h);
    return { x: p.x * w, y: p.y * h, w: p.w * w, h: ph, rot: p.rot || 0 };
  });
}

function redraw() {
  drawCover(canvas, state, photos.map((p) => p.img));
  syncPanelControls();
  document.querySelectorAll('#layoutRow button').forEach((b) => b.classList.toggle('on', b.dataset.layout === state.layout));
  document.querySelectorAll('#gradeRow button').forEach((b) => b.classList.toggle('on', b.dataset.grade === state.grade));
  document.querySelectorAll('#sizeRow button').forEach((b) => b.classList.toggle('on', b.dataset.size === state.size));
}

function syncPanelControls() {
  const panel = state.panels[selectedPanel];
  if (!panel) return;
  $('panelLabel').textContent = `Panel ${selectedPanel + 1} of ${state.panels.length}`;
  $('zoom').value = panel.zoom;
  $('panX').value = panel.dx;
  $('panY').value = panel.dy;
  $('zoomVal').textContent = `${Math.round(panel.zoom * 100)}%`;
  $('panXVal').textContent = `${Math.round(panel.dx * 100)}`;
  $('panYVal').textContent = `${Math.round(panel.dy * 100)}`;
  const rects = layoutPanelRects();
  document.querySelectorAll('#tray .thumb').forEach((t, i) => {
    t.classList.toggle('used', state.panels.some((p) => p.photo === i));
  });
  drawSelectionOverlay(rects);
}

function drawSelectionOverlay(rects) {
  const overlay = $('selectOverlay');
  const ctx = overlay.getContext('2d');
  overlay.width = canvas.width;
  overlay.height = canvas.height;
  ctx.clearRect(0, 0, overlay.width, overlay.height);
  const r = rects[selectedPanel];
  if (!r) return;
  ctx.save();
  ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
  if (r.rot) ctx.rotate((r.rot * Math.PI) / 180);
  ctx.translate(-r.w / 2, -r.h / 2);
  ctx.lineWidth = Math.max(4, overlay.width * 0.006);
  ctx.strokeStyle = '#22d3ee';
  ctx.setLineDash([18, 10]);
  ctx.strokeRect(4, 4, r.w - 8, r.h - 8);
  ctx.setLineDash([]);
  ctx.restore();
}

function fitPreview() {
  const size = SIZES[state.size];
  canvas.width = size.w;
  canvas.height = size.h;
  const maxW = Math.min(previewWrap.clientWidth || 640, 640);
  const scale = Math.min(maxW / size.w, 560 / size.h, 1);
  canvas.style.width = `${Math.round(size.w * scale)}px`;
  canvas.style.height = `${Math.round(size.h * scale)}px`;
  const overlay = $('selectOverlay');
  overlay.style.width = canvas.style.width;
  overlay.style.height = canvas.style.height;
}

function renderTray() {
  const tray = $('tray');
  tray.innerHTML = '';
  photos.forEach((p, i) => {
    const d = document.createElement('div');
    d.className = 'thumb';
    d.title = p.name;
    const img = document.createElement('img');
    img.src = p.img.src;
    img.alt = p.name;
    d.appendChild(img);
    const tag = document.createElement('span');
    tag.textContent = p.name;
    d.appendChild(tag);
    d.addEventListener('click', () => {
      state.panels[selectedPanel].photo = i;
      redraw();
      setStatus(`Panel ${selectedPanel + 1} now uses “${p.name}”.`);
    });
    tray.appendChild(d);
  });
}

function setStatus(msg) {
  $('status').textContent = msg;
}

function setLayout(id) {
  state.layout = id;
  state.panels = panelsForLayout(state, id);
  selectedPanel = 0;
  fitPreview();
  redraw();
}

function setGrade(id) {
  state.grade = id;
  redraw();
}

function setSize(id) {
  state.size = id;
  fitPreview();
  redraw();
  setStatus(`Size ${SIZES[id].label} — preview updated, export will match.`);
}

function applyPhotoToAll(i) {
  state.panels.forEach((p) => { p.photo = i; });
  redraw();
  setStatus(`All panels now use “${photos[i].name}”.`);
}

async function addFiles(fileList) {
  for (const file of fileList) {
    if (!file.type.startsWith('image/')) continue;
    const img = await loadImage(URL.createObjectURL(file));
    photos.push({ name: file.name.replace(/\.[^.]+$/, '').slice(0, 18) || 'Photo', img });
  }
  renderTray();
  redraw();
  setStatus(`${photos.length} photo(s) loaded — click a photo, then a panel, to place it.`);
}

function exportPNG() {
  const size = SIZES[state.size];
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  drawCover(off, state, photos.map((p) => p.img));
  off.toBlob((blob) => {
    if (!blob) { setStatus('Export failed — try again.'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neon-coast-cover-${size.w}x${size.h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    setStatus(`Saved neon-coast-cover-${size.w}x${size.h}.png — share it!`);
  }, 'image/png');
}

/** Builds the layout / grade / size button rows from the catalogues. */
export function buildControlRows() {
  const layoutRow = $('layoutRow');
  Object.entries(LAYOUTS).forEach(([id, l]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.layout = id;
    b.textContent = l.label;
    b.addEventListener('click', () => setLayout(id));
    layoutRow.appendChild(b);
  });
  const gradeRow = $('gradeRow');
  Object.entries(GRADES).forEach(([id, g]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.grade = id;
    b.textContent = g.label;
    b.style.setProperty('--sw', g.skyMid);
    b.addEventListener('click', () => setGrade(id));
    gradeRow.appendChild(b);
  });
  const sizeRow = $('sizeRow');
  Object.entries(SIZES).forEach(([id, s]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.size = id;
    b.textContent = s.label;
    b.addEventListener('click', () => setSize(id));
    sizeRow.appendChild(b);
  });
}

function hitPanel(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  const x = ((clientX - r.left) / r.width) * canvas.width;
  const y = ((clientY - r.top) / r.height) * canvas.height;
  const rects = layoutPanelRects();
  for (let i = rects.length - 1; i >= 0; i--) {
    const p = rects[i];
    if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) return i;
  }
  return -1;
}

function bindPointer() {
  canvas.addEventListener('pointerdown', (e) => {
    const i = hitPanel(e.clientX, e.clientY);
    if (i < 0) return;
    selectedPanel = i;
    drag = { x: e.clientX, y: e.clientY, dx: state.panels[i].dx, dy: state.panels[i].dy };
    canvas.setPointerCapture(e.pointerId);
    redraw();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const r = canvas.getBoundingClientRect();
    const panel = state.panels[selectedPanel];
    const rect = layoutPanelRects()[selectedPanel];
    panel.dx = clamp(drag.dx + ((e.clientX - drag.x) / r.width) * (canvas.width / rect.w), -0.5, 0.5);
    panel.dy = clamp(drag.dy + ((e.clientY - drag.y) / r.height) * (canvas.height / rect.h), -0.5, 0.5);
    redraw();
  });
  canvas.addEventListener('pointerup', () => { drag = null; });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const panel = state.panels[selectedPanel];
    panel.zoom = clamp(panel.zoom * (e.deltaY < 0 ? 1.08 : 0.93), 1, 3);
    redraw();
  }, { passive: false });
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

function bindControls() {
  $('photoInput').addEventListener('change', (e) => addFiles(e.target.files));
  $('titleInput').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
  $('subtitleInput').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
  $('zoom').addEventListener('input', (e) => { state.panels[selectedPanel].zoom = Number(e.target.value); redraw(); });
  $('panX').addEventListener('input', (e) => { state.panels[selectedPanel].dx = Number(e.target.value); redraw(); });
  $('panY').addEventListener('input', (e) => { state.panels[selectedPanel].dy = Number(e.target.value); redraw(); });
  $('fillAll').addEventListener('click', () => {
    const panel = state.panels[selectedPanel];
    if (panel.photo >= 0) applyPhotoToAll(panel.photo);
  });
  $('shuffle').addEventListener('click', () => {
    if (!photos.length) return;
    state.panels.forEach((p, i) => { p.photo = (i + 1) % photos.length; });
    redraw();
    setStatus('Photos shuffled across the panels.');
  });
  $('resetPanels').addEventListener('click', () => {
    state.panels.forEach((p) => { p.zoom = 1; p.dx = 0; p.dy = 0; });
    redraw();
    setStatus('Panel crops reset.');
  });
  $('exportBtn').addEventListener('click', exportPNG);
  window.addEventListener('resize', () => { fitPreview(); redraw(); });
}

async function loadSamples() {
  for (const s of SAMPLES) {
    try {
      const img = await loadImage(s.url);
      photos.push({ name: s.name, img });
    } catch { /* a missing sample just leaves the tray shorter */ }
  }
  if (state.panels.length === 0) state.panels = defaultState(photos.length).panels;
  state.panels.forEach((p, i) => { if (p.photo < 0 && photos.length) p.photo = i % photos.length; });
  renderTray();
}

async function boot() {
  buildControlRows();
  bindControls();
  bindPointer();
  fitPreview();
  const query = new URLSearchParams(location.search);
  const shot = query.get('shot');
  await loadSamples();
  if (shot) {
    await runShot(shot, query, { state, photos, setLayout, setGrade, setSize, redraw, fitPreview, loadImage });
  } else {
    redraw();
  }
  if (document.fonts?.ready) {
    document.fonts.ready.then(() => redraw());
  }
}

boot();
