/*
  site.js — command palette (Ctrl/⌘ K), scorciatoie da tastiera a un tasto
  e Ctrl+Invio per inviare il form. Le scorciatoie si possono disattivare
  dalla palette (WCAG 2.1.4): la preferenza resta in localStorage.
*/
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  var MOD = isMac ? '⌘' : 'Ctrl';

  function shortcutsOn() { return localStorage.getItem('shortcuts') !== 'off'; }

  document.querySelectorAll('[data-kbd-palette]').forEach(function (k) { k.textContent = MOD + ' K'; });
  document.querySelectorAll('[data-kbd-submit]').forEach(function (k) { k.textContent = MOD + ' ↵'; });

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
    { group: 'Azioni', label: 'Cambia tema', key: 'T', run: function () { document.getElementById('theme-toggle').click(); } },
    { group: 'Preferenze', label: function () {
      return shortcutsOn() ? 'Disattiva scorciatoie da tastiera' : 'Attiva scorciatoie da tastiera';
    }, run: function () { localStorage.setItem('shortcuts', shortcutsOn() ? 'off' : 'on'); } }
  ];

  function labelOf(c) { return typeof c.label === 'function' ? c.label() : c.label; }

  /* ── PALETTE ── */

  var dialog = document.getElementById('palette');
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
      if (c.key && shortcutsOn()) {
        var k = document.createElement('kbd');
        k.textContent = c.key;
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
      empty.textContent = 'Nessun comando contiene “' + input.value.trim() + '”. Prova con “esperienza” o “CV”.';
      list.appendChild(empty);
    }
    highlight();
  }

  function open() {
    if (dialog.open) return;
    input.value = '';
    active = 0;
    render();
    dialog.showModal();
    input.focus();
  }

  function close() { if (dialog.open) dialog.close(); }

  function run(i) {
    var c = filtered[i];
    if (!c) return;
    close();
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

  // clic sullo sfondo: chiude
  dialog.addEventListener('click', function (e) { if (e.target === dialog) close(); });

  document.querySelectorAll('[data-open-palette]').forEach(function (b) {
    b.addEventListener('click', open);
  });

  /* ── SCORCIATOIE ── */

  var form = document.getElementById('contact-form');

  document.addEventListener('keydown', function (e) {
    var mod = e.metaKey || e.ctrlKey;

    if (mod && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (dialog.open) close(); else open();
      return;
    }

    if (mod && e.key === 'Enter' && form && form.contains(e.target)) {
      e.preventDefault();
      form.requestSubmit();
      return;
    }

    if (dialog.open || mod || e.altKey || e.repeat) return;
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

  // con le scorciatoie spente, via anche i suggerimenti sui pulsanti
  function syncHints() {
    document.documentElement.classList.toggle('no-shortcuts', !shortcutsOn());
  }
  syncHints();
  dialog.addEventListener('close', syncHints);
})();
