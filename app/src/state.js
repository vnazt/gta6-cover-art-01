// Neon Vice Cover Studio v2 — state, samples, layouts, grades.
// Plain script (no modules) so the app also runs from file:// .
window.NV = window.NV || {};

NV.SAMPLES = [
  { id: 'hero',    src: 'samples/hero-rooftop.jpg',      tag: 'THE BOSS',   fx: 0.42, fy: 0.34 },
  { id: 'marina',  src: 'samples/marina-night.jpg',      tag: 'THE FIXER',  fx: 0.50, fy: 0.38 },
  { id: 'driver',  src: 'samples/driver-convertible.jpg',tag: 'THE DRIVER', fx: 0.46, fy: 0.40 },
  { id: 'courier', src: 'samples/courier-gasstation.jpg',tag: 'THE COURIER',fx: 0.50, fy: 0.38 },
  { id: 'yacht',   src: 'samples/yacht.jpg',             tag: 'THE INSIDER',fx: 0.50, fy: 0.45 },
  { id: 'motel',   src: 'samples/neon-motel.jpg',        tag: 'THE DRIFTER',fx: 0.50, fy: 0.45 },
];

NV.LAYOUT_NAMES = [
  'Key Art Slash', 'Hero Mosaic', 'Slash Trio', 'Six Grid',
  'Strip Five', 'Postcards', 'Full Bleed',
];

NV.GRADES = {
  'Sunset Chrome': { filter: 'saturate(1.28) contrast(1.08) brightness(1.03)',
                     overlay: '#ff7b39', alpha: 0.20, glow: '#ff9a3c' },
  'Neon Night':    { filter: 'saturate(1.38) contrast(1.16) brightness(0.98) hue-rotate(-10deg)',
                     overlay: '#3b1d5e', alpha: 0.24, glow: '#ff2e88' },
  'Golden Hour':   { filter: 'sepia(0.30) saturate(1.22) contrast(1.05) brightness(1.07)',
                     overlay: '#ffb347', alpha: 0.22, glow: '#ffc46b' },
  'Tropic Teal':   { filter: 'saturate(1.22) contrast(1.08) hue-rotate(6deg)',
                     overlay: '#0fb5a8', alpha: 0.18, glow: '#2fe0c8' },
  'Heatwave':      { filter: 'sepia(0.16) saturate(1.48) contrast(1.13) brightness(1.02)',
                     overlay: '#ff4040', alpha: 0.17, glow: '#ff5a3c' },
  'Ultraviolet':   { filter: 'saturate(1.42) contrast(1.12) hue-rotate(-26deg)',
                     overlay: '#7b2ff7', alpha: 0.22, glow: '#b26bff' },
};
NV.GRADE_NAMES = Object.keys(NV.GRADES);

// Title stripe palettes: arrays of [stop, color] with hard bands.
NV.TITLE_STYLES = {
  'Sunset Chrome': [[0, '#fff3b0'], [0.18, '#ffe259'], [0.38, '#ffa751'], [0.55, '#ff5e62'],
                    [0.72, '#ff2e88'], [0.88, '#a044ff'], [1, '#5b2ee5']],
  'Ice Neon':      [[0, '#ffffff'], [0.25, '#b8f6ff'], [0.5, '#39d5ff'], [0.75, '#2e7bff'], [1, '#2430ff']],
  'Gold Rush':     [[0, '#fffbe0'], [0.22, '#ffe98a'], [0.45, '#ffc93c'], [0.68, '#e79b1e'], [1, '#9c6410']],
  'Ultra Chrome':  [[0, '#ffffff'], [0.2, '#dfe9ff'], [0.42, '#9fb6ff'], [0.6, '#c9b8ff'],
                    [0.8, '#7b8cff'], [1, '#3c3f8f']],
};
NV.TITLE_STYLE_NAMES = Object.keys(NV.TITLE_STYLES);

NV.defaultPanel = function (photo) {
  return {
    photo: photo,            // index into NV.photos
    zoom: 1, panX: 0, panY: 0,
    fx: 0.5, fy: 0.42, flip: false,
    tag: '',
  };
};

NV.state = {
  layout: 'Key Art Slash',
  grade: 'Sunset Chrome',
  titleStyle: 'Sunset Chrome',
  caption: {
    title: 'NEON VICE',
    script: 'one last ride',
    tagline: 'SIX STRANGERS · ONE COAST · NO WAY HOME',
    quote: 'ONE LAST SUMMER, DONE RIGHT',
    gazette: 'THE BAYLINE GAZETTE',
  },
  look: {
    paint: 22, gradeAmt: 65, halftone: 16, grain: 20, glow: 55,
    titleSize: 100, titleLift: 0,
    ink: true, inkStrength: 55, skyGlow: true, frameBreak: true,
  },
  extras: { quote: true, pill: true, vol: true, seal: true, tags: true, billing: true, palm: true },
  panels: [],          // filled by NV.setLayout
  selected: 0,
  previewAspect: '16:9',
};

NV.photos = [];        // loaded photo records {img, name, tag, fx, fy}

// Panel counts per layout.
NV.LAYOUT_COUNTS = {
  'Key Art Slash': 5, 'Hero Mosaic': 5, 'Slash Trio': 3, 'Six Grid': 6,
  'Strip Five': 5, 'Postcards': 5, 'Full Bleed': 1,
};

// Build the panel list for a layout, assigning photos round-robin from the
// pool (hero first) and seeding each panel's tag/focal from its photo.
NV.buildPanels = function (layoutName) {
  var count = NV.LAYOUT_COUNTS[layoutName] || 5;
  var panels = [];
  for (var i = 0; i < count; i++) {
    var photoIdx = NV.photos.length ? i % NV.photos.length : 0;
    var p = NV.defaultPanel(photoIdx);
    var rec = NV.photos[photoIdx];
    if (rec) { p.tag = rec.tag; p.fx = rec.fx; p.fy = rec.fy; }
    panels.push(p);
  }
  return panels;
};

NV.setLayout = function (name) {
  if (NV.LAYOUT_COUNTS[name] == null) return;
  NV.state.layout = name;
  NV.state.panels = NV.buildPanels(name);
  NV.state.selected = 0;
};
