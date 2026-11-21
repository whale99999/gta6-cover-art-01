// Neon Coast cover engine: draws a multi-panel GTA-poster-style cover on a 2D canvas.
// Everything is drawn from the photos the user supplies plus vector art made here
// (sun, palms, halftone, grain) — no Rockstar logo, artwork or font anywhere.
// Deterministic: the same state always paints the same pixels (seeded grain).

/** Layout catalogue: each layout names its panels as fractions of the frame. */
export const LAYOUTS = {
  hero: {
    label: 'Hero + 3',
    titleBand: 0.22,
    panels: [
      { x: 0.015, y: 0.015, w: 0.6, h: 0.745, rot: 0 },
      { x: 0.63, y: 0.015, w: 0.355, h: 0.3625, rot: 0 },
      { x: 0.63, y: 0.3975, w: 0.1725, h: 0.3625, rot: 0 },
      { x: 0.8175, y: 0.3975, w: 0.1675, h: 0.3625, rot: 0 },
    ],
  },
  quad: {
    label: 'Four Square',
    titleBand: 0.22,
    panels: [
      { x: 0.015, y: 0.015, w: 0.48, h: 0.37, rot: 0 },
      { x: 0.505, y: 0.015, w: 0.48, h: 0.37, rot: 0 },
      { x: 0.015, y: 0.395, w: 0.48, h: 0.365, rot: 0 },
      { x: 0.505, y: 0.395, w: 0.48, h: 0.365, rot: 0 },
    ],
  },
  nine: {
    label: 'Nine Grid',
    titleBand: 0.2,
    panels: [
      { x: 0.015, y: 0.015, w: 0.316, h: 0.246, rot: 0 },
      { x: 0.342, y: 0.015, w: 0.316, h: 0.246, rot: 0 },
      { x: 0.669, y: 0.015, w: 0.316, h: 0.246, rot: 0 },
      { x: 0.015, y: 0.272, w: 0.316, h: 0.246, rot: 0 },
      { x: 0.342, y: 0.272, w: 0.316, h: 0.246, rot: 0 },
      { x: 0.669, y: 0.272, w: 0.316, h: 0.246, rot: 0 },
      { x: 0.015, y: 0.529, w: 0.316, h: 0.246, rot: 0 },
      { x: 0.342, y: 0.529, w: 0.316, h: 0.246, rot: 0 },
      { x: 0.669, y: 0.529, w: 0.316, h: 0.246, rot: 0 },
    ],
  },
  tilted: {
    label: 'Tilted Snaps',
    titleBand: 0.2,
    panels: [
      { x: 0.02, y: 0.02, w: 0.52, h: 0.46, rot: -4 },
      { x: 0.47, y: 0.015, w: 0.51, h: 0.47, rot: 3.5 },
      { x: 0.24, y: 0.44, w: 0.54, h: 0.36, rot: -1.5 },
    ],
  },
  strip: {
    label: 'Full Bleed',
    titleBand: 0.24,
    panels: [{ x: 0, y: 0, w: 1, h: 1, rot: 0 }],
  },
  columns: {
    label: 'Three Columns',
    titleBand: 0.22,
    panels: [
      { x: 0.015, y: 0.015, w: 0.316, h: 0.745, rot: 0 },
      { x: 0.342, y: 0.015, w: 0.316, h: 0.745, rot: 0 },
      { x: 0.669, y: 0.015, w: 0.316, h: 0.745, rot: 0 },
    ],
  },
};

/** Colour grades: sunset / neon colour work painted over the photos. */
export const GRADES = {
  sunset: {
    label: 'Vice Sunset',
    skyTop: '#2b1055', skyMid: '#ff7e5f', skyBot: '#feb47b',
    wash: 'rgba(255, 94, 98, 0.20)', deep: 'rgba(120, 20, 90, 0.28)',
    sun: '#ffd166', accent: '#ffd166', ink: '#1c0b2e', sunOn: true,
  },
  neon: {
    label: 'Neon Nights',
    skyTop: '#0b0620', skyMid: '#ff2e88', skyBot: '#22d3ee',
    wash: 'rgba(255, 46, 136, 0.20)', deep: 'rgba(10, 10, 60, 0.34)',
    sun: '#ff5da2', accent: '#22d3ee', ink: '#0b0620', sunOn: true,
  },
  gold: {
    label: 'Palm Gold',
    skyTop: '#3a1c00', skyMid: '#ff9a3c', skyBot: '#ffe259',
    wash: 'rgba(255, 170, 60, 0.18)', deep: 'rgba(90, 40, 0, 0.26)',
    sun: '#fff3b0', accent: '#ffe259', ink: '#2a1500', sunOn: true,
  },
  noir: {
    label: 'Teal Noir',
    skyTop: '#04141a', skyMid: '#0e7490', skyBot: '#f59e0b',
    wash: 'rgba(14, 165, 164, 0.16)', deep: 'rgba(2, 20, 28, 0.38)',
    sun: '#fbbf24', accent: '#5eead4', ink: '#04141a', sunOn: false,
  },
  candy: {
    label: 'Candy Pink',
    skyTop: '#3b0764', skyMid: '#ec4899', skyBot: '#fda4af',
    wash: 'rgba(236, 72, 153, 0.20)', deep: 'rgba(80, 7, 80, 0.28)',
    sun: '#fdf2f8', accent: '#f9a8d4', ink: '#3b0764', sunOn: true,
  },
};

/** Export sizes: the common post sizes. */
export const SIZES = {
  square: { label: 'Square 1080 × 1080', w: 1080, h: 1080 },
  portrait: { label: 'Portrait 1080 × 1350', w: 1080, h: 1350 },
  wide: { label: 'Wide 1920 × 1080', w: 1920, h: 1080 },
};

/** Tiny seeded random generator, so the grain is identical on every render. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A fresh default state: hero layout, sunset grade, sample photos cycled per panel. */
export function defaultState(photoCount) {
  const layout = LAYOUTS.hero;
  return {
    layout: 'hero',
    grade: 'sunset',
    title: 'Neon Coast',
    subtitle: 'chasing the last light',
    size: 'square',
    panels: layout.panels.map((_, i) => ({
      photo: photoCount > 0 ? i % photoCount : -1,
      zoom: 1,
      dx: 0,
      dy: 0,
    })),
  };
}

/** Rebuilds the panel list when the layout changes, keeping each photo where it was. */
export function panelsForLayout(state, layoutId) {
  const layout = LAYOUTS[layoutId];
  const old = state.panels;
  return layout.panels.map((_, i) => old[i] ?? { photo: old.length ? old[i % old.length].photo : -1, zoom: 1, dx: 0, dy: 0 });
}

/** Draws one photo into a panel rect with cover-fit, zoom and pan. */
export function drawPhotoInPanel(ctx, photo, rect, panel) {
  const { x, y, w, h } = rect;
  if (!photo) {
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, '#3d2b52');
    g.addColorStop(1, '#1c0b2e');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = `600 ${Math.max(12, h * 0.06)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('ADD A PHOTO', x + w / 2, y + h / 2);
    return;
  }
  const iw = photo.naturalWidth || photo.width;
  const ih = photo.naturalHeight || photo.height;
  const base = Math.max(w / iw, h / ih);
  const s = base * (panel.zoom || 1);
  const dw = iw * s;
  const dh = ih * s;
  const cx = x + w / 2 + (panel.dx || 0) * w;
  const cy = y + h / 2 + (panel.dy || 0) * h;
  ctx.drawImage(photo, cx - dw / 2, cy - dh / 2, dw, dh);
}

/** A palm silhouette, drawn from paths — original vector art, no borrowed image. */
export function drawPalm(ctx, x, y, s, flip, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flip ? -s : s, s);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(14, -70, 34, -118);
  ctx.stroke();
  ctx.lineWidth = 5;
  for (let i = 0; i < 6; i++) {
    const a = (-160 + i * 38) * (Math.PI / 180);
    const len = 62 - Math.abs(i - 2.5) * 7;
    const bx = 34 + Math.cos(a) * len;
    const by = -118 + Math.sin(a) * len * 0.55;
    ctx.beginPath();
    ctx.moveTo(34, -118);
    ctx.quadraticCurveTo(34 + Math.cos(a) * len * 0.6, -118 + Math.sin(a) * len * 0.35 - 14, bx, by);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(28, -108, 7, 0, Math.PI * 2);
  ctx.arc(40, -104, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Sun disc with rays, painted behind the title block. */
export function drawSun(ctx, cx, cy, r, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = Math.max(2, r * 0.03);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r * 1.25, cy + Math.sin(a) * r * 1.25);
    ctx.lineTo(cx + Math.cos(a) * r * 1.6, cy + Math.sin(a) * r * 1.6);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Halftone dots fading down the title band. */
export function drawHalftone(ctx, x, y, w, h, color) {
  ctx.save();
  ctx.fillStyle = color;
  const step = Math.max(10, w * 0.014);
  for (let row = 0; row * step < h; row++) {
    for (let col = 0; col * step < w; col++) {
      const fade = 1 - (row * step) / h;
      const r = step * 0.22 * fade;
      if (r < 0.5) continue;
      ctx.globalAlpha = 0.5 * fade;
      ctx.beginPath();
      ctx.arc(x + col * step + (row % 2 ? step / 2 : 0), y + row * step, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Seeded film grain over the whole frame. */
export function drawGrain(ctx, w, h) {
  const rnd = mulberry32(20261121);
  const tile = document.createElement('canvas');
  tile.width = 140;
  tile.height = 140;
  const tctx = tile.getContext('2d');
  const img = tctx.createImageData(140, 140);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 110 + Math.floor(rnd() * 90);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  tctx.putImageData(img, 0, 0);
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.globalCompositeOperation = 'overlay';
  const pat = ctx.createPattern(tile, 'repeat');
  ctx.fillStyle = pat;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** Vignette: darkened corners to pull the eye to the middle. */
export function drawVignette(ctx, w, h) {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.72);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.30)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** The title block: badge, big Anton title, Pacifico subtitle, palms and halftone. */
export function drawTitleBlock(ctx, w, h, bandY, bandH, grade, title, subtitle) {
  const sky = ctx.createLinearGradient(0, bandY, 0, h);
  sky.addColorStop(0, grade.skyTop);
  sky.addColorStop(0.55, grade.skyMid);
  sky.addColorStop(1, grade.skyBot);
  ctx.fillStyle = sky;
  ctx.fillRect(0, bandY, w, bandH);
  if (grade.sunOn) drawSun(ctx, w * 0.86, bandY + bandH * 0.42, bandH * 0.2, grade.sun);
  drawHalftone(ctx, w * 0.03, bandY + bandH * 0.08, w * 0.22, bandH * 0.5, 'rgba(255,255,255,0.9)');
  drawPalm(ctx, w * 0.045, bandY + bandH * 0.98, bandH / 170, false, 'rgba(20,5,30,0.85)');
  drawPalm(ctx, w * 0.955, bandY + bandH * 0.98, bandH / 190, true, 'rgba(20,5,30,0.85)');

  const cx = w / 2;
  const badgeY = bandY + bandH * 0.05;
  ctx.font = `700 ${Math.max(11, bandH * 0.095)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  const badge = '★  ORIGINAL COVER  ★';
  const bw = ctx.measureText(badge).width + bandH * 0.22;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  roundRect(ctx, cx - bw / 2, badgeY, bw, bandH * 0.15, bandH * 0.075);
  ctx.fill();
  ctx.fillStyle = grade.accent;
  ctx.fillText(badge, cx, badgeY + bandH * 0.108);

  const text = (title || 'NEON COAST').trim().toUpperCase();
  let size = bandH * 0.38;
  ctx.font = `${size}px Anton, 'Arial Black', sans-serif`;
  try { ctx.letterSpacing = '1px'; } catch { /* older canvas: no letter spacing */ }
  while (ctx.measureText(text).width > w * 0.88 && size > 14) {
    size -= 2;
    ctx.font = `${size}px Anton, 'Arial Black', sans-serif`;
  }
  const titleY = bandY + bandH * 0.65;
  ctx.save();
  ctx.translate(cx, titleY);
  ctx.rotate(-0.022);
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = grade.ink;
  ctx.lineWidth = Math.max(3, size * 0.14);
  ctx.strokeText(text, 0, 0);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, 0, 0);
  ctx.restore();
  try { ctx.letterSpacing = '0px'; } catch { /* ignore */ }

  const sub = (subtitle || '').trim();
  if (sub) {
    ctx.font = `${Math.max(13, bandH * 0.17)}px Pacifico, cursive`;
    ctx.textAlign = 'center';
    ctx.fillStyle = grade.accent;
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = bandH * 0.06;
    ctx.fillText(sub, cx, bandY + bandH * 0.86);
    ctx.shadowBlur = 0;
  }
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Draws the whole cover. `state` holds layout, grade, title, subtitle and one
 * panel entry per layout panel ({photo, zoom, dx, dy}); `photos` is the array
 * of loaded images (index -1 means the empty placeholder).
 */
export function drawCover(canvas, state, photos) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const layout = LAYOUTS[state.layout] || LAYOUTS.hero;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const bandH = h * layout.titleBand;
  const bandY = h - bandH;
  const border = Math.max(3, Math.round(w * 0.004));
  const gap = Math.max(2, Math.round(w * 0.006));

  ctx.fillStyle = grade.ink;
  ctx.fillRect(0, 0, w, h);

  const isFullBleed = state.layout === 'strip';
  layout.panels.forEach((p, i) => {
    const px = p.x * w;
    const py = p.y * h;
    const pw = p.w * w;
    const ph = isFullBleed ? p.h * h : Math.min(p.h * h, bandY - py);
    if (pw <= 0 || ph <= 0) return;
    const panel = state.panels[i] || { photo: -1, zoom: 1, dx: 0, dy: 0 };
    const photo = panel.photo >= 0 ? photos[panel.photo] : null;
    ctx.save();
    ctx.translate(px + pw / 2, py + ph / 2);
    if (p.rot) ctx.rotate((p.rot * Math.PI) / 180);
    ctx.translate(-pw / 2, -ph / 2);
    if (p.rot) {
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = w * 0.02;
      ctx.shadowOffsetY = w * 0.008;
    }
    ctx.beginPath();
    ctx.rect(0, 0, pw, ph);
    ctx.fillStyle = '#241a33';
    ctx.fill();
    ctx.save();
    ctx.clip();
    drawPhotoInPanel(ctx, photo, { x: 0, y: 0, w: pw, h: ph }, panel);
    const wash = ctx.createLinearGradient(0, 0, 0, ph);
    wash.addColorStop(0, 'rgba(255,255,255,0.04)');
    wash.addColorStop(1, grade.deep);
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, pw, ph);
    ctx.restore();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    if (!isFullBleed) {
      ctx.lineWidth = border;
      ctx.strokeStyle = '#ffffff';
      ctx.strokeRect(border / 2, border / 2, pw - border, ph - border);
    }
    ctx.restore();
  });

  if (isFullBleed) {
    const scrim = ctx.createLinearGradient(0, bandY - bandH * 0.5, 0, h);
    scrim.addColorStop(0, 'rgba(0,0,0,0)');
    scrim.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, bandY - bandH * 0.5, w, h - (bandY - bandH * 0.5));
    drawTitleBlock(ctx, w, h, bandY, bandH, grade, state.title, state.subtitle);
  } else {
    ctx.fillStyle = grade.ink;
    ctx.fillRect(0, bandY - gap, w, gap + 1);
    drawTitleBlock(ctx, w, h, bandY, bandH, grade, state.title, state.subtitle);
  }

  const washAll = ctx.createLinearGradient(0, 0, 0, h);
  washAll.addColorStop(0, 'rgba(255,255,255,0.03)');
  washAll.addColorStop(0.5, 'rgba(0,0,0,0)');
  washAll.addColorStop(1, grade.wash);
  ctx.fillStyle = washAll;
  ctx.fillRect(0, 0, w, h);
  drawVignette(ctx, w, h);
  drawGrain(ctx, w, h);
}
