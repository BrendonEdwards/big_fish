# Self-hosted glyphs

MapLibre is configured to request glyph PBFs from `/fonts/{fontstack}/{range}.pbf` using the `Noto Sans Regular` font stack. In production, keep the generated PBF ranges for `Noto Sans Regular` in `public/fonts/Noto Sans Regular/` so labels do not depend on MapLibre's demo glyph endpoint.
