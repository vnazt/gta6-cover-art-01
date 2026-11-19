/* Neon Vice Cover Studio - cover renderer.
   Pure canvas work: panel layouts, per-panel photo placement, gradient-map
   colour grades, poster lettering, badge, grain and vignette. No network,
   no libraries; photos are drawn from Image objects the editor loaded. */

var SAMPLE_PHOTO_URLS = [
  'samples/beach-car.jpg',
  'samples/yacht.jpg',
  'samples/neon-motel.jpg',
  'samples/convertible.jpg'
];

var GUTTER_COLOUR = '#f5efe0';

function buildPanelLayouts() {
  return [
    {
      name: 'Hero Split',
      panels: [
        { x: 0, y: 0, w: 0.52, h: 1 },
        { x: 0.52, y: 0, w: 0.48, h: 0.5 },
        { x: 0.52, y: 0.5, w: 0.48, h: 0.5 }
      ]
    },
    {
      name: 'Classic Five',
      panels: [
        { x: 0, y: 0, w: 0.5, h: 0.58 },
        { x: 0.5, y: 0, w: 0.5, h: 0.58 },
        { x: 0, y: 0.58, w: 0.55, h: 0.42 },
        { x: 0.55, y: 0.58, w: 0.225, h: 0.42 },
        { x: 0.775, y: 0.58, w: 0.225, h: 0.42 }
      ]
    },
    {
      name: 'Triptych',
      panels: [
        { x: 0, y: 0, w: 1 / 3, h: 1 },
        { x: 1 / 3, y: 0, w: 1 / 3, h: 1 },
        { x: 2 / 3, y: 0, w: 1 / 3, h: 1 }
      ]
    },
    {
      name: 'Quad Grid',
      panels: [
        { x: 0, y: 0, w: 0.5, h: 0.5 },
        { x: 0.5, y: 0, w: 0.5, h: 0.5 },
        { x: 0, y: 0.5, w: 0.5, h: 0.5 },
        { x: 0.5, y: 0.5, w: 0.5, h: 0.5 }
      ]
    },
    {
      name: 'Cover Story',
      panels: [
        { x: 0, y: 0, w: 1, h: 0.55 },
        { x: 0, y: 0.55, w: 0.5, h: 0.45 },
        { x: 0.5, y: 0.55, w: 0.5, h: 0.45 }
      ]
    }
  ];
}

function panelRectToPixels(fractionRect, canvasWidth, canvasHeight, gutter) {
  var half = gutter / 2;
  return {
    x: fractionRect.x * canvasWidth + half,
    y: fractionRect.y * canvasHeight + half,
    w: fractionRect.w * canvasWidth - gutter,
    h: fractionRect.h * canvasHeight - gutter
  };
}

function createPanelPlacement(image) {
  return { image: image || null, zoom: 1, offsetX: 0.5, offsetY: 0.5 };
}

function createDefaultCoverState() {
  return {
    layoutIndex: 0,
    gradeName: 'Vice Sunset',
    gradeStrength: 0.85,
    spread: false,
    spreadImage: null,
    spreadPlacement: { zoom: 1, offsetX: 0.5, offsetY: 0.5 },
    panels: [
      createPanelPlacement(null),
      createPanelPlacement(null),
      createPanelPlacement(null),
      createPanelPlacement(null),
      createPanelPlacement(null)
    ],
    texts: { kicker: 'WELCOME BACK TO', script: 'Neon', title: 'VICE HEAT' },
    showBadge: true,
    showGrain: true,
    selectedPanel: 0
  };
}

function computeCoverFit(image, rectWidth, rectHeight, zoom) {
  var scale = Math.max(rectWidth / image.width, rectHeight / image.height) * (zoom || 1);
  var drawWidth = image.width * scale;
  var drawHeight = image.height * scale;
  return {
    scale: scale,
    drawWidth: drawWidth,
    drawHeight: drawHeight,
    overflowX: Math.max(0, drawWidth - rectWidth),
    overflowY: Math.max(0, drawHeight - rectHeight)
  };
}

function drawPhotoIntoPanel(ctx, image, rect, placement) {
  var fit = computeCoverFit(image, rect.w, rect.h, placement.zoom);
  var drawX = rect.x - fit.overflowX * placement.offsetX;
  var drawY = rect.y - fit.overflowY * placement.offsetY;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(image, drawX, drawY, fit.drawWidth, fit.drawHeight);
  ctx.restore();
}

function drawEmptyPanel(ctx, rect, panelNumber) {
  var gradient = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  gradient.addColorStop(0, '#27407c');
  gradient.addColorStop(0.55, '#8a2a63');
  gradient.addColorStop(1, '#ff8c5a');
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.fillStyle = gradient;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = 'rgba(247, 239, 220, 0.85)';
  ctx.font = '600 ' + Math.max(13, Math.min(rect.w, rect.h) * 0.09) + 'px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ADD A PHOTO', rect.x + rect.w / 2, rect.y + rect.h / 2 - 10);
  ctx.font = '400 ' + Math.max(11, Math.min(rect.w, rect.h) * 0.07) + 'px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = 'rgba(247, 239, 220, 0.6)';
  ctx.fillText('panel ' + panelNumber, rect.x + rect.w / 2, rect.y + rect.h / 2 + Math.min(rect.w, rect.h) * 0.11);
  ctx.restore();
}

function drawSpreadPhoto(ctx, image, panels, canvasWidth, canvasHeight, placement) {
  var fit = computeCoverFit(image, canvasWidth, canvasHeight, placement.zoom);
  var drawX = -fit.overflowX * placement.offsetX;
  var drawY = -fit.overflowY * placement.offsetY;
  panels.forEach(function (rect) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    ctx.drawImage(image, drawX, drawY, fit.drawWidth, fit.drawHeight);
    ctx.restore();
  });
}

function hexToRgb(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16)
  ];
}

function buildGradientLut(stops) {
  var points = stops.map(function (stop) {
    return { at: stop[0], rgb: hexToRgb(stop[1]) };
  });
  var lut = new Uint8Array(256 * 3);
  for (var i = 0; i < 256; i++) {
    var t = i / 255;
    var lower = points[0];
    var upper = points[points.length - 1];
    for (var s = 0; s < points.length - 1; s++) {
      if (t >= points[s].at && t <= points[s + 1].at) {
        lower = points[s];
        upper = points[s + 1];
        break;
      }
    }
    var span = upper.at - lower.at || 1;
    var mix = Math.min(1, Math.max(0, (t - lower.at) / span));
    for (var c = 0; c < 3; c++) {
      lut[i * 3 + c] = Math.round(lower.rgb[c] + (upper.rgb[c] - lower.rgb[c]) * mix);
    }
  }
  return lut;
}

var GRADE_LUTS = {
  'Vice Sunset': buildGradientLut([
    [0, '#062a33'], [0.35, '#7a2a5e'], [0.62, '#e2497c'], [0.85, '#ff8c5a'], [1, '#ffd9a0']
  ]),
  'Neon Nights': buildGradientLut([
    [0, '#050a2e'], [0.4, '#3b1d6e'], [0.68, '#c22bd8'], [1, '#7df9ff']
  ]),
  'Golden Hour': buildGradientLut([
    [0, '#2a1608'], [0.45, '#8a4b16'], [0.75, '#e89b3c'], [1, '#ffedc2']
  ]),
  'Poster Ink': buildGradientLut([
    [0, '#160a2e'], [0.5, '#e2497c'], [1, '#ffe9c9']
  ])
};

function colourGradeNames() {
  return ['Vice Sunset', 'Neon Nights', 'Golden Hour', 'Poster Ink', 'Clean Print'];
}

function pixelLuminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function applyCleanPrint(data, strength) {
  var contrast = 1 + 0.08 * strength;
  var saturation = 1 + 0.24 * strength;
  for (var i = 0; i < data.length; i += 4) {
    var r = data[i], g = data[i + 1], b = data[i + 2];
    var grey = pixelLuminance(r, g, b);
    r = grey + (r - grey) * saturation;
    g = grey + (g - grey) * saturation;
    b = grey + (b - grey) * saturation;
    data[i] = (r - 128) * contrast + 128;
    data[i + 1] = (g - 128) * contrast + 128;
    data[i + 2] = (b - 128) * contrast + 128;
  }
}

function applyColourGrade(canvas, gradeName, strength) {
  var amount = Math.min(1, Math.max(0, strength == null ? 0.85 : strength));
  if (amount <= 0) return;
  var ctx = canvas.getContext('2d');
  var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  var data = imageData.data;

  if (gradeName === 'Clean Print') {
    applyCleanPrint(data, amount);
    ctx.putImageData(imageData, 0, 0);
    return;
  }

  var lut = GRADE_LUTS[gradeName] || GRADE_LUTS['Vice Sunset'];
  var posterInk = gradeName === 'Poster Ink';
  var keep = 1 - amount;
  for (var i = 0; i < data.length; i += 4) {
    var lum = pixelLuminance(data[i], data[i + 1], data[i + 2]);
    if (posterInk) {
      var pushed = Math.min(255, Math.max(0, (lum / 255 - 0.5) * 1.3 + 0.5));
      lum = Math.round(pushed * 4) / 4 * 255;
    }
    var idx = Math.round(lum) * 3;
    data[i] = data[i] * keep + lut[idx] * amount;
    data[i + 1] = data[i + 1] * keep + lut[idx + 1] * amount;
    data[i + 2] = data[i + 2] * keep + lut[idx + 2] * amount;
  }
  ctx.putImageData(imageData, 0, 0);
}

function setCanvasLetterSpacing(ctx, value) {
  try {
    ctx.letterSpacing = value;
  } catch (err) {
    /* older canvas implementations simply skip tracking */
  }
}

function drawCoverLettering(ctx, w, h, text) {
  var centreX = w / 2;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  if (text.kicker) {
    var kickerSize = Math.max(13, w * 0.02);
    ctx.font = kickerSize + 'px "Anton", "Arial Narrow", sans-serif';
    // Tighter tracking than before: at the old 0.55 spacing the centred
    // line stretched so wide that a letter could land half over a panel
    // gutter. 0.42 keeps the letterspaced poster look while the whole word
    // sits comfortably inside the hero panel's width.
    setCanvasLetterSpacing(ctx, Math.round(kickerSize * 0.42) + 'px');
    // A soft dark halo behind the letters, not a hard offset shadow: the
    // kicker usually sits over bright sky, and the blurred shadow keeps the
    // cream text readable without a visible drop edge.
    ctx.shadowColor = 'rgba(5, 5, 15, 0.85)';
    ctx.shadowBlur = kickerSize * 0.55;
    ctx.shadowOffsetY = kickerSize * 0.1;
    ctx.fillStyle = '#f7efdc';
    ctx.fillText(text.kicker.toUpperCase(), centreX, h * 0.085);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    setCanvasLetterSpacing(ctx, '0px');
  }

  var title = (text.title || '').toUpperCase();
  var titleSize = w * 0.135;
  ctx.font = titleSize + 'px "Anton", "Arial Narrow", sans-serif';
  while (title && ctx.measureText(title).width > w * 0.9 && titleSize > 12) {
    titleSize *= 0.94;
    ctx.font = titleSize + 'px "Anton", "Arial Narrow", sans-serif';
  }
  var titleWidth = title ? ctx.measureText(title).width : 0;
  var titleBaseline = h * 0.94;

  if (title) {
    ctx.save();
    ctx.translate(centreX, titleBaseline);
    ctx.transform(1, 0, -0.07, 1, 0, 0);
    ctx.font = titleSize + 'px "Anton", "Arial Narrow", sans-serif';
    ctx.fillStyle = '#0a0a12';
    ctx.fillText(title, titleSize * 0.05, titleSize * 0.06);
    ctx.lineJoin = 'round';
    ctx.lineWidth = titleSize * 0.1;
    ctx.strokeStyle = '#101018';
    ctx.strokeText(title, 0, 0);
    var fillGradient = ctx.createLinearGradient(0, -titleSize, 0, 0);
    fillGradient.addColorStop(0, '#ffffff');
    fillGradient.addColorStop(0.55, '#ffd9a0');
    fillGradient.addColorStop(1, '#ff7eb6');
    ctx.fillStyle = fillGradient;
    ctx.fillText(title, 0, 0);
    ctx.restore();
  }

  if (text.script) {
    var scriptSize = w * 0.058;
    ctx.save();
    ctx.translate(centreX - titleWidth * 0.27, titleBaseline - titleSize * 0.98);
    ctx.rotate(-0.06);
    ctx.font = scriptSize + 'px "Pacifico", cursive';
    ctx.shadowColor = '#ff2e88';
    ctx.shadowBlur = w * 0.022;
    ctx.fillStyle = '#ff5da2';
    ctx.fillText(text.script, 0, 0);
    ctx.fillText(text.script, 0, 0);
    ctx.restore();
  }

  ctx.restore();
}

function starPathPoints(cx, cy, outerRadius, innerRadius, pointCount) {
  var points = [];
  for (var i = 0; i < pointCount * 2; i++) {
    var radius = i % 2 === 0 ? outerRadius : innerRadius;
    var angle = (Math.PI / pointCount) * i - Math.PI / 2;
    points.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]);
  }
  return points;
}

function drawStarBadge(ctx, x, y, radius) {
  var r = radius || 44;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(10, 10, 26, 0.55)';
  ctx.fill();
  ctx.lineWidth = r * 0.07;
  ctx.strokeStyle = '#f7efdc';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, r * 0.82, 0, Math.PI * 2);
  ctx.lineWidth = r * 0.03;
  ctx.strokeStyle = 'rgba(247, 239, 220, 0.65)';
  ctx.stroke();

  var starGradient = ctx.createLinearGradient(x, y - r * 0.62, x, y + r * 0.3);
  starGradient.addColorStop(0, '#ffb35c');
  starGradient.addColorStop(1, '#ff2e88');
  var points = starPathPoints(x, y - r * 0.14, r * 0.52, r * 0.22, 5);
  ctx.beginPath();
  points.forEach(function (point, index) {
    if (index === 0) ctx.moveTo(point[0], point[1]);
    else ctx.lineTo(point[0], point[1]);
  });
  ctx.closePath();
  ctx.fillStyle = starGradient;
  ctx.shadowColor = 'rgba(255, 46, 136, 0.65)';
  ctx.shadowBlur = r * 0.25;
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.font = Math.round(r * 0.24) + 'px "Anton", "Arial Narrow", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f7efdc';
  ctx.fillText('EST. 2026', x, y + r * 0.58);
  ctx.restore();
}

var grainCanvasCache = null;

function makeGrainCanvas() {
  if (grainCanvasCache) return grainCanvasCache;
  var size = 256;
  var tile = document.createElement('canvas');
  tile.width = size;
  tile.height = size;
  var tileCtx = tile.getContext('2d');
  var imageData = tileCtx.createImageData(size, size);
  for (var i = 0; i < imageData.data.length; i += 4) {
    var value = Math.floor(Math.random() * 256);
    imageData.data[i] = value;
    imageData.data[i + 1] = value;
    imageData.data[i + 2] = value;
    imageData.data[i + 3] = 255;
  }
  tileCtx.putImageData(imageData, 0, 0);
  grainCanvasCache = tile;
  return tile;
}

function drawGrainAndVignette(ctx, w, h) {
  ctx.save();
  try {
    ctx.globalCompositeOperation = 'overlay';
  } catch (err) { /* keep default composite */ }
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = ctx.createPattern(makeGrainCanvas(), 'repeat');
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  ctx.save();
  var outer = Math.max(w, h) * 0.75;
  var vignette = ctx.createRadialGradient(w / 2, h / 2, outer * 0.45, w / 2, h / 2, outer);
  vignette.addColorStop(0, 'rgba(8, 2, 16, 0)');
  vignette.addColorStop(1, 'rgba(8, 2, 16, 0.48)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function renderCover(targetCanvas, state, width, height) {
  targetCanvas.width = width;
  targetCanvas.height = height;
  var ctx = targetCanvas.getContext('2d');
  ctx.fillStyle = GUTTER_COLOUR;
  ctx.fillRect(0, 0, width, height);

  var photoCanvas = document.createElement('canvas');
  photoCanvas.width = width;
  photoCanvas.height = height;
  var photoCtx = photoCanvas.getContext('2d');

  var layout = buildPanelLayouts()[state.layoutIndex] || buildPanelLayouts()[0];
  var gutter = Math.max(6, Math.round(width * 0.009));
  var pixelPanels = layout.panels.map(function (fractionRect) {
    return panelRectToPixels(fractionRect, width, height, gutter);
  });

  if (state.spread && state.spreadImage) {
    drawSpreadPhoto(photoCtx, state.spreadImage, pixelPanels, width, height, state.spreadPlacement);
  } else {
    pixelPanels.forEach(function (rect, index) {
      var placement = state.panels[index];
      if (placement && placement.image) drawPhotoIntoPanel(photoCtx, placement.image, rect, placement);
      else drawEmptyPanel(photoCtx, rect, index + 1);
    });
  }

  applyColourGrade(photoCanvas, state.gradeName, state.gradeStrength);
  ctx.drawImage(photoCanvas, 0, 0);

  drawCoverLettering(ctx, width, height, state.texts);
  if (state.showBadge) {
    var badgeRadius = Math.max(30, width * 0.042);
    drawStarBadge(ctx, width - badgeRadius - width * 0.028, badgeRadius + height * 0.03, badgeRadius);
  }
  if (state.showGrain) drawGrainAndVignette(ctx, width, height);
  return targetCanvas;
}

function exportCoverPng(state, width, height) {
  var offscreen = document.createElement('canvas');
  renderCover(offscreen, state, width, height);
  if (offscreen.toBlob) {
    offscreen.toBlob(function (blob) {
      if (!blob) return;
      var url = URL.createObjectURL(blob);
      var link = document.createElement('a');
      link.href = url;
      link.download = 'neon-vice-cover-' + width + 'x' + height + '.png';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    }, 'image/png');
  }
  return offscreen;
}

function loadImageFromUrl(url) {
  return new Promise(function (resolve, reject) {
    var image = new Image();
    image.onload = function () { resolve(image); };
    image.onerror = reject;
    image.src = url;
  });
}

function assignPhotosToPanels(state, images) {
  if (!images.length) return;
  state.panels.forEach(function (placement, index) {
    placement.image = images[index % images.length];
    placement.zoom = 1;
    placement.offsetX = 0.5;
    placement.offsetY = 0.5;
  });
  state.spreadImage = images[0];
}

var studioState = createDefaultCoverState();

function loadSamplePhotosIntoStudio() {
  return Promise.all(SAMPLE_PHOTO_URLS.map(loadImageFromUrl)).then(function (images) {
    assignPhotosToPanels(studioState, images);
    return images;
  });
}

window.coverStudio = {
  getState: function () { return studioState; },
  setLayout: function (layout) {
    var layouts = buildPanelLayouts();
    if (typeof layout === 'number') {
      studioState.layoutIndex = Math.min(layouts.length - 1, Math.max(0, layout));
    } else {
      layouts.forEach(function (entry, index) {
        if (entry.name === layout) studioState.layoutIndex = index;
      });
    }
    if (studioState.selectedPanel >= layouts[studioState.layoutIndex].panels.length) {
      studioState.selectedPanel = 0;
    }
  },
  setGrade: function (gradeName) { studioState.gradeName = gradeName; },
  setTexts: function (texts) {
    if (!texts) return;
    if (texts.kicker != null) studioState.texts.kicker = texts.kicker;
    if (texts.script != null) studioState.texts.script = texts.script;
    if (texts.title != null) studioState.texts.title = texts.title;
  },
  loadSamplePhotos: loadSamplePhotosIntoStudio,
  exportCoverPng: function (width, height) { return exportCoverPng(studioState, width, height); },
  renderCover: function (canvas, state, width, height) {
    return renderCover(canvas, state || studioState, width, height);
  }
};
