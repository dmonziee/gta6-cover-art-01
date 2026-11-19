// Vice Cover Studio — the editor wiring.
//
// Holds the poster state, connects every control to it, and redraws the
// canvas on every change. Photos come from the person's own files (read on
// this machine, never uploaded) or from the two free sample photos shipped
// under app/samples/. Dragging on the preview pans the photo in the panel
// under the pointer; the zoom slider zooms it. Export writes the PNG the
// preview shows, at the chosen post size.

import { SIZES, drawPoster, emptyPanel, panelRects } from './poster.js';
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

/** Loads every panel from the samples: panel 1 gets `first`, the rest `rest`. */
async function loadSamples(first, rest) {
  const a = await loadImage(`samples/${first}.jpg`);
  const b = await loadImage(`samples/${rest}.jpg`);
  state.panels[0] = { img: a, zoom: 1.05, ox: 0, oy: 0 };
  state.panels[1] = { img: b, zoom: 1.2, ox: 0, oy: -20 };
  state.panels[2] = { img: b, zoom: 1.25, ox: 60, oy: 0 };
  state.panels[3] = { img: a, zoom: 1.15, ox: 0, oy: -10 };
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

document.getElementById('fill-all').addEventListener('click', () => {
  const source = state.panels[activePanel];
  if (!source.img) {
    setStatus('Load a photo into the active panel first, then fill all panels with it.');
    return;
  }
  for (let i = 0; i < 4; i++) {
    state.panels[i] = { img: source.img, zoom: 1, ox: 0, oy: 0 };
  }
  setStatus('All four panels now use the active panel’s photo — crop each one differently.');
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
