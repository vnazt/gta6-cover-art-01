// Neon Vice Cover Studio - hand-in program (Node 22, standard library only).
//
// The entry itself is the static web app under app/: plain files a desktop
// browser opens straight from disk or any static host, with no build step and
// no network calls. This program packages that app for the judges. It mirrors
// app/ and screenshots/ from beside this file into the output directory, then
// writes dossier.json there with the vendored make.fun library, byte for byte
// the summary the scorer rebuilds and compares against.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const entryDir = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(entryDir, 'app'), join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(entryDir, 'screenshots'))) {
  cpSync(join(entryDir, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The caps below are the scorer's own (reference/gate.json). Only
// text_max_bytes shapes the dossier's bytes; the rest make this program refuse
// an entry the scorer would refuse anyway: more than 4 screenshots or one over
// 256 KiB, more than 993 files or 48 MiB under app/, or a path under app/
// longer than 1000 bytes.
const dossierBytes = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossierBytes);
