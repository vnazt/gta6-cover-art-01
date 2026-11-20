// Neon Vice Cover Studio v2 — boot: load fonts + sample photos, build the
// editor, auto-load the default Key Art Slash cover, expose window.coverStudio.
window.NV = window.NV || {};

NV.FONT_DEFS = [
  { family: 'Anton', url: 'fonts/Anton-Regular.ttf', weight: '400' },
  { family: 'Pacifico', url: 'fonts/Pacifico-Regular.ttf', weight: '400' },
  { family: 'Kaushan Script', url: 'fonts/KaushanScript-Regular.ttf', weight: '400' },
  { family: 'Teko', url: 'fonts/Teko-Regular.ttf', weight: '300 700' },
];

NV.loadFonts = function () {
  var jobs = NV.FONT_DEFS.map(function (def) {
    try {
      var face = new FontFace(def.family, 'url(' + def.url + ')', { weight: def.weight });
      document.fonts.add(face);
      return face.load().catch(function () { return null; });
    } catch (e) {
      return Promise.resolve(null);
    }
  });
  // also explicitly warm the weights the canvas uses
  jobs.push(document.fonts.load('40px Anton').catch(function () {}));
  jobs.push(document.fonts.load('30px Pacifico').catch(function () {}));
  jobs.push(document.fonts.load('600 30px Teko').catch(function () {}));
  jobs.push(document.fonts.load('30px "Kaushan Script"').catch(function () {}));
  return Promise.all(jobs);
};

NV.loadSamples = function () {
  // Load into fixed slots so NV.photos always follows NV.SAMPLES order,
  // whichever image finishes first — panel assignment depends on it.
  var slots = new Array(NV.SAMPLES.length);
  var jobs = NV.SAMPLES.map(function (s, i) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        slots[i] = { img: img, name: s.id.toUpperCase(), tag: s.tag, fx: s.fx, fy: s.fy };
        resolve();
      };
      img.onerror = function () { resolve(); };
      img.src = s.src;
    });
  });
  return Promise.all(jobs).then(function () {
    NV.photos = slots.filter(Boolean);
  });
};

NV.getState = function () {
  var st = NV.state;
  return {
    app: 'Neon Vice Cover Studio',
    version: 2,
    layout: st.layout,
    grade: st.grade,
    titleStyle: st.titleStyle,
    caption: Object.assign({}, st.caption),
    look: Object.assign({}, st.look),
    extras: Object.assign({}, st.extras),
    selected: st.selected,
    panels: st.panels.map(function (p) {
      var rec = NV.photos[p.photo];
      return {
        photo: rec ? rec.name : null,
        tag: p.tag, zoom: p.zoom, panX: p.panX, panY: p.panY,
        fx: p.fx, fy: p.fy, flip: p.flip,
      };
    }),
    photoCount: NV.photos.length,
  };
};

window.coverStudio = {
  setLayout: function (name) { NV.setLayout(name); NV.refreshAll(); },
  setGrade: function (name) {
    if (NV.GRADES[name]) { NV.state.grade = name; NV.refreshChips(); NV.scheduleRender(); }
  },
  setCaption: function (obj) {
    if (!obj) return;
    ['title', 'script', 'tagline', 'quote', 'gazette'].forEach(function (k) {
      if (typeof obj[k] === 'string') NV.state.caption[k] = obj[k];
    });
    NV.initCaptions();
    NV.scheduleRender();
  },
  exportPNG: function (w, h) { return NV.exportPNG(w || 1920, h || 1080); },
  getState: function () { return NV.getState(); },
};

NV.boot = function () {
  var status = document.getElementById('bootStatus');
  Promise.all([NV.loadFonts(), NV.loadSamples()]).then(function () {
    NV.setLayout('Key Art Slash');
    NV.initEditor();
    NV.renderPreview();
    if (status) status.remove();
  });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', NV.boot);
} else {
  NV.boot();
}
