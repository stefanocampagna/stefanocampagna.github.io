/*
  glass.js — carta topografica di sfondo, rifrazione del vetro e nav a goccia.
  Tutto progressivo: senza JS il sito resta leggibile su un fondo pieno.
*/
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ── CARTA: rilievo ombreggiato + isoline, generati da rumore con seme fisso ── */

  var CELL = 6;          // passo della griglia, in px CSS
  var SCALE = 1 / 780;   // ampiezza delle "montagne"
  var LEVELS = 30;       // numero di isoline
  var INDEX_EVERY = 5;   // isolina direttrice, come sulle carte IGM

  function makeNoise(seed) {
    var perm = new Uint8Array(512), p = [], i, j, t;
    for (i = 0; i < 256; i++) p[i] = i;
    for (i = 255; i > 0; i--) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      j = seed % (i + 1);
      t = p[i]; p[i] = p[j]; p[j] = t;
    }
    for (i = 0; i < 512; i++) perm[i] = p[i & 255];

    function grad(h, x, y) {
      switch (h & 7) {
        case 0: return x + y;  case 1: return -x + y;
        case 2: return x - y;  case 3: return -x - y;
        case 4: return x;      case 5: return -x;
        case 6: return y;      default: return -y;
      }
    }
    function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }

    return function (x, y) {
      var X = Math.floor(x), Y = Math.floor(y);
      x -= X; y -= Y; X &= 255; Y &= 255;
      var u = fade(x), v = fade(y);
      var a = perm[X] + Y, b = perm[X + 1] + Y;
      var n0 = grad(perm[a], x, y) + u * (grad(perm[b], x - 1, y) - grad(perm[a], x, y));
      var n1 = grad(perm[a + 1], x, y - 1) + u * (grad(perm[b + 1], x - 1, y - 1) - grad(perm[a + 1], x, y - 1));
      return n0 + v * (n1 - n0);
    };
  }

  var noise = makeNoise(1996);

  function fbm(x, y) {
    var v = 0, amp = 0.6, f = 1;
    for (var o = 0; o < 4; o++) {
      v += amp * noise(x * f, y * f);
      f *= 2.03; amp *= 0.42;
    }
    return v;
  }

  function smoothstep(a, b, x) {
    var t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }

  function buildField(w, h) {
    var cols = Math.ceil(w / CELL) + 2, rows = Math.ceil(h / CELL) + 2;
    var data = new Float32Array(cols * rows);
    var lo = Infinity, hi = -Infinity;
    for (var j = 0; j < rows; j++) {
      for (var i = 0; i < cols; i++) {
        var x = i * CELL * SCALE + 4.2, y = j * CELL * SCALE + 1.7;
        // domain warping: creste e valli più organiche
        var qx = fbm(x + 3.1, y + 7.4), qy = fbm(x + 8.3, y + 2.8);
        var v = fbm(x + 0.7 * qx, y + 0.7 * qy);
        // terreno più calmo a sinistra, dove siede il testo dell'hero
        v *= 0.3 + 0.7 * smoothstep(0.12, 0.68, (i * CELL) / w);
        data[j * cols + i] = v;
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
    }
    return { cols: cols, rows: rows, data: data, lo: lo, hi: hi };
  }

  // marching squares: una Path2D per livello
  function contour(field, level) {
    var c = field.cols, r = field.rows, d = field.data, p = new Path2D();
    function seg(x1, y1, x2, y2) { p.moveTo(x1, y1); p.lineTo(x2, y2); }
    for (var j = 0; j < r - 1; j++) {
      for (var i = 0; i < c - 1; i++) {
        var k = j * c + i;
        var tl = d[k], tr = d[k + 1], br = d[k + c + 1], bl = d[k + c];
        var idx = (tl > level ? 8 : 0) | (tr > level ? 4 : 0) | (br > level ? 2 : 0) | (bl > level ? 1 : 0);
        if (idx === 0 || idx === 15) continue;
        var x = i * CELL, y = j * CELL;
        var top = x + CELL * (level - tl) / (tr - tl);
        var right = y + CELL * (level - tr) / (br - tr);
        var bottom = x + CELL * (level - bl) / (br - bl);
        var left = y + CELL * (level - tl) / (bl - tl);
        switch (idx) {
          case 1: case 14: seg(x, left, bottom, y + CELL); break;
          case 2: case 13: seg(bottom, y + CELL, x + CELL, right); break;
          case 3: case 12: seg(x, left, x + CELL, right); break;
          case 4: case 11: seg(top, y, x + CELL, right); break;
          case 5: seg(x, left, top, y); seg(bottom, y + CELL, x + CELL, right); break;
          case 6: case 9: seg(top, y, bottom, y + CELL); break;
          case 7: case 8: seg(x, left, top, y); break;
          case 10: seg(top, y, x + CELL, right); seg(x, left, bottom, y + CELL); break;
        }
      }
    }
    return p;
  }

  function hex(name) {
    var v = getComputedStyle(root).getPropertyValue(name).trim().replace('#', '');
    if (v.length === 3) v = v[0] + v[0] + v[1] + v[1] + v[2] + v[2];
    var n = parseInt(v, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function num(name) { return parseFloat(getComputedStyle(root).getPropertyValue(name)); }

  function mix(a, b, t) {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  }

  // rilievo ombreggiato a bassa risoluzione (una cella = un pixel), poi scalato con smoothing
  function buildRelief(field) {
    var c = field.cols, r = field.rows, d = field.data;
    var low = hex('--map-low'), high = hex('--map-high');
    var lit = hex('--map-lit'), shadow = hex('--map-shadow');
    var amount = num('--map-shade');
    var off = document.createElement('canvas');
    off.width = c; off.height = r;
    var octx = off.getContext('2d');
    var img = octx.createImageData(c, r);
    var span = field.hi - field.lo;
    for (var j = 0; j < r; j++) {
      for (var i = 0; i < c; i++) {
        var k = j * c + i;
        var dx = d[j * c + Math.min(c - 1, i + 1)] - d[j * c + Math.max(0, i - 1)];
        var dy = d[Math.min(r - 1, j + 1) * c + i] - d[Math.max(0, j - 1) * c + i];
        // luce da nord-ovest
        var s = Math.max(-1, Math.min(1, (dx + dy) * 16));
        // clamp: il minimo è calcolato in float64, i dati sono Float32 (evita pow di negativi = NaN = pixel nero)
        var base = mix(low, high, Math.pow(Math.max(0, (d[k] - field.lo) / span), 1.3));
        var col = mix(base, s > 0 ? lit : shadow, Math.abs(s) * amount);
        img.data[k * 4] = col[0];
        img.data[k * 4 + 1] = col[1];
        img.data[k * 4 + 2] = col[2];
        img.data[k * 4 + 3] = 255;
      }
    }
    octx.putImageData(img, 0, 0);
    return off;
  }

  var canvas = document.getElementById('terrain');
  var ctx = canvas && canvas.getContext('2d');
  var map = null;        // { field, paths, relief, w, h }

  function buildMap(w, h) {
    var field = buildField(w, h);
    var paths = [];
    var step = (field.hi - field.lo) / (LEVELS + 1);
    for (var n = 1; n <= LEVELS; n++) paths.push(contour(field, field.lo + n * step));
    return { field: field, paths: paths, relief: buildRelief(field), w: w, h: h };
  }

  // progress 0..1: il rilievo emerge, poi le isoline si tracciano dalle valli alle cime
  function paint(progress) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var lineLow = hex('--map-line-low'), lineHigh = hex('--map-line-high');
    var alpha = num('--map-line-alpha');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, map.w, map.h);
    ctx.globalAlpha = Math.min(1, progress * 2.5);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(map.relief, 0, 0, map.field.cols * CELL, map.field.rows * CELL);
    ctx.lineCap = 'round';
    for (var n = 0; n < map.paths.length; n++) {
      var t = n / (map.paths.length - 1);
      var appear = Math.min(1, Math.max(0, (progress - 0.15 - t * 0.6) / 0.25));
      if (appear <= 0) continue;
      var isIndex = (n + 1) % INDEX_EVERY === 0;
      var c = mix(lineLow, lineHigh, smoothstep(0.25, 0.9, t));
      ctx.globalAlpha = appear * alpha * (isIndex ? 1.9 : 1);
      ctx.strokeStyle = 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')';
      ctx.lineWidth = isIndex ? 1.3 : 0.75;
      ctx.stroke(map.paths[n]);
    }
    ctx.globalAlpha = 1;
  }

  function render(animate) {
    var w = canvas.clientWidth, h = canvas.clientHeight;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (!map || map.w !== w || map.h < h) map = buildMap(w, h);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    if (!animate || reduceMotion.matches) { paint(1); return; }
    var start = performance.now(), duration = 1800;
    (function frame(now) {
      var t = Math.min(1, (now - start) / duration);
      paint(1 - Math.pow(1 - t, 3));
      if (t < 1) requestAnimationFrame(frame);
    })(start);
  }

  if (ctx) {
    render(true);

    var lastW = canvas.clientWidth, resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        // la barra degli indirizzi su mobile cambia solo l'altezza: non ridisegnare per quello
        if (canvas.clientWidth === lastW && map && map.h >= canvas.clientHeight) return;
        lastW = canvas.clientWidth;
        map = null;
        render(false);
      }, 180);
    });

    // cambio tema: stessa carta, colori nuovi
    new MutationObserver(function () {
      if (!map) return;
      map.relief = buildRelief(map.field);
      paint(1);
    }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  }

  /* ── VETRO: rifrazione vera sul bordo (solo Chromium supporta url() in backdrop-filter) ── */

  var isChromium = !!(navigator.userAgentData && navigator.userAgentData.brands &&
    navigator.userAgentData.brands.some(function (b) { return /Chromium/.test(b.brand); }));

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var lenses = document.querySelectorAll('[data-refract]');

  // mappa di spostamento: rosso = asse x, blu = asse y, grigio neutro al centro.
  // Il bordo del vetro "piega" lo sfondo, il centro resta limpido.
  function displacementMap(w, h, radius, bezel) {
    var svg =
      '<svg xmlns="' + SVG_NS + '" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">' +
      '<defs>' +
      '<linearGradient id="x" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#f00"/></linearGradient>' +
      '<linearGradient id="y" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#00f"/></linearGradient>' +
      '</defs>' +
      '<rect width="' + w + '" height="' + h + '" fill="#000"/>' +
      '<rect width="' + w + '" height="' + h + '" rx="' + radius + '" fill="url(#x)"/>' +
      '<rect width="' + w + '" height="' + h + '" rx="' + radius + '" fill="url(#y)" style="mix-blend-mode:difference"/>' +
      '<rect x="' + bezel + '" y="' + bezel + '" width="' + Math.max(0, w - 2 * bezel) + '" height="' + Math.max(0, h - 2 * bezel) +
        '" rx="' + Math.max(0, radius - bezel) + '" fill="rgb(128,128,128)" style="filter:blur(' + (bezel * 0.55).toFixed(1) + 'px)"/>' +
      '</svg>';
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
  }

  // tre spostamenti leggermente diversi per R, G, B: la dispersione cromatica sul bordo
  function lensFilter(id, w, h, radius, bezel, scale) {
    var channels = [
      { s: scale, m: '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0' },
      { s: scale * 0.92, m: '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0' },
      { s: scale * 0.84, m: '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0' }
    ];
    var html =
      '<filter id="' + id + '" color-interpolation-filters="sRGB">' +
      '<feImage x="0" y="0" width="' + w + '" height="' + h + '" preserveAspectRatio="none" href="' +
        displacementMap(w, h, radius, bezel) + '" result="map"/>';
    channels.forEach(function (ch, n) {
      html +=
        '<feDisplacementMap in="SourceGraphic" in2="map" scale="' + ch.s.toFixed(1) +
          '" xChannelSelector="R" yChannelSelector="B" result="d' + n + '"/>' +
        '<feColorMatrix in="d' + n + '" type="matrix" values="' + ch.m + '" result="c' + n + '"/>';
    });
    html +=
      '<feBlend in="c0" in2="c1" mode="screen" result="c01"/>' +
      '<feBlend in="c01" in2="c2" mode="screen"/>' +
      '</filter>';
    return html;
  }

  if (isChromium && lenses.length) {
    var defs = document.createElementNS(SVG_NS, 'svg');
    defs.setAttribute('aria-hidden', 'true');
    defs.setAttribute('width', '0');
    defs.setAttribute('height', '0');
    defs.style.position = 'absolute';
    document.body.appendChild(defs);

    var refract = function (el, n) {
      var w = Math.round(el.offsetWidth), h = Math.round(el.offsetHeight);
      if (!w || !h) return;
      var radius = Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0, h / 2, w / 2);
      var bezel = parseFloat(el.dataset.bezel) || Math.min(w, h) * 0.2;
      var scale = parseFloat(el.dataset.scale) || -60;
      var blur = el.dataset.blur !== undefined ? parseFloat(el.dataset.blur) : 1;
      var id = 'lens-' + n;
      var old = document.getElementById(id);
      if (old) old.remove();
      defs.insertAdjacentHTML('beforeend', lensFilter(id, w, h, radius, bezel, scale));
      el.style.backdropFilter = 'url(#' + id + ') blur(' + blur + 'px) saturate(1.7) brightness(1.04)';
    };

    var ro = new ResizeObserver(function (entries) {
      entries.forEach(function (e) {
        refract(e.target, Array.prototype.indexOf.call(lenses, e.target));
      });
    });
    Array.prototype.forEach.call(lenses, function (el) { ro.observe(el); });
    root.classList.add('has-refraction');
  }

  // riflesso speculare che segue il puntatore
  Array.prototype.forEach.call(lenses, function (el) {
    el.addEventListener('pointermove', function (e) {
      var r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      el.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  /* ── NAV: la goccia segue la sezione in vista ── */

  var list = document.querySelector('.nav-links');
  var drop = document.querySelector('.nav-droplet');
  var track = document.querySelector('.nav-track');
  if (!list || !drop) return;

  var links = Array.prototype.slice.call(list.querySelectorAll('a'));
  var sections = links.map(function (a) { return document.querySelector(a.getAttribute('href')); });
  var current = null;

  function place(link, force) {
    if (link === current && !force) return;
    links.forEach(function (a) {
      if (a === link) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });
    if (!link) {
      list.classList.remove('has-active');
      current = null;
      return;
    }
    var l = link.parentNode.offsetLeft;
    var r = list.offsetWidth - l - link.parentNode.offsetWidth;
    if (!current || force) {
      // prima comparsa: niente scivolata dal bordo
      list.classList.add('is-snapping');
      drop.style.left = l + 'px';
      drop.style.right = r + 'px';
      void drop.offsetWidth;
      list.classList.remove('is-snapping');
    } else {
      list.dataset.dir = l >= parseFloat(drop.style.left) ? 'right' : 'left';
      drop.style.left = l + 'px';
      drop.style.right = r + 'px';
    }
    list.classList.add('has-active');
    current = link;
    if (track && track.scrollWidth > track.clientWidth) {
      track.scrollTo({
        left: l - (track.clientWidth - link.parentNode.offsetWidth) / 2,
        behavior: reduceMotion.matches ? 'auto' : 'smooth'
      });
    }
  }

  function update() {
    var edge = window.innerHeight * 0.4, active = null;
    sections.forEach(function (s, i) {
      if (s && s.getBoundingClientRect().top <= edge) active = links[i];
    });
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
      active = links[links.length - 1];
    }
    place(active);
  }

  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; update(); });
  }, { passive: true });

  window.addEventListener('resize', function () { if (current) place(current, true); });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { if (current) place(current, true); });
  }
  update();
})();
