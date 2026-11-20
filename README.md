# Neon Vice Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/vnazt/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/vnazt/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

**Neon Vice Cover Studio** turns your own photos into a multi-panel,
sunset-chrome movie-poster cover and exports it as a PNG. It is a static web
app that runs entirely offline in a desktop browser — your photos are read on
your own machine and are never uploaded.

Entered in the make.fun bounty
[**Make GTA 6 Cover Art**](https://make.fun/bounty/gta6-cover-art-01)
(gta6-cover-art-01).

## What it does

Three steps: add photos, pick a layout, export.

1. **Add photos.** Six AI-generated sample photos load automatically; add
   your own from disk and click a photo to drop it into the selected panel.
   With one photo, every panel can take a different crop of it.
2. **Pick a layout and a look.** Seven layouts — Key Art Slash (a big hero
   panel with slanted, cream-framed panels), Hero Mosaic, Slash Trio, Six
   Grid, Strip Five, Postcards and Full Bleed — and six grades (Sunset
   Chrome, Neon Night, Golden Hour, Tropic Teal, Heatwave, Ultraviolet),
   plus a Poster Ink finish (posterized paint with ink-darkened edges), sky
   glow, halftone and grain, all driven from one canvas renderer so the
   preview is the export, pixel for pixel.
3. **Export** a PNG at 1920×1080, 1080×1350 or 1080×1080, or all three.

The cover dressing is pure poster craft, all of it editable and toggleable:

- a huge title in horizontal-stripe chrome (four title styles) with a 3D
  extrusion and sparkles, a neon script line overlapping it, and a letterspaced
  tagline ribbon;
- a five-star press quote from a fictional gazette above the title;
- slanted cast name tags and circled numbers on the panels (never over a
  face — tags hug the panel's bottom edge);
- a gold "Original Cover Art" seal, a VICE pill badge and a VOL. 1 tag;
- a palm-silhouette sunset band with a neon COMING SOON line, and a billing
  block with a barcode at the bottom.

Per panel you can pan the crop by dragging, zoom, flip, swap photos between
panels, rename the cast tag, and use **Mark face**: click a face and the crop
re-centers on it. A frame-break toggle lets the hero photo spill past its
frame over its neighbours. A small API is exposed for scripting:
`window.coverStudio.setLayout(name)`, `.setGrade(name)`, `.setCaption(obj)`,
`.exportPNG(w, h)` (returns a data URL) and `.getState()`.

The design is our own: original lettering, layouts and effects, and no logos,
artwork, fonts or names from any game.

## Run it

Any static file server works, for example:

```sh
npx serve app
# or
python3 -m http.server -d app 8080
```

then open the page in a desktop browser. Opening `app/index.html` directly
from disk also works. There is no build step and nothing is fetched from the
network.

The make.fun entry program at the repo root copies `app/` and `screenshots/`
to the output directory and writes `dossier.json` with the vendored
`buildDossier`:

```sh
MAKEFUN_OUTPUT_DIR=/output node main.ts
```

## Credits

- Fonts, all under the SIL Open Font License (license files beside them in
  `app/fonts/`): **Anton**, **Kaushan Script**, **Pacifico** and **Teko**,
  from the Google Fonts project.
- Sample photos in `app/samples/` are AI-generated; every person in them is
  fictional.
- `vendor/makefun-app.ts` is make.fun's dossier library, vendored unchanged.

## License

MIT — see `LICENSE`.
