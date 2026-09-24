/*
  site.js — temi (palette + aspetto chiaro/scuro/sistema), pannello Impostazioni
  (Ctrl/⌘ ,), command palette (Ctrl/⌘ K), scorciatoie a un tasto e Ctrl+Invio
  per inviare il form. Le scorciatoie a un tasto si possono disattivare
  (WCAG 2.1.4). Preferenze in localStorage: palette, theme, shortcuts.
*/
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var systemDark = window.matchMedia('(prefers-color-scheme: dark)');
  var isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  var MOD = isMac ? '⌘' : 'Ctrl';

  function shortcutsOn() { return localStorage.getItem('shortcuts') !== 'off'; }

  document.querySelectorAll('[data-kbd-palette]').forEach(function (k) { k.textContent = MOD + ' K'; });
  document.querySelectorAll('[data-kbd-submit]').forEach(function (k) { k.textContent = MOD + ' ↵'; });

  /* ── TEMI E ASPETTO ── */

  var PALETTES = [
    { id: 'teal', name: 'Teal', light: 'Predefinito', dark: 'Predefinito' },
    { id: 'one', name: 'One', light: 'One Light', dark: 'One Dark' },
    { id: 'gruvbox', name: 'Gruvbox', light: 'Gruvbox Light', dark: 'Gruvbox Dark' },
    { id: 'solarized', name: 'Solarized', light: 'Solarized Light', dark: 'Solarized Dark' },
    { id: 'nord', name: 'Nord', light: 'Snow Storm', dark: 'Polar Night' },
    { id: 'catppuccin', name: 'Catppuccin', light: 'Latte', dark: 'Mocha' }
  ];

  function currentPalette() { return root.getAttribute('data-palette') || 'teal'; }
  function currentMode() { return localStorage.getItem('theme') || 'system'; }

  function setPalette(id) {
    root.setAttribute('data-palette', id);
    localStorage.setItem('palette', id);
  }

  function setMode(mode) {
    if (mode === 'system') localStorage.removeItem('theme');
    else localStorage.setItem('theme', mode);
    root.setAttribute('data-theme', mode === 'system' ? (systemDark.matches ? 'dark' : 'light') : mode);
  }

  // in modalità "Sistema" segue il cambio chiaro/scuro del sistema operativo
  systemDark.addEventListener('change', function () {
    if (currentMode() === 'system') setMode('system');
  });

  /* ── IMPOSTAZIONI ── */

  var settings = document.getElementById('settings');
  var swatches = document.getElementById('swatches');

  PALETTES.forEach(function (p) {
    var label = document.createElement('label');
    label.className = 'swatch';
    label.innerHTML =
      '<input class="visually-hidden" type="radio" name="palette" />' +
      '<span class="swatch-preview" aria-hidden="true">' +
        '<span class="sp-window">' +
          '<span class="sp-bar"><i></i><i></i><i></i></span>' +
          '<span class="sp-body"><i class="sp-h"></i><i class="sp-t"></i><i class="sp-m"></i>' +
            '<span class="sp-row"><b class="sp-btn"></b><b class="sp-sel"></b><b class="sp-now"></b></span>' +
          '</span>' +
        '</span>' +
      '</span>' +
      '<span class="swatch-name"></span>' +
      '<span class="swatch-variant"></span>';
    var input = label.querySelector('input');
    input.value = p.id;
    input.addEventListener('change', function () { setPalette(p.id); });
    label.querySelector('.swatch-preview').setAttribute('data-palette', p.id);
    label.querySelector('.swatch-name').textContent = p.name;
    swatches.appendChild(label);
  });

  var modeInputs = settings.querySelectorAll('input[name="mode"]');
  var shortcutsInput = settings.querySelector('input[name="shortcuts"]');

  modeInputs.forEach(function (r) {
    r.addEventListener('change', function () { setMode(r.value); });
  });

  shortcutsInput.addEventListener('change', function () {
    localStorage.setItem('shortcuts', shortcutsInput.checked ? 'on' : 'off');
    sync();
  });

  // allinea controlli, anteprime e suggerimenti allo stato corrente
  function sync() {
    var theme = root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    swatches.querySelectorAll('.swatch').forEach(function (label, i) {
      var p = PALETTES[i];
      label.querySelector('input').checked = p.id === currentPalette();
      label.querySelector('.swatch-preview').setAttribute('data-theme', theme);
      label.querySelector('.swatch-variant').textContent = p[theme];
    });
    modeInputs.forEach(function (r) { r.checked = r.value === currentMode(); });
    shortcutsInput.checked = shortcutsOn();
    root.classList.toggle('no-shortcuts', !shortcutsOn());
  }

  new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ['data-theme', 'data-palette'] });
  sync();

  function openSettings() {
    if (palette.open) palette.close();
    if (settings.open) return;
    sync();
    settings.showModal();
    var checked = swatches.querySelector('input:checked');
    if (checked) checked.focus();
  }

  settings.addEventListener('click', function (e) { if (e.target === settings) settings.close(); });

  document.querySelectorAll('[data-open-settings]').forEach(function (b) {
    b.addEventListener('click', openSettings);
  });

  /* ── COMANDI ── */

  function go(hash) {
    var target = document.querySelector(hash);
    if (!target) return;
    target.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
    history.replaceState(null, '', hash);
  }

  function clickAction(name) {
    var el = document.querySelector('[data-action="' + name + '"]');
    if (el) el.click();
  }

  var commands = [
    { group: 'Vai a', label: 'Chi sono', key: '1', run: function () { go('#about'); } },
    { group: 'Vai a', label: 'Esperienza', key: '2', run: function () { go('#experience'); } },
    { group: 'Vai a', label: 'Competenze', key: '3', run: function () { go('#skills'); } },
    { group: 'Vai a', label: 'Formazione', key: '4', run: function () { go('#education'); } },
    { group: 'Vai a', label: 'Lingue & Interessi', key: '5', run: function () { go('#extra'); } },
    { group: 'Vai a', label: 'Now', key: '6', run: function () { go('#now'); } },
    { group: 'Azioni', label: 'Scrivimi', key: 'S', run: function () {
      go('#contact');
      var name = document.getElementById('name');
      if (name) name.focus({ preventScroll: true });
    } },
    { group: 'Azioni', label: 'Scarica CV', key: 'C', run: function () { clickAction('cv'); } },
    { group: 'Azioni', label: 'Apri LinkedIn', key: 'L', run: function () { clickAction('linkedin'); } },
    { group: 'Aspetto', label: 'Passa da chiaro a scuro', key: 'T', run: function () { document.getElementById('theme-toggle').click(); } },
    { group: 'Aspetto', label: 'Impostazioni', hint: MOD + ' ,', run: openSettings }
  ];

  PALETTES.forEach(function (p) {
    commands.push({ group: 'Tema', label: 'Tema: ' + p.name, run: function () { setPalette(p.id); } });
  });

  commands.push({ group: 'Preferenze', label: function () {
    return shortcutsOn() ? 'Disattiva scorciatoie da tastiera' : 'Attiva scorciatoie da tastiera';
  }, run: function () { localStorage.setItem('shortcuts', shortcutsOn() ? 'off' : 'on'); sync(); } });

  function labelOf(c) { return typeof c.label === 'function' ? c.label() : c.label; }

  /* ── PALETTE DEI COMANDI ── */

  var palette = document.getElementById('palette');
  var input = document.getElementById('palette-input');
  var list = document.getElementById('palette-list');
  var filtered = [], active = 0;

  function highlight() {
    list.querySelectorAll('.palette-item').forEach(function (li, i) {
      li.setAttribute('aria-selected', i === active ? 'true' : 'false');
      if (i === active) li.scrollIntoView({ block: 'nearest' });
    });
    input.setAttribute('aria-activedescendant', filtered.length ? 'cmd-' + active : '');
  }

  function render() {
    var q = input.value.trim().toLowerCase();
    filtered = commands.filter(function (c) {
      return !q || labelOf(c).toLowerCase().indexOf(q) !== -1 || c.group.toLowerCase().indexOf(q) !== -1;
    });
    list.textContent = '';
    var group = null;
    filtered.forEach(function (c, i) {
      if (c.group !== group) {
        group = c.group;
        var g = document.createElement('li');
        g.className = 'palette-group';
        g.setAttribute('role', 'presentation');
        g.textContent = group;
        list.appendChild(g);
      }
      var li = document.createElement('li');
      li.id = 'cmd-' + i;
      li.className = 'palette-item';
      li.setAttribute('role', 'option');
      var text = document.createElement('span');
      text.textContent = labelOf(c);
      li.appendChild(text);
      var hint = c.hint || (c.key && shortcutsOn() ? c.key : '');
      if (hint) {
        var k = document.createElement('kbd');
        k.textContent = hint;
        li.appendChild(k);
      }
      li.addEventListener('click', function () { run(i); });
      li.addEventListener('mousemove', function () {
        if (active !== i) { active = i; highlight(); }
      });
      list.appendChild(li);
    });
    if (!filtered.length) {
      var empty = document.createElement('li');
      empty.className = 'palette-empty';
      empty.setAttribute('role', 'presentation');
      empty.textContent = 'Nessun comando contiene “' + input.value.trim() + '”. Prova con “esperienza”, “tema” o “CV”.';
      list.appendChild(empty);
    }
    highlight();
  }

  function openPalette() {
    if (settings.open) settings.close();
    if (palette.open) return;
    input.value = '';
    active = 0;
    render();
    palette.showModal();
    input.focus();
  }

  function closePalette() { if (palette.open) palette.close(); }

  function run(i) {
    var c = filtered[i];
    if (!c) return;
    closePalette();
    c.run();
  }

  input.addEventListener('input', function () { active = 0; render(); });

  input.addEventListener('keydown', function (e) {
    if (!filtered.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      active = (active + 1) % filtered.length;
      highlight();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      active = (active - 1 + filtered.length) % filtered.length;
      highlight();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      run(active);
    }
  });

  palette.addEventListener('click', function (e) { if (e.target === palette) closePalette(); });

  document.querySelectorAll('[data-open-palette]').forEach(function (b) {
    b.addEventListener('click', openPalette);
  });

  /* ── SCORCIATOIE ── */

  var form = document.getElementById('contact-form');

  document.addEventListener('keydown', function (e) {
    var mod = e.metaKey || e.ctrlKey;

    if (mod && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (palette.open) closePalette(); else openPalette();
      return;
    }

    if (mod && e.key === ',') {
      e.preventDefault();
      if (settings.open) settings.close(); else openSettings();
      return;
    }

    if (mod && e.key === 'Enter' && form && form.contains(e.target)) {
      e.preventDefault();
      form.requestSubmit();
      return;
    }

    if (palette.open || settings.open || mod || e.altKey || e.repeat) return;
    if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (!shortcutsOn()) return;

    var key = e.key.toUpperCase();
    for (var i = 0; i < commands.length; i++) {
      if (commands[i].key === key) {
        e.preventDefault();
        commands[i].run();
        return;
      }
    }
  });
})();
