/* Neon Vice Cover Studio — editor wiring.
   Owns the preview canvas, the photo strip, panel selection and dragging,
   and every control in the side column. Photos are read with FileReader and
   never leave this machine. */

'use strict';

(function () {
  var A = window.CoverArt;
  var state = A.state;

  var preview = document.getElementById('preview');
  var thumbsEl = document.getElementById('thumbs');
  var panelLabel = document.getElementById('panelLabel');
  var zoomRange = document.getElementById('zoomRange');
  var gradeStrength = document.getElementById('gradeStrength');
  var spreadToggle = document.getElementById('spreadToggle');
  var fileInput = document.getElementById('fileInput');

  var exportSize = { w: 1920, h: 1080 };
  var renderQueued = false;

  /* ------------------------------------------------------------ rendering */

  function previewSize() {
    var longSide = 1080;
    var ratio = exportSize.w / exportSize.h;
    if (ratio >= 1) return { w: longSide, h: Math.round(longSide / ratio) };
    return { w: Math.round(longSide * ratio), h: longSide };
  }

  function drawSelection() {
    var ctx = preview.getContext('2d');
    var rects = A.panelRects(preview.width, preview.height);
    var r = A.state.spread.on ? null : rects[state.selectedPanel];
    ctx.save();
    if (r) {
      ctx.strokeStyle = '#ff2d95';
      ctx.lineWidth = 3;
      ctx.setLineDash([12, 8]);
      ctx.strokeRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
      ctx.fillStyle = '#ff2d95';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('PANEL ' + (state.selectedPanel + 1), r.x + 10, r.y + 24);
    }
    ctx.restore();
  }

  function render() {
    var size = previewSize();
    A.renderCover(preview, size.w, size.h);
    drawSelection();
    syncPanelControls();
  }

  function requestRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(function () {
      renderQueued = false;
      render();
    });
  }

  /* -------------------------------------------------------------- photos */

  function refreshThumbs() {
    thumbsEl.innerHTML = '';
    state.photos.forEach(function (img, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'thumb';
      b.title = 'Put this photo in the selected panel';
      var t = document.createElement('img');
      t.src = img.src;
      t.alt = 'Photo ' + (i + 1);
      b.appendChild(t);
      b.addEventListener('click', function () { assignPhoto(i); });
      thumbsEl.appendChild(b);
    });
    if (!state.photos.length) {
      var empty = document.createElement('span');
      empty.className = 'thumbs-empty';
      empty.textContent = 'No photos yet — add some, or use the samples.';
      thumbsEl.appendChild(empty);
    }
  }

  function assignPhoto(i) {
    if (state.spread.on) {
      state.spread.photo = i;
    } else {
      A.ensurePanels();
      state.panels[state.selectedPanel].photo = i;
    }
    requestRender();
  }

  function addPhoto(img) {
    state.photos.push(img);
    var idx = state.photos.length - 1;
    A.ensurePanels();
    var target = state.panels.findIndex(function (p) { return p.photo < 0; });
    if (target === -1) target = state.selectedPanel;
    if (!state.spread.on) state.panels[target].photo = idx;
    refreshThumbs();
    requestRender();
  }

  function readFiles(files) {
    Array.prototype.forEach.call(files, function (file) {
      if (!/^image\//.test(file.type)) return;
      var reader = new FileReader();
      reader.onload = function () {
        var img = new Image();
        img.onload = function () { addPhoto(img); };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  fileInput.addEventListener('change', function () {
    readFiles(fileInput.files);
    fileInput.value = '';
  });

  document.getElementById('sampleBtn').addEventListener('click', function () {
    A.loadSamplePhotos().then(function () {
      refreshThumbs();
      requestRender();
    });
  });

  ['dragover', 'dragleave', 'drop'].forEach(function (name) {
    document.addEventListener(name, function (e) { e.preventDefault(); });
  });
  document.addEventListener('drop', function (e) {
    if (e.dataTransfer && e.dataTransfer.files.length) readFiles(e.dataTransfer.files);
  });

  /* ---------------------------------------------------- canvas interaction */

  function canvasPoint(e) {
    var box = preview.getBoundingClientRect();
    return {
      x: (e.clientX - box.left) * preview.width / box.width,
      y: (e.clientY - box.top) * preview.height / box.height,
    };
  }

  function panelAt(pt) {
    var rects = A.panelRects(preview.width, preview.height);
    for (var i = 0; i < rects.length; i++) {
      var r = rects[i];
      if (pt.x >= r.x && pt.x <= r.x + r.w && pt.y >= r.y && pt.y <= r.y + r.h) return i;
    }
    return -1;
  }

  function activePlacement() {
    if (state.spread.on) return state.spread;
    A.ensurePanels();
    return state.panels[state.selectedPanel];
  }

  var dragging = null;
  preview.addEventListener('pointerdown', function (e) {
    var pt = canvasPoint(e);
    if (!state.spread.on) {
      var idx = panelAt(pt);
      if (idx >= 0) state.selectedPanel = idx;
    }
    var place = activePlacement();
    dragging = { x: pt.x, y: pt.y, ox: place.offsetX, oy: place.offsetY };
    preview.setPointerCapture(e.pointerId);
    requestRender();
  });
  preview.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var pt = canvasPoint(e);
    var rects = A.panelRects(preview.width, preview.height);
    var r = state.spread.on ? { w: preview.width, h: preview.height } : rects[state.selectedPanel];
    var place = activePlacement();
    place.offsetX = clamp(dragging.ox + (pt.x - dragging.x) / Math.max(1, r.w), -1, 1);
    place.offsetY = clamp(dragging.oy + (pt.y - dragging.y) / Math.max(1, r.h), -1, 1);
    requestRender();
  });
  ['pointerup', 'pointercancel'].forEach(function (name) {
    preview.addEventListener(name, function () { dragging = null; });
  });
  preview.addEventListener('wheel', function (e) {
    e.preventDefault();
    var place = activePlacement();
    place.zoom = clamp(place.zoom * Math.exp(-e.deltaY * 0.0012), 0.5, 4);
    requestRender();
  }, { passive: false });

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

  /* -------------------------------------------------------------- controls */

  function syncPanelControls() {
    var place = activePlacement();
    panelLabel.textContent = state.spread.on
      ? 'Spread photo (all panels)'
      : 'Panel ' + (state.selectedPanel + 1) + ' of ' + A.panelRects(preview.width, preview.height).length;
    zoomRange.value = place.zoom;
  }

  zoomRange.addEventListener('input', function () {
    activePlacement().zoom = parseFloat(zoomRange.value);
    requestRender();
  });

  spreadToggle.addEventListener('change', function () {
    state.spread.on = spreadToggle.checked;
    requestRender();
  });

  gradeStrength.addEventListener('input', function () {
    state.gradeStrength = parseFloat(gradeStrength.value);
    requestRender();
  });

  function buttonGroup(el, attr, current, onPick) {
    Array.prototype.forEach.call(el.querySelectorAll('button'), function (b) {
      b.classList.toggle('active', b.getAttribute(attr) === String(current));
      b.addEventListener('click', function () {
        onPick(b.getAttribute(attr));
        Array.prototype.forEach.call(el.querySelectorAll('button'), function (x) {
          x.classList.toggle('active', x === b);
        });
        requestRender();
      });
    });
  }

  buttonGroup(document.getElementById('layoutButtons'), 'data-layout', state.layout, function (v) {
    window.coverStudio.setLayout(v);
  });
  buttonGroup(document.getElementById('gradeButtons'), 'data-grade', state.grade, function (v) {
    window.coverStudio.setGrade(v);
  });
  buttonGroup(document.getElementById('sizeButtons'), 'data-size', exportSize.w + 'x' + exportSize.h, function (v) {
    var parts = v.split('x');
    exportSize = { w: parseInt(parts[0], 10), h: parseInt(parts[1], 10) };
  });

  function bindText(id, key) {
    var el = document.getElementById(id);
    el.addEventListener('input', function () {
      state.texts[key] = el.value;
      requestRender();
    });
  }
  bindText('kickerInput', 'kicker');
  bindText('scriptInput', 'script');
  bindText('titleInput', 'title');

  document.getElementById('grainToggle').addEventListener('change', function (e) {
    state.grain = e.target.checked;
    requestRender();
  });
  document.getElementById('badgeToggle').addEventListener('change', function (e) {
    state.badge = e.target.checked;
    requestRender();
  });

  document.getElementById('exportBtn').addEventListener('click', function () {
    A.ensureFonts().then(function () {
      window.coverStudio.exportCoverPng(exportSize.w, exportSize.h);
    });
  });

  /* ------------------------------------------------------------------ init */

  A.ensureFonts()
    .then(function () { return A.loadSamplePhotos(); })
    .then(function () {
      refreshThumbs();
      render();
    })
    .catch(function () {
      refreshThumbs();
      render();
    });
})();
