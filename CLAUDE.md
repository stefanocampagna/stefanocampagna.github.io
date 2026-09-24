# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

Personal portfolio website for Stefano Campagna, a Senior BI Developer. Hosted at `stefanocampagna.it` via GitHub Pages. No build toolchain — pure HTML, CSS, and vanilla JS.

## Files

- `index.html` — single-page portfolio (all sections: hero, about, experience, skills, education, extra, contact)
- `cv.html` — print-optimized CV; content must stay in sync with `index.html`
- `cv-stefano-campagna.pdf` — generated from `cv.html` via Chromium headless
- `assets/style.css` — all styles for `index.html`; `cv.html` has its own `<style>` block inline
- `assets/glass.js` — `index.html` only: procedural topographic background (canvas `#terrain`), liquid-glass refraction for `[data-refract]` elements, nav droplet that follows the active section

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

## Design "Rilievo" (index.html)

- Background is a topographic map (shaded relief + contour lines) drawn by `glass.js` from a fixed noise seed. Its colors come from the `--map-*` CSS variables, so the canvas is repainted when `data-theme` changes.
- Real liquid-glass refraction (SVG `feDisplacementMap` in `backdrop-filter: url()`) works only in Chromium; other browsers fall back to blur + specular rim. Glass with refraction is reserved for the control layer (nav, hero buttons, portrait); content sits on a single frosted `.sheet`.
- Experience is rendered as a dashed trail (`.trail` / `.waypoint`); the `.job-period` text format `Mmm YYYY → Mmm YYYY` is parsed by the duration script, keep it.

## Typography

- `index.html`: **Archivo** only (variable, `wdth` 62–125, `wght` 100–900). Hierarchy comes from the width axis: name at `font-stretch: 125%` weight 800, headings ~110–118%, body at 100%.
- `cv.html`: **IBM Plex Sans** for body, **JetBrains Mono** for the name and small labels (print layout, not yet aligned to the site)

## Design workflow

- Bug fixes and content updates go directly on `master`
- Before making significant palette, typography, or layout changes, ask whether this should be a new `design/<nome>` branch or an improvement to the current design
- Use `git tag -a backup-pre-<cosa>-YYYY-MM-DD -m "..."` for pre-change snapshots instead of file copies

## Deployment

GitHub Pages deploys automatically on push to `master`. Custom domain is configured in `CNAME` (`stefanocampagna.it`). There is no CI — preview by opening `index.html` locally in a browser.
