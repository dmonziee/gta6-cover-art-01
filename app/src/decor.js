// Vice Cover Studio — procedural decorations painted over the photo panels.
// Five families: palm silhouettes, a rayed setting sun, birds, a distant
// skyline with a ferris wheel, and flowing waves along the bottom edge.
// Everything is drawn with the 2D canvas API from fixed numbers only:
// no randomness, no clock, no Date — the same settings always paint
// the same cover. The painter calls paintDecor after the grade wash and
// before the caption band, so the decorations sit on the panels without
// covering the title.

export const DEFAULT_DECOR = { set: 'all', size: 'medium', bold: 'bold' };

export const DECOR_SETS = ['all', 'palms', 'sky', 'none'];
export const DECOR_SIZES = ['small', 'medium', 'large'];
export const DECOR_BOLD = ['soft', 'bold'];

// Palette for the decoration families. Warm ink for the silhouettes,
// hot amber for the sun, and a cool dusk violet for the skyline so it
// reads as distant against the photos.
const INK = '#1b0f2e';
const INK_SOFT = '#2c1747';
const SUN_CORE = '#ffb347';
const SUN_EDGE = '#ff6b35';
const SUN_GLOW = 'rgba(255, 178, 71, 0.28)';
const SKYLINE_FILL = '#241539';
const WAVE_STROKE = 'rgba(255, 255, 255, 0.85)';

// Size multipliers applied to every decoration family.
const SIZE_SCALE = { small: 0.78, medium: 1.0, large: 1.28 };

// Boldness controls how solid the decorations read: soft is a light
// wash, bold is near-opaque with heavier strokes.
const BOLD_STYLE = {
  soft: { alpha: 0.55, weight: 2, frond: 3 },
  bold: { alpha: 0.92, weight: 3.5, frond: 5 },
};

function resolveDecor(decor) {
  const merged = { ...DEFAULT_DECOR };
  if (decor && typeof decor === 'object') {
    if (DECOR_SETS.includes(decor.set)) merged.set = decor.set;
    if (DECOR_SIZES.includes(decor.size)) merged.size = decor.size;
    if (DECOR_BOLD.includes(decor.bold)) merged.bold = decor.bold;
  }
  return merged;
}

function familyEnabled(set, family) {
  if (set === 'none') return false;
  if (set === 'all') return true;
  if (set === 'palms') return family === 'palms' || family === 'waves';
  if (set === 'sky') return family === 'sun' || family === 'birds' || family === 'skyline';
  return false;
}

// Draw one drooping frond: a fat quadratic curve that leaves the crown
// and sags toward the ground, drawn as a filled tapered leaf shape.
function drawFrond(ctx, cx, cy, angle, length, width, colour) {
  const tipX = cx + Math.cos(angle) * length;
  const tipY = cy + Math.sin(angle) * length + length * 0.32;
  const midX = cx + Math.cos(angle) * length * 0.55;
  const midY = cy + Math.sin(angle) * length * 0.45 - length * 0.08;
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.quadraticCurveTo(midX, midY, tipX, tipY);
  ctx.quadraticCurveTo(midX + width, midY + width * 0.7, cx + width * 0.4, cy + width * 0.4);
  ctx.closePath();
  ctx.fill();
}

// One palm tree: a gently leaning trunk that thickens toward the base,
// topped by a crown of six drooping fronds fanning out around the top.
function drawPalm(ctx, baseX, baseY, height, lean, style) {
  const topX = baseX + lean;
  const topY = baseY - height;
  const trunkW = Math.max(3, height * 0.045);
  ctx.save();
  ctx.globalAlpha = style.alpha;
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.moveTo(baseX - trunkW, baseY);
  ctx.quadraticCurveTo(baseX + lean * 0.4 - trunkW * 0.5, baseY - height * 0.55, topX - trunkW * 0.4, topY);
  ctx.lineTo(topX + trunkW * 0.4, topY);
  ctx.quadraticCurveTo(baseX + lean * 0.4 + trunkW * 0.5, baseY - height * 0.55, baseX + trunkW, baseY);
  ctx.closePath();
  ctx.fill();
  const crownX = topX;
  const crownY = topY + height * 0.02;
  const frondLen = height * 0.34;
  const frondW = style.frond * 1.6;
  const angles = [-2.75, -2.15, -1.55, -0.95, -0.45, 0.05];
  for (const a of angles) {
    drawFrond(ctx, crownX, crownY, a, frondLen, frondW, INK);
  }
  ctx.fillStyle = INK_SOFT;
  ctx.beginPath();
  ctx.arc(crownX - 4, crownY + 7, 4, 0, Math.PI * 2);
  ctx.arc(crownX + 5, crownY + 8, 4, 0, Math.PI * 2);
  ctx.arc(crownX, crownY + 12, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function paintPalms(ctx, area, scale, style) {
  const groundY = area.y + area.h;
  const palms = [
    { fx: 0.06, height: 0.36, lean: 18 },
    { fx: 0.88, height: 0.44, lean: -22 },
    { fx: 0.94, height: 0.3, lean: -10 },
  ];
  for (const palm of palms) {
    const baseX = area.x + area.w * palm.fx;
    const height = area.h * palm.height * scale;
    drawPalm(ctx, baseX, groundY + 4, height, palm.lean * scale, style);
  }
}

// A setting sun: a warm disc in the top-right corner with straight
// triangular rays radiating outward, plus a soft halo behind it.
function paintSun(ctx, area, scale, style) {
  const radius = Math.min(area.w, area.h) * 0.1 * scale;
  const cx = area.x + area.w * 0.86;
  const cy = area.y + area.h * 0.2;
  ctx.save();
  ctx.globalAlpha = style.alpha;
  // Halo.
  ctx.fillStyle = SUN_GLOW;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 1.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = SUN_EDGE;
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const rayLen = radius * (i % 2 === 0 ? 1.55 : 1.3);
    const spread = 0.16;
    const bx = cx + Math.cos(angle - spread) * radius * 1.05;
    const by = cy + Math.sin(angle - spread) * radius * 1.05;
    const tx = cx + Math.cos(angle) * rayLen;
    const ty = cy + Math.sin(angle) * rayLen;
    const ex = cx + Math.cos(angle + spread) * radius * 1.05;
    const ey = cy + Math.sin(angle + spread) * radius * 1.05;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(tx, ty);
    ctx.lineTo(ex, ey);
    ctx.closePath();
    ctx.fill();
  }
  const grad = ctx.createRadialGradient(cx - radius * 0.3, cy - radius * 0.3, radius * 0.1, cx, cy, radius);
  grad.addColorStop(0, SUN_CORE);
  grad.addColorStop(1, SUN_EDGE);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// One bird: a simple two-stroke "V" curve, wings swept upward.
function drawBird(ctx, x, y, span, weight, colour) {
  ctx.strokeStyle = colour;
  ctx.lineWidth = weight;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - span, y - span * 0.35);
  ctx.quadraticCurveTo(x - span * 0.4, y + span * 0.25, x, y);
  ctx.quadraticCurveTo(x + span * 0.4, y + span * 0.25, x + span, y - span * 0.35);
  ctx.stroke();
}

function paintBirds(ctx, area, scale, style) {
  const birds = [
    { fx: 0.18, fy: 0.12, span: 11 },
    { fx: 0.26, fy: 0.08, span: 9 },
    { fx: 0.33, fy: 0.16, span: 12 },
    { fx: 0.42, fy: 0.07, span: 8 },
    { fx: 0.5, fy: 0.14, span: 10 },
    { fx: 0.58, fy: 0.09, span: 9 },
    { fx: 0.66, fy: 0.18, span: 11 },
  ];
  ctx.save();
  ctx.globalAlpha = style.alpha;
  for (const bird of birds) {
    const x = area.x + area.w * bird.fx;
    const y = area.y + area.h * bird.fy;
    drawBird(ctx, x, y, bird.span * scale, style.weight, INK);
  }
  ctx.restore();
}

// One tower: a rectangle with a rounded top, drawn as a filled path.
function drawTower(ctx, x, baseY, w, h, colour) {
  const r = Math.min(w / 2, 10);
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(x, baseY);
  ctx.lineTo(x, baseY - h + r);
  ctx.arc(x + w / 2, baseY - h + r, w / 2, Math.PI, 0);
  ctx.lineTo(x + w, baseY);
  ctx.closePath();
  ctx.fill();
  // A few lit windows so the tower reads as a building at dusk.
  ctx.fillStyle = 'rgba(255, 205, 110, 0.9)';
  const rows = Math.max(1, Math.floor(h / 22));
  for (let i = 0; i < rows; i++) {
    const wy = baseY - 14 - i * 20;
    ctx.fillRect(x + w * 0.3, wy, 3, 5);
    ctx.fillRect(x + w * 0.62, wy, 3, 5);
  }
}

// A ferris wheel: a rim circle, eight spokes, and small cabins hanging
// from the rim, standing on two angled legs.
function drawWheel(ctx, cx, baseY, radius, style) {
  const cy = baseY - radius - 6;
  ctx.save();
  ctx.globalAlpha = style.alpha;
  ctx.strokeStyle = SKYLINE_FILL;
  ctx.lineWidth = style.weight;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.55, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
    ctx.stroke();
  }
  ctx.fillStyle = SUN_EDGE;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const px = cx + Math.cos(a) * radius;
    const py = cy + Math.sin(a) * radius;
    ctx.fillRect(px - 3, py - 2, 6, 5);
  }
  ctx.strokeStyle = SKYLINE_FILL;
  ctx.lineWidth = style.weight + 1;
  ctx.beginPath();
  ctx.moveTo(cx - radius * 0.55, cy + radius * 0.8);
  ctx.lineTo(cx, cy);
  ctx.lineTo(cx + radius * 0.55, cy + radius * 0.8);
  ctx.stroke();
  ctx.restore();
}

function paintSkyline(ctx, area, scale, style) {
  const baseY = area.y + area.h * 0.94;
  const towers = [
    { fx: 0.1, w: 0.055, h: 0.13 },
    { fx: 0.17, w: 0.07, h: 0.2 },
    { fx: 0.26, w: 0.05, h: 0.11 },
    { fx: 0.32, w: 0.075, h: 0.24 },
    { fx: 0.41, w: 0.06, h: 0.16 },
    { fx: 0.68, w: 0.065, h: 0.19 },
    { fx: 0.76, w: 0.05, h: 0.12 },
    { fx: 0.83, w: 0.07, h: 0.21 },
    { fx: 0.91, w: 0.055, h: 0.15 },
  ];
  ctx.save();
  ctx.globalAlpha = style.alpha;
  for (const tower of towers) {
    const x = area.x + area.w * tower.fx;
    drawTower(ctx, x, baseY, area.w * tower.w * scale, area.h * tower.h * scale, SKYLINE_FILL);
  }
  // The wheel stands in the gap between the two tower clusters.
  const wheelX = area.x + area.w * 0.56;
  const wheelR = Math.min(area.w, area.h) * 0.085 * scale;
  drawWheel(ctx, wheelX, baseY, wheelR, style);
  ctx.restore();
}

// Two flowing wave lines along the very bottom edge of the panel area.
function paintWaves(ctx, area, scale, style) {
  const lines = [
    { fy: 0.95, amp: 6, phase: 0 },
    { fy: 0.972, amp: 4, phase: 1.6 },
  ];
  ctx.save();
  ctx.globalAlpha = style.alpha;
  ctx.strokeStyle = WAVE_STROKE;
  ctx.lineWidth = style.weight;
  ctx.lineCap = 'round';
  for (const line of lines) {
    const baseY = area.y + area.h * line.fy;
    const amp = line.amp * scale;
    ctx.beginPath();
    ctx.moveTo(area.x + 6, baseY);
    const steps = 24;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const x = area.x + 6 + t * (area.w - 12);
      const y = baseY + Math.sin(t * Math.PI * 5 + line.phase) * amp;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

// Paint every enabled decoration family onto the panel area, in order
// from back to front. Missing or partial settings fall back to the
// defaults, so older saved states without decorations still paint.
export function paintDecor(ctx, area, decor) {
  if (!ctx || !area) return;
  const settings = resolveDecor(decor);
  if (settings.set === 'none') return;
  const scale = SIZE_SCALE[settings.size] ?? 1.0;
  const style = BOLD_STYLE[settings.bold] ?? BOLD_STYLE.bold;
  if (familyEnabled(settings.set, 'skyline')) paintSkyline(ctx, area, scale, style);
  if (familyEnabled(settings.set, 'sun')) paintSun(ctx, area, scale, style);
  if (familyEnabled(settings.set, 'birds')) paintBirds(ctx, area, scale, style);
  if (familyEnabled(settings.set, 'palms')) paintPalms(ctx, area, scale, style);
  if (familyEnabled(settings.set, 'waves')) paintWaves(ctx, area, scale, style);
}
