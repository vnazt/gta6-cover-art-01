# Neon Vice Cover Studio

Turn your own photos and a caption into bold, multi-panel cover art in the
spirit of a sun-drenched crime-saga poster — then export it as a print-ready
PNG. Neon Vice Cover Studio is a fully offline web app: open it in a desktop
browser, drop in photos, arrange the panels, pick a colour grade, letter your
headline, and export. Nothing is uploaded, ever; every photo stays on your
machine.

## Features

- **5 panel layouts** — Hero Split, Classic Five, Triptych, Quad Grid and
  Cover Story, all with the genre's signature cream gutters.
- **Any photo, placed your way** — fill the panels with several photos, or
  spread one photo continuously across every panel. Click a panel to select
  it, drag to reposition its photo, scroll or use the slider to zoom.
- **5 colour grades** — gradient-map looks computed per pixel: Vice Sunset,
  Neon Nights and Golden Hour, a posterized Poster Ink duotone, and the
  gentle Clean Print lift. Grade strength is adjustable.
- **Poster lettering** — a letterspaced kicker, a glowing neon script word,
  and a big condensed headline with a sunset gradient fill, hard shadow and
  outline, plus an original star badge and optional film grain and vignette.
- **3 export sizes** — 1920 × 1080, 1080 × 1350 and 1080 × 1080 PNG, rendered
  at full resolution from the same live preview you edit.
- **Instant start** — four bundled sample photos load on first open, so a
  finished cover is on screen before you add anything of your own.
- **Fully offline** — static files only, no build step, no network requests.
  Fonts and samples ship inside `app/`; photos you add are read locally in
  the browser and never leave the machine.

## Run it

Serve the `app/` folder with any static file server and open it in a desktop
browser, for example:

```sh
npx serve app
# or
python3 -m http.server --directory app 8000
```

Then open the printed local address. Add photos with the **Add photos**
button or by dragging them onto the window, click a panel, drag and scroll
to frame it, choose a layout and grade, edit the lettering, pick an export
size, and press **Export PNG**.

## Hand-in program

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/`
to the output directory (`MAKEFUN_OUTPUT_DIR`, or `/output` by default) and
writes `dossier.json` there using the vendored make.fun library in
`vendor/makefun-app.ts`:

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Credits

- **Anton** and **Pacifico** typefaces, used under the SIL Open Font License
  1.1; the license texts ship beside the font files in `app/fonts/`.
- Sample photos in `app/samples/` were generated with an image model for this
  project and are free to use.
- All artwork, layout and lettering in the app are original to this project.

## License

MIT — see `LICENSE`.
