# Vice Cover Studio

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/dmonziee/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/dmonziee/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

An entry for the [gta6-cover-art-01 bounty](https://make.fun/bounty/gta6-cover-art-01) on
[make.fun](https://make.fun/): a web app that turns a person's photo and a caption into
cover art in the style of GTA 6's posters — a multi-panel poster with bold condensed
lettering, a Vice City sunset or neon grade and a skyline at the foot — exported as
a PNG to share.

## What it does

- Load your own photo into any of four panels (or use the two free sample photos).
  Every panel frames a different part of its photo — a face, a detail, a wide view —
  so two panels of the same photo never look alike; drag a photo to reposition it
  and zoom with the slider.
- Fill all four panels with one photo: each panel gets a different crop of it.
- Pick a layout (Hero, Grid, Strips), a colour grade (Sunset, Neon, Noir) and a post
  size (1080 x 1080, 1080 x 1350, 1920 x 1080). The grade is baked into the photos
  themselves — warm and saturated for Sunset, hot magenta-cyan for Neon — with a
  colour wash over the panels on top.
- Edit the title and subtitle; the lettering is set in Anton, an open-licensed
  condensed face shipped under `app/fonts/`, sized to fill the caption band with
  a heavy outline and a drop shadow.
- Export the cover as a PNG. Everything runs offline in a desktop browser from
  the app's own static files; photos are read on your machine and never uploaded.

## Poster layout, Dusk grade and text effects

- Poster layout: one big photo across the top, a full-width title band below
  it, and panels 2–4 as a slim strip along the bottom — the classic one-sheet
  poster, with all four panels still in play.
- Dusk grade: a purple-to-orange twilight. The photos get a saturated, warm,
  hue-shifted filter and a vertical wash — deep purple at the top fading to
  burnt orange at the bottom — so it reads clearly apart from Sunset and Neon.
- Text effects for the title lettering: outline colour (White, Black, Magenta,
  Cyan), shadow (None, Soft, Strong) and letter tracking (Tight, Normal, Wide).
  The defaults — white outline, soft shadow, normal tracking — are the look
  the cover already had, so older covers paint exactly as before.

## Decorations

The cover can also wear procedural vector decorations, drawn with the 2D
canvas API straight onto the panel area — over the photos, under the
caption band, so the title always stays clean. Five families are painted:
palm silhouettes rising from the bottom edge, a rayed setting sun in a top
corner, a small flock of birds across the upper panels, a distant skyline
with rounded towers and a ferris wheel, and flowing wave lines along the
very bottom. Everything is deterministic: fixed positions and shapes, no
randomness, so the same settings always paint the same cover.

Three controls shape them. **Set** picks which families show: All, Palms
(palms and waves only), Sky (sun, birds and skyline only), or None to turn
them off. **Size** scales every decoration — Small, Medium or Large.
**Bold** picks the weight: Soft is a light wash, Bold is near-opaque with
heavier strokes. The defaults are All, Medium and Bold, so decorations are
on from the first paint, and a saved cover without decoration settings
still paints with those defaults.

## Run it

Serve `app/` with any static file server and open `index.html`, for example:

```sh
cd app && python3 -m http.server 8080
```

Then open http://localhost:8080 in desktop Chrome.

## How it is built

- `app/src/poster.js` draws the whole poster on one canvas: panel layout, photo
  crop and grade, sunset caption band with a deterministic skyline, and a title
  fitted to the band's width and height. Its `focusCrop` works out the zoom and
  pan that put one point of a photo at one point of a panel.
- `app/src/editor.js` wires the controls, drag-to-pan and export, and sets the
  opening spread — the two samples alternating across the panels, each cropped
  differently — plus the four different crops of the fill-all button.
- `app/src/shots.js` sets up fixed scenes for screenshots (`?shot=editor`,
  `?shot=cover`).
- `main.ts` (Node 22, standard library only) copies `app/` and `screenshots/`
  to the output directory and writes `dossier.json` with the vendored make.fun
  library (`vendor/makefun-app.ts`).

All artwork is original. No Rockstar Games logo, artwork, character or font is
used; the two sample photos under `app/samples/` were made with an image model
for make.fun and are free to use.
