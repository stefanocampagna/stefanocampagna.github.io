# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

Personal portfolio website for Stefano Campagna, a Senior BI Developer. Hosted at `stefanocampagna.it` via GitHub Pages. No build toolchain — pure HTML, CSS, and vanilla JS.

## Files

- `index.html` — single-page portfolio (all sections: hero, about, experience, skills, education, extra, contact)
- `cv.html` — print-optimized CV; content must stay in sync with `index.html`
- `cv-stefano-campagna.pdf` — generated from `cv.html` via Chromium headless
- `assets/style.css` — all styles for `index.html`; `cv.html` has its own `<style>` block inline
- `assets/site.js` — `index.html` only: command palette (`Ctrl/⌘ K`), single-key shortcuts (can be turned off from the palette, stored in `localStorage` key `shortcuts`), `Ctrl/⌘ Enter` to submit the contact form
- `assets/fonts/` — self-hosted iA Writer Quattro webfonts (SIL OFL, license file alongside)

## Generating the PDF CV

```bash
chromium --headless --disable-gpu --no-sandbox \
  --print-to-pdf=cv-stefano-campagna.pdf \
  --no-pdf-header-footer \
  "file://$(pwd)/cv.html"
```

Run this after any change to `cv.html`.

## Content sync rule

Any content change (job bullets, skills, education, certifications, languages) in `index.html` **must also be reflected in `cv.html`**, and vice versa. The two files are independent HTML documents that must stay semantically identical.

## Theming

`index.html` defaults to dark mode. Theme is stored in `localStorage` under the key `theme`. The `data-theme` attribute on `<html>` drives CSS custom properties:

- `:root` defines the dark-mode palette
- `[data-theme="light"]` overrides surface/text/border variables

The amber (`#d4a574`) and teal (`#0f7b6c`) accent colors are shared between `index.html` and `cv.html`. Keep them consistent.

## Design "Editor" (index.html) — inspired by zed.dev

- Warm-gray paper with grain, a central column bounded by hairline rails (`.page::before`), dashed outer rails at ≥1400px, and full-width rules with diamonds where they cross the rails (`.band::before/::after`, diamond SVG in `--diamond` per theme).
- Buttons are "keys": 4px radius, inset bottom shadow, and a `<kbd>` hint for their shortcut. Keep `data-action="linkedin"` / `data-action="cv"` on the hero buttons: the shortcuts click them.
- "Chi sono" is rendered as an editor window (`.editor`): gutter line numbers via CSS counters, `<strong>` styled as a text selection.
- Experience is laid out like release notes (`.release`); the `.job-period` text format `Mmm YYYY → Mmm YYYY` is parsed by the duration script, keep it.
- The "Now:" banner under the header links to the NOW footer (`#now`); keep its text in sync with the first NOW item.
- Accent is teal instead of Zed's blue, to stay consistent with `cv.html`.

## Typography

- `index.html`: **IBM Plex Serif** (Google Fonts, 300/400 + italics) for headings, the name in light italic; **iA Writer Quattro** (self-hosted) for body text; system monospace for `<kbd>`, badges and line numbers.
- `cv.html`: **IBM Plex Sans** for body, **JetBrains Mono** for the name and small labels (print layout, not yet aligned to the site)

## Design workflow

- Bug fixes and content updates go directly on `master`
- Before making significant palette, typography, or layout changes, ask whether this should be a new `design/<nome>` branch or an improvement to the current design
- Use `git tag -a backup-pre-<cosa>-YYYY-MM-DD -m "..."` for pre-change snapshots instead of file copies

## Deployment

GitHub Pages deploys automatically on push to `master`. Custom domain is configured in `CNAME` (`stefanocampagna.it`). There is no CI — preview by opening `index.html` locally in a browser.
