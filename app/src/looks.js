// Vice Cover Studio — the extra looks: Poster layout, Dusk grade, text effects.
//
// This module holds the round-3 additions so poster.js stays small: the
// fourth layout (one big photo, a title band, a slim strip of the other
// three panels), the fourth grade (a purple-to-orange twilight), and the
// title lettering presets the editor offers. Everything here is pure
// geometry and paint values — no photos, no clock, no randomness — so the
// same state always paints the same poster.

/** The outline colours the editor offers for the title lettering. */
export const OUTLINE_CHOICES = ['white', 'black', 'magenta', 'cyan'];

/** The shadow strengths the editor offers for the title lettering. */
export const SHADOW_CHOICES = ['none', 'soft', 'strong'];

/** The letter-tracking options the editor offers for the title. */
export const TRACKING_CHOICES = ['tight', 'normal', 'wide'];

/** The title lettering a cover gets before the person picks anything. */
export const DEFAULT_TEXT_FX = { outline: 'white', shadow: 'soft', tracking: 'normal' };

/** The outline colour, as a canvas colour, for each outline choice. */
const OUTLINE_COLOURS = {
  white: '#ffffff',
  black: '#12061f',
  magenta: '#ff2ea6',
  cyan: '#2ee6ff',
};

/**
 * The shadow paint for each shadow choice: its colour, and its blur and
 * drop as fractions of the fitted title size. None means no shadow at all;
 * soft is the gentle drop the cover already had; strong is a hard, deep
 * drop for titles that sit over a busy photo.
 */
const SHADOW_PAINT = {
  none: { color: 'rgba(8, 1, 18, 0)', blur: 0, offsetY: 0 },
  soft: { color: 'rgba(8, 1, 18, 0.65)', blur: 0.1, offsetY: 0.05 },
  strong: { color: 'rgba(8, 1, 18, 0.85)', blur: 0.18, offsetY: 0.09 },
};

/**
 * How much each tracking choice stretches the letter spacing fitTitle
 * works out. Tight pulls the letters close for a dense, punchy title;
 * normal leaves the spacing alone; wide opens it out for a short title
 * that would otherwise sit small in the band.
 */
const TRACKING_MULTIPLIER = {
  tight: 0.55,
  normal: 1,
  wide: 1.35,
};

/**
 * The paint for one title-lettering choice: the outline colour and width,
 * the shadow colour, blur and drop, and the tracking multiplier. The
 * fractions are of the fitted title size; poster.js multiplies them out.
 * Any choice the editor does not know falls back to the default — white
 * outline, soft shadow, normal tracking — which is the look the cover
 * already had, so a cover made before these presets still paints the
 * same.
 */
export function titlePaint(fx = {}) {
  const outline = OUTLINE_CHOICES.includes(fx.outline) ? fx.outline : DEFAULT_TEXT_FX.outline;
  const shadow = SHADOW_CHOICES.includes(fx.shadow) ? fx.shadow : DEFAULT_TEXT_FX.shadow;
  const tracking = TRACKING_CHOICES.includes(fx.tracking) ? fx.tracking : DEFAULT_TEXT_FX.tracking;
  const shade = SHADOW_PAINT[shadow];
  return {
    outline: OUTLINE_COLOURS[outline],
    outlineWidth: 0.13,
    shadowColor: shade.color,
    shadowBlur: shade.blur,
    shadowOffsetY: shade.offsetY,
    tracking: TRACKING_MULTIPLIER[tracking],
  };
}

/**
 * The canvas filter string for the Dusk grade: saturated, a little more
 * contrast, and pushed toward purple-orange twilight with a hue shift and
 * a touch of sepia warmth. The wash below does the rest of the work; the
 * filter makes sure the photos themselves carry the dusk, not just the
 * overlay.
 */
export function duskFilter() {
  return 'saturate(1.7) contrast(1.16) hue-rotate(18deg) sepia(0.22) brightness(1.02)';
}

/**
 * The dusk wash: a vertical twilight gradient over the panel area — deep
 * purple at the top, fading through magenta to burnt orange at the bottom
 * — laid over the graded photos so the whole cover reads as dusk at a
 * glance. A violet glow from the top edge deepens the twilight sky.
 */
export function duskWash(ctx, area) {
  ctx.save();
  const wash = ctx.createLinearGradient(0, area.y, 0, area.y + area.h);
  wash.addColorStop(0, 'rgba(58, 16, 96, 0.48)');
  wash.addColorStop(0.45, 'rgba(140, 32, 120, 0.3)');
  wash.addColorStop(0.8, 'rgba(230, 90, 40, 0.22)');
  wash.addColorStop(1, 'rgba(255, 122, 26, 0.34)');
  ctx.fillStyle = wash;
  ctx.fillRect(area.x, area.y, area.w, area.h);
  const glow = ctx.createLinearGradient(0, area.y, 0, area.y + area.h * 0.45);
  glow.addColorStop(0, 'rgba(90, 30, 160, 0.24)');
  glow.addColorStop(1, 'rgba(90, 30, 160, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(area.x, area.y, area.w, area.h * 0.45);
  ctx.restore();
}

/**
 * The four panel rectangles for the Poster layout, in canvas pixels.
 * Panel 1 is one big photo across the top, about two thirds of the panel
 * area; below it sits the full-width title band; panels 2–4 run as a slim
 * horizontal strip along the very bottom, each a third of the width. The
 * band is shorter here than in the other layouts, so the big photo still
 * has room to breathe. Returns the same shape panelRects returns, plus
 * bandY: the top edge of the title band, which the painter needs because
 * the band is not at the foot of the poster in this layout.
 */
export function posterLayout(size) {
  const { w, h } = size;
  const frame = Math.max(10, Math.round(w * 0.014));
  const gutter = Math.max(6, Math.round(w * 0.01));
  // A shorter band than the other layouts (17% of the height instead of
  // 24%): the band still holds the skyline and the title, and the big
  // photo above it keeps most of the poster.
  const bandH = Math.round(h * 0.17);
  // Unlike the other layouts, the poster fills the whole content height
  // — the band sits in the middle, so the strip runs to the foot of the
  // poster instead of leaving the bottom band-height empty.
  const contentH = h - frame * 2;
  const bandDrawnH = bandH - frame;
  const rest = contentH - bandDrawnH - gutter * 2;
  // The big photo takes about two thirds of the poster height; what is
  // left after the band and the gutters is the slim strip at the bottom.
  const bigH = Math.round(rest * 0.82);
  const bandY = frame + bigH + gutter;
  const stripY = bandY + bandDrawnH + gutter;
  const stripH = rest - bigH;
  const stripW = Math.floor((w - frame * 2 - gutter * 2) / 3);
  const rects = [
    // Panel 1: the big photo, full width, across the top.
    { x: frame, y: frame, w: w - frame * 2, h: bigH },
    // Panels 2–4: the slim strip along the bottom, a third each.
    { x: frame, y: stripY, w: stripW, h: stripH },
    { x: frame + stripW + gutter, y: stripY, w: stripW, h: stripH },
    { x: frame + stripW * 2 + gutter * 2, y: stripY, w: stripW, h: stripH },
  ];
  return { rects, frame, gutter, bandH, bandY };
}
