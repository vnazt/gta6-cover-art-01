[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/vnazt/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/vnazt/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

# Neon Vice Cover Studio

An offline web app that turns your own photos and a caption into GTA 6-style
multi-panel cover art — the iconic poster look with cream panel gutters, a
Vice City sunset-or-neon colour grade, bold display lettering with a neon
script flourish, and a one-click PNG export in the sizes people actually post.

Open the app, and a finished cover is already on screen: the four bundled
sample photos fill the panels. Swap in your own photos, drag them into place,
pick a grade, type your caption, export. From first click to a shareable PNG
takes well under a minute, and nothing ever leaves your machine — the app
makes no network requests at all.

## What it does

- **Five multi-panel layouts** — Hero Split, Classic Five, Triptych, Quad
  Grid and Cover Story — drawn as printed plates with cream gutters.
- **Any photo, placed your way** — add photos from your machine (file picker
  or drag-and-drop anywhere on the page), click a thumbnail to drop it into
  the selected panel, then drag inside the panel to reposition and scroll to
  zoom. A spread mode stretches one photo continuously across every panel.
- **Five colour grades** — Vice Sunset, Neon Nights and Golden Hour are
  gradient-map grades (teal-to-pink, blue-to-magenta-to-cyan, amber-to-cream);
  Poster Ink is a five-step posterized duotone; Clean Print is a gentle
  saturation-and-contrast lift. A strength slider blends each grade to taste.
- **Poster lettering** — a letterspaced kicker centred over the art, a neon
  script word glowing over a big gradient-filled title with a black outline
  and hard offset shadow, plus an original star badge ("EST. 2026"), film
  grain and a vignette. All three text lines are editable.
- **Exports that fit the feed** — PNG at 1920×1080, 1080×1350 or 1080×1080,
  rendered fresh at full resolution on every export.
- **Original throughout** — every drawing, word and layout is this project's
  own. No Rockstar Games logos, wordmarks, artwork, characters or fonts.

## Run it

The app is plain static files under `app/` — no build step. Serve the folder
with any static server and open it in a desktop browser, for example:

```sh
python3 -m http.server 8080 --directory app
# then visit http://localhost:8080
```

Opening `app/index.html` directly from disk works too. Photos are read
locally with the FileReader API and are never uploaded anywhere.

## Hand it in

`main.ts` (Node 22, standard library only) delivers the entry: it copies
`app/` and `screenshots/` into the output directory and writes `dossier.json`
with the vendored make.fun library in `vendor/makefun-app.ts`, then rebuilds
the dossier from the copies and fails if it differs by a single byte.

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

`screenshots/` holds four JPEGs taken from the real running app: an exported
1920×1080 cover, the editor with a photo loaded and a panel selected, and
exported covers at 1080×1350 and 1080×1080.

## Credits

- **Anton** (display face) and **Pacifico** (script face) are used under the
  SIL Open Font License 1.1; the font files and their license texts live in
  `app/fonts/` (`Anton-OFL.txt`, `Pacifico-OFL.txt`).
- The four sample photos in `app/samples/` were generated with an image model
  for this entry and are free to use.
- This project is released under the MIT License — see `LICENSE`.
