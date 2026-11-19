# Vice Cover Studio

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/dmonziee/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/dmonziee/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

An entry for the [gta6-cover-art-01 bounty](https://make.fun/bounty/gta6-cover-art-01) on
[make.fun](https://make.fun/): a web app that turns a person's photo and a caption into
cover art in the style of GTA 6's posters — a multi-panel poster with bold condensed
lettering, a Vice City sunset grade and a skyline at the foot — exported as a PNG to share.

## What it does

- Load your own photo into any of four panels (or use the two free sample photos),
  crop each one by dragging it on the cover and zooming with the slider.
- Fill all four panels with one photo, or use several.
- Pick a layout (Hero, Grid, Strips), a colour grade (Sunset, Neon, Noir) and a post
  size (1080 x 1080, 1080 x 1350, 1920 x 1080).
- Edit the title and subtitle; the lettering is set in Anton, an open-licensed
  condensed face shipped under `app/fonts/`.
- Export the cover as a PNG. Everything runs offline in a desktop browser from
  the app's own static files; photos are read on your machine and never uploaded.

## Run it

Serve `app/` with any static file server and open `index.html`, for example:

```sh
cd app && python3 -m http.server 8080
```

Then open http://localhost:8080 in desktop Chrome.

## How it is built

- `app/src/poster.js` draws the whole poster on one canvas: panel layout, photo
  crop and grade, sunset caption band with a deterministic skyline, title fit.
- `app/src/editor.js` wires the controls, drag-to-pan and export.
- `app/src/shots.js` sets up fixed scenes for screenshots (`?shot=editor`,
  `?shot=cover`).
- `main.ts` (Node 22, standard library only) copies `app/` and `screenshots/`
  to the output directory and writes `dossier.json` with the vendored make.fun
  library (`vendor/makefun-app.ts`).

All artwork is original. No Rockstar Games logo, artwork, character or font is
used; the two sample photos under `app/samples/` were made with an image model
for make.fun and are free to use.
