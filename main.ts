// Neon Vice Cover Studio v2 — make.fun entry program for gta6-cover-art-01.
// Copies app/ and screenshots/ into the output directory and writes the
// dossier the scorer expects, using the vendored buildDossier byte for byte.
// The app itself is fully offline: app/index.html plus plain scripts, local
// fonts and local sample photos — nothing is fetched at runtime.
import { buildDossier } from './vendor/makefun-app.ts';
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ENTRY_TITLE = 'Neon Vice Cover Studio';
const ENTRY_DESCRIPTION =
  'Version 2 of the offline cover-art studio: your photos become a ' +
  'multi-panel, sunset-chrome movie-poster cover — slanted cream-framed ' +
  'panels with cast name tags, a horizontal-stripe chrome title with a ' +
  'neon script accent, a five-star press quote, a gold seal, a palm band ' +
  'and a billing block, poster-ink grading in six grades across seven ' +
  'layouts, per-panel crop with face marking, and PNG export at ' +
  '1920x1080, 1080x1350 and 1080x1080.';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outDir, { recursive: true });
for (const name of ['app', 'screenshots']) {
  rmSync(join(outDir, name), { recursive: true, force: true });
  cpSync(join(here, name), join(outDir, name), { recursive: true });
}

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});

writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`${ENTRY_TITLE}: ${ENTRY_DESCRIPTION}`);
console.log(`dossier.json written to ${join(outDir, 'dossier.json')} (${dossier.length} bytes)`);
