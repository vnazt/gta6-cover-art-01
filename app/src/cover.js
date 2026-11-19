/* Neon Vice Cover Studio — canvas renderer.
   Pure classic script: no modules, no network. Everything the cover needs is
   drawn here: panel layouts, per-photo cover-fit placement, gradient-map
   colour grades, poster lettering, badge, grain and vignette. */

'use strict';

/* ---------------------------------------------------------------- layouts */

function buildPanelLayouts() {
  return {
    hero: {
      label: 'Hero Split',
      panels: [
        [0.00, 0.00, 0.52, 1.00],
        [0.52, 0.00, 0.48, 0.52],
        [0.52, 0.52, 0.48, 0.48],
      ],
    },
    classic: {
      label: 'Classic Five',
      panels: [
        [0.00, 0.00, 0.34, 0.56],
        [0.34, 0.00, 0.33, 0.56],
        [0.67, 0.00, 0.33, 0.56],
        [0.00, 0.56, 0.55, 0.44],
        [0.55, 0.56, 0.45, 0.44],
      ],
    },
    triptych: {
      label: 'Triptych',
      panels: [
        [0.000, 0.00, 1 / 3, 1.00],
        [1 / 3, 0.00, 1 / 3, 1.00],
        [2 / 3, 0.00, 1 / 3, 1.00],
      ],
    },
    quad: {
      label: 'Quad Grid',
      panels: [
        [0.0, 0.0, 0.5, 0.5],
        [0.5, 0.0, 0.5, 0.5],
        [0.0, 0.5, 0.5, 0.5],
        [0.5, 0.5, 0.5, 0.5],
      ],
    },
    story: {
      label: 'Cover Story',
      panels: [
        [0.00, 0.00, 1.00, 0.60],
        [0.00, 0.60, 0.50, 0.40],
        [0.50, 0.60, 0.50, 0.40],
      ],
    },
  };
}

var PANEL_LAYOUTS = buildPanelLayouts();
var GUTTER_FRACTION = 0.011; /* cream gutter, as a fraction of canvas width */
var PAPER_COLOUR = '#f3e9d2';

/* Panel rectangles in pixels for a w x h canvas, each inset by half a gutter. */
function panelRects(w, h) {
  var layout = PANEL_LAYOUTS[coverState.layout] || PANEL_LAYOUTS.hero;
  var g = Math.max(4, Math.round(w * GUTTER_FRACTION));
  return layout.panels.map(function (p) {
    return {
      x: p[0] * w + g / 2,
      y: p[1] * h + g / 2,
      w: p[2] * w - g,
      h: p[3] * h - g,
    };
  });
}

/* ------------------------------------------------------------------ state */

var SAMPLE_FILES = [
  'samples/beach-car.jpg',
  'samples/yacht.jpg',
  'samples/neon-motel.jpg',
  'samples/convertible.jpg',
];

var coverState = {
  layout: 'hero',
  grade: 'sunset',
  gradeStrength: 0.85,
  photos: [],            /* HTMLImageElement list, in load order */
  panels: [],            /* { photo, zoom, offsetX, offsetY } per panel */
  spread: { on: false, photo: 0, zoom: 1, offsetX: 0, offsetY: 0 },
  texts: { kicker: 'WELCOME BACK TO', script: 'Neon', title: 'VICE HEAT' },
  grain: true,
  badge: true,
  selectedPanel: 0,
};

function ensurePanels() {
  var count = (PANEL_LAYOUTS[coverState.layout] || PANEL_LAYOUTS.hero).panels.length;
  while (coverState.panels.length < count) {
    var i = coverState.panels.length;
    coverState.panels.push({
      photo: coverState.photos.length ? i % coverState.photos.length : -1,
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
    });
  }
  if (coverState.selectedPanel >= count) coverState.selectedPanel = 0;
}

function loadImageFromUrl(url) {
  return new Promise(function (resolve, reject) {
    var img = new Image();
    img.onload = function () { resolve(img); };
    img.onerror = reject;
    img.src = url;
  });
}

function loadSamplePhotos() {
  return Promise.all(SAMPLE_FILES.map(loadImageFromUrl)).then(function (imgs) {
    coverState.photos = imgs.slice();
    coverState.panels = [];
    ensurePanels();
    for (var i = 0; i < coverState.panels.length; i++) {
      coverState.panels[i].photo = i % imgs.length;
    }
    coverState.spread.photo = 0;
    return imgs;
  });
}

/* ------------------------------------------------------------------ fonts */

var fontsReadyPromise = null;
function ensureFonts() {
  if (!fontsReadyPromise) {
    var loads = [];
    try {
      loads.push(document.fonts.load('80px Anton'));
      loads.push(document.fonts.load('80px Pacifico'));
    } catch (e) { /* older engines: fall through and draw anyway */ }
    fontsReadyPromise = Promise.all(loads).then(function () {
      return document.fonts.ready;
    }).catch(function () { return null; });
  }
  return fontsReadyPromise;
}

/* ------------------------------------------------------------- photo draw */

/* Draw img into rect with cover-fit, zoom and fractional pan, pre-clipped. */
function drawPhotoCoverFit(ctx, img, rect, zoom, offsetX, offsetY) {
  if (!img || !img.naturalWidth) return;
  var scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * zoom;
  var dw = img.naturalWidth * scale;
  var dh = img.naturalHeight * scale;
  var maxShiftX = Math.max(0, (dw - rect.w) / 2);
  var maxShiftY = Math.max(0, (dh - rect.h) / 2);
  var dx = rect.x + (rect.w - dw) / 2 + offsetX * maxShiftX * 2;
  var dy = rect.y + (rect.h - dh) / 2 + offsetY * maxShiftY * 2;
  dx = Math.min(rect.x, Math.max(rect.x + rect.w - dw, dx));
  dy = Math.min(rect.y, Math.max(rect.y + rect.h - dh, dy));
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

/* Compose every panel's photo onto its own transparent canvas. */
function composePhotoCanvas(w, h) {
  var c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  var ctx = c.getContext('2d');
  var rects = panelRects(w, h);
  if (coverState.spread.on && coverState.photos[coverState.spread.photo]) {
    var full = { x: 0, y: 0, w: w, h: h };
    var img = coverState.photos[coverState.spread.photo];
    /* Draw once across the whole canvas, then punch it through each panel. */
    var spreadCanvas = document.createElement('canvas');
    spreadCanvas.width = w;
    spreadCanvas.height = h;
    var sctx = spreadCanvas.getContext('2d');
    drawPhotoCoverFit(sctx, img, full, coverState.spread.zoom, coverState.spread.offsetX, coverState.spread.offsetY);
    rects.forEach(function (r) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(r.x, r.y, r.w, r.h);
      ctx.clip();
      ctx.drawImage(spreadCanvas, 0, 0);
      ctx.restore();
    });
    return c;
  }
  rects.forEach(function (r, i) {
    var panel = coverState.panels[i];
    var photo = panel ? coverState.photos[panel.photo] : null;
    if (photo) {
      drawPhotoCoverFit(ctx, photo, r, panel.zoom, panel.offsetX, panel.offsetY);
    } else {
      var grad = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
      grad.addColorStop(0, '#2a1a5e');
      grad.addColorStop(1, '#c218a8');
      ctx.fillStyle = grad;
      ctx.fillRect(r.x, r.y, r.w, r.h);
    }
  });
  return c;
}

/* ------------------------------------------------------------ colour grade */

function hexToRgb(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

var GRADE_STOPS = {
  sunset: ['#0b2a4a', '#5c1a63', '#c22a72', '#f2604c', '#ff9a3d', '#ffe9b0'],
  neon:   ['#040824', '#2b0a5e', '#7a1fa2', '#d6339f', '#ff5da2', '#8ef4ff'],
  golden: ['#221103', '#59300d', '#9c5a1c', '#d98a33', '#f7bc60', '#fff0c4'],
  ink:    ['#0d0621', '#3d1160', '#8e2a8f', '#e0499b', '#ff9e6b', '#ffe3ae'],
};

function buildGradientLut(stops) {
  var rgbs = stops.map(hexToRgb);
  var lut = new Uint8Array(256 * 3);
  for (var i = 0; i < 256; i++) {
    var t = i / 255 * (rgbs.length - 1);
    var a = Math.floor(t);
    var b = Math.min(rgbs.length - 1, a + 1);
    var f = t - a;
    for (var ch = 0; ch < 3; ch++) {
      lut[i * 3 + ch] = Math.round(rgbs[a][ch] + (rgbs[b][ch] - rgbs[a][ch]) * f);
    }
  }
  return lut;
}

function applyColourGrade(canvas, gradeName, strength) {
  var ctx = canvas.getContext('2d');
  var w = canvas.width;
  var h = canvas.height;
  if (!w || !h) return;
  var imageData = ctx.getImageData(0, 0, w, h);
  var d = imageData.data;
  var s = Math.max(0, Math.min(1, strength));
  var i, r, g, b, lum;
  if (gradeName === 'clean') {
    for (i = 0; i < d.length; i += 4) {
      if (d[i + 3] === 0) continue;
      r = d[i]; g = d[i + 1]; b = d[i + 2];
      lum = 0.299 * r + 0.587 * g + 0.114 * b;
      var cr = (r - 128) * 1.14 + 128 + 5;
      var cg = (g - 128) * 1.14 + 128 + 5;
      var cb = (b - 128) * 1.14 + 128 + 5;
      var sr = lum + (cr - lum) * 1.3;
      var sg = lum + (cg - lum) * 1.3;
      var sb = lum + (cb - lum) * 1.3;
      d[i]     = r + (sr - r) * s;
      d[i + 1] = g + (sg - g) * s;
      d[i + 2] = b + (sb - b) * s;
    }
  } else {
    var lut = buildGradientLut(GRADE_STOPS[gradeName] || GRADE_STOPS.sunset);
    var posterSteps = gradeName === 'ink' ? 5 : 0;
    for (i = 0; i < d.length; i += 4) {
      if (d[i + 3] === 0) continue;
      r = d[i]; g = d[i + 1]; b = d[i + 2];
      lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      if (posterSteps) lum = Math.round(lum * (posterSteps - 1)) / (posterSteps - 1);
      var idx = Math.max(0, Math.min(255, Math.round(lum * 255))) * 3;
      d[i]     = r + (lut[idx] - r) * s;
      d[i + 1] = g + (lut[idx + 1] - g) * s;
      d[i + 2] = b + (lut[idx + 2] - b) * s;
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

/* --------------------------------------------------------------- lettering */

function drawSpacedText(ctx, text, cx, y, spacing) {
  var widths = [];
  var total = 0;
  for (var i = 0; i < text.length; i++) {
    var wch = ctx.measureText(text[i]).width;
    widths.push(wch);
    total += wch;
  }
  total += spacing * (text.length - 1);
  var x = cx - total / 2;
  var prevAlign = ctx.textAlign;
  ctx.textAlign = 'left';
  for (var j = 0; j < text.length; j++) {
    ctx.fillText(text[j], x, y);
    x += widths[j] + spacing;
  }
  ctx.textAlign = prevAlign;
  return total;
}

function fitFontSize(ctx, text, family, startSize, maxWidth) {
  var size = startSize;
  while (size > 10) {
    ctx.font = size + 'px ' + family;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  return size;
}

function drawCoverLettering(ctx, w, h, texts) {
  var cx = w / 2;
  ctx.save();
  ctx.textBaseline = 'alphabetic';

  /* Kicker: small, letterspaced, dead centre of the canvas, soft dark halo. */
  var kicker = (texts.kicker || '').toUpperCase();
  if (kicker) {
    var kSize = Math.round(h * 0.040);
    ctx.font = kSize + 'px Anton, sans-serif';
    ctx.shadowColor = 'rgba(12, 0, 24, 0.92)';
    ctx.shadowBlur = kSize * 0.55;
    ctx.shadowOffsetY = kSize * 0.08;
    ctx.fillStyle = '#ffedcb';
    drawSpacedText(ctx, kicker, cx, h * 0.088, kSize * 0.42);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }

  /* Title: big Anton, sunset gradient fill, black outline, hard shadow, skew. */
  var title = (texts.title || '').toUpperCase();
  var titleSize = 0;
  if (title) {
    titleSize = fitFontSize(ctx, title, 'Anton, sans-serif', Math.round(h * 0.175), w * 0.92);
    var titleY = h * 0.905;
    ctx.save();
    ctx.translate(cx, titleY);
    ctx.transform(1, 0, -0.055, 1, 0, 0);
    ctx.font = titleSize + 'px Anton, sans-serif';
    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';
    /* hard offset shadow pass */
    ctx.fillStyle = '#0a0014';
    ctx.fillText(title, titleSize * 0.045, titleSize * 0.055);
    /* outline */
    ctx.strokeStyle = '#0a0014';
    ctx.lineWidth = titleSize * 0.16;
    ctx.strokeText(title, 0, 0);
    /* gradient fill */
    var grad = ctx.createLinearGradient(0, -titleSize, 0, titleSize * 0.25);
    grad.addColorStop(0.00, '#fff6da');
    grad.addColorStop(0.45, '#ffc65c');
    grad.addColorStop(0.78, '#ff7a59');
    grad.addColorStop(1.00, '#ff4d7e');
    ctx.fillStyle = grad;
    ctx.fillText(title, 0, 0);
    ctx.restore();
  }

  /* Script word: neon script overlapping the title's top edge. */
  var script = texts.script || '';
  if (script) {
    var sSize = fitFontSize(ctx, script, 'Pacifico, cursive', Math.round(h * 0.115), w * 0.7);
    ctx.save();
    ctx.translate(cx, h * 0.905 - titleSize * 1.02);
    ctx.rotate(-0.045);
    ctx.font = sSize + 'px Pacifico, cursive';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#ff2d95';
    ctx.shadowBlur = sSize * 0.45;
    ctx.fillStyle = '#ff6fb3';
    ctx.fillText(script, 0, 0);
    ctx.fillText(script, 0, 0);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffd7ec';
    ctx.fillText(script, 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ badge */

function starPath(ctx, cx, cy, rOuter, rInner) {
  ctx.beginPath();
  for (var i = 0; i < 10; i++) {
    var r = i % 2 === 0 ? rOuter : rInner;
    var a = -Math.PI / 2 + i * Math.PI / 5;
    var x = cx + Math.cos(a) * r;
    var y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawStarBadge(ctx, cx, cy, r) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(10, 4, 28, 0.62)';
  ctx.fill();
  ctx.lineWidth = r * 0.09;
  ctx.strokeStyle = '#ffedcb';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.82, 0, Math.PI * 2);
  ctx.lineWidth = r * 0.035;
  ctx.strokeStyle = 'rgba(255, 237, 203, 0.65)';
  ctx.stroke();
  var grad = ctx.createLinearGradient(cx, cy - r * 0.62, cx, cy + r * 0.35);
  grad.addColorStop(0, '#ffb347');
  grad.addColorStop(1, '#ff2d95');
  starPath(ctx, cx, cy - r * 0.12, r * 0.52, r * 0.215);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.font = Math.round(r * 0.30) + 'px Anton, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffedcb';
  ctx.fillText('EST. 2026', cx, cy + r * 0.68);
  ctx.restore();
}

/* ------------------------------------------------------------ grain & mood */

var grainPatternCanvas = null;
function applyFilmGrain(ctx, w, h) {
  if (!grainPatternCanvas) {
    grainPatternCanvas = document.createElement('canvas');
    grainPatternCanvas.width = 256;
    grainPatternCanvas.height = 256;
    var gctx = grainPatternCanvas.getContext('2d');
    var data = gctx.createImageData(256, 256);
    for (var i = 0; i < data.data.length; i += 4) {
      var v = 96 + Math.floor(Math.random() * 96);
      data.data[i] = v;
      data.data[i + 1] = v;
      data.data[i + 2] = v;
      data.data[i + 3] = 255;
    }
    gctx.putImageData(data, 0, 0);
  }
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.globalCompositeOperation = 'overlay';
  var pattern = ctx.createPattern(grainPatternCanvas, 'repeat');
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function applyVignette(ctx, w, h) {
  var r = Math.sqrt(w * w + h * h) / 2;
  var grad = ctx.createRadialGradient(w / 2, h / 2, r * 0.45, w / 2, h / 2, r * 1.02);
  grad.addColorStop(0, 'rgba(8, 0, 18, 0)');
  grad.addColorStop(1, 'rgba(8, 0, 18, 0.38)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

/* ----------------------------------------------------------------- render */

function renderCover(canvas, w, h) {
  canvas.width = w;
  canvas.height = h;
  var ctx = canvas.getContext('2d');
  ensurePanels();
  ctx.fillStyle = PAPER_COLOUR;
  ctx.fillRect(0, 0, w, h);
  var photos = composePhotoCanvas(w, h);
  applyColourGrade(photos, coverState.grade, coverState.gradeStrength);
  ctx.drawImage(photos, 0, 0);
  /* hairline shade on each panel edge so panels read as printed plates */
  ctx.strokeStyle = 'rgba(20, 8, 30, 0.28)';
  ctx.lineWidth = Math.max(1, w * 0.0012);
  panelRects(w, h).forEach(function (r) {
    ctx.strokeRect(r.x, r.y, r.w, r.h);
  });
  drawCoverLettering(ctx, w, h, coverState.texts);
  if (coverState.badge) {
    var br = Math.min(w, h) * 0.082;
    drawStarBadge(ctx, w - br - w * 0.022, br + h * 0.022, br);
  }
  applyVignette(ctx, w, h);
  if (coverState.grain) applyFilmGrain(ctx, w, h);
  return canvas;
}

function exportCoverPng(w, h) {
  var c = document.createElement('canvas');
  renderCover(c, w, h);
  var url = c.toDataURL('image/png');
  var a = document.createElement('a');
  a.href = url;
  a.download = 'neon-vice-cover-' + w + 'x' + h + '.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
  return url;
}

/* -------------------------------------------------------------- public API */

window.coverStudio = {
  getState: function () { return coverState; },
  setLayout: function (name) {
    if (PANEL_LAYOUTS[name]) {
      coverState.layout = name;
      ensurePanels();
    }
  },
  setGrade: function (name) { coverState.grade = name; },
  setTexts: function (texts) {
    if (!texts) return;
    if (typeof texts.kicker === 'string') coverState.texts.kicker = texts.kicker;
    if (typeof texts.script === 'string') coverState.texts.script = texts.script;
    if (typeof texts.title === 'string') coverState.texts.title = texts.title;
  },
  loadSamplePhotos: loadSamplePhotos,
  exportCoverPng: exportCoverPng,
  renderCover: renderCover,
};

/* Internals the editor drives directly. */
window.CoverArt = {
  state: coverState,
  layouts: PANEL_LAYOUTS,
  panelRects: panelRects,
  ensurePanels: ensurePanels,
  ensureFonts: ensureFonts,
  loadImageFromUrl: loadImageFromUrl,
  loadSamplePhotos: loadSamplePhotos,
  renderCover: renderCover,
  exportCoverPng: exportCoverPng,
};
