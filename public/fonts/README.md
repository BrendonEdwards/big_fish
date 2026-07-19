# Self-hosted glyphs

MapLibre requests glyph PBFs from `/fonts/{fontstack}/{range}.pbf` using the
`Noto Sans Regular` font stack. The ranges in `Noto Sans Regular/` are
vendored by `scripts/fetch-glyphs.mjs`, which computes the exact character
set used by all rendered labels (summit names, contributing-peak names,
elevation text) and downloads only those ranges.

**A missing range is not cosmetic:** MapLibre drops the entire tile when a
glyph fetch 404s, which silently removes every layer on that source —
markers included. Re-run `node scripts/fetch-glyphs.mjs` after regenerating
`public/data/jailers.json` in case new peak names introduce new character ranges.

The repo-root `fonts` symlink points here so the dev server
(`python3 -m http.server` from the repo root) resolves the same `/fonts/...`
URLs that production (which serves `dist/`, where `public/*` sits at the
root) does.
