// Neon Vice Cover Studio — hand-in program for the gta6-cover-art-01 bounty.
//
// The entry itself is the static web app under app/ (plain files, loads fully
// offline in a desktop browser). This program delivers it: it copies app/ and
// screenshots/ from beside this file into the output directory and writes
// dossier.json there with the vendored make.fun library, then proves the
// dossier is honest by rebuilding it from the copies and comparing bytes.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   MAKEFUN_OUTPUT_DIR=/tmp/out node main.ts

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's own caps, handed to the dossier builder so the bytes it writes
// are shaped exactly the way the gate expects.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

/* Screenshot gate, checked before anything is copied: every file in
   screenshots/ must be at most 262144 bytes, with a long side of at most
   1280 px and a short side of at least 480 px. Dimensions are read straight
   from the PNG IHDR or the JPEG start-of-frame header — no dependencies. */
function imageSize(buf: Buffer): { w: number; h: number } | null {
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47 && buf.toString('ascii', 12, 16) === 'IHDR') {
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  }
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let off = 2;
    while (off + 9 < buf.length) {
      if (buf[off] !== 0xff) return null;
      const marker = buf[off + 1];
      const len = buf.readUInt16BE(off + 2);
      if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
        return { w: buf.readUInt16BE(off + 7), h: buf.readUInt16BE(off + 5) };
      }
      if (len < 2) return null;
      off += 2 + len;
    }
  }
  return null;
}

function validateScreenshots(dir: string): void {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (!statSync(p).isFile()) continue;
    const buf = readFileSync(p);
    if (buf.length > 262144) {
      console.error(`screenshot ${name}: ${buf.length} bytes exceeds the 262144-byte cap`);
      process.exit(1);
    }
    const size = imageSize(buf);
    if (!size) {
      console.error(`screenshot ${name}: not a readable PNG or JPEG`);
      process.exit(1);
    }
    const long = Math.max(size.w, size.h);
    const short = Math.min(size.w, size.h);
    if (long > 1280 || short < 480) {
      console.error(`screenshot ${name}: ${size.w}x${size.h} breaks the side limits (long <= 1280, short >= 480)`);
      process.exit(1);
    }
  }
}

function countFiles(dir: string): number {
  let total = 0;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) total += countFiles(p);
    else total += 1;
  }
  return total;
}

validateScreenshots(join(repoDir, 'screenshots'));

mkdirSync(outDir, { recursive: true });
cpSync(join(repoDir, 'app'), join(outDir, 'app'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoDir, 'screenshots'))) {
  cpSync(join(repoDir, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

const copiedFiles = countFiles(join(outDir, 'app')) + countFiles(join(outDir, 'screenshots'));

const dossier = buildDossier(outDir, DOSSIER_CAPS);
const dossierPath = join(outDir, 'dossier.json');
writeFileSync(dossierPath, dossier);

// Self-verification: a dossier rebuilt from the copied tree must equal the
// one just written, byte for byte. Anything else means the hand-in is lying
// about the app, so fail loudly instead of submitting a mismatch.
const rebuilt = buildDossier(outDir, DOSSIER_CAPS);
const onDisk = readFileSync(dossierPath);
if (!Buffer.from(rebuilt).equals(onDisk)) {
  console.error('dossier self-check FAILED: rebuilt dossier differs from dossier.json');
  process.exit(1);
}

console.log(`copied ${copiedFiles} files (app/ + screenshots/) to ${outDir}`);
console.log(`dossier.json: ${onDisk.length} bytes, self-check passed`);
