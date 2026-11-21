// Fixed scenes for screenshots: ?shot=editor shows the page with sample photos loaded;
// ?shot=cover shows the exported cover alone, full frame, at the size the query names.
// window.__shotReady is set once the cover is painted with its fonts loaded.
import { LAYOUTS, GRADES, SIZES } from './cover.js';

/** Picks a photo from the tray by name, falling back to the first one. */
function pickPhoto(photos, name) {
  if (!name) return 0;
  const i = photos.findIndex((p) => p.name.toLowerCase() === name.toLowerCase());
  return i >= 0 ? i : 0;
}

export async function runShot(shot, query, api) {
  const { state, photos } = api;
  const layout = query.get('layout');
  if (layout && LAYOUTS[layout]) api.setLayout(layout);
  const grade = query.get('grade');
  if (grade && GRADES[grade]) api.setGrade(grade);
  const size = query.get('size');
  if (size && SIZES[size]) api.setSize(size);
  if (query.get('title') !== null) {
    state.title = query.get('title');
    document.getElementById('titleInput').value = state.title;
  }
  if (query.get('subtitle') !== null) {
    state.subtitle = query.get('subtitle');
    document.getElementById('subtitleInput').value = state.subtitle;
  }
  const photoName = query.get('photo');
  if (photoName) {
    const idx = pickPhoto(photos, photoName);
    state.panels.forEach((p, i) => { p.photo = (idx + i) % photos.length; });
  }
  // Frame the faces: the samples are portrait/square photos, so a wide panel's
  // cover-fit crops top and bottom — shift each panel's photo down just enough
  // that heads stay in frame, never past the point where a gap would show.
  const exportSize = SIZES[state.size];
  LAYOUTS[state.layout].panels.forEach((p, i) => {
    const panel = state.panels[i];
    const entry = photos[panel.photo];
    if (!entry) return;
    const img = entry.img;
    const pw = p.w * exportSize.w;
    const ph = state.layout === 'strip' ? p.h * exportSize.h : Math.min(p.h * exportSize.h, exportSize.h * (1 - LAYOUTS[state.layout].titleBand) - p.y * exportSize.h);
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const s = Math.max(pw / iw, ph / ih);
    const maxDy = Math.max(0, (ih * s - ph) / 2 / ph - 0.02);
    panel.zoom = 1;
    panel.dx = 0;
    panel.dy = Math.min(0.3, maxDy);
  });
  // A second photo for the hero panel, when the query names one.
  const heroPhoto = query.get('photo2');
  if (heroPhoto && state.panels.length > 1) {
    state.panels[1].photo = pickPhoto(photos, heroPhoto);
  }
  api.fitPreview();
  api.redraw();

  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    const canvas = document.getElementById('cover');
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    document.getElementById('selectOverlay').style.display = 'none';
    api.redraw();
  }
  try {
    await document.fonts.ready;
    await document.fonts.load('16px Anton');
    await document.fonts.load('16px Pacifico');
  } catch { /* fonts fall back to system faces */ }
  api.redraw();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
