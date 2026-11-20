// Vice Cover Studio — the entrypoint for gta6-cover-art-01.
//
// The app itself is plain static files under app/ (index.html, its modules,
// the Anton title font and the two sample photos), and the screenshots are
// renders the app drew. This program hands both in: it copies app/ and
// screenshots/ into the output directory and writes dossier.json there with
// the vendored make.fun library, so the judge can read the app and its
// covers. Node 22, standard library only; no network, no clock, no files
// outside this repository, so two runs write the same bytes.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outRoot = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The caps the scorer grades against (this competition's gate.json).
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};
// The same 256 KiB screenshot cap, checked before handing the files in so
// a too-large image fails here with a plain message instead of at intake.
const SCREENSHOT_MAX_BYTES = 262144;

/** Copies a directory tree into `dest`, entries in code-unit order. */
function copyTree(sourceDir, destDir) {
  mkdirSync(destDir, { recursive: true });
  const names = readdirSync(sourceDir).sort();
  for (const name of names) {
    const from = join(sourceDir, name);
    const to = join(destDir, name);
    if (statSync(from).isDirectory()) copyTree(from, to);
    else copyFileSync(from, to);
  }
}

/** The screenshot files in a directory, in name order. */
function screenshotNames(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => !name.startsWith('.'))
    .sort();
}

const appDir = join(repoRoot, 'app');
const shotsDir = join(repoRoot, 'screenshots');
if (!existsSync(appDir)) {
  console.error('app/: no such directory — the app is missing');
  process.exit(1);
}

const shots = screenshotNames(shotsDir);
if (shots.length < 3 || shots.length > 4) {
  console.error(`screenshots/: ${shots.length} images — this entry needs 3 or 4`);
  process.exit(1);
}
for (const name of shots) {
  const bytes = statSync(join(shotsDir, name)).size;
  if (bytes > SCREENSHOT_MAX_BYTES) {
    console.error(`screenshots/${name}: ${bytes} bytes, over the 256 KiB cap`);
    process.exit(1);
  }
}

mkdirSync(outRoot, { recursive: true });
copyTree(appDir, join(outRoot, 'app'));
copyTree(shotsDir, join(outRoot, 'screenshots'));

writeFileSync(join(outRoot, 'dossier.json'), buildDossier(outRoot, DOSSIER_CAPS));
console.log(`handed in app/ and ${shots.length} screenshots, dossier written`);
