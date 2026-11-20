// Neon Vice Cover Studio v2 — the single Canvas 2D renderer.
// Preview and every export go through NV.renderCover, so what you see is
// exactly what you get at 1920x1080, 1080x1350 and 1080x1080.
window.NV = window.NV || {};

// ---------- deterministic helpers ----------
NV.lcg = function (seed) {
  var s = seed >>> 0;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
};

NV._grainPattern = null;
NV.grainPattern = function (ctx) {
  if (NV._grainPattern) return NV._grainPattern;
  var c = document.createElement('canvas');
  c.width = c.height = 140;
  var g = c.getContext('2d');
  var img = g.createImageData(140, 140);
  var rnd = NV.lcg(20260614);
  for (var i = 0; i < img.data.length; i += 4) {
    var v = Math.floor(rnd() * 255);
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  NV._grainPattern = ctx.createPattern(c, 'repeat');
  return NV._grainPattern;
};

NV._halftonePattern = null;
NV.halftonePattern = function (ctx) {
  if (NV._halftonePattern) return NV._halftonePattern;
  var c = document.createElement('canvas');
  c.width = c.height = 9;
  var g = c.getContext('2d');
  g.clearRect(0, 0, 9, 9);
  var grad = g.createRadialGradient(4.5, 4.5, 0.4, 4.5, 4.5, 3.4);
  grad.addColorStop(0, 'rgba(0,0,0,0.85)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 9, 9);
  NV._halftonePattern = ctx.createPattern(c, 'repeat');
  return NV._halftonePattern;
};

function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }

// ---------- layout geometry ----------
// Returns panels as pixel polygons for a W x H canvas.
// Each entry: { poly: [[x,y],...], hero: bool }
NV.layoutPolys = function (name, W, H) {
  var wide = W / H >= 1.15;
  var P = function (pts) {
    return pts.map(function (p) { return [p[0] * W, p[1] * H]; });
  };
  var out = [];
  var i, x0, x1, y0, y1;

  if (name === 'Full Bleed') {
    out.push({ poly: P([[0, 0], [1, 0], [1, 1], [0, 1]]), hero: true });
    return out;
  }

  if (name === 'Key Art Slash') {
    if (wide) {
      out.push({ poly: P([[0, 0], [0.545, 0], [0.475, 1], [0, 1]]), hero: true });
      out.push({ poly: P([[0.555, 0], [0.79, 0], [0.765, 0.45], [0.51, 0.475]]) });
      out.push({ poly: P([[0.80, 0], [1, 0], [1, 0.465], [0.775, 0.45]]) });
      out.push({ poly: P([[0.50, 0.49], [0.755, 0.465], [0.75, 1], [0.485, 1]]) });
      out.push({ poly: P([[0.765, 0.48], [1, 0.48], [1, 1], [0.76, 1]]) });
    } else {
      // tall/square: hero across the top, then a slanted 2x2 grid below;
      // the title block layers over the grid's upper middle, poster-style.
      out = [
        { poly: P([[0, 0], [1, 0], [0.95, 0.46], [0, 0.495]]), hero: true },
        { poly: P([[0, 0.51], [0.485, 0.49], [0.48, 0.745], [0, 0.755]]) },
        { poly: P([[0.50, 0.487], [0.945, 0.472], [1, 0.75], [0.495, 0.745]]) },
        { poly: P([[0, 0.77], [0.475, 0.76], [0.485, 1], [0, 1]]) },
        { poly: P([[0.49, 0.757], [0.995, 0.762], [1, 1], [0.50, 1]]) },
      ];
    }
    return out;
  }

  if (name === 'Hero Mosaic') {
    out.push({ poly: P([[0.015, 0.02], [0.325, 0.005], [0.345, 0.48], [0.02, 0.50]]) });
    out.push({ poly: P([[0.02, 0.515], [0.345, 0.495], [0.335, 0.99], [0.015, 1]]) });
    out.push({ poly: P([[0.345, 0], [0.665, 0], [0.655, 1], [0.335, 1]]), hero: true });
    out.push({ poly: P([[0.675, 0.005], [0.985, 0.02], [0.98, 0.50], [0.665, 0.48]]) });
    out.push({ poly: P([[0.665, 0.495], [0.98, 0.515], [0.985, 1], [0.665, 0.99]]) });
    return out;
  }

  if (name === 'Slash Trio') {
    out.push({ poly: P([[0, 0], [0.44, 0], [0.30, 1], [0, 1]]), hero: true });
    out.push({ poly: P([[0.455, 0], [0.76, 0], [0.615, 1], [0.315, 1]]) });
    out.push({ poly: P([[0.775, 0], [1, 0], [1, 1], [0.63, 1]]) });
    return out;
  }

  if (name === 'Six Grid') {
    var cols = 3, rows = 2;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        x0 = c / cols; x1 = (c + 1) / cols; y0 = r / rows; y1 = (r + 1) / rows;
        var slant = (r === 0 ? 0.012 : -0.012);
        out.push({ poly: P([[x0, y0 + (c ? slant : 0)], [x1, y0], [x1, y1], [x0, y1 + (c ? slant : 0)]]),
                   hero: r === 0 && c === 1 });
      }
    }
    return out;
  }

  if (name === 'Strip Five') {
    for (i = 0; i < 5; i++) {
      x0 = i / 5; x1 = (i + 1) / 5;
      var lift = (i % 2 === 0) ? 0 : 0.035;
      out.push({ poly: P([[x0, lift], [x1, i % 2 ? 0 : 0.035], [x1, 1], [x0, 1]]), hero: i === 2 });
    }
    return out;
  }

  if (name === 'Postcards') {
    // Rotated snapshot rects; rotation applied at draw time via .rot (radians).
    var cards = [
      { cx: 0.27, cy: 0.34, w: 0.46, h: 0.52, rot: -0.055, hero: true },
      { cx: 0.68, cy: 0.28, w: 0.40, h: 0.42, rot: 0.05 },
      { cx: 0.80, cy: 0.62, w: 0.36, h: 0.40, rot: -0.04 },
      { cx: 0.16, cy: 0.74, w: 0.30, h: 0.34, rot: 0.07 },
      { cx: 0.48, cy: 0.80, w: 0.34, h: 0.32, rot: -0.025 },
    ];
    return cards.map(function (cd) {
      var hw = cd.w * W / 2, hh = cd.h * H / 2;
      var cx = cd.cx * W, cy = cd.cy * H;
      var cos = Math.cos(cd.rot), sin = Math.sin(cd.rot);
      var corners = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(function (p) {
        return [cx + p[0] * cos - p[1] * sin, cy + p[0] * sin + p[1] * cos];
      });
      return { poly: corners, hero: !!cd.hero, rot: cd.rot, cx: cx, cy: cy, w: cd.w * W, h: cd.h * H, postcard: true };
    });
  }

  // Fallback: treat unknown as Key Art Slash.
  return NV.layoutPolys('Key Art Slash', W, H);
};

// Shrink a polygon toward its centroid (creates the plum gaps between panels).
NV.insetPoly = function (poly, px) {
  var cx = 0, cy = 0;
  poly.forEach(function (p) { cx += p[0]; cy += p[1]; });
  cx /= poly.length; cy /= poly.length;
  return poly.map(function (p) {
    var dx = p[0] - cx, dy = p[1] - cy;
    var d = Math.sqrt(dx * dx + dy * dy) || 1;
    var m = Math.max(0, d - px) / d;
    return [cx + dx * m, cy + dy * m];
  });
};

NV.polyBBox = function (poly) {
  var minX = 1e12, minY = 1e12, maxX = -1e12, maxY = -1e12;
  poly.forEach(function (p) {
    minX = Math.min(minX, p[0]); minY = Math.min(minY, p[1]);
    maxX = Math.max(maxX, p[0]); maxY = Math.max(maxY, p[1]);
  });
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
};

NV.pointInPoly = function (x, y, poly) {
  var inside = false;
  for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    var xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
};

// ---------- panel photo drawing ----------
// Cover-crop an image into a rect, honoring focal point, zoom, pan and flip.
NV.drawCoverPhoto = function (ctx, img, x, y, w, h, p) {
  if (!img || !img.width) return;
  var s = Math.max(w / img.width, h / img.height) * (p.zoom || 1);
  var dw = img.width * s, dh = img.height * s;
  var dx = x + w / 2 - (p.fx || 0.5) * dw + (p.panX || 0) * w;
  var dy = y + h / 2 - (p.fy || 0.42) * dh + (p.panY || 0) * h;
  dx = Math.min(x, Math.max(x + w - dw, dx));
  dy = Math.min(y, Math.max(y + h - dh, dy));
  ctx.save();
  if (p.flip) {
    ctx.translate(x + w / 2, 0);
    ctx.scale(-1, 1);
    ctx.translate(-(x + w / 2), 0);
    dx = 2 * x + w - dx - dw;
  }
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
  p._t = { s: s, dx: dx, dy: dy, dw: dw, dh: dh };
};

NV.tracePoly = function (ctx, poly) {
  ctx.beginPath();
  poly.forEach(function (p, i) {
    if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
  });
  ctx.closePath();
};

// Draw one panel: clip to its (inset) polygon, grade-filtered photo, cream frame.
NV.drawPanel = function (ctx, geo, panel, grade, W, H) {
  var gap = Math.max(3, W * 0.004);
  var poly = NV.insetPoly(geo.poly, gap);
  var bb = NV.polyBBox(geo.poly);
  panel._bb = bb;
  ctx.save();
  NV.tracePoly(ctx, poly);
  ctx.clip();
  ctx.filter = grade.filter;
  NV.drawCoverPhoto(ctx, panel._img, bb.x, bb.y, bb.w, bb.h, panel);
  ctx.filter = 'none';
  // soft inner shade at the panel's lower edge so tags/title sit well
  var sh = ctx.createLinearGradient(0, bb.y + bb.h * 0.55, 0, bb.y + bb.h);
  sh.addColorStop(0, 'rgba(10,2,20,0)');
  sh.addColorStop(1, 'rgba(10,2,20,0.28)');
  ctx.fillStyle = sh;
  ctx.fillRect(bb.x, bb.y, bb.w, bb.h);
  ctx.restore();
  // cream frame
  ctx.save();
  NV.tracePoly(ctx, poly);
  ctx.lineWidth = Math.max(2, W * 0.0035);
  ctx.strokeStyle = '#f3e5c3';
  ctx.stroke();
  ctx.restore();
  return poly;
};

// Posterize (+ optional ink edge darkening) over the photo layer only.
// Runs on a scratch canvas so title/dressing drawn later stays crisp.
NV.applyPaintInk = function (ctx, W, H, look) {
  var paint = look.paint / 100;              // 0..1
  var ink = look.ink ? look.inkStrength / 100 : 0;
  if (paint <= 0.01 && ink <= 0.01) return;
  var levels = Math.round(lerp(256, lerp(26, 9, ink), Math.max(paint, ink * 0.85)));
  if (levels >= 250 && ink <= 0.01) return;
  var data;
  try {
    data = ctx.getImageData(0, 0, W, H);
  } catch (e) { return; }
  var d = data.data;
  var step = 255 / (levels - 1);
  var edgeDark = ink * 0.55;
  var i, v;
  // luminance pass first for cheap edge detection (right & down neighbours)
  var lum = new Float32Array(W * H);
  for (i = 0; i < W * H; i++) {
    lum[i] = 0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2];
  }
  for (var y = 0; y < H; y++) {
    for (var x = 0; x < W; x++) {
      var idx = y * W + x;
      var o = idx * 4;
      for (var ch = 0; ch < 3; ch++) {
        v = d[o + ch];
        d[o + ch] = Math.round(Math.round(v / step) * step);
      }
      if (edgeDark > 0) {
        var l = lum[idx];
        var lx = x + 1 < W ? lum[idx + 1] : l;
        var ly = y + 1 < H ? lum[idx + W] : l;
        var e = Math.min(1, (Math.abs(l - lx) + Math.abs(l - ly)) / 90);
        var f = 1 - edgeDark * e;
        d[o] *= f; d[o + 1] *= f; d[o + 2] *= f;
      }
      // ink also deepens the darkest band, like ink pooling in shadow
      if (ink > 0 && lum[idx] < 70) {
        var f2 = 1 - ink * 0.18 * (1 - lum[idx] / 70);
        d[o] *= f2; d[o + 1] *= f2; d[o + 2] *= f2;
      }
    }
  }
  ctx.putImageData(data, 0, 0);
};

// ---------- poster dressing ----------
NV.star = function (ctx, cx, cy, r, color) {
  ctx.save();
  ctx.beginPath();
  for (var i = 0; i < 10; i++) {
    var rad = i % 2 === 0 ? r : r * 0.45;
    var a = -Math.PI / 2 + i * Math.PI / 5;
    var x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
};

NV.sparkle = function (ctx, cx, cy, r) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.quadraticCurveTo(cx, cy, cx + r, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy + r);
  ctx.quadraticCurveTo(cx, cy, cx - r, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy - r);
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.shadowColor = 'rgba(255,255,255,0.9)';
  ctx.shadowBlur = r * 0.9;
  ctx.fill();
  ctx.restore();
};

NV.setSpacing = function (ctx, px) {
  try { ctx.letterSpacing = px + 'px'; } catch (e) { /* older engines */ }
};

// Press quote: five gold stars, quote in letterspaced caps, gazette name.
// A soft dark backdrop keeps it readable over busy panel art.
NV.drawQuote = function (ctx, W, H, cap, yBase) {
  var cx = W / 2;
  var starR = H * 0.011;
  var gap = starR * 2.6;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  NV.setSpacing(ctx, W * 0.004);
  ctx.font = '600 ' + Math.round(H * 0.021) + 'px Teko, sans-serif';
  var q = '“' + cap.quote + '” — ' + cap.gazette;
  var qw = ctx.measureText(q).width;
  // backdrop pill behind stars + quote line
  var bw = Math.max(qw, gap * 5) + W * 0.045;
  var bh = H * 0.078;
  var bx = cx - bw / 2, by = yBase - starR - H * 0.012;
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, bh / 2);
  ctx.fillStyle = 'rgba(10,2,20,0.52)';
  ctx.fill();
  for (var i = 0; i < 5; i++) {
    NV.star(ctx, cx + (i - 2) * gap, yBase, starR, '#ffc93c');
  }
  ctx.fillStyle = '#ffe9a8';
  ctx.shadowColor = 'rgba(0,0,0,0.65)';
  ctx.shadowBlur = H * 0.008;
  ctx.shadowOffsetY = H * 0.002;
  ctx.fillText(q, cx, yBase + H * 0.032);
  ctx.restore();
  NV.setSpacing(ctx, 0);
};

// The big title: layered dark extrusion + horizontal stripe chrome fill.
NV.drawTitle = function (ctx, W, H, state, yTop) {
  var cap = state.caption;
  var look = state.look;
  var title = (cap.title || '').toUpperCase();
  if (!title) return 0;
  var size = H * 0.148 * (look.titleSize / 100);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = size + 'px Anton, sans-serif';
  // shrink to fit 94% width
  var wText = ctx.measureText(title).width;
  if (wText > W * 0.94) {
    size = size * (W * 0.94) / wText;
    ctx.font = size + 'px Anton, sans-serif';
    wText = ctx.measureText(title).width;
  }
  var cx = W / 2;
  var base = yTop + size; // baseline
  // 3D extrusion: layered offsets in deep purple
  var depth = Math.max(3, size * 0.055);
  ctx.fillStyle = '#2a0a3a';
  for (var i = depth; i > 0; i--) {
    ctx.fillText(title, cx + i * 0.55, base + i);
  }
  ctx.fillStyle = '#17041f';
  ctx.fillText(title, cx + depth * 0.55 + 1.5, base + depth + 1.5);
  // stripe chrome fill
  var grad = ctx.createLinearGradient(0, yTop, 0, base + depth);
  var stops = NV.TITLE_STYLES[state.titleStyle] || NV.TITLE_STYLES['Sunset Chrome'];
  stops.forEach(function (s) { grad.addColorStop(s[0], s[1]); });
  ctx.fillStyle = grad;
  ctx.fillText(title, cx, base);
  // thin top highlight pass
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(title, cx, base - size * 0.012);
  ctx.restore();
  // sparkles on a few letters
  var rnd = NV.lcg(777);
  var n = Math.max(2, Math.floor(title.length / 3));
  for (var k = 0; k < n; k++) {
    var sx = cx - wText / 2 + rnd() * wText;
    var sy = yTop + rnd() * size * 0.5;
    NV.sparkle(ctx, sx, sy, size * (0.05 + rnd() * 0.05));
  }
  ctx.restore();
  return size;
};

// Script accent overlapping the title's lower-left, pink neon + white outline.
NV.drawScript = function (ctx, W, H, state, yTop, titleSize) {
  var text = state.caption.script;
  if (!text) return;
  var size = titleSize * 0.44;
  ctx.save();
  ctx.font = size + 'px "Kaushan Script", cursive';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  var wText = ctx.measureText(text).width;
  var x = W / 2 - (titleSize * 2.6) - wText * 0.1;
  x = Math.max(W * 0.05, Math.min(x, W * 0.62 - wText * 0.4));
  var y = yTop + titleSize * 1.16;
  ctx.translate(x, y);
  ctx.rotate(-0.045);
  ctx.lineWidth = size * 0.16;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#ffffff';
  ctx.shadowColor = 'rgba(255,46,136,0.85)';
  ctx.shadowBlur = size * 0.35;
  ctx.strokeText(text, 0, 0);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ff5da2';
  ctx.fillText(text, 0, 0);
  ctx.restore();
};

// The tagline ribbon's rect (px), or null when there is no tagline.
NV.taglineRect = function (ctx, W, H, state, y) {
  var text = state.caption.tagline;
  if (!text) return null;
  var size = H * 0.023;
  ctx.save();
  ctx.font = '600 ' + Math.round(size) + 'px Teko, sans-serif';
  NV.setSpacing(ctx, W * 0.006);
  var w = ctx.measureText(text).width + W * 0.05;
  ctx.restore();
  NV.setSpacing(ctx, 0);
  var h = size * 1.7;
  return { x: W / 2 - w / 2, y: y - h / 2, w: w, h: h };
};

// Black tagline ribbon.
NV.drawTagline = function (ctx, W, H, state, y) {
  var text = state.caption.tagline;
  if (!text) return;
  var rect = NV.taglineRect(ctx, W, H, state, y);
  ctx.save();
  var size = H * 0.023;
  ctx.font = '600 ' + Math.round(size) + 'px Teko, sans-serif';
  NV.setSpacing(ctx, W * 0.006);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(8,2,14,0.88)';
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = '#ffd76b';
  ctx.fillText(text, W / 2, y + size * 0.05);
  ctx.restore();
  NV.setSpacing(ctx, 0);
};

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// Slanted black name tag with yellow italic text, bottom-left of a panel.
// dress = { titleRect, ribbonRect }: a tag never hides under the title
// (it is skipped when it would), and it shifts clear of the tagline ribbon.
NV.drawTag = function (ctx, geo, panel, idx, W, H, dress) {
  if (!panel.tag) return;
  var bb = NV.polyBBox(geo.poly);
  if (bb.w < W * 0.09 || bb.h < H * 0.09) return;
  var size = clamp(bb.h * 0.085, H * 0.016, H * 0.03);
  ctx.save();
  ctx.font = 'italic 600 ' + Math.round(size) + 'px Teko, sans-serif';
  var tw = ctx.measureText(panel.tag).width;
  var padX = size * 0.7;
  var tagW = tw + padX * 2, tagH = size * 1.55;
  var x = bb.x + W * 0.012;
  var y = bb.y + bb.h - tagH - H * 0.014;
  // keep tags clear of the bottom palm/billing dressing on full-height panels
  y = Math.min(y, H * 0.878 - tagH);
  if (dress) {
    var rect = { x: x, y: y, w: tagW + tagH * 0.35, h: tagH };
    if (dress.titleRect && rectsOverlap(rect, dress.titleRect)) {
      ctx.restore();
      NV.drawPanelNumber(ctx, geo, idx, W, H);
      return;
    }
    if (dress.ribbonRect && rectsOverlap(rect, dress.ribbonRect)) {
      var below = dress.ribbonRect.y + dress.ribbonRect.h + H * 0.006;
      var above = dress.ribbonRect.y - tagH - H * 0.006;
      if (below + tagH <= bb.y + bb.h - H * 0.006) y = below;
      else if (above >= bb.y + H * 0.008) y = above;
      rect.y = y;
      if (dress.titleRect && rectsOverlap(rect, dress.titleRect)) {
        ctx.restore();
        NV.drawPanelNumber(ctx, geo, idx, W, H);
        return;
      }
    }
  }
  var slant = tagH * 0.35;
  ctx.beginPath();
  ctx.moveTo(x + slant, y);
  ctx.lineTo(x + tagW + slant, y);
  ctx.lineTo(x + tagW, y + tagH);
  ctx.lineTo(x, y + tagH);
  ctx.closePath();
  ctx.fillStyle = 'rgba(5,2,10,0.88)';
  ctx.fill();
  ctx.fillStyle = '#ffd21f';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(panel.tag, x + slant * 0.4 + padX, y + tagH / 2 + size * 0.04);
  ctx.restore();
  NV.drawPanelNumber(ctx, geo, idx, W, H);
};

// Circled panel number, top-left of a panel.
NV.drawPanelNumber = function (ctx, geo, idx, W, H) {
  var bb = NV.polyBBox(geo.poly);
  var r = clamp(bb.h * 0.05, H * 0.013, H * 0.022);
  var cxp = bb.x + W * 0.012 + r, cyp = bb.y + H * 0.014 + r;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cxp, cyp, r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(5,2,10,0.75)';
  ctx.fill();
  ctx.lineWidth = Math.max(1.2, H * 0.0016);
  ctx.strokeStyle = '#f3e5c3';
  ctx.stroke();
  ctx.fillStyle = '#f3e5c3';
  ctx.font = '600 ' + Math.round(r * 1.15) + 'px Teko, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(idx + 1), cxp, cyp + r * 0.08);
  ctx.restore();
};

// Gold starburst seal.
NV.drawSeal = function (ctx, cx, cy, r) {
  ctx.save();
  ctx.beginPath();
  var spikes = 28;
  for (var i = 0; i < spikes * 2; i++) {
    var rad = i % 2 === 0 ? r : r * 0.86;
    var a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
    var x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  var g = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
  g.addColorStop(0, '#ffe98a');
  g.addColorStop(0.7, '#ffc93c');
  g.addColorStop(1, '#d98a12');
  ctx.fillStyle = g;
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = r * 0.25;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.74, 0, Math.PI * 2);
  ctx.lineWidth = r * 0.045;
  ctx.strokeStyle = '#8a5a06';
  ctx.stroke();
  ctx.fillStyle = '#5e3c04';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 ' + Math.round(r * 0.30) + 'px Teko, sans-serif';
  ctx.fillText('ORIGINAL', cx, cy - r * 0.30);
  ctx.fillText('COVER ART', cx, cy + 0.02 * r);
  NV.star(ctx, cx, cy + r * 0.38, r * 0.16, '#5e3c04');
  ctx.restore();
};

// Black pill badge, top-right.
NV.drawPill = function (ctx, W, H) {
  var text = 'VICE ★★★★☆';
  var size = H * 0.024;
  ctx.save();
  ctx.font = '600 ' + Math.round(size) + 'px Teko, sans-serif';
  NV.setSpacing(ctx, W * 0.002);
  var tw = ctx.measureText(text).width;
  var padX = size * 0.9, h = size * 1.8;
  var x = W * 0.985 - (tw + padX * 2), y = H * 0.028;
  ctx.beginPath();
  ctx.roundRect(x, y, tw + padX * 2, h, h / 2);
  ctx.fillStyle = 'rgba(5,2,10,0.88)';
  ctx.fill();
  ctx.lineWidth = Math.max(1.2, H * 0.0016);
  ctx.strokeStyle = '#ffc93c';
  ctx.stroke();
  ctx.fillStyle = '#ffd76b';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + padX, y + h / 2 + size * 0.05);
  ctx.restore();
  NV.setSpacing(ctx, 0);
};

// Yellow/black volume tag, top-left.
NV.drawVolTag = function (ctx, W, H) {
  var text = 'VOL. 1';
  var size = H * 0.024;
  ctx.save();
  ctx.font = '700 ' + Math.round(size) + 'px Teko, sans-serif';
  var tw = ctx.measureText(text).width;
  var padX = size * 0.6, h = size * 1.6;
  var x = W * 0.015, y = H * 0.028;
  ctx.fillStyle = '#ffd21f';
  ctx.fillRect(x, y, tw + padX * 2, h);
  ctx.lineWidth = Math.max(1.5, H * 0.002);
  ctx.strokeStyle = '#0a0214';
  ctx.strokeRect(x, y, tw + padX * 2, h);
  ctx.fillStyle = '#0a0214';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + padX, y + h / 2 + size * 0.05);
  ctx.restore();
};

// One stylized palm silhouette (trunk + fronds), drawn in black.
NV.palm = function (ctx, x, y, h) {
  ctx.save();
  ctx.strokeStyle = '#0a0214';
  ctx.fillStyle = '#0a0214';
  ctx.lineCap = 'round';
  ctx.lineWidth = h * 0.045;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + h * 0.06, y - h * 0.55, x + h * 0.20, y - h * 0.92);
  ctx.stroke();
  var tx = x + h * 0.20, ty = y - h * 0.92;
  ctx.lineWidth = h * 0.030;
  var fronds = [-2.6, -2.0, -1.45, -0.9, -0.35, 0.15];
  fronds.forEach(function (a) {
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(
      tx + Math.cos(a) * h * 0.30, ty + Math.sin(a) * h * 0.30 - h * 0.10,
      tx + Math.cos(a) * h * 0.46, ty + Math.sin(a) * h * 0.42 + h * 0.13);
    ctx.stroke();
  });
  ctx.restore();
};

// Sunset palm band across the bottom.
NV.drawPalmBand = function (ctx, W, H, grade) {
  var bandH = H * 0.052;
  var y = H - bandH - H * 0.036;
  ctx.save();
  var g = ctx.createLinearGradient(0, y, 0, y + bandH);
  g.addColorStop(0, '#ff9a3c');
  g.addColorStop(0.55, '#ff2e88');
  g.addColorStop(1, '#5b2ee5');
  ctx.fillStyle = g;
  ctx.fillRect(0, y, W, bandH);
  // sun disc
  ctx.beginPath();
  ctx.arc(W * 0.80, y + bandH * 0.52, bandH * 0.30, 0, Math.PI * 2);
  ctx.fillStyle = '#ffe259';
  ctx.fill();
  var rnd = NV.lcg(4242);
  for (var i = 0; i < 7; i++) {
    var px = W * (0.04 + rnd() * 0.6);
    NV.palm(ctx, px, y + bandH * 1.04, bandH * (1.05 + rnd() * 0.6));
  }
  // neon COMING SOON on the band's right side
  ctx.font = '600 ' + Math.round(bandH * 0.42) + 'px Teko, sans-serif';
  NV.setSpacing(ctx, W * 0.004);
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#ff2e88';
  ctx.shadowBlur = bandH * 0.3;
  ctx.fillText('COMING SOON', W * 0.985, y + bandH * 0.54);
  ctx.restore();
  NV.setSpacing(ctx, 0);
  return y;
};

// Barcode: deterministic stripe pattern.
NV.drawBarcode = function (ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#0a0214';
  var rnd = NV.lcg(90210);
  var cx = x + w * 0.06;
  while (cx < x + w * 0.94) {
    var bw = (0.4 + rnd() * 1.6) * (w / 42);
    if (rnd() > 0.32) ctx.fillRect(cx, y + h * 0.08, bw, h * 0.84);
    cx += bw + (0.4 + rnd()) * (w / 42);
  }
  ctx.restore();
};

// Billing block: tiny letterspaced credits line, centered at the very bottom.
NV.drawBilling = function (ctx, W, H) {
  var text = 'A NEON VICE PICTURE · STARRING YOUR CREW · SHOT ON YOUR OWN CAMERA · GRADED BY HAND IN THE STUDIO';
  var size = H * 0.0165;
  ctx.save();
  ctx.font = '500 ' + Math.round(size) + 'px Teko, sans-serif';
  NV.setSpacing(ctx, W * 0.0022);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  var tw = ctx.measureText(text).width;
  if (tw > W * 0.78) {
    size = size * (W * 0.78) / tw;
    ctx.font = '500 ' + Math.round(size) + 'px Teko, sans-serif';
  }
  ctx.fillStyle = 'rgba(243,229,195,0.92)';
  ctx.fillText(text, W * 0.47, H * 0.982);
  ctx.restore();
  NV.setSpacing(ctx, 0);
  NV.drawBarcode(ctx, W * 0.90, H * 0.962, W * 0.085, H * 0.030);
};

// Frame-break hero: the hero photo spills past its frame as a framed ring
// outside the panel polygon, over its neighbours, with a soft shadow.
NV.drawFrameBreak = function (ctx, geo, panel, grade, W, H) {
  if (!panel._img) return;
  var cx = 0, cy = 0;
  geo.poly.forEach(function (p) { cx += p[0]; cy += p[1]; });
  cx /= geo.poly.length; cy /= geo.poly.length;
  var big = geo.poly.map(function (p) {
    return [clamp(cx + (p[0] - cx) * 1.075, 0, W), clamp(cy + (p[1] - cy) * 1.06, 0, H)];
  });
  var bb = NV.polyBBox(big);
  ctx.save();
  ctx.beginPath();
  big.forEach(function (p, i) { if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]); });
  ctx.closePath();
  geo.poly.forEach(function (p, i) { if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]); });
  ctx.closePath();
  ctx.clip('evenodd');
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = W * 0.02;
  ctx.filter = grade.filter;
  NV.drawCoverPhoto(ctx, panel._img, bb.x, bb.y, bb.w, bb.h, panel);
  ctx.filter = 'none';
  ctx.restore();
  ctx.save();
  NV.tracePoly(ctx, big);
  ctx.lineWidth = Math.max(2, W * 0.0035);
  ctx.strokeStyle = '#f3e5c3';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = W * 0.012;
  ctx.stroke();
  ctx.restore();
};

// ---------- main render ----------
NV.lastPanels = [];   // [{geo, panel}] from the latest render, for hit-testing

NV.renderCover = function (ctx, W, H, opts) {
  opts = opts || {};
  var st = NV.state, look = st.look;
  var grade = NV.GRADES[st.grade] || NV.GRADES['Sunset Chrome'];
  st.panels.forEach(function (p) {
    var rec = NV.photos[p.photo];
    p._img = rec ? rec.img : null;
  });

  // plum backdrop
  var bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#2a1238');
  bg.addColorStop(0.55, '#1b0b28');
  bg.addColorStop(1, '#10041a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // panels
  var geos = NV.layoutPolys(st.layout, W, H);
  NV.lastPanels = [];
  var heroGeo = null, heroPanel = null;
  geos.forEach(function (geo, i) {
    var panel = st.panels[i];
    if (!panel) return;
    if (geo.postcard) {
      ctx.save();
      NV.tracePoly(ctx, geo.poly);
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = W * 0.018;
      ctx.shadowOffsetY = H * 0.008;
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.restore();
    }
    NV.drawPanel(ctx, geo, panel, grade, W, H);
    NV.lastPanels.push({ geo: geo, panel: panel, index: i });
    if (geo.hero) { heroGeo = geo; heroPanel = panel; }
  });

  // frame-break hero overflow
  if (look.frameBreak && heroGeo && heroPanel && st.layout !== 'Full Bleed' && st.layout !== 'Postcards') {
    NV.drawFrameBreak(ctx, heroGeo, heroPanel, grade, W, H);
  }

  // grade wash
  var amt = look.gradeAmt / 100;
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = clamp(grade.alpha * amt * 1.7, 0, 0.6);
  ctx.fillStyle = grade.overlay;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = clamp(grade.alpha * amt, 0, 0.4);
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // sky glow behind hero sky / title
  if (look.skyGlow) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    var g1 = ctx.createRadialGradient(W * 0.30, H * 0.26, 0, W * 0.30, H * 0.26, W * 0.55);
    g1.addColorStop(0, grade.glow);
    g1.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.34 * (look.glow / 100);
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, W, H);
    var g2 = ctx.createRadialGradient(W * 0.5, H * 0.72, 0, W * 0.5, H * 0.72, W * 0.5);
    g2.addColorStop(0, grade.glow);
    g2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.30 * (look.glow / 100);
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // poster paint / ink over the photo layer
  NV.applyPaintInk(ctx, W, H, look);

  // halftone + grain print texture
  if (look.halftone > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = (look.halftone / 100) * 0.5;
    ctx.fillStyle = NV.halftonePattern(ctx);
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  if (look.grain > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = (look.grain / 100) * 0.38;
    ctx.fillStyle = NV.grainPattern(ctx);
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // vignette
  ctx.save();
  var vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.78);
  vg.addColorStop(0, 'rgba(8,1,16,0)');
  vg.addColorStop(1, 'rgba(8,1,16,0.40)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // title block geometry
  var lift = (look.titleLift / 100) * H * 0.09;
  var titleTop = H * 0.612 - lift;
  var titleSize = H * 0.148 * (look.titleSize / 100);
  var taglineY = titleTop + titleSize * 1.24 + H * 0.030;
  var dress = {
    titleRect: { x: W * 0.03, y: titleTop, w: W * 0.94, h: titleSize * 1.30 },
    ribbonRect: NV.taglineRect(ctx, W, H, st, taglineY),
  };

  // panel name tags + numbers (crisp, above the texture; the quote and
  // title are drawn after them, so the dressing always wins an overlap)
  if (st.extras.tags) {
    NV.lastPanels.forEach(function (lp) { NV.drawTag(ctx, lp.geo, lp.panel, lp.index, W, H, dress); });
  } else {
    NV.lastPanels.forEach(function (lp) { NV.drawPanelNumber(ctx, lp.geo, lp.index, W, H); });
  }

  // press quote above the title
  if (st.extras.quote) NV.drawQuote(ctx, W, H, st.caption, titleTop - H * 0.064);

  // title, script, tagline
  var drawn = NV.drawTitle(ctx, W, H, st, titleTop);
  NV.drawScript(ctx, W, H, st, titleTop, drawn || titleSize);
  NV.drawTagline(ctx, W, H, st, taglineY);

  // badges
  if (st.extras.pill) NV.drawPill(ctx, W, H);
  if (st.extras.vol) NV.drawVolTag(ctx, W, H);
  if (st.extras.seal) {
    NV.drawSeal(ctx, W * 0.918, H * 0.845, Math.min(W * 0.050, H * 0.082));
  }

  // bottom dressing
  if (st.extras.palm) NV.drawPalmBand(ctx, W, H, grade);
  if (st.extras.billing) NV.drawBilling(ctx, W, H);

  // editor-only: selected panel outline
  if (opts.highlight && NV.lastPanels[st.selected]) {
    ctx.save();
    NV.tracePoly(ctx, NV.lastPanels[st.selected].geo.poly);
    ctx.lineWidth = Math.max(2, W * 0.0028);
    ctx.strokeStyle = '#22d3ee';
    ctx.setLineDash([W * 0.012, W * 0.008]);
    ctx.stroke();
    ctx.restore();
  }
  return { titleSize: drawn || titleSize, titleTop: titleTop };
};
