// Neon Vice Cover Studio v2 — editor chrome: controls, pointer interaction,
// photo tray, exports. The cover itself is pure canvas (see render.js).
window.NV = window.NV || {};

NV.markFaceMode = false;
NV._rafPending = false;

NV.scheduleRender = function () {
  if (NV._rafPending) return;
  NV._rafPending = true;
  requestAnimationFrame(function () {
    NV._rafPending = false;
    NV.renderPreview();
  });
};

NV.previewSize = function () {
  var a = NV.state.previewAspect;
  if (a === '4:5') return [922, 1152];
  if (a === '1:1') return [1024, 1024];
  return [1152, 648];
};

NV.renderPreview = function () {
  var canvas = document.getElementById('stage');
  if (!canvas) return;
  var size = NV.previewSize();
  if (canvas.width !== size[0] || canvas.height !== size[1]) {
    canvas.width = size[0];
    canvas.height = size[1];
  }
  var ctx = canvas.getContext('2d');
  NV.renderCover(ctx, canvas.width, canvas.height, { highlight: true });
};

// ---------- control builders ----------
function el(tag, cls, text) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

NV.buildChipGroup = function (containerId, names, current, onPick) {
  var box = document.getElementById(containerId);
  box.innerHTML = '';
  names.forEach(function (name) {
    var b = el('button', 'chip' + (name === current ? ' active' : ''), name);
    b.addEventListener('click', function () { onPick(name); });
    box.appendChild(b);
  });
};

NV.refreshChips = function () {
  NV.buildChipGroup('layoutBtns', NV.LAYOUT_NAMES, NV.state.layout, function (name) {
    NV.setLayout(name);
    NV.refreshAll();
  });
  NV.buildChipGroup('gradeBtns', NV.GRADE_NAMES, NV.state.grade, function (name) {
    NV.state.grade = name;
    NV.refreshChips();
    NV.scheduleRender();
  });
  NV.buildChipGroup('titleStyleBtns', NV.TITLE_STYLE_NAMES, NV.state.titleStyle, function (name) {
    NV.state.titleStyle = name;
    NV.refreshChips();
    NV.scheduleRender();
  });
};

NV.buildSlider = function (containerId, label, obj, key, min, max, suffix) {
  var box = document.getElementById(containerId);
  var row = el('label', 'slider-row');
  var name = el('span', 'slider-name', label);
  var input = document.createElement('input');
  input.type = 'range';
  input.min = min; input.max = max; input.value = obj[key];
  var val = el('span', 'slider-val', obj[key] + (suffix || ''));
  input.addEventListener('input', function () {
    obj[key] = Number(input.value);
    val.textContent = input.value + (suffix || '');
    NV.scheduleRender();
  });
  row.appendChild(name);
  row.appendChild(input);
  row.appendChild(val);
  box.appendChild(row);
  return input;
};

NV.buildToggle = function (containerId, label, obj, key, onChange) {
  var box = document.getElementById(containerId);
  var row = el('label', 'toggle-row');
  var input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = !!obj[key];
  input.addEventListener('change', function () {
    obj[key] = input.checked;
    if (onChange) onChange();
    NV.scheduleRender();
  });
  row.appendChild(input);
  row.appendChild(el('span', null, label));
  box.appendChild(row);
  return input;
};

// ---------- photo tray ----------
NV.buildTray = function () {
  var tray = document.getElementById('tray');
  tray.innerHTML = '';
  NV.photos.forEach(function (rec, i) {
    var t = el('button', 'thumb');
    var img = document.createElement('img');
    img.src = rec.img.src;
    img.alt = rec.name;
    t.appendChild(img);
    t.appendChild(el('span', 'thumb-tag', rec.name));
    t.title = 'Put this photo in the selected panel';
    t.addEventListener('click', function () {
      var p = NV.state.panels[NV.state.selected];
      if (!p) return;
      p.photo = i;
      p.tag = rec.tag;
      p.fx = rec.fx; p.fy = rec.fy;
      p.zoom = 1; p.panX = 0; p.panY = 0;
      NV.syncPanelEditor();
      NV.scheduleRender();
    });
    tray.appendChild(t);
  });
};

NV.addUserPhotos = function (files) {
  Array.prototype.forEach.call(files, function (file) {
    if (!file.type || file.type.indexOf('image/') !== 0) return;
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      NV.photos.push({ img: img, name: 'YOUR PHOTO', tag: 'THE STAR', fx: 0.5, fy: 0.4 });
      NV.buildTray();
    };
    img.src = url;
  });
};

// ---------- selected-panel editor ----------
NV.syncPanelEditor = function () {
  var p = NV.state.panels[NV.state.selected];
  var info = document.getElementById('panelInfo');
  if (!p) { info.textContent = 'No panel selected'; return; }
  var rec = NV.photos[p.photo];
  info.textContent = 'Panel ' + (NV.state.selected + 1) + ' — ' + (rec ? rec.name : 'empty');
  document.getElementById('panelZoom').value = Math.round(p.zoom * 100);
  document.getElementById('panelZoomVal').textContent = Math.round(p.zoom * 100) + '%';
  document.getElementById('panelTag').value = p.tag || '';
};

NV.initPanelEditor = function () {
  var zoom = document.getElementById('panelZoom');
  zoom.addEventListener('input', function () {
    var p = NV.state.panels[NV.state.selected];
    if (!p) return;
    p.zoom = Number(zoom.value) / 100;
    document.getElementById('panelZoomVal').textContent = zoom.value + '%';
    NV.scheduleRender();
  });
  document.getElementById('panelTag').addEventListener('input', function (e) {
    var p = NV.state.panels[NV.state.selected];
    if (p) { p.tag = e.target.value.toUpperCase(); NV.scheduleRender(); }
  });
  document.getElementById('btnFlip').addEventListener('click', function () {
    var p = NV.state.panels[NV.state.selected];
    if (p) { p.flip = !p.flip; NV.scheduleRender(); }
  });
  document.getElementById('btnSwap').addEventListener('click', function () {
    var panels = NV.state.panels;
    if (panels.length < 2) return;
    var i = NV.state.selected, j = (i + 1) % panels.length;
    var a = panels[i], b = panels[j];
    var t;
    t = a.photo; a.photo = b.photo; b.photo = t;
    t = a.tag; a.tag = b.tag; b.tag = t;
    t = a.fx; a.fx = b.fx; b.fx = t;
    t = a.fy; a.fy = b.fy; b.fy = t;
    NV.syncPanelEditor();
    NV.scheduleRender();
  });
  document.getElementById('btnResetCrop').addEventListener('click', function () {
    var p = NV.state.panels[NV.state.selected];
    if (!p) return;
    var rec = NV.photos[p.photo];
    p.zoom = 1; p.panX = 0; p.panY = 0;
    if (rec) { p.fx = rec.fx; p.fy = rec.fy; }
    NV.syncPanelEditor();
    NV.scheduleRender();
  });
  document.getElementById('btnMarkFace').addEventListener('click', function () {
    NV.markFaceMode = !NV.markFaceMode;
    this.classList.toggle('active', NV.markFaceMode);
    this.textContent = NV.markFaceMode ? 'Click a panel to place the face…' : 'Mark face';
  });
};

// ---------- canvas pointer interaction ----------
NV.initCanvas = function () {
  var canvas = document.getElementById('stage');
  var drag = null;

  function toCanvas(e) {
    var r = canvas.getBoundingClientRect();
    return [
      (e.clientX - r.left) * canvas.width / r.width,
      (e.clientY - r.top) * canvas.height / r.height,
    ];
  }
  function hit(x, y) {
    // topmost = last drawn wins for overlaps (postcards), so scan in reverse
    for (var i = NV.lastPanels.length - 1; i >= 0; i--) {
      if (NV.pointInPoly(x, y, NV.lastPanels[i].geo.poly)) return NV.lastPanels[i];
    }
    return null;
  }

  canvas.addEventListener('pointerdown', function (e) {
    var pt = toCanvas(e);
    var found = hit(pt[0], pt[1]);
    if (!found) return;
    NV.state.selected = found.index;
    NV.syncPanelEditor();
    if (NV.markFaceMode) {
      var p = found.panel;
      var t = p._t, bb = p._bb;
      if (t && bb) {
        p.fx = clamp01((pt[0] - t.dx) / t.dw);
        p.fy = clamp01((pt[1] - t.dy) / t.dh);
        p.panX = 0; p.panY = 0;
      }
      NV.markFaceMode = false;
      var btn = document.getElementById('btnMarkFace');
      btn.classList.remove('active');
      btn.textContent = 'Mark face';
      NV.scheduleRender();
      return;
    }
    drag = { panel: found.panel, startX: pt[0], startY: pt[1], panX: found.panel.panX, panY: found.panel.panY, bb: found.panel._bb };
    canvas.setPointerCapture(e.pointerId);
    NV.scheduleRender();
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var pt = toCanvas(e);
    var bb = drag.bb || { w: canvas.width, h: canvas.height };
    drag.panel.panX = drag.panX + (pt[0] - drag.startX) / bb.w;
    drag.panel.panY = drag.panY + (pt[1] - drag.startY) / bb.h;
    NV.scheduleRender();
  });
  canvas.addEventListener('pointerup', function () { drag = null; });
  canvas.addEventListener('pointercancel', function () { drag = null; });
};

function clamp01(v) { return Math.min(1, Math.max(0, v)); }

// ---------- exports ----------
NV.exportPNG = function (w, h) {
  var c = document.createElement('canvas');
  c.width = w; c.height = h;
  var ctx = c.getContext('2d');
  NV.renderCover(ctx, w, h, {});
  return c.toDataURL('image/png');
};

NV.downloadPNG = function (w, h) {
  var a = document.createElement('a');
  a.href = NV.exportPNG(w, h);
  a.download = 'neon-vice-cover-' + w + 'x' + h + '.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
};

NV.initExports = function () {
  document.querySelectorAll('[data-export]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var parts = btn.getAttribute('data-export').split('x');
      NV.downloadPNG(Number(parts[0]), Number(parts[1]));
    });
  });
  document.getElementById('btnExportAll').addEventListener('click', function () {
    [[1920, 1080], [1080, 1350], [1080, 1080]].forEach(function (s, i) {
      setTimeout(function () { NV.downloadPNG(s[0], s[1]); }, i * 350);
    });
  });
  document.querySelectorAll('[data-aspect]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      NV.state.previewAspect = btn.getAttribute('data-aspect');
      document.querySelectorAll('[data-aspect]').forEach(function (b) {
        b.classList.toggle('active', b === btn);
      });
      NV.scheduleRender();
    });
  });
};

// ---------- captions ----------
NV.initCaptions = function () {
  var cap = NV.state.caption;
  [['capTitle', 'title'], ['capScript', 'script'], ['capTagline', 'tagline'],
   ['capQuote', 'quote'], ['capGazette', 'gazette']].forEach(function (pair) {
    var input = document.getElementById(pair[0]);
    input.value = cap[pair[1]];
    input.addEventListener('input', function () {
      cap[pair[1]] = input.value;
      NV.scheduleRender();
    });
  });
};

NV.refreshAll = function () {
  NV.refreshChips();
  NV.syncPanelEditor();
  NV.scheduleRender();
};

NV.initEditor = function () {
  NV.refreshChips();
  NV.buildTray();
  NV.initCaptions();
  NV.initPanelEditor();
  NV.initCanvas();
  NV.initExports();

  var look = NV.state.look;
  NV.buildSlider('lookSliders', 'Paint', look, 'paint', 0, 100);
  NV.buildSlider('lookSliders', 'Grade', look, 'gradeAmt', 0, 100);
  NV.buildSlider('lookSliders', 'Halftone', look, 'halftone', 0, 100);
  NV.buildSlider('lookSliders', 'Grain', look, 'grain', 0, 100);
  NV.buildSlider('lookSliders', 'Glow', look, 'glow', 0, 100);
  NV.buildSlider('lookSliders', 'Title size', look, 'titleSize', 70, 130, '%');
  NV.buildSlider('lookSliders', 'Title lift', look, 'titleLift', -50, 50);
  NV.buildSlider('lookSliders', 'Ink strength', look, 'inkStrength', 0, 100);

  NV.buildToggle('lookToggles', 'Poster ink', look, 'ink');
  NV.buildToggle('lookToggles', 'Sky glow', look, 'skyGlow');
  NV.buildToggle('lookToggles', 'Frame-break hero', look, 'frameBreak');

  var ex = NV.state.extras;
  NV.buildToggle('extrasToggles', 'Stars & quote', ex, 'quote');
  NV.buildToggle('extrasToggles', 'Heat pill', ex, 'pill');
  NV.buildToggle('extrasToggles', 'Vol. 1 tag', ex, 'vol');
  NV.buildToggle('extrasToggles', 'Seal', ex, 'seal');
  NV.buildToggle('extrasToggles', 'Panel tags', ex, 'tags');
  NV.buildToggle('extrasToggles', 'Palm band', ex, 'palm');
  NV.buildToggle('extrasToggles', 'Billing band', ex, 'billing');

  document.getElementById('fileInput').addEventListener('change', function (e) {
    NV.addUserPhotos(e.target.files);
    e.target.value = '';
  });

  NV.syncPanelEditor();
};
