// Vice Cover Studio — the poster painter.
//
// One canvas holds the whole cover: four photo panels inside a white frame,
// a sunset caption band with a skyline and a big condensed title. The editor
// preview and the exported PNG are the same drawing at different sizes, so
// what you see is what the file holds. Nothing here is random: the skyline
// comes from a fixed-seed generator, so the same state always paints the
// same pixels.

import { posterLayout, duskFilter, duskWash, titlePaint } from './looks.js';
import { paintDecor } from './decor.js';

export const SIZES = {
  square: { w: 1080, h: 1080, label: '1080 x 1080' },
  portrait: { w: 1080, h: 1350, label: '1080 x 1350' },
  wide: { w: 1920, h: 1080, label: '1920 x 1080' },
};

export const LAYOUTS = ['hero', 'grid', 'strips'];
export const GRADES = ['sunset', 'neon', 'noir'];
// Round 3 adds the Poster layout and the Dusk grade by appending here,
// so the original lists stay exactly as they were.
LAYOUTS.push('poster');
GRADES.push('dusk');

/** A panel with no photo yet: zoom 1, centred. */
export function emptyPanel() {
  return { img: null, zoom: 1, ox: 0, oy: 0 };
}

/** A tiny deterministic generator (mulberry32) that builds the skyline. */
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The four panel rectangles for a layout, in canvas pixels. The panels fill
 * the area above the caption band, inside the white outer frame, with
 * gutters between them. Every layout shows all four panels.
 */
export function panelRects(size, layout) {
  const { w, h } = size;
  const frame = Math.max(10, Math.round(w * 0.014));
  const gutter = Math.max(6, Math.round(w * 0.01));
  const bandH = Math.round(h * 0.24);
  const area = { x: frame, y: frame, w: w - frame * 2, h: h - bandH - frame };
  const rects = [];
  if (layout === 'poster') return posterLayout(size);
  if (layout === 'hero') {
    const leftW = Math.round(area.w * 0.58);
    rects.push({ x: area.x, y: area.y, w: leftW, h: area.h });
    const rx = area.x + leftW + gutter;
    const rw = area.w - leftW - gutter;
    const rh = Math.floor((area.h - gutter * 2) / 3);
    for (let i = 0; i < 3; i++) {
      rects.push({ x: rx, y: area.y + i * (rh + gutter), w: rw, h: rh });
    }
  } else if (layout === 'grid') {
    const cw = Math.floor((area.w - gutter) / 2);
    const ch = Math.floor((area.h - gutter) / 2);
    rects.push({ x: area.x, y: area.y, w: cw, h: ch });
    rects.push({ x: area.x + cw + gutter, y: area.y, w: cw, h: ch });
    rects.push({ x: area.x, y: area.y + ch + gutter, w: cw, h: ch });
    rects.push({ x: area.x + cw + gutter, y: area.y + ch + gutter, w: cw, h: ch });
  } else {
    // strips: four tall panels side by side.
    const sw = Math.floor((area.w - gutter * 3) / 4);
    for (let i = 0; i < 4; i++) {
      rects.push({ x: area.x + i * (sw + gutter), y: area.y, w: sw, h: area.h });
    }
  }
  return { rects, frame, gutter, bandH };
}

/**
 * Works out a crop that puts one point of a photo at one point of a panel.
 *
 * `fx`, `fy` are the focus point as fractions of the photo (0..1); `ax`,
 * `ay` are where that point should land as fractions of the panel. The
 * offsets come back in canvas pixels, clamped so the photo still covers
 * the panel — a focus the panel cannot reach lands as close as it can.
 * Different focus points and zooms are what keep two panels of the same
 * photo from looking alike.
 */
export function focusCrop(rect, img, zoom, fx, fy, ax = 0.5, ay = 0.5) {
  const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
  const s = base * zoom;
  const pw = img.naturalWidth * s;
  const ph = img.naturalHeight * s;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const wantX = rect.x + ax * rect.w - fx * pw;
  const wantY = rect.y + ay * rect.h - fy * ph;
  const centredX = rect.x + (rect.w - pw) / 2;
  const centredY = rect.y + (rect.h - ph) / 2;
  const ox = clamp(wantX - centredX, -(pw - rect.w) / 2, (pw - rect.w) / 2);
  const oy = clamp(wantY - centredY, -(ph - rect.h) / 2, (ph - rect.h) / 2);
  return { zoom, ox, oy };
}

/** The canvas filter each grade paints its photos with. */
function gradeFilter(grade) {
  if (grade === 'sunset') return 'saturate(1.55) contrast(1.12) sepia(0.38) brightness(1.03)';
  if (grade === 'neon') return 'saturate(1.85) contrast(1.14) hue-rotate(-16deg) brightness(1.04)';
  if (grade === 'noir') return 'saturate(0.15) contrast(1.25) brightness(1.06)';
  if (grade === 'dusk') return duskFilter();
  return 'none';
}

/** Paints one photo into its panel, cover-fit, with the panel's zoom, pan and grade. */
function drawPanelPhoto(ctx, rect, panel, grade) {
  const img = panel.img;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (!img) {
    const g = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
    g.addColorStop(0, '#3b1d5e');
    g.addColorStop(1, '#12081f');
    ctx.fillStyle = g;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
    return;
  }
  const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
  const s = base * panel.zoom;
  const pw = img.naturalWidth * s;
  const ph = img.naturalHeight * s;
  let dx = rect.x + (rect.w - pw) / 2 + panel.ox;
  let dy = rect.y + (rect.h - ph) / 2 + panel.oy;
  dx = Math.min(rect.x, Math.max(rect.x + rect.w - pw, dx));
  dy = Math.min(rect.y, Math.max(rect.y + rect.h - ph, dy));
  // The grade is baked into the photo itself, not just washed over it.
  ctx.filter = gradeFilter(grade);
  ctx.drawImage(img, dx, dy, pw, ph);
  ctx.filter = 'none';
  ctx.restore();
}

/** A colour wash over the whole panel area, on top of the graded photos. */
function drawGrade(ctx, area, grade) {
  if (grade === 'noir') return;
  if (grade === 'dusk') { duskWash(ctx, area); return; }
  ctx.save();
  if (grade === 'neon') {
    ctx.globalCompositeOperation = 'overlay';
    const neon = ctx.createLinearGradient(area.x, area.y, area.x + area.w, area.y + area.h);
    neon.addColorStop(0, 'rgba(255, 0, 160, 0.38)');
    neon.addColorStop(0.55, 'rgba(120, 0, 255, 0.22)');
    neon.addColorStop(1, 'rgba(0, 220, 255, 0.34)');
    ctx.fillStyle = neon;
    ctx.fillRect(area.x, area.y, area.w, area.h);
    ctx.globalCompositeOperation = 'source-over';
    // A magenta glow from the top edge, so the neon reads at a glance.
    const glow = ctx.createLinearGradient(0, area.y, 0, area.y + area.h * 0.4);
    glow.addColorStop(0, 'rgba(255, 0, 180, 0.14)');
    glow.addColorStop(1, 'rgba(255, 0, 180, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(area.x, area.y, area.w, area.h * 0.4);
  } else {
    const warm = ctx.createLinearGradient(0, area.y, 0, area.y + area.h);
    warm.addColorStop(0, 'rgba(255, 120, 50, 0.08)');
    warm.addColorStop(0.55, 'rgba(255, 70, 110, 0.22)');
    warm.addColorStop(1, 'rgba(200, 25, 110, 0.38)');
    ctx.fillStyle = warm;
    ctx.fillRect(area.x, area.y, area.w, area.h);
  }
  ctx.restore();
}

/** A soft darkening towards the poster's edges. */
function drawVignette(ctx, w, h) {
  const v = ctx.createRadialGradient(w / 2, h * 0.42, Math.min(w, h) * 0.42, w / 2, h * 0.5, Math.max(w, h) * 0.75);
  v.addColorStop(0, 'rgba(0, 0, 0, 0)');
  v.addColorStop(1, 'rgba(10, 2, 20, 0.30)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

/** The skyline silhouette and the sun inside the caption band. */
function drawSkyline(ctx, band, w) {
  const rand = seeded(7);
  const { x, y, w: bw, h: bh } = band;
  // Sun: a warm disc rising behind the towers, right of centre.
  const sunR = bh * 0.52;
  const sunX = x + bw * 0.72;
  const sunY = y + bh * 0.62;
  const sun = ctx.createRadialGradient(sunX, sunY, sunR * 0.1, sunX, sunY, sunR);
  sun.addColorStop(0, 'rgba(255, 214, 110, 0.95)');
  sun.addColorStop(0.6, 'rgba(255, 120, 60, 0.85)');
  sun.addColorStop(1, 'rgba(255, 60, 120, 0)');
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();
  // Towers: a fixed-seed row of dark blocks with lit windows.
  let bx = x;
  ctx.fillStyle = '#150829';
  while (bx < x + bw) {
    const bwid = bw * (0.03 + rand() * 0.05);
    const bhei = bh * (0.25 + rand() * 0.45);
    const top = y + bh - bhei;
    ctx.fillRect(bx, top, bwid, bhei);
    if (rand() > 0.5) {
      // A rooftop antenna on some towers.
      ctx.fillRect(bx + bwid / 2 - 1, top - bh * 0.08, 2, bh * 0.08);
    }
    // Lit windows: a few warm dots per tower.
    const cols = Math.max(1, Math.floor(bwid / (bw * 0.012)));
    const rows = Math.max(1, Math.floor(bhei / (bh * 0.09)));
    ctx.fillStyle = 'rgba(255, 205, 110, 0.85)';
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if (rand() > 0.62) {
          ctx.fillRect(bx + 3 + c * (bw * 0.012), top + 4 + r * (bh * 0.09), 3, 4);
        }
      }
    }
    ctx.fillStyle = '#150829';
    bx += bwid + 2;
  }
}

/**
 * Sizes the title so it fills the band: tall enough for the band height,
 * wide enough for the band width. The size comes from the smaller of the
 * two caps, then letter spacing stretches a short title out towards the
 * band edges instead of leaving it small in the middle.
 */
function fitTitle(ctx, text, bandW, bandH) {
  const probe = 100;
  ctx.font = `${probe}px Anton, 'Arial Narrow', sans-serif`;
  const perPx = ctx.measureText(text).width / probe;
  const fromWidth = (bandW * 0.92) / perPx;
  const fromHeight = bandH * 0.62;
  let size = Math.max(24, Math.floor(Math.min(fromWidth, fromHeight)));
  ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
  while (ctx.measureText(text).width > bandW * 0.92 && size > 24) {
    size -= 4;
    ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
  }
  let spacing = Math.round(size * 0.04);
  const plain = ctx.measureText(text).width;
  const target = bandW * 0.88;
  if (text.length > 1 && plain < target) {
    const stretch = (target - plain) / (text.length - 1);
    spacing = Math.min(Math.round(stretch), Math.round(size * 0.22));
  }
  return { size, spacing };
}

/**
 * Paints the whole poster onto `canvas` from `state`:
 * { sizeKey, layout, grade, title, subtitle, panels[4] }.
 * The canvas is resized to the export size; drawing is deterministic.
 */
export function drawPoster(canvas, state) {
  const size = SIZES[state.sizeKey] ?? SIZES.square;
  const { w, h } = size;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#14101c';
  ctx.fillRect(0, 0, w, h);

  const { rects, frame, bandH } = panelRects(size, state.layout);
  const area = { x: frame, y: frame, w: w - frame * 2, h: h - bandH - frame };
  // The Poster layout fills the whole poster, band in the middle, so its
  // panel area runs to the foot instead of stopping above the band.
  if (state.layout === 'poster') area.h = h - frame * 2;
  // White gutters: the panel area is white first, the panels sit in it.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(area.x, area.y, area.w, area.h);
  for (let i = 0; i < 4; i++) {
    drawPanelPhoto(ctx, rects[i], state.panels[i] ?? emptyPanel(), state.grade);
  }
  drawGrade(ctx, area, state.grade);
  paintDecor(ctx, area, state.decor);

  // Caption band: sunset gradient, skyline, sun, then the lettering.
  const band = { x: frame, y: h - bandH, w: w - frame * 2, h: bandH - frame };
  // The Poster layout puts its title band in the middle of the poster,
  // between the big photo and the strip — not at the foot.
  if (state.layout === 'poster') band.y = posterLayout(size).bandY;
  const bg = ctx.createLinearGradient(0, band.y, 0, band.y + band.h);
  bg.addColorStop(0, '#2a0a3d');
  bg.addColorStop(0.55, '#a4136e');
  bg.addColorStop(1, '#ff5e3a');
  ctx.fillStyle = bg;
  ctx.fillRect(band.x, band.y, band.w, band.h);
  drawSkyline(ctx, band, w);

  const title = (state.title || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim().toUpperCase();
  const cx = band.x + band.w / 2;
  if (title) {
    const { size, spacing } = fitTitle(ctx, title, band.w, band.h);
    const paint = titlePaint(state.textFx);
    const fxSpacing = Math.min(Math.round(spacing * paint.tracking), Math.round(size * 0.28));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    try {
      ctx.letterSpacing = `${spacing}px`;
    } catch {
      // Older engines ignore letter spacing; the title still draws.
    }
    try {
      ctx.letterSpacing = `${fxSpacing}px`;
    } catch {
      // Older engines ignore letter spacing; the title still draws.
    }
    const ty = band.y + band.h * (subtitle ? 0.32 : 0.5);
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(5, Math.round(size * 0.13));
    ctx.strokeStyle = '#12061f';
    ctx.shadowColor = 'rgba(8, 1, 18, 0.65)';
    ctx.shadowBlur = Math.round(size * 0.1);
    ctx.shadowOffsetY = Math.round(size * 0.05);
    ctx.strokeStyle = paint.outline;
    ctx.lineWidth = Math.max(4, Math.round(size * paint.outlineWidth));
    ctx.shadowColor = paint.shadowColor;
    ctx.shadowBlur = Math.round(size * paint.shadowBlur);
    ctx.shadowOffsetY = Math.round(size * paint.shadowOffsetY);
    ctx.strokeText(title, cx, ty);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(title, cx, ty);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    try {
      ctx.letterSpacing = '0px';
    } catch {
      // ignore
    }
  }
  if (subtitle) {
    const subSize = Math.max(20, Math.round(band.h * 0.16));
    ctx.font = `bold ${subSize}px Anton, 'Arial Narrow', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    try {
      ctx.letterSpacing = `${Math.round(subSize * 0.22)}px`;
    } catch {
      // ignore
    }
    ctx.shadowColor = 'rgba(8, 1, 18, 0.5)';
    ctx.shadowBlur = Math.round(subSize * 0.2);
    ctx.shadowOffsetY = Math.round(subSize * 0.08);
    ctx.fillStyle = 'rgba(255, 235, 245, 0.95)';
    ctx.fillText(subtitle, cx, band.y + band.h * 0.73);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    try {
      ctx.letterSpacing = '0px';
    } catch {
      // ignore
    }
  }

  drawVignette(ctx, w, h);

  // The white frame: the poster's edge, GTA-poster style.
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = frame;
  ctx.strokeRect(frame / 2, frame / 2, w - frame, h - frame);
}
