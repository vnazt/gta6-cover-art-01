// Neon Vice Cover Studio - the hand-in program (Node 22, standard library
// only, no dependencies).
//
// What is being handed in is the static web app under app/: plain files a
// desktop browser opens from disk or any static host, with no build step and
// no network calls. This program's whole job is to package that app for the
// judges:
//
//   1. mirror app/ and screenshots/ from beside this file into the output
//      directory, and
//   2. write dossier.json there, built with the vendored make.fun library
//      (vendor/makefun-app.ts) - the same bytes the scorer rebuilds from the
//      copies and compares against.
//
// Because the scorer's comparison is byte for byte, the program guards
// itself the same way: once dossier.json is written it builds the dossier a
// second time from the copies it just placed in the output directory and
// byte-compares the two. Any disagreement means the hand-in would fail at
// grading, so the program exits non-zero with a plain error instead of
// handing in a dossier it cannot stand behind.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const entryDir = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// --- Validate the screenshots before anything is copied -------------------
//
// The scorer caps every screenshot at 256 KiB, with a long side of at most
// 1280 px and a short side of at least 480 px. Checking that here - reading
// the image headers directly, no image library - turns a grading rejection
// into a plain local error with the offending file named.
function imageSize(path) {
  const bytes = readFileSync(path);
  // PNG: an 8-byte signature, then the IHDR chunk holds width and height as
  // big-endian uint32s at bytes 16 and 20.
  if (bytes.length >= 24 && bytes.readUInt32BE(0) === 0x89504e47) {
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }
  // JPEG: FF D8, then length-prefixed segments; a start-of-frame segment
  // (C0-CF except C4, C8 and CC) holds the height, then the width.
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 <= bytes.length && bytes[offset] === 0xff) {
      const marker = bytes[offset + 1];
      if (
        marker >= 0xc0 &&
        marker <= 0xcf &&
        marker !== 0xc4 &&
        marker !== 0xc8 &&
        marker !== 0xcc
      ) {
        return {
          width: bytes.readUInt16BE(offset + 7),
          height: bytes.readUInt16BE(offset + 5),
        };
      }
      offset += 2 + bytes.readUInt16BE(offset + 2);
    }
  }
  throw new Error(`cannot read image dimensions from ${path}`);
}

const screenshotsDir = join(entryDir, 'screenshots');
if (existsSync(screenshotsDir)) {
  for (const name of readdirSync(screenshotsDir)) {
    const path = join(screenshotsDir, name);
    if (!statSync(path).isFile()) continue;
    const size = statSync(path).size;
    if (size > 262144) {
      console.error(
        `error: screenshot ${name} is ${size} bytes, over the 262144-byte cap`,
      );
      process.exit(1);
    }
    const { width, height } = imageSize(path);
    if (Math.max(width, height) > 1280 || Math.min(width, height) < 480) {
      console.error(
        `error: screenshot ${name} is ${width}x${height}; the long side ` +
          'must be at most 1280 and the short side at least 480',
      );
      process.exit(1);
    }
    console.log(
      `screenshot ${name}: ${width}x${height}, ${size} bytes - within limits`,
    );
  }
}

// --- Mirror the entry into the output directory --------------------------

mkdirSync(outputDir, { recursive: true });
cpSync(join(entryDir, 'app'), join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(entryDir, 'screenshots'))) {
  cpSync(join(entryDir, 'screenshots'), join(outputDir, 'screenshots'), {
    recursive: true,
  });
}

// --- Build the dossier ----------------------------------------------------
//
// These caps are the scorer's own (the kit's reference/gate.json). Of them,
// only text_max_bytes shapes the dossier's bytes; the rest make this program
// refuse up front an entry the scorer would refuse anyway - more than 4
// screenshots or one over 256 KiB, more than 993 files or 48 MiB under app/,
// or a path under app/ longer than 1000 bytes.
const dossierOptions = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};
const dossierBytes = buildDossier(outputDir, dossierOptions);
writeFileSync(join(outputDir, 'dossier.json'), dossierBytes);

// --- Report what the hand-in holds ---------------------------------------

function countFiles(dir) {
  let count = 0;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    count += statSync(path).isDirectory() ? countFiles(path) : 1;
  }
  return count;
}
const appFiles = countFiles(join(outputDir, 'app'));
const screenshotFiles = countFiles(join(outputDir, 'screenshots'));
const dossierSize = Buffer.byteLength(dossierBytes);
console.log(
  `copied ${appFiles + screenshotFiles} files ` +
    `(${appFiles} under app/, ${screenshotFiles} screenshots); ` +
    `dossier.json is ${dossierSize} bytes`,
);

// --- Self-verification -----------------------------------------------------
//
// Rebuild the dossier from the copied app/ and screenshots/ and byte-compare
// it with the dossier.json just written. The scorer does exactly this, so a
// mismatch here is a rejection caught early.
const rebuiltBytes = buildDossier(outputDir, dossierOptions);
if (!Buffer.from(rebuiltBytes).equals(Buffer.from(dossierBytes))) {
  console.error(
    'error: self-verification failed - the dossier rebuilt from the copied ' +
      'app/ and screenshots/ differs byte for byte from the dossier.json ' +
      'just written, so the scorer would reject this hand-in',
  );
  process.exit(1);
}
console.log('self-verification passed: rebuilt dossier matches byte for byte');
