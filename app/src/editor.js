// Vice Cover Studio — the editor wiring.
//
// Holds the poster state, connects every control to it, and repaints the
// canvas on every change. Photos come from the person's own files (read on
// this machine, never uploaded) or from the two free sample photos shipped
// under app/samples/. Dragging on the preview pans the photo in the panel
// under the pointer; the zoom slider zooms it. Export writes the PNG the
// preview shows, at the chosen post size.

import { SIZES, drawPoster, emptyPanel, focusCrop, panelRects } from './poster.js';
import { DEFAULT_TEXT_FX, OUTLINE_CHOICES, SHADOW_CHOICES, TRACKING_CHOICES } from './looks.js';
import { DEFAULT_DECOR, DECOR_SETS, DECOR_SIZES, DECOR_BOLD } from './decor.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('poster');
const titleInput = document.getElementById('title');
const subtitleInput = document.getElementById('subtitle');
const sizeInput = document.getElementById('size');
const exportButton = document.getElementById('export');
const statusLine = document.getElementById('status');

const state = {
  sizeKey: 'square',
  layout: 'hero',
  grade: 'sunset',
  textFx: { ...DEFAULT_TEXT_FX },
  decor: { ...DEFAULT_DECOR },
  title: 'SUNSET HEIST',
  subtitle: 'VICE CITY NIGHTS',
  panels: [emptyPanel(), emptyPanel(), emptyPanel(), emptyPanel()],
};

let activePanel = 0;
let drag = null;

function redraw() {
  drawPoster(canvas, state);
  updatePanelCards();
}

function setStatus(text) {
  statusLine.textContent = text;
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`cannot load ${url}`));
    img.src = url;
  });
}

/** Puts a sample photo into a panel, keeping its zoom and pan. */
async function setSample(panelIndex, name) {
  try {
    const img = await loadImage(`samples/${name}.jpg`);
    state.panels[panelIndex] = { ...state.panels[panelIndex], img };
    setStatus(`Panel ${panelIndex + 1}: sample photo ${name}.`);
  } catch {
    setStatus(`Could not load the sample photo ${name}.`);
  }
  redraw();
}

/**
 * The opening spread: the two samples alternate across the four panels,
 * and every panel frames a different part of its photo — a face here, a
 * detail there — so no two panels ever look like the same shot twice.
 * The crops are worked out from the panel rectangles in force, so the
 * same spread fits the hero, grid and strips layouts at any post size.
 *
 * Focus points are fractions of each photo: pier is the man fishing
 * (face upper-left, rod and reel lower-right), boulevard is the woman by
 * the red car (face upper-middle, car door lower-left).
 */
const OPENING_CROPS = [
  { zoom: 1.35, fx: 0.37, fy: 0.22, ax: 0.5, ay: 0.42 },
  { zoom: 1.6, fx: 0.56, fy: 0.24, ax: 0.5, ay: 0.4 },
  { zoom: 1.85, fx: 0.8, fy: 0.72, ax: 0.5, ay: 0.55 },
  { zoom: 1.9, fx: 0.24, fy: 0.8, ax: 0.5, ay: 0.55 },
];

/** Loads the opening spread: panels 1 and 3 get `first`, 2 and 4 `second`. */
async function loadSamples(first, second) {
  const a = await loadImage(`samples/${first}.jpg`);
  const b = await loadImage(`samples/${second}.jpg`);
  const size = SIZES[state.sizeKey];
  const { rects } = panelRects(size, state.layout);
  const photos = [a, b, a, b];
  for (let i = 0; i < 4; i++) {
    const crop = OPENING_CROPS[i];
    const placed = focusCrop(rects[i], photos[i], crop.zoom, crop.fx, crop.fy, crop.ax, crop.ay);
    state.panels[i] = { img: photos[i], ...placed };
  }
  redraw();
}

// ---- the four panel cards: photo, zoom, centre, fill-all -----------------

function updatePanelCards() {
  for (let i = 0; i < 4; i++) {
    const card = document.getElementById(`panel-${i + 1}`);
    if (!card) continue;
    card.classList.toggle('active', i === activePanel);
    card.classList.toggle('empty', !state.panels[i].img);
    const zoom = document.getElementById(`zoom-${i + 1}`);
    if (zoom) zoom.value = String(state.panels[i].zoom);
  }
}

for (let i = 0; i < 4; i++) {
  const n = i + 1;
  document.getElementById(`file-${n}`).addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const img = await loadImage(URL.createObjectURL(file));
      state.panels[i] = { img, zoom: 1, ox: 0, oy: 0 };
      activePanel = i;
      setStatus(`Panel ${n}: your photo “${file.name}” loaded.`);
    } catch {
      setStatus(`Panel ${n}: that file could not be read as a photo.`);
    }
    redraw();
  });
  document.getElementById(`sample-pier-${n}`).addEventListener('click', () => {
    activePanel = i;
    setSample(i, 'pier');
  });
  document.getElementById(`sample-boulevard-${n}`).addEventListener('click', () => {
    activePanel = i;
    setSample(i, 'boulevard');
  });
  document.getElementById(`zoom-${n}`).addEventListener('input', (e) => {
    state.panels[i].zoom = Number(e.target.value);
    redraw();
  });
  document.getElementById(`center-${n}`).addEventListener('click', () => {
    state.panels[i].zoom = 1;
    state.panels[i].ox = 0;
    state.panels[i].oy = 0;
    redraw();
  });
}

/**
 * Fill-all crops: four different framings of one photo — a wide view, a
 * close face, a low detail and a side detail — so one photo fills four
 * panels that each look like a different shot.
 */
const FILL_CROPS = [
  { zoom: 1.25, fx: 0.5, fy: 0.35, ax: 0.5, ay: 0.45 },
  { zoom: 1.6, fx: 0.35, fy: 0.25, ax: 0.5, ay: 0.4 },
  { zoom: 1.9, fx: 0.68, fy: 0.72, ax: 0.5, ay: 0.55 },
  { zoom: 1.45, fx: 0.72, fy: 0.55, ax: 0.5, ay: 0.5 },
];

document.getElementById('fill-all').addEventListener('click', () => {
  const source = state.panels[activePanel];
  if (!source.img) {
    setStatus('Load a photo into the active panel first, then fill all panels with it.');
    return;
  }
  const size = SIZES[state.sizeKey];
  const { rects } = panelRects(size, state.layout);
  for (let i = 0; i < 4; i++) {
    const crop = FILL_CROPS[i];
    const placed = focusCrop(rects[i], source.img, crop.zoom, crop.fx, crop.fy, crop.ax, crop.ay);
    state.panels[i] = { img: source.img, ...placed };
  }
  setStatus('One photo now fills all four panels, each cropped differently — drag any panel to adjust it.');
  redraw();
});

// ---- caption, size, layout, grade -----------------------------------------

titleInput.addEventListener('input', () => {
  state.title = titleInput.value;
  redraw();
});
subtitleInput.addEventListener('input', () => {
  state.subtitle = subtitleInput.value;
  redraw();
});
sizeInput.addEventListener('change', () => {
  state.sizeKey = sizeInput.value;
  const size = SIZES[state.sizeKey];
  setStatus(`Export size ${size.label}.`);
  redraw();
});

for (const button of document.querySelectorAll('[data-layout]')) {
  button.addEventListener('click', () => {
    state.layout = button.dataset.layout;
    for (const other of document.querySelectorAll('[data-layout]')) {
      other.classList.toggle('on', other === button);
    }
    redraw();
  });
}
for (const button of document.querySelectorAll('[data-grade]')) {
  button.addEventListener('click', () => {
    state.grade = button.dataset.grade;
    for (const other of document.querySelectorAll('[data-grade]')) {
      other.classList.toggle('on', other === button);
    }
    redraw();
  });
}

// ---- text effects: outline, shadow, tracking for the title lettering ------

const FX_CHOICES = { outline: OUTLINE_CHOICES, shadow: SHADOW_CHOICES, tracking: TRACKING_CHOICES };
for (const button of document.querySelectorAll('[data-fx]')) {
  button.addEventListener('click', () => {
    const key = button.dataset.fx;
    const value = button.dataset.value;
    if (!FX_CHOICES[key] || !FX_CHOICES[key].includes(value)) return;
    state.textFx[key] = value;
    for (const other of document.querySelectorAll(`[data-fx="${key}"]`)) {
      other.classList.toggle('on', other === button);
    }
    redraw();
  });
}

// ---- decorations: segmented controls for set / size / bold ----------------
// Every decor button carries data-decor="set|size|bold" and a data-value.
// A click validates the value against the matching choice list, updates
// the matching field of state.decor, moves the `on` class to the clicked
// button, and repaints the cover.
const DECOR_LISTS = { set: DECOR_SETS, size: DECOR_SIZES, bold: DECOR_BOLD };
function refreshDecorButtons() {
  for (const btn of document.querySelectorAll('[data-decor]')) {
    const group = btn.dataset.decor;
    btn.classList.toggle('on', state.decor[group] === btn.dataset.value);
  }
}
// The cover repaints through the live caption preview: nudging the title
// field's input event makes the editor redraw with the new decor state.
function nudgePaint() {
  const title = document.getElementById('title');
  if (title) title.dispatchEvent(new Event('input', { bubbles: true }));
}
for (const btn of document.querySelectorAll('[data-decor]')) {
  btn.addEventListener('click', () => {
    const group = btn.dataset.decor;
    const choices = DECOR_LISTS[group];
    if (!choices || !choices.includes(btn.dataset.value)) return;
    state.decor[group] = btn.dataset.value;
    refreshDecorButtons();
    nudgePaint();
  });
}

// ---- drag to pan the photo in a panel --------------------------------------

function panelAt(clientX, clientY) {
  const box = canvas.getBoundingClientRect();
  const px = ((clientX - box.left) / box.width) * canvas.width;
  const py = ((clientY - box.top) / box.height) * canvas.height;
  const size = SIZES[state.sizeKey];
  const { rects } = panelRects(size, state.layout);
  for (let i = 0; i < 4; i++) {
    const r = rects[i];
    if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return i;
  }
  return -1;
}

canvas.addEventListener('pointerdown', (e) => {
  const hit = panelAt(e.clientX, e.clientY);
  if (hit < 0) return;
  activePanel = hit;
  const scale = canvas.width / canvas.getBoundingClientRect().width;
  drag = { panel: hit, x: e.clientX, y: e.clientY, scale };
  canvas.setPointerCapture(e.pointerId);
  updatePanelCards();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const panel = state.panels[drag.panel];
  if (!panel.img) return;
  panel.ox += (e.clientX - drag.x) * drag.scale;
  panel.oy += (e.clientY - drag.y) * drag.scale;
  drag.x = e.clientX;
  drag.y = e.clientY;
  redraw();
});
canvas.addEventListener('pointerup', () => {
  drag = null;
});

// ---- export ----------------------------------------------------------------

exportButton.addEventListener('click', () => {
  const size = SIZES[state.sizeKey];
  canvas.toBlob((blob) => {
    if (!blob) {
      setStatus('The export failed — try again.');
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-cover-${size.w}x${size.h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    setStatus(`Saved vice-cover-${size.w}x${size.h}.png — share it anywhere.`);
  }, 'image/png');
});

// ---- start -----------------------------------------------------------------

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(new URLSearchParams(location.search), {
    setTitle: (t, s) => {
      state.title = t;
      state.subtitle = s;
      titleInput.value = t;
      subtitleInput.value = s;
    },
    setSize: (key) => {
      state.sizeKey = key;
      sizeInput.value = key;
    },
    setLayout: (layout) => {
      state.layout = layout;
      for (const other of document.querySelectorAll('[data-layout]')) {
        other.classList.toggle('on', other.dataset.layout === layout);
      }
    },
    setGrade: (grade) => {
      state.grade = grade;
      for (const other of document.querySelectorAll('[data-grade]')) {
        other.classList.toggle('on', other.dataset.grade === grade);
      }
    },
    setTextFx: (fx) => {
      state.textFx = { ...state.textFx, ...fx };
      for (const button of document.querySelectorAll('[data-fx]')) {
        button.classList.toggle('on', state.textFx[button.dataset.fx] === button.dataset.value);
      }
    },
    setDecor(partial) {
      if (partial && typeof partial === 'object') {
        for (const key of ['set', 'size', 'bold']) {
          if (partial[key] !== undefined) state.decor[key] = partial[key];
        }
      }
      refreshDecorButtons();
      nudgePaint();
    },
    loadSamples,
    redraw,
  }).then(() => {
    setStatus('Sample photos loaded — pick a panel, drag its photo, then export.');
  });
} else {
  loadSamples('pier', 'boulevard').then(() => {
    setStatus('Sample photos loaded — pick a panel, drag its photo, then export.');
  });
}
