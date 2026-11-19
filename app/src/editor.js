/* Neon Vice Cover Studio - editor wiring.
   Owns the control column, the photo library, canvas pan/zoom gestures and
   the export buttons. All cover state lives in window.coverStudio's state
   object so the renderer in cover.js stays the single source of truth. */

(function () {
  var studio = window.coverStudio;
  var state = studio.getState();

  var previewCanvas = document.getElementById('previewCanvas');
  var stage = document.getElementById('stage');
  var layoutChips = document.getElementById('layoutChips');
  var gradeChips = document.getElementById('gradeChips');
  var sizeChips = document.getElementById('sizeChips');
  var thumbStrip = document.getElementById('thumbStrip');
  var photoInput = document.getElementById('photoInput');
  var selectedPanelLabel = document.getElementById('selectedPanelLabel');
  var zoomRange = document.getElementById('zoomRange');
  var gradeRange = document.getElementById('gradeRange');

  var exportWidth = 1920;
  var exportHeight = 1080;
  var photoLibrary = [];

  function currentLayout() {
    return buildPanelLayouts()[state.layoutIndex];
  }

  function activePlacement() {
    if (state.spread) return state.spreadPlacement;
    return state.panels[state.selectedPanel];
  }

  function previewSize() {
    var scale = Math.min(1120 / exportWidth, 880 / exportHeight);
    return {
      width: Math.max(320, Math.round(exportWidth * scale)),
      height: Math.max(240, Math.round(exportHeight * scale))
    };
  }

  function drawSelectionOutline(ctx, width, height) {
    if (state.spread) return;
    var layout = currentLayout();
    var fraction = layout.panels[state.selectedPanel];
    if (!fraction) return;
    var gutter = Math.max(6, Math.round(width * 0.009));
    var rect = panelRectToPixels(fraction, width, height, gutter);
    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ff2e88';
    ctx.shadowColor = 'rgba(255, 46, 136, 0.8)';
    ctx.shadowBlur = 10;
    ctx.setLineDash([12, 8]);
    ctx.strokeRect(rect.x - 2, rect.y - 2, rect.w + 4, rect.h + 4);
    ctx.restore();
  }

  function renderPreviewNow() {
    var size = previewSize();
    renderCover(previewCanvas, state, size.width, size.height);
    drawSelectionOutline(previewCanvas.getContext('2d'), size.width, size.height);
    selectedPanelLabel.textContent = state.spread
      ? 'Spread photo selected'
      : 'Panel ' + (state.selectedPanel + 1) + ' selected';
    var placement = activePlacement();
    if (placement) zoomRange.value = placement.zoom || 1;
  }

  var renderQueued = false;
  function scheduleRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(function () {
      renderQueued = false;
      renderPreviewNow();
    });
  }

  function buildChips(container, names, activeName, onPick) {
    container.innerHTML = '';
    names.forEach(function (name) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip' + (name === activeName ? ' is-active' : '');
      chip.textContent = name;
      chip.addEventListener('click', function () {
        onPick(name);
        buildChips(container, names, name, onPick);
        scheduleRender();
      });
      container.appendChild(chip);
    });
  }

  function buildLayoutChips() {
    var names = buildPanelLayouts().map(function (layout) { return layout.name; });
    buildChips(layoutChips, names, currentLayout().name, function (name) {
      studio.setLayout(name);
    });
  }

  function buildGradeChips() {
    buildChips(gradeChips, colourGradeNames(), state.gradeName, function (name) {
      studio.setGrade(name);
    });
  }

  function rebuildThumbs() {
    thumbStrip.innerHTML = '';
    photoLibrary.forEach(function (image, index) {
      var thumb = document.createElement('img');
      thumb.className = 'thumb';
      thumb.src = image.src;
      thumb.alt = 'Photo ' + (index + 1);
      thumb.title = state.spread ? 'Set as the spread photo' : 'Place in the selected panel';
      thumb.addEventListener('click', function () {
        if (state.spread) {
          state.spreadImage = image;
        } else {
          var placement = state.panels[state.selectedPanel];
          placement.image = image;
          placement.zoom = 1;
          placement.offsetX = 0.5;
          placement.offsetY = 0.5;
        }
        scheduleRender();
      });
      thumbStrip.appendChild(thumb);
    });
  }

  function addPhotosToLibrary(images) {
    images.forEach(function (image) { photoLibrary.push(image); });
    if (images.length) {
      var layoutCount = currentLayout().panels.length;
      for (var i = 0; i < images.length; i++) {
        var slot = state.panels[(state.selectedPanel + i) % layoutCount];
        slot.image = images[i];
        slot.zoom = 1;
        slot.offsetX = 0.5;
        slot.offsetY = 0.5;
      }
      if (!state.spreadImage) state.spreadImage = images[0];
    }
    rebuildThumbs();
    scheduleRender();
  }

  function loadPhotoFiles(files) {
    var readers = Array.prototype.map.call(files, function (file) {
      return new Promise(function (resolve) {
        var reader = new FileReader();
        reader.onload = function () {
          var image = new Image();
          image.onload = function () { resolve(image); };
          image.onerror = function () { resolve(null); };
          image.src = reader.result;
        };
        reader.onerror = function () { resolve(null); };
        reader.readAsDataURL(file);
      });
    });
    Promise.all(readers).then(function (images) {
      addPhotosToLibrary(images.filter(Boolean));
    });
  }

  photoInput.addEventListener('change', function () {
    if (photoInput.files && photoInput.files.length) loadPhotoFiles(photoInput.files);
    photoInput.value = '';
  });

  document.getElementById('samplePhotosBtn').addEventListener('click', function () {
    studio.loadSamplePhotos().then(function (images) {
      photoLibrary = images.slice();
      rebuildThumbs();
      scheduleRender();
    });
  });

  ['dragenter', 'dragover'].forEach(function (eventName) {
    window.addEventListener(eventName, function (event) {
      event.preventDefault();
      stage.classList.add('is-dragging');
    });
  });
  ['dragleave', 'drop'].forEach(function (eventName) {
    window.addEventListener(eventName, function (event) {
      event.preventDefault();
      if (eventName === 'dragleave' && event.relatedTarget) return;
      stage.classList.remove('is-dragging');
    });
  });
  window.addEventListener('drop', function (event) {
    if (event.dataTransfer && event.dataTransfer.files.length) {
      loadPhotoFiles(event.dataTransfer.files);
    }
  });

  document.getElementById('spreadToggle').addEventListener('change', function (event) {
    state.spread = event.target.checked;
    scheduleRender();
  });

  zoomRange.addEventListener('input', function () {
    var placement = activePlacement();
    if (placement) placement.zoom = parseFloat(zoomRange.value);
    scheduleRender();
  });

  gradeRange.addEventListener('input', function () {
    state.gradeStrength = parseFloat(gradeRange.value);
    scheduleRender();
  });

  function bindTextInput(id, key) {
    document.getElementById(id).addEventListener('input', function (event) {
      var update = {};
      update[key] = event.target.value;
      studio.setTexts(update);
      scheduleRender();
    });
  }
  bindTextInput('kickerInput', 'kicker');
  bindTextInput('scriptInput', 'script');
  bindTextInput('titleInput', 'title');

  document.getElementById('grainToggle').addEventListener('change', function (event) {
    state.showGrain = event.target.checked;
    scheduleRender();
  });
  document.getElementById('badgeToggle').addEventListener('change', function (event) {
    state.showBadge = event.target.checked;
    scheduleRender();
  });

  Array.prototype.forEach.call(sizeChips.querySelectorAll('.size-chip'), function (chip) {
    chip.addEventListener('click', function () {
      exportWidth = parseInt(chip.getAttribute('data-w'), 10);
      exportHeight = parseInt(chip.getAttribute('data-h'), 10);
      Array.prototype.forEach.call(sizeChips.querySelectorAll('.size-chip'), function (other) {
        other.classList.toggle('is-active', other === chip);
      });
      scheduleRender();
    });
  });

  document.getElementById('exportBtn').addEventListener('click', function () {
    exportCoverPng(state, exportWidth, exportHeight);
  });

  function canvasPoint(event) {
    var bounds = previewCanvas.getBoundingClientRect();
    return {
      x: (event.clientX - bounds.left) * (previewCanvas.width / bounds.width),
      y: (event.clientY - bounds.top) * (previewCanvas.height / bounds.height)
    };
  }

  function panelIndexAt(point) {
    var layout = currentLayout();
    for (var i = 0; i < layout.panels.length; i++) {
      var f = layout.panels[i];
      if (
        point.x >= f.x * previewCanvas.width && point.x <= (f.x + f.w) * previewCanvas.width &&
        point.y >= f.y * previewCanvas.height && point.y <= (f.y + f.h) * previewCanvas.height
      ) {
        return i;
      }
    }
    return -1;
  }

  var dragState = null;

  previewCanvas.addEventListener('pointerdown', function (event) {
    var point = canvasPoint(event);
    if (!state.spread) {
      var index = panelIndexAt(point);
      if (index >= 0) state.selectedPanel = index;
    }
    var placement = activePlacement();
    if (!placement) return;
    var image = state.spread ? state.spreadImage : placement.image;
    dragState = {
      startX: point.x,
      startY: point.y,
      offsetX: placement.offsetX,
      offsetY: placement.offsetY,
      image: image
    };
    previewCanvas.setPointerCapture(event.pointerId);
    scheduleRender();
  });

  previewCanvas.addEventListener('pointermove', function (event) {
    if (!dragState || !dragState.image) return;
    var placement = activePlacement();
    if (!placement) return;
    var point = canvasPoint(event);
    var rect = state.spread
      ? { w: previewCanvas.width, h: previewCanvas.height }
      : panelRectToPixels(
          currentLayout().panels[state.selectedPanel],
          previewCanvas.width,
          previewCanvas.height,
          Math.max(6, Math.round(previewCanvas.width * 0.009))
        );
    var fit = computeCoverFit(dragState.image, rect.w, rect.h, placement.zoom);
    if (fit.overflowX > 0) {
      placement.offsetX = Math.min(1, Math.max(0, dragState.offsetX - (point.x - dragState.startX) / fit.overflowX));
    }
    if (fit.overflowY > 0) {
      placement.offsetY = Math.min(1, Math.max(0, dragState.offsetY - (point.y - dragState.startY) / fit.overflowY));
    }
    scheduleRender();
  });

  function endDrag() {
    dragState = null;
  }
  previewCanvas.addEventListener('pointerup', endDrag);
  previewCanvas.addEventListener('pointercancel', endDrag);

  previewCanvas.addEventListener('wheel', function (event) {
    event.preventDefault();
    var placement = activePlacement();
    if (!placement) return;
    var step = event.deltaY < 0 ? 0.06 : -0.06;
    placement.zoom = Math.min(4, Math.max(1, (placement.zoom || 1) + step));
    scheduleRender();
  }, { passive: false });

  function preloadCoverFonts() {
    if (!document.fonts || !document.fonts.load) return;
    Promise.all([
      document.fonts.load('80px "Anton"'),
      document.fonts.load('60px "Pacifico"')
    ]).then(scheduleRender).catch(function () { /* fallbacks render instead */ });
    if (document.fonts.ready) document.fonts.ready.then(scheduleRender);
  }

  buildLayoutChips();
  buildGradeChips();
  gradeRange.value = state.gradeStrength;
  renderPreviewNow();
  preloadCoverFonts();

  studio.loadSamplePhotos().then(function (images) {
    photoLibrary = images.slice();
    rebuildThumbs();
    scheduleRender();
  }).catch(function () {
    /* samples are a convenience; the editor still works with user photos */
  });
})();
